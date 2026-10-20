# Design Brief — “Ink & Signal”

**Product:** Global Job Matching — global job marketplace + AI career tools, 12 locales, RTL (ar, fa).
**Scope of this brief:** the visual and interaction system used by every page. Feature scope, routes, APIs, Prisma models and payment logic are unchanged.

---

## 1. Visual direction

**Ink & Signal** is an editorial, data-first job marketplace language:

- **Ink** — near-black, green-tinted neutrals for text, borders and the “workspace” panels. Sharp 1px hairlines instead of heavy neumorphic bevels.
- **Signal** — one high-chroma emerald reserved for actions, match scores and live state; amber for urgency/salary; violet for AI features. Colour is *information*, never decoration.
- **Paper** — warm off-white surfaces (light) and deep charcoal surfaces (dark), with plenty of whitespace and a strict 4pt spacing rhythm.
- **Typography does the hierarchy work** (tight display type, tabular numerals for salary), not gradients or glows. Shadows are ambient and barely visible; the previous raised/recessed neumorphic pairs are gone.

Why: job seekers scan, they don’t read. 2026 job-board research is consistent — scannable cards, salary transparency, grouped filters, mobile filter drawers, skeleton states, and a real second theme. [1](https://www.jobboardly.com/blog/best-job-board-templates) [2](https://www.uxpin.com/studio/blog/filter-ui-and-ux/) [3](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/)

---

## 2. Colour tokens

Exposed as CSS variables in `src/app/design-system.css` (`:root` = light, `.dark` = dark), consumed by Tailwind via `var(--…)`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg-page` | `#F5F7F3` | `#080D0B` | app canvas |
| `--surface` | `#FFFFFF` | `#111815` | cards, sheets |
| `--surface-2` | `#EFF2ED` | `#171F1B` | wells, hover |
| `--surface-3` | `#E6EAE3` | `#1E2823` | pressed / track |
| `--border` | `#DCE2D8` | `#26332C` | hairlines |
| `--border-soft` | `#E7ECE3` | `#1C2620` | dividers |
| `--text-primary` | `#0B1512` | `#F2F6F2` | headings |
| `--text-body` | `#35423C` | `#C6D1CA` | body |
| `--text-muted` | `#56645C` | `#9AA8A0` | secondary |
| `--text-subtle` | `#5F6D66` | `#7E8C84` | meta |
| `--brand-primary` | `#0A7052` | `#35D6A0` | primary action, links |
| `--brand-primary-hover` | `#086247` | `#5BE7B8` | hover |
| `--brand-primary-soft` | `#D8F1E5` | `#0F2E24` | tint chips |
| `--brand-accent` (AI) | `#5A4BD1` | `#A79CFF` | AI surfaces |
| `--brand-accent-hover` | `#4B3DBF` | `#BDB5FF` | accent hover |
| `--warning` | `#8A5A08` | `#F2C15C` | urgency, featured |
| `--warning-hover` | `#734A06` | `#F7D184` | warning hover |
| `--error` | `#B0261D` | `#FF8A80` | destructive |
| `--success` | `#0A7A5A` | `#4ADE9B` | confirmed |
| `--success-hover` | `#086247` | `#6EE7B7` | success hover |
| `--focus-ring` | `#0A7052` | `#5BE7B8` | focus outline |

All text/background pairs meet **WCAG AA (≥4.5:1)** — measured, not estimated:

| Pair | Light | Dark |
| --- | --- | --- |
| `--text-primary` on page | 17.24 | 17.94 |
| `--text-body` on surface | 10.52 | 11.48 |
| `--text-muted` on surface | 6.23 | 7.28 |
| `--text-subtle` on surface | 5.43 | 5.12 |
| `--text-on-brand` on `--brand-primary` | 6.08 (white) | 10.28 (ink) |
| `--brand-primary` on `--brand-primary-soft` | 5.11 | 7.85 |
| `--warning` on `--warning-soft` | 5.23 | 9.12 |
| `--error` on `--error-soft` | 5.70 | 7.33 |
| `--success` on `--success-soft` | 4.54 | 8.80 |
| `--brand-accent` on `--brand-accent-soft` | 5.24 | 7.25 |
| `--info` on `--info-soft` | 5.97 | 9.76 |

Text on a saturated fill always uses `--text-on-brand` (white in light, ink in dark), never `white` — that is what lets the same class survive both themes.

## 3. Type

- **Display:** Geist Sans (`geist` — already a dependency, self-hosted, no build-time network fetch) for Latin locales. Arabic-script locales keep **Vazirmatn** (fa) and **Noto Kufi Arabic** (ar); Hindi keeps Inter + the OS Devanagari fallback. Per-locale stacks live in `src/app/layout.tsx` — the first family that has the glyph wins, so fa/ar/hi never fall back to Latin-only glyphs.
- **Body:** Inter (Latin), Vazirmatn (fa), Noto Kufi (ar).
- **Scale:** 12 / 13 / 14 / 16 / 18 / 20 / 24 / 30 / 38 / 48–64 (clamp). Display uses `-0.03em` tracking (`0` for ar/fa), body `1.6` line-height (`1.75` for hi).
- **Numerals:** `font-variant-numeric: tabular-nums` on salary, stats and match scores.

## 4. Space, radius, elevation, motion

- **Spacing:** 4pt base — 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.
- **Radius:** `6 / 8 / 10 / 14 / 18 / 22 / pill`. Cards 14–18, inputs 10, chips pill.
- **Elevation:** ambient only — `0 1px 2px` → `0 24px 48px -24px` with ≤12% opacity; dark mode uses 60% black plus a 1px inner highlight.
- **Motion:** 160ms press, 220ms UI, `cubic-bezier(.2,.8,.2,1)`; no motion on `prefers-reduced-motion`.

## 5. Components built

`Button`, `Card`, `Badge`, `Input`, `Skeleton*`, `EmptyState`, `PageHeader`, `JobCard`, `MatchScoreBadge`, `StatCard`, `FilterRail` (desktop) + filter sheet (mobile), `SearchHero`, `PricingCard`, `Stepper`, `Navbar` (theme + language + mobile sheet), `Footer`, `ThemeToggle`.

---

# Appendix A — Audit (Phase 2)

## Routes

| Class | Routes |
| --- | --- |
| Public | `/`, `/jobs`, `/jobs/[id]`, `/search`, `/companies`, `/companies/[id]`, `/locations`, `/locations/[slug]`, `/categories`, `/categories/[slug]`, `/blog`, `/blog/[slug]`, `/crypto-jobs`, `/pricing`, `/about`, `/contact`, `/terms`, `/privacy`, `/career-risk`, `/career-risk/share/[token]`, `/resume-builder`, `/job-alerts`, `/not-found`, `error` |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth` (redirect) |
| Dashboard (seeker) | `/dashboard`, `/profile`, `/settings`, `/my-applications`, `/my-interviews`, `/saved-jobs`, `/messages`, `/notifications` |
| Employer | `/employer`, `/employer/dashboard`, `/employer/post-job`, `/employer/applications`, `/employer/interviews`, `/employer/company/new`, `/company/profile`, `/post-job` |
| Admin | `/admin`, `/admin/analytics`, `/admin/categories`, `/admin/companies`, `/admin/help`, `/admin/jobs`, `/admin/leads`, `/admin/reports`, `/admin/source-companies`, `/admin/sync`, `/admin/users` |
| Payment | `/pricing` (crypto flow), `/payment` |
| Utility | `/bootstrap-owner`, `/app/post-job` (legacy redirect) |

## Components

- Canonical UI primitives: `src/components/ui/{button,card,badge,input,dialog,skeleton,empty-state,page-header,toast,dynamic-button,processing-status}.tsx`.
- Shell: `navbar.tsx`, `footer.tsx`, `language-switcher.tsx`, `theme-toggle.tsx`, `brand-logo.tsx`, `locale-provider.tsx`.
- Feature: `jobs/job-match-badge.tsx`, `company-logo.tsx`, `plan-*`, `payment-history-card.tsx`, `contact-employer.tsx`, `featured-urgency-banner.tsx`.

**Duplicates found (left in place, flagged in report):** `src/components/theme-toggle.tsx` vs `ThemeToggle.tsx`; `src/app/jobs/JobsClient.tsx` (used) vs `src/lib/jobs/JobsClient.tsx` (dead copy); `src/app/components/{Newsletter,ShareButtons}.tsx` vs `src/components/*`.

**Hardcoded English found:** `/about` (FAQ section rendered without `t()`), `/not-found`, `/loading`, `/verify-email` metadata, `/auth`, `/app/post-job` (redirect only), `/payment` metadata, admin `source-companies`/`sync` labels.

**Structural issue:** roughly 1,100 Tailwind `text-white` / `text-slate-*` / `bg-slate-900` utilities from the old dark theme were being force-mapped to the light neumorphic palette with `!important`. The new token layer remaps them to theme-aware variables, so those pages now follow light/dark correctly.
