# V42 Part 2 — Security fixes log

## FIX BATCH 1
- Job public visibility (active-only for strangers)
- Resume storage hardening
- Admin overview rate limit

## FIX BATCH 2+3
- Redis env multi-shape support (first pass)
- Health rateLimit status + CSP Report-Only
- securityLog + admin 429 consistency

## FIX BATCH 4
- Profile API hides resumeUrl
- Account delete audit + blob cleanup
- sync helpers / forgot-password / cron

## FIX BATCH 5 (closing)
- Redis status diagnostics (`hasUrl` / `hasToken` / `source`)
- Health explains missing token vs missing url
- `.env.example` documents UPSTASH_* clearly
- `docs/REDIS_SETUP.md` ops guide
- `sanitize-text` helpers for XSS defense-in-depth

## Production follow-up (ops, not more code batches)
1. Set **both** Redis URL + TOKEN on Vercel → recheck `/api/health`
2. Optional later: enforce CSP (drop Report-Only)
3. Optional later: on-chain crypto verification

## Part 2 mandatory coding batches remaining: 0
