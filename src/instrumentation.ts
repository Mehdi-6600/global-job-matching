/**
 * Next.js server instrumentation.
 *
 * Runs once per server instance start (every cold start on Vercel). Two jobs:
 *
 *  1. Kick the crypto payment sweep. The Hobby plan only allows daily cron
 *     jobs, so the 10-minute sweep cannot live in vercel.json. It is driven by
 *     ordinary requests (see src/lib/payment/sweep-scheduler.ts); this gives a
 *     fresh instance a chance to run it even before the first request lands.
 *
 *  2. Surface misconfiguration early in the logs without printing secrets.
 *
 * Everything here is best-effort: a failure must never stop the server from
 * starting, so every path is wrapped and nothing is awaited.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const missing = ["DATABASE_URL", "AUTH_SECRET"].filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missing.length > 0) {
    console.error(
      `[startup] missing required environment variables: ${missing.join(", ")}`,
    );
  }

  try {
    const { triggerPaymentSweep } = await import(
      "@/lib/payment/sweep-scheduler"
    );
    void triggerPaymentSweep();
  } catch (error) {
    console.error("[startup] payment sweep kick failed:", error);
  }
}
