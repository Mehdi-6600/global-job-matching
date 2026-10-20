# Crypto payment sweep — how it runs now

## The constraint

Vercel's **Hobby** plan only accepts cron jobs that run **at most once per day**.
A `*/10 * * * *` entry in `vercel.json` does not just get ignored — it fails the
whole deployment. That is what blocked every production release between
2026-10-18 and 2026-10-20 (see `docs/DB-MIGRATION-RUNBOOK.md`).

Waiting a day to confirm a customer's crypto payment is not acceptable, so the
10-minute cadence moved **into the app**, where no plan limit applies.

## How it works

```
request ──► after() ──► triggerPaymentSweep()
                          │
                          ├─ per-instance throttle (60 s, no database call)
                          ├─ atomic claim on "SweepState"  ──┐
                          │    (one winner per 10 minutes)  │ losers return
                          ├─ verifyPendingPayments()        │ immediately
                          └─ record outcome                 ┘
```

* **Drivers.** `GET /api/jobs` (the busiest public endpoint) and
  `GET /api/health` schedule the sweep with `after()`, so it runs *after* the
  response is sent and never slows a visitor down. `src/instrumentation.ts`
  also kicks it once per cold start.
* **Claim.** One SQL statement, executed by whichever instance gets there first:

  ```sql
  INSERT INTO "SweepState" ("id", "lastStartedAt", "updatedAt")
  VALUES ('verify-payments', NOW(), NOW())
  ON CONFLICT ("id") DO UPDATE
    SET "lastStartedAt" = NOW(), "updatedAt" = NOW()
    WHERE "SweepState"."lastStartedAt" < NOW() - (600000::int * INTERVAL '1 millisecond')
  RETURNING "id";
  ```

  It returns a row only for the winner. Everything else exits in microseconds.
* **Work.** `verifyPendingPayments()` (shared with the authenticated cron route)
  checks pending crypto transactions on-chain and activates the plan or features
  the job. Each confirmation is claimed with
  `updateMany({ where: { id, status: "pending" } })`, so two overlapping runs can
  never activate the same purchase twice.
* **No secrets.** Nothing to configure: no `CRON_SECRET` in GitHub, no external
  scheduler. The authenticated route still exists for manual runs and for the
  daily Vercel cron.
* **Fail-closed.** A transaction that cannot be verified on-chain stays
  `pending` for manual admin review. The sweep never rejects a payment.

## Guarantees and limits

| Property | Behaviour |
| --- | --- |
| Cadence | at most once per 10 minutes, never more often |
| Concurrency | one run at a time across all instances (database lease) |
| Traffic required | yes — the sweep is driven by requests. With zero traffic, the daily Vercel cron (05:30 UTC) is the backstop |
| Failure isolation | a failing sweep is recorded in `SweepState.lastError` and never throws into a request |
| Before the migration runs | the claim fails, the error is swallowed, requests are unaffected |
| Cost | one extra `UPDATE` per instance per minute, plus the sweep itself |

## Verifying it

```bash
curl -s https://global-job-matching.vercel.app/api/health | jq '.checks.payments.sweep'
```

```json
{
  "lastStartedAt": "2026-10-20T12:34:56.000Z",
  "lastFinishedAt": "2026-10-20T12:34:57.000Z",
  "lastError": null,
  "lastResult": { "checked": 0, "confirmed": 0, "pendingOnChain": 0, ... }
}
```

`lastFinishedAt` should stay within roughly 10–20 minutes of now. A non-null
`lastError` means the last attempt failed (usually the database).

Manual run (needs the `CRON_SECRET` that is already in Vercel):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://global-job-matching.vercel.app/api/cron/verify-payments
```

## Related files

| File | Role |
| --- | --- |
| `src/lib/payment/verify-pending-payments.ts` | the actual verification + plan activation |
| `src/lib/payment/sweep-scheduler.ts` | throttle, database lease, outcome recording |
| `src/lib/payment/sweep-scheduler.test.ts` | 8 tests: lease, throttle, single-flight, error paths |
| `src/app/api/jobs/route.ts`, `src/app/api/health/route.ts`, `src/instrumentation.ts` | drivers |
| `prisma/migrations/20261020050000_add_sweep_state/` | the lease table (idempotent) |
| `.github/workflows/verify-payments-cron.yml` | optional external backstop; a no-op unless `CRON_SECRET` is a repository secret |
