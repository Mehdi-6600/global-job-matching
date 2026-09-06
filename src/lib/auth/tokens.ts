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

function resetIdentifier(email: string): string {
  return `pw-reset:${email.toLowerCase().trim()}`;
}

/** Invalidate previous reset tokens for this email, then create a new one */
export async function issuePasswordResetToken(email: string): Promise<{
  rawToken: string;
  resetUrl: string;
  expiresAt: Date;
}> {
  const normalized = email.toLowerCase().trim();
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  const identifier = resetIdentifier(normalized);

  await db.$transaction([
    db.verificationToken.deleteMany({
      where: { identifier },
    }),
    db.verificationToken.create({
      data: {
        identifier,
        token: tokenHash,
        expires: expiresAt,
      },
    }),
  ]);

  const resetUrl = `${appBaseUrl()}/reset-password?token=${rawToken}`;
  return { rawToken, resetUrl, expiresAt };
}

/**
 * Atomically consume a reset token.
 * Only one concurrent request can succeed (delete-then-check pattern).
 */
export async function consumePasswordResetToken(rawToken: string): Promise<
  | { ok: true; email: string; tokenHash: string }
  | { ok: false; error: string; status: number }
> {
  const tokenHash = hashToken(rawToken.trim());
  const now = new Date();

  const row = await db.verificationToken.findFirst({
    where: {
      token: tokenHash,
      identifier: { startsWith: "pw-reset:" },
      expires: { gt: now },
    },
  });

  if (!row) {
    return { ok: false, error: "Invalid or expired token", status: 400 };
  }

  const deleted = await db.verificationToken.deleteMany({
    where: {
      identifier: row.identifier,
      token: tokenHash,
    },
  });

  if (deleted.count !== 1) {
    return { ok: false, error: "Token already used", status: 400 };
  }

  const email = row.identifier.replace(/^pw-reset:/, "");
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Invalid or expired token", status: 400 };
  }

  return { ok: true, email, tokenHash };
}

export async function markPasswordResetUsed(tokenHash: string): Promise<void> {
  await db.verificationToken.deleteMany({
    where: {
      token: tokenHash,
      identifier: { startsWith: "pw-reset:" },
    },
  });
}

/** Email verification via VerificationToken table */
export async function issueEmailVerificationToken(email: string): Promise<{
  rawToken: string;
  verifyUrl: string;
}> {
  const normalized = email.toLowerCase().trim();
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + VERIFY_TTL_MS);

  await db.$transaction([
    db.verificationToken.deleteMany({
      where: { identifier: normalized },
    }),
    db.verificationToken.create({
      data: {
        identifier: normalized,
        token: tokenHash,
        expires,
      },
    }),
  ]);

  const verifyUrl = `${appBaseUrl()}/verify-email?token=${rawToken}&email=${encodeURIComponent(normalized)}`;
  return { rawToken, verifyUrl };
}

export async function consumeEmailVerificationToken(
  rawToken: string,
  email: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const normalized = email.toLowerCase().trim();
  const tokenHash = hashToken(rawToken.trim());
  const now = new Date();

  const row = await db.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: normalized,
        token: tokenHash,
      },
    },
  });

  if (!row) {
    return { ok: false, error: "Invalid or expired token", status: 400 };
  }
  if (row.expires < now) {
    await db.verificationToken
      .deleteMany({
        where: { identifier: normalized, token: tokenHash },
      })
      .catch(() => undefined);
    return { ok: false, error: "Token expired", status: 400 };
  }

  await db.$transaction([
    db.user.update({
      where: { email: normalized },
      data: { emailVerified: now },
    }),
    db.verificationToken.deleteMany({
      where: { identifier: normalized },
    }),
  ]);

  return { ok: true };
}
