# V42 Part 2 — Security fixes log

## FIX BATCH 1 (applied)

### P1 — Job detail IDOR / draft leak
- Added `src/lib/jobs/public-visibility.ts`
- `GET /api/jobs/[id]` only returns non-`active` jobs to poster, company owner, or admin
- Strangers receive `404` (same as missing)
- `company.ownerId` stripped from JSON response

### P1 — Resume storage hardening
- Longer pathname nonce (32 bytes)
- Host allowlist on server-side blob fetch
- Never return raw blob URL from API
- Clearer INVALID_PDF handling
- Magic-byte + size checks retained

### P2 — Admin overview rate limit
- `GET /api/admin` uses `adminRatelimit` + `rateLimitedResponse`

## Remaining (next batches)
- CSP (careful, gradual)
- Redis required in production (document / health warn)
- Optional on-chain crypto verification (product decision)
- Structured audit log for admin payment confirms
