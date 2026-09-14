# Production checklist — Global Job Matching

Use after every major deploy. Mark items only when verified.

## A. Infrastructure

- [ ] `https://YOUR-DOMAIN/api/health` returns `"status":"ok"`
- [ ] `checks.database.status` = `ok`
- [ ] `checks.rateLimit.status` = `redis` (not memory)
- [ ] `checks.payments.walletsConfigured` ≥ 1
- [ ] Env: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `OWNER_EMAIL`
- [ ] Env: `RESEND_API_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`
- [ ] Env: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- [ ] Crypto wallets: `CRYPTO_BTC`, `CRYPTO_ETH`, `CRYPTO_USDT`, etc. as used

## B. Public pages

- [ ] `/` `/jobs` `/pricing` `/categories` `/locations` load
- [ ] `/login` `/register` `/contact` `/about` `/career-risk` load
- [ ] `/robots.txt` and `/sitemap.xml` return 200
- [ ] Language switcher changes UI strings (spot-check fa + en)

## C. Auth & account

- [ ] Register new user + verify email (if enabled)
- [ ] Login with email/password
- [ ] Forgot password email arrives
- [ ] Logout works

## D. Job seeker

- [ ] Browse jobs + open job detail
- [ ] Apply to a job (logged in)
- [ ] Profile / resume upload path works
- [ ] Career risk AI returns a real analysis (not offline stub)

## E. Employer

- [ ] Create/select company
- [ ] Post job within plan limit
- [ ] See applicants for own job only

## F. Payments

- [ ] Logged-in user opens `/pricing`, sees wallets
- [ ] Submit valid tx hash → pending (or confirmed path per policy)
- [ ] Failed on-chain tx is rejected (`TX_FAILED_ON_CHAIN`)
- [ ] Duplicate hash rejected
- [ ] Admin confirms pending → plan activates
- [ ] Cron `/api/cron/expire-plans` authorized with `CRON_SECRET`

## G. Admin

- [ ] Owner/admin can open admin users/transactions
- [ ] `GET /api/admin/ops` returns counts (admin session)
- [ ] Pending payment attention message when count > 0

## H. After checklist

- [ ] Run: `node scripts/smoke-production.mjs`
- [ ] No open P0/P1 defects for launch scope
