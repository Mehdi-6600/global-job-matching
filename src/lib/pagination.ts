/**
 * Shared list-limit helpers for API routes.
 * Keeps user-controlled limits bounded to protect DB/memory.
 */

export type ListLimitOptions = {
  /** Default when param missing */
  defaultLimit?: number;
  /** Hard ceiling */
  maxLimit?: number;
  /** Floor */
  minLimit?: number;
};

/**
 * Parse `limit` from URLSearchParams (or raw string).
 * Returns a clamped integer in [min, max].
 */
export function parseListLimit(
  raw: string | null | undefined,
  options: ListLimitOptions = {}
): number {
  const minLimit = options.minLimit ?? 1;
  const maxLimit = options.maxLimit ?? 100;
  const defaultLimit = options.defaultLimit ?? 50;

  if (raw == null || String(raw).trim() === "") {
    return clamp(defaultLimit, minLimit, maxLimit);
  }

  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n)) {
    return clamp(defaultLimit, minLimit, maxLimit);
  }
  return clamp(n, minLimit, maxLimit);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Common presets */
export const LIST_LIMITS = {
  userList: { defaultLimit: 50, maxLimit: 100, minLimit: 1 },
  adminList: { defaultLimit: 50, maxLimit: 100, minLimit: 1 },
  messagesThread: { defaultLimit: 100, maxLimit: 200, minLimit: 1 },
  messagesInbox: { defaultLimit: 100, maxLimit: 200, minLimit: 1 },
} as const;
