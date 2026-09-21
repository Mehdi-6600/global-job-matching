import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * RESEND_FROM_EMAIL accepts plain emails and "Name <email@domain>" forms.
 * Pure z.string().email() rejects display-name addresses used by Resend.
 */
const resendFromSchema = z
  .string()
  .min(3)
  .refine((v) => /@/.test(v), { message: "Invalid Resend from address" });

const optionalNonEmpty = z.string().min(1).optional();

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z.string().url().optional(),

    /**
     * Google OAuth.
     * Both must be set together, or both must be unset.
     * If unset, the Google provider is removed from Auth.js
     * (and the login page hides the Google button — see LoginPage).
     */
    GOOGLE_CLIENT_ID: optionalNonEmpty,
    GOOGLE_CLIENT_SECRET: optionalNonEmpty,

    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: resendFromSchema.optional(),

    KV_URL: z.string().url().optional(),
    KV_REST_API_TOKEN: z.string().optional(),
    KV_REST_API_READ_ONLY_TOKEN: z.string().optional(),

    OWNER_EMAIL: z.string().email(),
    SYNC_SECRET: z.string().min(32),

    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENROUTER_API_KEY: z.string().min(1).optional(),

    CRON_SECRET: z.string().min(16).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),

    /**
     * Public flag mirror: when "1", the login page renders the Google
     * button. Set this in env alongside GOOGLE_CLIENT_ID/SECRET.
     * Kept separate from the secret ID to avoid exposing it to the client.
     */
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: z
      .enum(["0", "1"])
      .optional()
      .default("0"),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,

    KV_URL: process.env.KV_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN,

    OWNER_EMAIL: process.env.OWNER_EMAIL,
    SYNC_SECRET: process.env.SYNC_SECRET,

    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,

    CRON_SECRET: process.env.CRON_SECRET,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,

    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED:
      process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED,
  },

  /**
   * Cross-field: Google ID and Secret must be set together.
   * Prevents the "button visible but provider missing" failure mode.
   */
  onValidationError: (issues) => {
    const messages = issues
      .map((i) => `[${i.path?.join(".") || "env"}] ${i.message}`)
      .join("\n");
    throw new Error(`❌ Invalid environment variables:\n${messages}`);
  },

  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  emptyStringAsUndefined: true,
});

/* ------------------------------------------------------------------ */
/* Cross-field checks (run once at import time)                        */
/* ------------------------------------------------------------------ */

const hasGoogleId = Boolean(env.GOOGLE_CLIENT_ID);
const hasGoogleSecret = Boolean(env.GOOGLE_CLIENT_SECRET);

if (hasGoogleId !== hasGoogleSecret) {
  throw new Error(
    "❌ GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together, or both unset."
  );
}

/**
 * If secrets are present, require the public flag to be "1" so the UI
 * shows the button. If secrets are missing, force the flag to "0".
 * We never throw here for the mismatch — we just compute the effective
 * value and let auth.ts hide the provider. The UI reads the public flag.
 */
export const googleAuthConfigured = hasGoogleId && hasGoogleSecret;

export function isGoogleLoginEnabled(): boolean {
  return googleAuthConfigured && env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1";
}
