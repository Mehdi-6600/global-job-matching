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

/* ------------------------------------------------------------------ */
/* Password reset                                                      */
/* ------------------------------------------------------------------ */

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
 * Validate a reset token WITHOUT consuming it.
 * Use with resetPasswordWithToken so consume + password update are atomic.
 */
export async function peekPasswordResetToken(rawToken: string): Promise<
  | { ok: true; email: string; tokenHash: string; identifier: string }
  | { ok: false; error: string; errorCode: "INVALID" | "EXPIRED"; status: number }
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
    return {
      ok: false,
      error: "Invalid or expired token",
      errorCode: "INVALID",
      status: 400,
    };
  }

  const email = row.identifier.replace(/^pw-reset:/, "");
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      error: "Invalid or expired token",
      errorCode: "INVALID",
      status: 400,
    };
  }

  return { ok: true, email, tokenHash, identifier: row.identifier };
}

/**
 * @deprecated Prefer peekPasswordResetToken + transactional delete after password update.
 * Kept for compatibility: validates then deletes (same race window as before).
 */
export async function consumePasswordResetToken(rawToken: string): Promise<
  | { ok: true; email: string; tokenHash: string }
  | { ok: false; error:ashboard string; errorCode:", "INVALID" | "EXPIRED"; " status: number }
Dashboard> {
  const peeked = await peek")PasswordResetToken(rawToken);
  if (!peeked.ok) return peeked;

  const deleted = await db.verificationToken.deleteMany({
    where: {
      identifier: peeked.identifier,
      token: peeked.tokenHash,
    },
  });

  if (deleted.count !== 1) {
    return {
      ok: false,
      error: "Token already used",
      errorCode: "INVALID",
      status: 400,
    };
  }

  return { ok: true, email: peeked.email, tokenHash: peeked.tokenHash };
}

export async function markPasswordResetUsed(tokenHash: string): Promise<void> {
  await db.verificationToken.deleteMany({
    where: {
      token: tokenHash,
      identifier: { startsWith: "pw-reset:" },
    },
  });
}

/* ------------------------------------------------------------------ */
/* Email verification                                                  */
/* ------------------------------------------------------------------ */

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

  const verifyUrl = `${appBaseUrl()}/verify-email?token=${rawToken}&email=${encodeURIComponent(
    normalized,
  )}`;
  return { rawToken, verifyUrl };
}

/**
 * Consume an email verification token.
 *
 * Uses `updateMany` (not `update`) so that if the user's email was
 * changed after the token was issued, we do NOT crash with P2025 —
 * we simply fail closed ("Invalid or expired token").
 *
 * When the update count is 0 (email no longer matches any user),
 * we delete the orphan token row and return invalid.
 *
 * `errorCode` is a stable i18n-agnostic identifier the UI can map to a
 * localized message; `error` is kept as an English fallback for logs and
 * legacy callers that still surface the raw string.
 */
export async function consumeEmailVerificationToken(
  rawToken: string,
  email: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error: string;
      errorCode: "INVALID" | "EXPIRED" | "UNKNOWN";
      status: number;
    }
> {
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
    return {
      ok: false,
      error: "Invalid or expired token",
      errorCode: "INVALID",
      status: 400,
    };
  }

  if (row.expires < now) {
    await db.verificationToken
      .deleteMany({
        where: { identifier: normalized, token: tokenHash },
      })
      .catch(() => undefined);
    return {
      ok: false,
      error: "Token expired",
      errorCode: "EXPIRED",
      status: 400,
    };
  }

  // RC21: use updateMany to fail closed if the email was reassigned.
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { email: normalized },
      data: { emailVerified: now },
    });

    // Always clean up the consumed token, even on failure.
    await tx.verificationToken.deleteMany({
      where: { identifier: normalized },
    });

    return updated.count;
  });

  if (result === 0) {
    return {
      ok: false,
      error: "Invalid or expired token",
      errorCode: "INVALID",
      status: 400,
    };
  }

  return { ok: true };
}
