import { describe, expect, it, vi } from "vitest";

import {
  createSweepScheduler,
  SWEEP_INTERVAL_MS,
  type SchedulerDeps,
} from "@/lib/payment/sweep-scheduler";
import type { PaymentVerificationResult } from "@/lib/payment/verify-pending-payments";

const EMPTY_RESULT: PaymentVerificationResult = {
  checked: 0,
  confirmed: 0,
  pendingOnChain: 0,
  failed: 0,
  notFound: 0,
  unavailable: 0,
  results: [],
};

function deps(overrides: Partial<SchedulerDeps> = {}) {
  let clock = 1_000_000;
  const claimSlot = vi.fn(async () => true);
  const sweep = vi.fn(async () => EMPTY_RESULT);
  const record = vi.fn(async () => {});

  const scheduler = createSweepScheduler({
    claimSlot,
    sweep,
    record,
    now: () => clock,
    ...overrides,
  });

  return {
    scheduler,
    claimSlot,
    sweep,
    record,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe("payment sweep scheduler", () => {
  it("runs when the slot is free and records the result", async () => {
    const { scheduler, sweep, record } = deps();

    const outcome = await scheduler.run();

    expect(outcome).toEqual({ status: "ran", result: EMPTY_RESULT });
    expect(sweep).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith({ result: EMPTY_RESULT });
  });

  it("does nothing when another instance owns the interval", async () => {
    const { scheduler, sweep } = deps({ claimSlot: async () => false });

    const outcome = await scheduler.run();

    expect(outcome).toEqual({ status: "skipped", reason: "slot-taken" });
    expect(sweep).not.toHaveBeenCalled();
  });

  it("asks the database at most once a minute per instance", async () => {
    const { scheduler, claimSlot, advance } = deps();

    expect((await scheduler.run()).status).toBe("ran");
    expect(claimSlot).toHaveBeenCalledTimes(1);

    advance(5_000);
    expect(await scheduler.run()).toEqual({
      status: "skipped",
      reason: "instance-throttle",
    });
    expect(claimSlot).toHaveBeenCalledTimes(1);

    advance(60_000);
    await scheduler.run();
    expect(claimSlot).toHaveBeenCalledTimes(2);
  });

  it("never runs two sweeps at once inside one instance", async () => {
    let release: (() => void) | undefined;
    const sweep = vi.fn(
      () =>
        new Promise<PaymentVerificationResult>((resolve) => {
          release = () => resolve(EMPTY_RESULT);
        }),
    );
    const { scheduler, advance } = deps({ sweep });

    const first = scheduler.run();
    advance(120_000); // past the instance throttle, but the first run is active
    const second = await scheduler.run();

    expect(second).toEqual({ status: "skipped", reason: "busy" });
    expect(sweep).toHaveBeenCalledTimes(1);

    release?.();
    await expect(first).resolves.toEqual({ status: "ran", result: EMPTY_RESULT });
  });

  it("swallows a claim error instead of failing the request", async () => {
    const onError = vi.fn();
    const { scheduler, sweep } = deps({
      claimSlot: async () => {
        throw new Error('relation "SweepState" does not exist');
      },
      onError,
    });

    const outcome = await scheduler.run();

    expect(outcome).toEqual({ status: "skipped", reason: "slot-taken" });
    expect(sweep).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it("reports a sweep failure and records the error", async () => {
    const onError = vi.fn();
    const record = vi.fn(async () => {});
    const { scheduler } = deps({
      sweep: async () => {
        throw new Error("database unreachable");
      },
      record,
      onError,
    });

    const outcome = await scheduler.run();

    expect(outcome).toEqual({ status: "error", error: "database unreachable" });
    expect(record).toHaveBeenCalledWith({ error: "database unreachable" });
    expect(onError).toHaveBeenCalled();
  });

  it("still returns the result when recording the outcome fails", async () => {
    const { scheduler } = deps({
      record: async () => {
        throw new Error("write failed");
      },
      onError: () => {},
    });

    await expect(scheduler.run()).resolves.toEqual({
      status: "ran",
      result: EMPTY_RESULT,
    });
  });

  it("retries on the next interval after a failure", async () => {
    let attempt = 0;
    const sweep = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("boom");
      return EMPTY_RESULT;
    });
    const { scheduler, advance } = deps({ sweep, onError: () => {} });

    expect((await scheduler.run()).status).toBe("error");
    advance(SWEEP_INTERVAL_MS + 1_000);
    expect((await scheduler.run()).status).toBe("ran");
  });
});
