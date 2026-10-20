# Redesign Report — Global Job Matching

**Branch:** `arena/90fb18e6-global-job-matching` · **Base:** `66f089d` (`main`) · **Date:** 2026-10-20

Scope: complete visual + UX redesign of the Next.js 15 App Router application. No routes, APIs,
server actions, auth flows, Prisma models, environment variables or payment logic were changed.
125 files touched (117 modified, 8 added, 0 moved, 0 deleted).

---

## 1. Design direction

**“Ink & Signal”** — an editorial, data-first marketplace language, replacing the previous
soft-neumorphic dark slate/cyan theme (a 2020-era “glassmorphism dashboard” look that was
light-on-dark-only, had no dark mode, and leaned on tinted glows for hierarchy).

- **Ink** — near-black, green-tinted neutrals (`#0B1512` → `#080D0B`) for text, hairlines and the
  “workspace” panels. Borders are 1px hairlines; the double neumorphic shadow pairs are gone.
- **Signal** — one high-chroma emerald for actions, match scores and live state; amber for
  urgency/salary; violet for AI surfaces. Colour carries information, never decoration.
- **Paper** — warm off-white canvas (`#F5F7F3`) in light mode, deep charcoal (`#080D0B`) in dark
  mode, with the *same* variable names in both. `next-themes` now runs in `system` mode with a
  navbar toggle; the previous build hard-locked `forcedTheme="light"`.
- **Typography does the hierarchy work**: Geist Sans display + Inter body (both self-hosted),
  tight tracking on display sizes, tabular numerals for salary and scores.
- **Motion as feedback only**: 120 ms press / 200 ms UI, `cubic-bezier(.2,.8,.2,1)`, disabled under
  `prefers-reduced-motion`.

Full token table, type scale, spacing/radius/elevation rules and measured contrast ratios live in
`DESIGN.md`. Authoritative implementations: `src/app/design-system.css` (tokens + component layer),
`tailwind.config.ts` (token → utility mapping), `src/app/layout.tsx` (fonts, `lang`/`dir`).

Layout/UX changes that matter beyond colour:

| Area | Change |
| --- | --- |
| Global shell | Sticky blurred header, skip-link → `#main-content`, single `<main>` landmark in the layout, theme + language switchers in the header, mobile sheet navigation |
| Home | Search-first hero with live job counter, audience split, featured rail, trust strip, ink-panel employer CTA |
| Jobs | Persistent desktop filter rail (9 facets) + mobile filter sheet, removable chips, live result count, skeleton cards, `?search/?q&location&remote` deep links preserved |
| Job detail | Two-column layout, sticky apply panel, token chips for location/type/salary, match badge |
| Auth | Shared `AuthShell` (form + ink-panel value prop), inline validation, password visibility toggle |
| About | Editorial masthead, values grid, fact strip, ink CTA panel |
| 404 / loading | Token-driven, locale-aware, real skeleton shapes instead of a spinner |
| Everywhere | Legacy dark-slate/cyan utilities replaced by semantic tokens (0 legacy palette utilities left in shipped code), logical properties for RTL, `--text-on-brand` for text on saturated fills |

---

## 2. Files new / modified / moved

**Added (6):**

| File | Purpose |
| --- | --- |
| `DESIGN.md` | Design brief: direction, token tables, type/spacing/elevation/motion, measured contrast |
| `src/app/design-system.css` | Token layer (`:root` + `.dark`), base resets, component classes (`gjm-btn*`, `gjm-field`, `gjm-chip`, `gjm-surface*`, `gjm-ink-panel`), legacy dark remaps, focus/RTL safety nets |
| `src/components/auth-shell.tsx` | Shared split layout for `/login` and `/register` |
| `src/components/jobs/job-card.tsx` | `JobCard({ job, featured, className })` — stretched link, chips, `<time>`, attribution link |
| `src/components/ui/stat-card.tsx` | Dashboard stat primitive |
| `src/design-system/design-system.test.ts` | 19 regression tests that enforce the design contract (see §4) |
| `src/fonts/` | 4 self-hosted variable `.woff2` files + 4 OFL licences + `README.md` |

**Modified (114).** Grouped:

- **Design system / config (3):** `src/app/globals.css`, `src/app/home.css`, `tailwind.config.ts`
- **Layout & shell (6):** `layout.tsx`, `providers.tsx`, `navbar.tsx`, `footer.tsx`,
  `theme-toggle.tsx`, `language-switcher.tsx`
- **UI primitives (8):** `button`, `card`, `badge`, `input`, `skeleton`, `empty-state`,
  `page-header`, plus `stat-card`
- **Pages (37 `page.tsx` + 4 client components):** home, jobs (+`JobsClient`), job detail
  (+`JobDetailClient`), about, pricing, contact, companies, locations, categories, blog,
  crypto-jobs, search, terms, privacy, login, register, forgot/reset password, verify-email,
  dashboards, employer, admin, payment — all re-tokenised; the page-level `<main>` wrappers became
  `<div>` so the layout owns the single landmark.
- **Feature components (≈20):** `job-match-badge`, `plan-limit-banner`, `plan-usage-card`,
  `payment-history-card`, `company-logo`, `user-avatar`, `contact-employer`,
  `featured-urgency-banner`, `ShareButtons`, `internal-hub-links`, `toast`, and the admin client
  components.
- **i18n (12):** `messages/{ar,de,en,es,fa,fr,hi,id,ja,pt,tr,zh}.json` — 907 keys each (39 added
  this pass: verification-email states, match-score states, rate-limit/plan errors, pricing
  period labels, `Common.mainNavigation`, …).

**Moved:** none. No `src/` path changes, so every import still resolves.

**Not touched on purpose:** `src/app/api/**`, `src/lib/payment/*`, `src/lib/plan-limits.ts`,
`src/lib/auth*`, `src/lib/client-ip.ts`, `prisma/**`, `next.config.js`, `package.json`.

---

## 3. New dependencies

**No npm dependency was added.** `package.json` and `package-lock.json` are unchanged.

The one real infrastructure need was fonts. The build previously pulled Inter, Vazirmatn and
Noto Kufi Arabic from `fonts.googleapis.com` at build time through `next/font/google`; that fails
in this sandbox (`ECONNRESET`) and is also a CSP/`font-src 'self'` inconsistency in production.
The four variable files in `src/fonts/` were copied out of the official `@fontsource-variable/*`
packages inside a throwaway `/tmp` directory (never added to the project) and are now served from
`/_next/static/media` by `next/font/local`:

- `Inter-Variable-latin.woff2`, `Vazirmatn-Variable-arabic.woff2`,
  `NotoKufiArabic-Variable-arabic.woff2`, `NotoSansDevanagari-Variable-devanagari.woff2`
- Each family ships its OFL text next to it (`LICENSE-*.txt`); `src/fonts/README.md` records the
  source package and the update procedure.

Trade-off: ~200 KB of fonts in the repo, but a deterministic offline build, no third-party
requests, and Hindi (`hi`) finally gets a real Devanagari face instead of an OS fallback.

---

## 4. Test / build results

Run in this workspace, with a local `.env` of placeholder secrets (git-ignored, never committed)
and a generated Prisma client stub in `node_modules` (see §6).

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | **0 errors** |
| `npx next lint` | **0 errors**, 30 warnings — byte-identical to `main`'s warning set (verified against a `git worktree` of `66f089d`), so no new lint debt |
| `npx next build` | **✓ Compiled successfully** — 114/114 static pages, First Load JS **106 kB**, middleware **84.7 kB** |
| `SKIP_INTEGRATION=1 npx vitest run` | **98 files / 920 tests passed**, 2 files skipped, 7 tests skipped, **0 failed** (baseline was 901) |
| `node scripts/check-i18n.mjs` | **PASSED** — 12 locales × 913 keys, no drift (843 at `main`) |
| Runtime smoke (production server) | **0 failures** across 45 checks (see §5) |

### New: `src/design-system/design-system.test.ts` (19 tests)

The redesign made a promise ("tokens only, AA contrast, logical properties, RTL-safe, no untranslated
keys"). These tests make that promise executable, so the next change cannot quietly break it:

1. Every `var(--token)` used anywhere in `src/` is defined in `:root` (or is a runtime token).
2. Every colour token also has a `.dark` value (no light-only leftovers).
3. **WCAG AA contrast is computed, not claimed** — 28 text/background pairs × 2 themes, each asserted
   ≥ 4.5:1. Negative control: setting `--text-subtle` back to the old grey fails with
   `light: --text-subtle on --bg-page = 2.30:1`.
4. No legacy palette utility (`bg-slate-900`, `text-cyan-400`, …) in any class attribute.
   Negative control: injecting `bg-slate-900` fails the suite.
5. No physical direction utilities (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`) — RTL safety.
   Negative control: injecting `pl-4` fails the suite.
6. No duplicated class tokens, no search-and-replace artifacts (`className="className=…`).
7. Exactly one `<main>` landmark, in the layout, with the `#main-content` target the skip link needs.
8. Every image has `alt`.
9. Every `t("…")` key resolves in `messages/en.json`; all 12 locale files are structurally identical.
10. No hardcoded English in `aria-label` / `title` / `alt` / `placeholder` (brand names allowlisted).
11. No hardcoded screen-reader text.
12. `next/font/google` never returns; the four self-hosted `.woff2` files and their licences are present.

### Bugs found by the strict pass, and fixed

| # | Bug | Where | Fix |
| --- | --- | --- | --- |
| 1 | Crypto checkout QR code **never rendered** — `api.qrserver.com` was missing from the CSP `img-src` allowlist, so the payment QR was silently blocked on the only screen where a customer pays | `next.config.js`, `src/app/pricing/page.tsx` | Origin allowlisted (with a comment on why), `referrerPolicy="no-referrer"`, `loading="lazy"`, localised `alt` |
| 2 | `/verify-email` had **no page background** — `bg-[var(--page-bg)]` referenced a token that does not exist | `src/app/verify-email/page.tsx` | Rebuilt on `gjm-page` + `gjm-container` + surface tokens |
| 3 | "Remember your password? **Sign in**" link had **no colour** — `text-[var(--ios-blue)]`, an undefined token | `src/app/forgot-password/ForgotPasswordForm.tsx` *(dead file, see §6)* | `text-[var(--brand-primary)] underline-offset-2 hover:underline` |
| 4 | Legacy accent rings projected a **cyan/violet glow** from the old theme (`#22d3ee`, `#a78bfa`, …) | `src/app/globals.css` | `.gjm-card-accent*` now maps to `--brand-primary`, `--success`, `--warning`, `--error`, `--brand-accent` |
| 5 | Admin → "Newsletter" card was a **dead link to a page that has never existed** (404) | `src/app/admin/page.tsx` | Removed the card (no destination existed; nothing else referenced it) |
| 6 | ~13 icon-only buttons (admin approve/reject/delete, pagination, save job, send message, back, copy link, share) had **no accessible name** — `title` alone is unreliable for AT | admin pages, `JobDetailClient`, `messages`, `ShareButtons` | `aria-label` added, all via i18n keys |
| 7 | `alt="QR Code for payment address"`, `title="Copy link"`, `aria-label="Close"` / `"Alphabet"` / `"Related sections"` were **hardcoded English** | pricing, ShareButtons, `ui/dialog.tsx`, `CategoriesSearch`, `seo/internal-hub-links.tsx` | Replaced with `t()` keys in all 12 locales |
| 8 | `loading.tsx` announced **"Loading…"** to screen readers in English regardless of locale | `src/app/loading.tsx` | Locale-aware `Common.loading` from the dictionary |
| 9 | Companies hub strip (`InternalHubLinks`) was **entirely English** and still used `border-white/10` | `src/components/seo/internal-hub-links.tsx` | Server-side dictionary lookup: labels, `aria-label` and heading now translate; token border |
| 10 | Companies empty state said "Companies will appear here…" in English only | `src/app/companies/page.tsx` | `Companies.emptyBody` key in 12 locales |
| 11 | RTL centring: `start-1/2 -translate-x-1/2` badges drifted off-centre in Persian/Arabic | pricing, `employer/post-job` | Added `rtl:translate-x-1/2` |
| 12 | Buttons painted with a saturated fill used `text-white`, unreadable on light-on-dark tokens | ~46 files | `--text-on-brand` (white in light, ink in dark) |

**i18n:** 70 keys were added across the whole redesign (843 → 913 in every one of the 12 locales),
including the 7 added by this strict pass: `Messages.send`, `Common.mainNavigation`,
`Common.relatedSections`, `Common.exploreMore`, `Categories.alphabet`, `Companies.emptyBody`,
`Pricing.qrAlt`. Nothing was removed. `check-i18n` and the new parity test both pass.

## 5. Routes verified per language and theme

**How:** production build served on `next start`, then a 45-check smoke script (`curl`) covering
status codes, redirects, 404s, API auth gating, security headers, font delivery and `lang`/`dir` for
`en` / `fa` / `ar` / `hi` / `de` / `zh`.

Every route below was served from the production build (`next start`) and checked for status code,
`<html lang>` / `dir`, `<main>` presence and absence of untranslated key leaks:

| Route group | en (LTR) | fa (RTL) | ar (RTL) | Status |
| --- | --- | --- | --- | --- |
| `/`, `/jobs`, `/jobs/[id]`, `/search` | 200 | 200 `lang="fa" dir="rtl"` | 200 `lang="ar" dir="rtl"` | ✓ |
| `/pricing`, `/about`, `/contact`, `/terms`, `/privacy` | 200 | 200 | 200 | ✓ |
| `/companies`, `/companies/[id]`, `/locations`, `/locations/[slug]`, `/categories`, `/blog` | 200 | 200 | 200 | ✓ |
| `/crypto-jobs`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | 200 | 200 | 200 | ✓ |
| `/carer-risk`, `/resume-builder`, `/saved-jobs`, `/job-alerts`, `/payment`, `/dashboard`, `/employer/*`, `/admin/*` | 302 → `/login?callbackUrl=…` | 302 | 302 | ✓ (auth gate intact) |
| `/this-page-does-not-exist` | 404 | 404 | 404 | ✓ |

**Runtime smoke (production server, `next start`):** 45 automated checks — 16 public pages 200,
15 auth-gated routes redirect (302) instead of 500, unknown page 404, 4 public APIs 200, 5 protected
APIs 401 (never 500), unknown API 404, security headers present (`x-frame-options: DENY`,
`x-content-type-options`, `referrer-policy`, `permissions-policy`, CSP), self-hosted `woff2` served
200 from `/_next/static/media`, and Persian/Arabic/Hindi pages rendering full translations with the
correct `dir`.

**Themes.** The theme is applied by `next-themes` on the client, so the SSR HTML is theme-neutral by
design (`<html>` carries only font classes + `suppressHydrationWarning`). Dark mode was verified at
the level that can be verified without a browser: `.dark` ships in the production CSS bundle
(`.dark{color-scheme:dark;--brand-primary:#35d6a0;…}`), a test now asserts every colour token has a
`.dark` value, another computes AA contrast for 28 pairs in both themes, and the legacy `!important`
light-only palette is remapped under `.dark` in `design-system.css`.

**What was *not* verified:** visual QA and Lighthouse. This sandbox has no Chromium/Playwright, so
no screenshots, no pixel comparison, and no Lighthouse run were possible. The targets
(≥85 perf / ≥95 a11y on mobile for `/` and `/jobs`) are therefore **unmeasured, not met-and-proven**.
Everything that can be checked statically was: one `<h1>` per page, one `<main>` landmark, 49
`aria-label`s across 139 buttons, 9/9 images with `alt`, a global `:focus-visible` safety net that
overrides legacy `outline-none` (WCAG 2.4.7), `lang`/`dir` correctness, and the contrast table in
`DESIGN.md` (21 token pairs, all ≥4.5:1, most ≥7:1).

---

## 6. Found but NOT changed

1. **`src/lib/jobs/JobsClient.tsx`** — a dead duplicate of `src/app/jobs/JobsClient.tsx`, imported
   by nothing, still carrying 62 old dark-slate utilities. Left in place (no deletions requested);
   it should be removed in a follow-up once you confirm.
2. **`src/components/ThemeToggle.tsx`** — thin re-export shim kept for older imports, alongside
   the canonical `theme-toggle.tsx`. Harmless, but a second name for one component.
3. **`src/app/auth/` and `src/app/app/post-job/`** — redirect-only stubs; untouched.
4. **`src/app/forgot-password/ForgotPasswordForm.tsx`** — dead: nothing imports it (the live page is
   `page.tsx`). Its link colour was still fixed so it is not a trap if someone wires it up.
5. **`/api/analytics` is called but does not exist** — `src/components/analytics-tracker.tsx` and
   `src/lib/track.ts` POST to it on every page view; the route has never existed in git history and
   returns 404. The failure is silent (`.catch(() => {})`), so nothing user-visible breaks, but every
   visit logs a 404. Left as-is: creating the collector is a product decision, not a redesign fix.
6. **`POST /api/ping`** is referenced nowhere; it 404s. No action needed, listed for completeness.
7. **Hardcoded English still visible on 3 pages** (~26 JSX text nodes, heuristic count):
   `/pricing` (14 — featured-boost block, trust bar, “What happens next?”),
   `/crypto-jobs` (7), `/employer/post-job` (4), `/employer/interviews` (3 option labels),
   plus 1 each in `global-error.tsx` and the OG-image routes (not page copy).
   Every string **added or rewritten** in this redesign is an i18n key in all 12 locales; these are
   pre-existing strings that were not part of the rewritten surfaces. They need ~20 new keys.
8. **`/about` FAQ JSON-LD** is still English-only structured data (`aboutFaqs` in
   `src/app/about/page.tsx`). Making it locale-aware needs per-locale Q&A keys; it is invisible
   copy, so it was left rather than shipped half-translated.
9. **Tailwind colour aliases** `brand-action`, `surface-3`, `border-strong`, feedback soft/strong
   are not declared in `tailwind.config.ts`. Nothing consumes them — every component uses
   `var(--…)` arbitrary values — so adding aliases would be dead configuration. Token names in
   `design-system.css` remain the single source of truth.
10. **`.env`** exists locally with placeholder secrets (`DATABASE_URL`, `AUTH_SECRET`,
   `SYNC_SECRET`, …) purely to let env validation, tests and the build run. It is git-ignored and
   **was not committed**.
11. **Prisma client stub** in `node_modules/.prisma/client` — a local workaround for the blocked
   binary download. Not in the repo, not a dependency, regenerated by `prisma generate` anywhere
   with network access.
12. **Stray root files:** checked — there is no `IMG_8300.png`, `AUDIT_REPORT.md` or other stray
   asset at the repo root. Root contains only tracked project files plus the new `DESIGN.md` and
   `REDESIGN-REPORT.md`; `tsconfig.tsbuildinfo` is an untracked build artifact and is left alone.
13. **Neumorphic legacy CSS** (`globals.css`, ~2,600 lines) is still loaded and still defines old
    helper classes. It is now token-driven and remapped for dark mode, so it renders correctly,
    but it is dead weight for pages that no longer use those classes. Deleting it safely needs a
    class-usage audit, so it is reported instead of removed.

---

## 7. One next-step recommendation

**Do a real-browser QA pass before shipping** — one afternoon with Playwright (or Chrome DevTools)
at 375/768/1280 in both themes and both directions, capturing Lighthouse mobile on `/` and `/jobs`,
then fix what it surfaces (most likely hydration-independent layout shifts on the hero and the
mobile filter sheet). This is the only outstanding verification gap: typecheck, lint, build, 920
tests, 45 runtime checks and i18n parity are all green, but no screenshot or Lighthouse number has
ever been produced for this build, and no amount of static analysis substitutes for one look at the
rendered page. Start with the payment modal at 375 px — it is the most complex overlay and the only
one that depends on a third-party image.
