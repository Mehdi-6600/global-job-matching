# Production checklist — Global Job Matching

Use after every major deploy. Mark items only when verified on the live deployment.

## A. Infrastructure

- [ ] `GET /api/health` returns `"status":"ok"`
- [ ] `checks.database.status` = `ok`
- [ ] `checks.rateLimit.status` = `redis` (not memory fallback)
- [ ] `checks.payments.walletsConfigured` ≥ 1
- [ ] Env present: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `OWNER_EMAIL`
- [ ] Env present: `CRON_SECRET` (≥16 chars), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] Optional but recommended: `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`
- [ ] Crypto wallets set as used: `CRYPTO_BTC_ADDRESS`, `CRYPTO_ETH_ADDRESS`, `CRYPTO_USDT_ADDRESS`, `CRYPTO_USDC_ADDRESS`, `CRYPTO_DOGE_ADDRESS`, `CRYPTO_BNB_ADDRESS`

## B. Public pages & i18n

- [ ] `/` `/jobs` `/pricing` `/categories` `/locations` load (200)
- [ ] `/login` `/register` `/contact` `/about` `/career-risk` load
- [ ] `/robots.txt` and `/sitemap.xml` return 200
- [ ] Language switcher works (spot-check `en` + `fa` + one RTL `ar`)
- [ ] Pricing strings show in selected locale (no raw keys)

## C. Auth & account

- [ ] Register new user
- [ ] Login with email/password
- [ ] Forgot-password flow (if enabled) sends email
- [ ] Logout clears session
- [ ] Unauthenticated user hitting `/pricing` payment actions is redirected to login

## D. Job seeker flows

- [ ] Browse jobs + open job detail
- [ ] Apply to a job while logged in
- [ ] Saved jobs / job alerts respect plan limits
- [ ] Career-risk AI returns analysis (or clear offline fallback)
- [ ] Roadmap / migration endpoints respect shared AI quota

## E. Employer flows

- [ ] Create or select company
- [ ] Post job within plan limit
- [ ] See applicants only for own jobs
- [ ] Plan limit enforced on excess posts

## F. Crypto payments (PaymentIntent flow) — critical

### F1. Quote (intent)
- [ ] Logged-in user on `/pricing` can select plan + asset
- [ ] `POST /api/crypto-payment/intent` returns locked quote:
  - `id`, `expectedCryptoAmount`, `recipientAddress`, `expiresAt`, `amountUsd`, `rateUsd`
- [ ] Quote TTL ≈ 30 minutes
- [ ] Too many open intents → `TOO_MANY_INTENTS` (429)
- [ ] Rate fetch failure → `RATE_FETCH_FAILED` / `RATE_STALE` (503)

### F2. Submit
- [ ] User must send **exact** `expectedCryptoAmount` to `recipientAddress`
- [ ] `POST /api/crypto-payment` body requires `paymentIntentId` + `txHash`
- [ ] Invalid / expired / already-used intent rejected
- [ ] Duplicate `txHash` rejected (`DUPLICATE_TX`)
- [ ] On-chain failure / wrong recipient / wrong amount → `TX_FAILED_ON_CHAIN` (fail-closed)
- [ ] Pending cap (≥5) blocks new submits (`TOO_MANY_PENDING`)

### F3. Admin confirmation (fail-closed)
- [ ] Admin `PATCH /api/admin/transactions` with `status: "confirmed"`:
  - Re-runs `verifyTxOnChain` with stored `recipientAddress` + `expectedCryptoAmount`
  - Rejects if status ≠ confirmed, or recipientMatched === false, or amountMatched === false
- [ ] Only then: transaction → confirmed, PaymentIntent → confirmed, plan activated, user notified
- [ ] Reject path: transaction + intent marked rejected, user notified
- [ ] Already confirmed / rejected cannot be changed (409)

### F4. Cron
- [ ] `GET/POST /api/cron/expire-plans` requires `Authorization: Bearer <CRON_SECRET>`
- [ ] Expired paid plans downgraded to free + notification created
- [ ] Vercel cron schedule present (`15 4 * * *`)

## G. Admin

- [ ] Owner/admin can list users and transactions
- [ ] `GET /api/admin/ops` returns operational counts
- [ ] Pending payments visible when count > 0
- [ ] Security log entries written on confirm/reject

## H. Security matrix (quick pass)

| Area | Expected behaviour | Pass? |
|------|--------------------|-------|
| Auth | JWT session, no open admin routes | [ ] |
| Rate limits | 429 on abuse (crypto, auth, contact, AI) | [ ] |
| Payment quote | Locked amount + recipient before tx | [ ] |
| On-chain verify | Fail-closed (recipient + amount) | [ ] |
| Admin confirm | Re-verify on-chain before plan activate | [ ] |
| Intent state | pending → submitted → confirmed/rejected only | [ ] |
| Duplicate tx | Unique txHash enforced | [ ] |
| Plan expiry | Cron + effective plan logic | [ ] |
| AI quota | Shared pool + row lock | [ ] |
| Env secrets | No secrets in client bundle | [ ] |

## I. After checklist

- [ ] Run: `node scripts/smoke-production.mjs` (if present)
- [ ] No open P0/P1 defects for launch scope
- [ ] Manual smoke: create intent → (optional test net) submit → admin confirm → plan active

---

### Notes

- Blockchain auto-confirm is intentionally **not** enabled; admin remains final gate after on-chain checks.
- TON is disabled until a real verifier exists.
- i18n: English is source of truth; other locales deep-merge with en fallback.
