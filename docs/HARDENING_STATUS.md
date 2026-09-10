# Hardening status (V42 batches)

## Done in this series

- Env validation + safe Resend FROM formats
- CI scripts / workflow baseline
- Unit tests for validation, roles, plan limits, location, password, crypto hash, quota key, sync normalize, HTTP helpers
- Consistent 429 responses via `rateLimitedResponse` on major public/auth/user APIs:
  - contact, analytics, forgot-password, reset-password, register
  - crypto-payment, job-alerts, messages, notifications, applications, career-risk
- Job sync pure helpers extracted + tested
- Launch checklist updated (Node ≥ 20.9)

## Intentionally deferred

1. **Blockchain auto-confirm of crypto payments** — still admin-confirmed by design
2. **Full E2E browser tests** — not in this mobile-deploy workflow
3. **`eslint.ignoreDuringBuilds: false`** — only after a full-repo lint zero-error pass in CI

## Practical readiness

Site is in **launch-safe / beta-production** shape for authenticated job marketplace flows, with plan quotas, rate limits, and health checks.

True commercial 10/10 still needs deferred items above + monitoring/alerting in Vercel.
