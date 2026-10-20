import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import {
  verifyPendingPayments,
  type PaymentVerificationResult,
} from "@/lib/payment/verify-pending-payments";

/**
 * Runs the crypto payment sweep at most once per interval, without Vercel cron.
 *
 * Why this exists: the Hobby plan only allows cron jobs that run once per day,
 * and a sub-daily expression makes every deployment fail (that outage is
 * documented in docs/DB-MIGRATION-RUNBOOK.md). Waiting a day to confirm a
 * customer's payment is not acceptable, so the sweep rides along with normal
 * traffic instead:
 *
 *   1. A request handler calls `triggerPaymentSweep()` (fire-and-forget).
 *   2. A per-instance throttle keeps it to one database round trip a minute.
 *   3. The instance claims the slot with a single atomic UPDATE on "SweepState".
 *      Exactly one instance wins per interval; everyone else returns instantly.
 *   4. The winner runs the sweep and records the outcome.
 *
 * Properties:
 *   - No secret is involved, so nothing new to configure.
 *   - No table row = the sweep is skipped (a database that has not run the
 *     migration cannot be made slower or less reliable by this code).
 *   - Idempotent: `verifyPendingPayments` claims each transaction with an
 *     updateMany on `status: "pending"`, so two overlapping runs cannot both
 *     activate a plan.
 */

export const SWEEP_ID = "verify-payments";

/** The intended cadence: 10 minutes, matching the old GitHub Actions sweep. */
export const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/** Don't even ask the database more than once a minute per instance. */
const INSTANCE_THROTTLE_MS = 60 * 1000;

export type SweepOutcome =
  | { status: "ran"; result: PaymentVerificationResult }
  | { status: "skipped"; reason: "instance-throttle" | "busy" | "slot-taken" }
  | { status: "error"; error: string };

export type SchedulerDeps = {
  /** Atomically reserves the interval. True only for the winner. */
  claimSlot: (intervalMs: number) => Promise<boolean>;
  /** Performs the actual work. */
  sweep: () => Promise<PaymentVerificationResult>;
  /** Persists the outcome (best effort). */
  record: (
    outcome: { result?: PaymentVerificationResult; error?: string },
  ) => Promise<void>;
  now?: () => number;
  intervalMs?: number;
  instanceThrottleMs?: number;
  onError?: (error: unknown) => void;
};

export type SweepScheduler = {
  run: () => Promise<SweepOutcome>;
  /** Test seam: forget the per-instance throttle and any in-flight run. */
  reset: () => void;
};

export function createSweepScheduler(deps: SchedulerDeps): SweepScheduler {
  const now = deps.now ?? Date.now;
  const intervalMs = deps.intervalMs ?? SWEEP_INTERVAL_MS;
  const throttleMs = deps.instanceThrottleMs ?? INSTANCE_THROTTLE_MS;
  const onError =
    deps.onError ??
    ((error: unknown) => {
      console.error("[payment-sweep] failed:", error);
    });

  let lastCheck = 0;
  let inFlight = false;

  const run = async (): Promise<SweepOutcome> => {
    const startedAt = now();

    if (inFlight) return { status: "skipped", reason: "busy" };
    if (startedAt - lastCheck < throttleMs) {
      return { status: "skipped", reason: "instance-throttle" };
    }
    lastCheck = startedAt;

    inFlight = true;
    try {
      let claimed = false;
      try {
        claimed = await deps.claimSlot(intervalMs);
      } catch (error) {
        // Missing table / database hiccup: do not retry on every request.
        onError(error);
        return { status: "skipped", reason: "slot-taken" };
      }
      if (!claimed) return { status: "skipped", reason: "slot-taken" };

      const result = await deps.sweep();
      try {
        await deps.record({ result });
      } catch (error) {
        onError(error);
      }
      return { status: "ran", result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onError(error);
      try {
        await deps.record({ error: message });
      } catch {
        /* recording is best effort */
      }
      return { status: "error", error: message };
    } finally {
      inFlight = false;
    }
  };

  return {
    run,
    reset: () => {
      lastCheck = 0;
      inFlight = false;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Production wiring                                                   */
/* ------------------------------------------------------------------ */

async function claimSlot(intervalMs: number): Promise<boolean> {
  // One statement, so the claim is atomic across instances:
  //   - first ever call inserts the row and wins
  //   - later calls update it only when the previous run is old enough
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "SweepState" ("id", "lastStartedAt", "updatedAt")
    VALUES (${SWEEP_ID}, NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE
      SET "lastStartedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "SweepState"."lastStartedAt" < NOW() - (${intervalMs}::int * INTERVAL '1 millisecond')
    RETURNING "id"
  `;
  return rows.length > 0;
}

async function recordOutcome(outcome: {
  result?: PaymentVerificationResult;
  error?: string;
}): Promise<void> {
  await db.sweepState.update({
    where: { id: SWEEP_ID },
    data: {
      lastFinishedAt: new Date(),
      lastResult: outcome.result
        ? (outcome.result as unknown as Prisma.InputJsonValue)
        : undefined,
      lastError: outcome.error ?? null,
    },
  });
}

export const paymentSweepScheduler = createSweepScheduler({
  claimSlot,
  sweep: () => verifyPendingPayments(),
  record: recordOutcome,
});

/**
 * Fire-and-forget entry point for request handlers.
 *
 * Never throws and never rejects, so it is safe to call without `await`.
 * Callers that want the work to survive the response should wrap it in
 * `after()` from `next/server`.
 */
export function triggerPaymentSweep(): Promise<SweepOutcome> {
  return paymentSweepScheduler.run().catch((error) => {
    console.error("[payment-sweep] unexpected:", error);
    return { status: "error", error: "unexpected" } as SweepOutcome;
  });
}

/** Reads the last run for diagnostics (admin / health output). */
export async function getSweepStatus(): Promise<{
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastError: string | null;
  lastResult: unknown;
} | null> {
  try {
    const row = await db.sweepState.findUnique({ where: { id: SWEEP_ID } });
    if (!row) return null;
    return {
      lastStartedAt: row.lastStartedAt.toISOString(),
      lastFinishedAt: row.lastFinishedAt?.toISOString() ?? null,
      lastError: row.lastError,
      lastResult: row.lastResult,
    };
  } catch {
    return null;
  }
}
