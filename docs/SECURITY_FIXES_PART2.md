# V42 Part 2 — Security fixes log

## FIX BATCH 1
- Job public visibility (active-only for strangers)
- Resume pathname entropy + host allowlist + no URL leak from resume API
- Admin overview rate limit

## FIX BATCH 2+3
- Redis env supports UPSTASH_* and KV_*
- Health rateLimit backend status + production warning
- CSP Report-Only
- securityLog for admin role/payment/bootstrap
- Admin transactions/users/bootstrap + jobs fetch 429 headers

## FIX BATCH 4
- **Profile API no longer returns `resumeUrl`** (only hasResume + downloadPath)
- Account delete: rateLimitedResponse, securityLog, blob cleanup
- jobs/sync uses pure sync-normalize helpers
- forgot-password: no reset URL in production logs; consistent 429
- cron expire-plans: securityLog `plan.expire`
- seed remains production-blocked

## Optional later
- Enforce CSP (drop Report-Only) after monitoring
- On-chain crypto verification
- DB-backed audit table
