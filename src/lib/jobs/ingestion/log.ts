/**
 * Structured logging for ingestion.
 *
 * Goals:
 *  - One shape for every event (level + event + JSON fields).
 *  - Never log secrets, tokens, cookies, or auth headers.
 *  - Truncate long strings to keep log lines bounded.
 *  - Safe to call from anywhere in ingestion; never throws.
 *
 * Output format is a single console line so it works with Vercel Logs
 * and log drains without a JSON parser setup.
 */

export type IngestionLogLevel = "info" | "warn" | "error";

/**
 * Fields permitted in log output. Values are stringified safely.
 * Keep this list narrow — only diagnostics, never business PII.
 */
export type IngestionLogFields = {
  sourceKey?: string;
  runId?: string;
  page?: number;
  durationMs?: number;
  fetched?: number;
  created?: number;
  updated?: number;
  duplicates?: number;
  skipped?: number;
  qualityRejected?: number;
  failed?: number;
  reason?: string;
  error?: string;
  status?: string;
  [key: string]: unknown;
};

const MAX_FIELD_LEN = 240;

/** Keys whose values must never be logged, even if a caller passes them. */
const FORBIDDEN_KEYS = new Set([
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "secret",
  "apiKey",
  "apikey",
  "auth",
]);

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function safeString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.slice(0, MAX_FIELD_LEN);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v).slice(0, MAX_FIELD_LEN);
  } catch {
    return "[unserializable]";
  }
}

/**
 * Strip forbidden keys, truncate values, and drop nullish/empty fields
 * so the log line stays compact.
 */
function sanitizeFields(
  fields: IngestionLogFields | undefined,
): Record<string, string> {
  if (!fields || !isPlainRecord(fields)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (FORBIDDEN_KEYS.has(k.toLowerCase())) continue;
    if (v === null || v === undefined) continue;
    const s = safeString(v);
    if (s === "") continue;
    out[k] = s;
  }
  return out;
}

/**
 * Emit a single structured log line.
 *
 * Never throws — logging must never break ingestion.
 */
export function logIngestionEvent(
  level: IngestionLogLevel,
  event: string,
  fields?: IngestionLogFields,
): void {
  try {
    const safe = sanitizeFields(fields);
    const payload = { event, ...safe };
    const line = `[ingestion] ${JSON.stringify(payload)}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
  } catch {
    // never throw from logging
  }
}
