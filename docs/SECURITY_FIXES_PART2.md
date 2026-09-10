# V42 Part 2 — Security fixes log

## FIX BATCH 1
- Job public visibility (active-only for strangers)
- Resume pathname entropy + host allowlist + no URL leak to client
- Admin overview rate limit

## FIX BATCH 2+3
- **Redis env bugfix**: `src/lib/redis.ts` now accepts `UPSTASH_REDIS_*` and `KV_*`
- Health reports `rateLimit.status` (`redis` | `memory`) + production warning
- CSP **Report-Only** baseline in `next.config.js` (does not break UI)
- `securityLog()` structured lines for role change, payment confirm/reject, bootstrap
- Admin transactions / users / bootstrap / jobs fetch use `rateLimitedResponse`

## Still later (optional)
- Enforce CSP (remove Report-Only) after console is clean
- On-chain crypto verification
- Persistent audit table (DB) if log drain is not enough
