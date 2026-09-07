# Launch Checklist — Global Job Matching

## Environment (Vercel → Settings → Environment Variables)

- [ ] `DATABASE_URL`
- [ ] `AUTH_SECRET` (≥ 32 chars)
- [ ] `AUTH_URL` = production URL (no trailing slash)
- [ ] `NEXT_PUBLIC_APP_URL` = production URL (no trailing slash)
- [ ] `OWNER_EMAIL`
- [ ] `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- [ ] `SYNC_SECRET` (≥ 32)
- [ ] `CRON_SECRET` (≥ 16)
- [ ] `BLOB_READ_WRITE_TOKEN` (resume uploads)
- [ ] Upstash / KV (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` or Vercel KV)
- [ ] Crypto wallets: `CRYPTO_BTC_ADDRESS`, `CRYPTO_ETH_ADDRESS`, `CRYPTO_USDT_ADDRESS`, …
- [ ] Optional AI: `OPENROUTER_API_KEY` or `OPENAI_API_KEY`
- [ ] Node.js **24.x** in Project Settings

## Automated endpoints

1. [ ] `GET /api/health` → `"status":"ok"` and `checks.database.status":"ok"`
2. [ ] `GET /sitemap.xml` → opens (not HTML error page)
3. [ ] `GET /robots.txt` → lists Disallow + Sitemap URL
4. [ ] Cron paths exist: `/api/jobs/sync`, `/api/cron/expire-plans`

## Manual smoke (one pass)

1. [ ] Home `/` loads
2. [ ] `/jobs` lists jobs
3. [ ] Register + verify email (if Resend set) + login
4. [ ] Job seeker: complete profile + apply to a job
5. [ ] Upload resume (needs Blob token) + download via `/api/profile/resume/download`
6. [ ] `/career-risk` analysis works (auth required)
7. [ ] Employer: company + post job (plan limit respected)
8. [ ] `/pricing` → submit crypto tx (pending)
9. [ ] Admin: confirm pending tx → `/api/me/plan` shows paid plan + expiry
10. [ ] Locale switch + mobile nav OK
11. [ ] Logout / session still valid after refresh

## Security sanity

- [ ] `/api/jobs/fetch` returns 403 for non-admin
- [ ] `/api/seed` returns 403 in production
- [ ] Account delete requires `{ "confirm": "DELETE" }`
- [ ] Application status change only by employer/admin

## Go / No-go

- [ ] Build green on `main`
- [ ] Health OK for 10+ minutes
- [ ] No P0 in production logs
