# Hardening status — Global Job Matching

Last major series: PaymentIntent + fail-closed crypto + i18n parity + SEO robots fix.

## Done

### Platform baseline
- Env validation + safe Resend FROM formats
- CI scripts / workflow baseline (typecheck, lint, test)
- Unit tests: validation, roles, plan limits, location, password, crypto hash, quota key, sync normalize, HTTP helpers
- Consistent 429 via `rateLimitedResponse` on major public/auth/user APIs
- Job sync pure helpers extracted + tested
- Node engines `>=20.9.0`
- Health endpoint with database / rate-limit / wallet checks

### Payments (production-grade)
- **PaymentIntent** quote-before-tx flow (`/api/crypto-payment/intent`)
- Locked exact crypto amount + recipient + rate + TTL (~30 min)
- Submit requires `paymentIntentId` + `txHash`
- On-chain verification (Blockstream / Blockchair / EVM RPC / TronGrid) with **recipient + amount matching**
- Fail-closed: wrong amount, wrong recipient, failed tx → reject
- Duplicate `txHash` blocked
- Pending-cap protection
- Admin confirm re-runs on-chain verify before plan activation
- Intent state machine: pending → submitted → confirmed | rejected
- TON disabled until real verifier exists
- Cron `/api/cron/expire-plans` with `CRON_SECRET` + plan downgrade + notification

### AI quota
- Shared AI pool via `UsageEvent` (resume / career-risk / roadmap / migration)
- Row lock (`FOR UPDATE`) on reserve
- Distinct `UsageKind` for audit trail

### i18n
- Locales: en / es / ar / fa / hi / fr / de
- Deep-merge English fallback for missing keys
- Pricing + payment error strings covered
- RTL support for fa / ar

### SEO
- Dynamic multi-chunk sitemap (static + locations + categories + companies + blog + jobs)
- hreflang / language alternates
- JSON-LD (Organization + Website)
- `robots.ts`: private routes disallowed; single canonical `sitemap.xml`
- Open Graph / Twitter cards + metadataBase

### Docs / ops
- `docs/PRODUCTION_CHECKLIST.md` updated for Intent flow + security matrix
- `scripts/smoke-production.mjs` for public endpoint smoke

## Intentionally deferred

1. **Blockchain auto-confirm** — admin remains final gate after on-chain checks (by design)
2. **Full E2E browser tests** — not in mobile-deploy workflow
3. **`eslint.ignoreDuringBuilds: false`** — after full-repo lint is clean in CI
4. **Vercel monitoring / alerting** — commercial 10/10 needs external uptime + error tracking

## Practical readiness

**Launch-safe / beta-production** for:
- Auth + roles
- Job seeker & employer flows with plan limits
- Crypto payments with locked quotes and fail-closed verification
- Shared AI quotas
- Multi-language UI
- SEO baseline

Run after deploy:
```bash
node scripts/smoke-production.mjs
# or
BASE_URL=https://YOUR-DOMAIN node scripts/smoke-production.mjs
