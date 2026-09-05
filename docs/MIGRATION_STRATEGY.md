# Migration Strategy — global-job-matching

## Source of truth
- `prisma/schema.prisma` — application schema
- `prisma/migrations/` — ordered SQL history for `prisma migrate deploy`

## History layout
1. **Pre-baseline (20260824–20260825)** — legacy incremental steps.  
   These are now **idempotent** and skip work when tables do not exist yet.
2. **`20260902090000_production_baseline`** — full idempotent schema for fresh and legacy DBs.
3. **Post-baseline (20260904+)** — forward-only columns (plan dates, sessionVersion, Decimal amount).
4. **`20260905120000_ensure_integrity`** — safety net for missing columns/indexes.

## Production (Vercel + Neon)
Build script:
```bash
prisma migrate deploy && prisma generate && next build
