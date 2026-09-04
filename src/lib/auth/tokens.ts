import crypto from "crypto";
import { db } from "@/lib/db";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function createRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** Invalidate previous unused reset tokens for this email, then create a new one */
export async function issuePasswordResetToken(email: string): Promise<{
  rawToken: string;
  resetUrl: string;
  expiresAt: Date;
}> {
  const normalized = email.toLowerCase().trim();
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db.$transaction([
    db.passwordResetToken.updateMany({
      where: { email: normalized, usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.passwordResetToken.create({
      data: {
        email: normalized,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  const resetUrl = `${appBaseUrl()}/reset-password?token=${rawToken}`;
  return { rawToken, resetUrl, expiresAt };
}

export async function consumePasswordResetToken(rawToken: string): Promise<
  | { ok: true; email: string; tokenHash: string }
  | { ok: false; error: string; status: number }
> {
  const tokenHash = hashToken(rawToken.trim());
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!row) {
    return { ok: false, error: "Invalid or expired token", status: 400 };
  }
  if (row.usedAt) {
    return { ok: false, error: "Token already used", status: 400 };
  }
  if (new Date() > row.expiresAt) {
    return { ok: false, error: "Token expired", status: 400 };
  }

  return { ok: true, email: row.email, tokenHash };
}

export async function markPasswordResetUsed(tokenHash: string): Promise<void> {
  await db.passwordResetToken.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
  });
}

/** Email verification via NextAuth VerificationToken table */
export async function issueEmailVerificationToken(email: string): Promise<{
  rawToken: string;
  verifyUrl: string;
}> {
  const normalized = email.toLowerCase().trim();
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + VERIFY_TTL_MS);

  // Remove previous tokens for this identifier
  await db.verificationToken.deleteMany({
    where: { identifier: normalized },
  });

  await db.verificationToken.create({
    data: {
      identifier: normalized,
      token: tokenHash,
      expires,
    },
  });

  const verifyUrl = `${appBaseUrl()}/verify-email?token=${rawToken}&email=${encodeURIComponent(normalized)}`;
  return { rawToken, verifyUrl };
}

export async function consumeEmailVerificationToken(
  email: string,
  rawToken: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const normalized = email.toLowerCase().trim();
  const tokenHash = hashToken(rawToken.trim());

  const row = await db.verificationToken.findFirst({
    where: {
      identifier: normalized,
      token: tokenHash,
    },
  });

  if (!row) {
    return { ok: false, error: "Invalid or expired verification link", status: 400 };
  }
  if (new Date() > row.expires) {
    await db.verificationToken.deleteMany({
      where: { identifier: normalized, token: tokenHash },
    });
    return { ok: false, error: "Verification link expired", status: 400 };
  }

  await db.$transaction([
    db.user.update({
      where: { email: normalized },
      data: { emailVerified: new Date() },
    }),
    db.verificationToken.deleteMany({
      where: { identifier: normalized },
    }),
  ]);

  return { ok: true };
}
