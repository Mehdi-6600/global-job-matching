# Audit status — Cloud follow-up

Date: 2026-09

## Done

- Locale files `ar` / `es` / `fr` / `hi` aligned to **193 keys** (same structure as `en`)
- `getDictionary` deep-merge with English fallback for missing keys
- Dead code `src/lib/jobs/job-apis.ts` removed
- `getRequestIp` used on critical routes (crypto payment, auth, contact, etc.) instead of raw `x-forwarded-for` alone
- Crypto payment: `isPlausibleTxHash` shape check before creating pending transaction
- Unit tests: subscription, client-ip, plan-limits, verify-crypto
- `plan-limits.ts` restored as real module (not overwritten by test file)

## Open / next

- Migrate remaining non-critical API routes to `getRequestIp`
- Optional real on-chain explorer verification (`CRYPTO_EXPLORER_API_KEY`)
- Broader `t()` wiring on employer/admin UI pages
- Integration tests for concurrent job create (row lock path)
- Keep root `AUDIT_REPORT.md` outdated notes from being treated as source of truth

## Notes

- Do **not** paste test file content into `src/lib/plan-limits.ts`
- Tests live in `*.test.ts` next to the module (or under `src/lib/payment/` for crypto helpers)
- Prefer `prisma generate && next build` on Vercel; avoid destructive `db push --accept-data-loss`
