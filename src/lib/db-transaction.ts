import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type TxClient = Prisma.TransactionClient;

export type InteractiveTxOptions = {
  /** Max ms to wait for a free connection from the pool (default 5s). */
  maxWait?: number;
  /** Max ms the whole interactive transaction may run (default 12s). */
  timeout?: number;
  /** Retry attempts on lock/timeout conflict (default 3). */
  retries?: number;
  /** Base delay ms for exponential backoff (default 80). */
  baseDelayMs?: number;
};

const DEFAULTS: Required<InteractiveTxOptions> = {
  maxWait: 5_000,
  timeout: 12_000,
  retries: 3,
  baseDelayMs: 80,
};

function isRetryableTxError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  const code = e.code || "";
  const msg = (e.message || "").toLowerCase();

  // Prisma serialization / write conflict
  if (code === "P2034") return true;
  // Transaction closed / timed out
  if (code === "P2028") return true;
  if (msg.includes("transaction already closed")) return true;
  if (msg.includes("transaction not found")) return true;
  if (msg.includes("could not serialize access")) return true;
  if (msg.includes("deadlock detected")) return true;
  if (msg.includes("lock timeout")) return true;
  if (msg.includes("canceling statement due to lock timeout")) return true;

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Interactive transaction with explicit timeout + retry/backoff
 * so FOR UPDATE lock contention does not hang the request forever.
 */
export async function withTransaction<T>(
  fn: (tx: TxClient) => Promise<T>,
  options?: InteractiveTxOptions
): Promise<T> {
  const opts = { ...DEFAULTS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await db.$transaction(fn, {
        maxWait: opts.maxWait,
        timeout: opts.timeout,
      });
    } catch (err) {
      lastError = err;
      if (attempt >= opts.retries || !isRetryableTxError(err)) {
        throw err;
      }
      const delay =
        opts.baseDelayMs * Math.pow(2, attempt) +
        Math.floor(Math.random() * 40);
      await sleep(delay);
    }
  }

  throw lastError;
}
