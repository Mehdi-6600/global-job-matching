# FINAL PRODUCTION AUDIT — Global Job Matching v36

**Repository:** Mehdi-6600/global-job-matching  
**Audit date:** 2026-09-07  
**Baseline reviewed:** current `main` after Batches 1–4  
**Deployment target:** Vercel + Neon Postgres  

This document reflects **verified source-code evidence** on `main`, not marketing claims.

---

## 1. Executive summary

The product has moved from a fragile multi-path MVP toward a more coherent production shape:

- Role-based owner protection and last-owner guard on account deletion
- AI quota release by exact `usageEventId` (no “latest event” race path found in src)
- Career Risk auth gate + draft restore + expanded form fields + funnel tracking hooks
- Blog HTML sanitization before `dangerouslySetInnerHTML`
- Job external fetch timeouts (`AbortController`)
- Single matching engine surface (`@/lib/matching/score`) with shims
- Login open-redirect hardening via `safeCallbackOr`
- Job view-count cookie dedupe (12h)
- Health endpoint no longer returns DB error strings to clients

**Remaining blockers for true 9.5+/10:**

1. Pricing UI still advertises “Unlimited applications” while backend enforces numeric quotas  
2. No `package-lock.json` → non-deterministic installs on CI/Vercel  
3. ESLint ignored during production builds  
4. Resume storage still uses Blob `access: "public"` (mitigated by non-exposure + auth download, not true ACL)  
5. Full application i18n is **not** proven page-by-page (message JSON trees are similar size, but hardcoded English remains in many routes)  
6. E2E / full Vitest / clean `prisma migrate deploy` on empty DB **not executed in auditor environment**  
7. Crypto payment remains **manual admin verification** (must not be marketed as on-chain verified)

---

## 2. Scores (honest)

| Area | Score /10 | Notes |
|------|-----------|--------|
| Architecture | 7.8 | Service layer growing; some legacy paths remain |
| Database / Prisma | 7.5 | Schema rich; migration cleanliness not fully proven here |
| Authentication | 8.0 | NextAuth v5, rate limits, callback sanitization on login |
| Authorization / IDOR | 7.6 | Ownership helpers exist; not every route re-audited line-by-line this pass |
| Security | 7.4 | XSS mitigated on blog; SSRF helpers added; Blob public ACL residual |
| Jobs | 8.0 | Sync + timeouts + dedupe improved |
| Companies | 7.5 | Ownership patterns present |
| Applications | 7.8 | Quotas + ownership patterns |
| Interviews | 7.2 | Not deep-retested this batch |
| Messaging | 7.0 | Not deep-retested this batch |
| Subscription / plans | 7.5 | Limits exist; **pricing copy mismatch** |
| Payments / crypto | 6.5 | Manual verification only — acceptable if labeled honestly |
| AI | 7.8 | Reserve/release by id; schema validation on career risk |
| Career Risk | 8.2 | Core product flow strong |
| Resume | 7.0 | Private *serving* path; storage ACL public on Blob 0.27 |
| Search / matching | 8.0 | Unified scoring entrypoint |
| SEO | 7.5 | sitemap/robots present |
| i18n | 6.0 | 6 locales in messages; many UI strings still hardcoded EN |
| RTL | 6.5 | Partial; not full visual QA |
| Performance | 7.0 | Not profiled in production |
| Testing | 5.5 | Unit tests exist; E2E/Playwright gate incomplete |
| Deployment | 7.0 | Builds green reported by owner; lockfile missing |
| **Overall production readiness** | **7.6 / 10** | Launchable as **limited beta** with clear payment labeling |
| **Commercial readiness** | **6.8 / 10** | Need pricing truth + ops + lockfile + monitoring |

**9.5 gate status: NOT MET**

---

## 3. P0 / P1 matrix (current)

| ID | Severity | Status | Evidence |
|----|----------|--------|----------|
| Resume public ACL | P0 residual / mitigated | OPEN (mitigated) | `access: "public"` in `src/lib/storage/resume.ts` |
| Blog XSS | P0 | CLOSED | `sanitizeBlogHtml` on blog slug page |
| Owner delete by email | P0 | CLOSED | `isOwnerRole` + last-owner transaction |
| AI release latest | P0 | CLOSED | no `releaseLatestUsageEvent` in src |
| Pricing vs limits | P1 | OPEN | pricing page still “Unlimited applications” |
| Lockfile | P1 | OPEN | no `package-lock.json` |
| ESLint in build | P1 | OPEN | `ignoreDuringBuilds: true` |
| Open redirect login | P1 | CLOSED | `safeCallbackOr` on login |
| External API hang | P1 | CLOSED | `fetchWithTimeout` |
| Dual matching engines | P1 | CLOSED (shim) | `match-score` re-exports matching/score |
| View inflation | P2 | CLOSED | cookie `jv_*` 12h |
| Health info leak | P2 | CLOSED | errors logged server-side only |

---

## 4. What was changed across v36 batches (summary)

### Security
- Account deletion: role-based OWNER + last-owner protection  
- Blog HTML sanitizer  
- Login callback path allowlist  
- SSRF helper (`url-safety`)  
- Health response sanitization  
- Job view anti-refresh inflation  

### AI / Career Risk
- Exact usage event release  
- Full form fields (country, location, education)  
- Auth gate before result  
- Draft persistence through auth  
- Funnel `trackEvent` hooks  

### Reliability
- External job provider timeouts + JSON guards + dedupe  
- Matching consolidated entry  

### Product honesty
- Plans feature copy in `plans.ts` aligned to numeric limits (**pricing page still needs the Unlimited string fix on main**)

---

## 5. Required residual actions (before claiming 9.0+)

1. **Pricing page:** change Pro feature from `Unlimited applications` → `Up to 500 applications / month` (and align Free/Business/Enterprise with `plan-limits`)  
2. Locally run `npm install` and commit **`package-lock.json`**  
3. Turn off `eslint.ignoreDuringBuilds` after clearing lint errors  
4. Upgrade `@vercel/blob` when private ACL is available; store resumes private  
5. Systematic i18n: replace hardcoded page strings; harden dictionary test from soft → fail-on-missing for critical namespaces  
6. Playwright smoke: login, career-risk gate, apply, employer post job  
7. Clean DB: `prisma migrate deploy` on empty Postgres in CI  
8. Product copy: crypto = “Manual verification within 24h” (already partly true in FAQ)

---

## 6. Verification matrix

| Test | Result |
|------|--------|
| Source audit of main | PASS |
| TypeScript / Vitest full suite | NOT RUN (auditor env) |
| ESLint production gate | FAIL (ignored in build) |
| Production build on Vercel | PASS (owner-reported green deploys) |
| E2E Playwright | NOT RUN |
| i18n completeness strict | NOT RUN / incomplete |
| Clean migration empty DB | NOT RUN |
| Security red-team live | NOT RUN (static only) |

---

## 7. Final recommendation

**Ship as private/beta launch** with:

- Honest payment labeling  
- Pricing string fix  
- Lockfile committed  

**Do not market as “9.5/10 production-hardened SaaS”** until residual P1 items and automated test gates are closed.

**Realistic score today: 7.6/10 overall production readiness.**

---

*End of audit.*
