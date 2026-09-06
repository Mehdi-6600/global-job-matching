# Launch Checklist — Global Job Matching

## Environment (Vercel)

- [ ] `DATABASE_URL`
- [ ] `AUTH_SECRET` (≥ 32 chars)
- [ ] `AUTH_URL` / `NEXTAUTH_URL` = production URL
- [ ] `NEXT_PUBLIC_APP_URL` = production URL (no trailing slash)
- [ ] `OWNER_EMAIL`
- [ ] `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- [ ] `SYNC_SECRET` (≥ 32)
- [ ] `CRON_SECRET` (≥ 16)
- [ ] `BLOB_READ_WRITE_TOKEN` (resume uploads)
- [ ] Upstash KV vars (shared rate limits)
- [ ] Crypto wallet addresses: `CRYPTO_BTC_ADDRESS`, `CRYPTO_ETH_ADDRESS`, …
- [ ] Optional: `OPENROUTER_API_KEY` / `OPENAI_API_KEY`

## Post-deploy checks

1. Open `/` — home loads
2. `/jobs` — list loads
3. `/api/health` — `{ "status": "ok" }`
4. Register + login
5. Apply to a job (job seeker)
6. Employer: create company + post job
7. Pricing: wallets visible only if env set
8. Admin: confirm a pending crypto tx → plan activates
9. `/sitemap.xml` and `/robots.txt` reachable
10. Mobile navbar + RTL locale switch (if enabled)

## Cron (Vercel)

- `/api/jobs/sync` — daily (needs `SYNC_SECRET` / cron auth as implemented)
- `/api/cron/expire-plans` — daily — `Authorization: Bearer CRON_SECRET`

## Do not

- Do not use `prisma db push --accept-data-loss` in production
- Prefer `prisma migrate deploy`
- Do not commit `.env` or secrets
