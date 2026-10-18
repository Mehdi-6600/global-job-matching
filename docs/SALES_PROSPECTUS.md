# Sales Prospectus - Global Job Matching

**Status:** Ready for Starter Site sale (with monetization ready)
**Asking Range:** $1,500 - $3,500 as Starter + Crypto Payment System
**Potential with 3 months growth:** $15k-30k as Micro-SaaS (with MRR)

---

## 1. What You're Buying

| Asset | Detail |
|-------|--------|
| **Tech Stack** | Next.js 15 + TypeScript + Prisma 6 + PostgreSQL (Neon) + NextAuth 5 |
| **Domain** | global-job-matching.vercel.app (transferable) |
| **Database** | Neon PostgreSQL - easy migrate to Supabase/any PG |
| **Payments** | Full crypto system: 6 coins + auto on-chain verification + admin panel |
| **SEO** | sitemap.xml chunked, robots.txt, OG images, JSON-LD JobPosting, hreflang 12 languages |
| **Languages** | en/fa/ar/es/fr/hi/de/ja/zh/pt/tr/id (12 locales) |
| **Features** | Jobs + Companies + Locations/Categories + Blog + AI Resume + Career Risk + Alerts + Crypto Payments |

**Code Quality:**
- `npm run ci` passes (typecheck + lint + test + i18n check)
- 193 i18n keys aligned across locales with English fallback
- Rate limiting (Upstash Redis or in-memory fallback)
- Security hardened (see SECURITY_FIXES_PART2.md)

---

## 2. Why This Is Valuable

**1. Ready to monetize Day 1 with crypto only:**
- No Stripe needed - perfect for sanctioned countries, global nomads, Web3
- $9 Pro + $29 Business + $99 Enterprise + $19/$39 Featured Job one-time
- Buyer just adds wallet addresses in ENV and starts selling

**2. SEO Engine Built:**
- Programmatic pages: /locations/* and /categories/* auto-generate from real jobs (no empty pages)
- Every job = indexable page with schema.org JobPosting
- Sitemap splits jobs into chunks (5-10k per file) - scales to 100k jobs

**3. AI Moat:**
- Career Risk Analyzer (viral tool - "Is AI taking my job?")
- Resume Builder (lead magnet)
- Both have fallback templates if OPENAI key missing -> never breaks

**4. Transfer is Easy:**
- 1x ENV file + Vercel deploy + Neon DB
- No external SaaS lock-in (Redis optional, email optional)

---

## 3. Revenue Model (Crypto-Only)

| Product | Price | Why It Works |
|---------|-------|--------------|
| **Pro (Job Seeker)** | $9/mo or $90/yr | 500 apps + AI tools. Impulse buy with USDT $1 fee |
| **Business (Employer)** | $29/mo or $290/yr | 10 active jobs + ATS. Cheap vs $400 on CryptoJobsList |
| **Enterprise** | $99/mo | 50 jobs + analytics - for agencies |
| **Featured Boost** | $19 (7d) / $39 (30d) | One-time, no sub. Easiest first $ for 0-traffic sites. 10x views badge |

**Conversion optimised for crypto:**
- USDT-TRC20 recommended (~$1 fee) vs BTC ($10-15) - shown in UI
- QR code + copy button
- Locked quote 30 min + countdown
- Auto-verified on-chain (TronGrid / Etherscan / BscScan)

---

## 4. Growth Playbook (Included)

**Week 1-2: First Traffic**
- Enable JobSource sync (bring 500-2000 real jobs) -> locations/categories pages fill -> Google indexes
- Publish 5 SEO blogs: "Remote Jobs Paying in Crypto", etc.

**Week 3-4: Community**
- Product Hunt: "First job board that prefers crypto"
- Reddit r/RemoteJobs, r/CryptoJobs, Telegram job channels
- Newsletter lead magnet: "20 remote crypto jobs weekly"

**Month 2: Employer Sales**
- Cold email 20 Web3 startups/day: "Feature your job for $39 in crypto"
- Featured is easy yes vs subscription

**Metrics to Aim:**
- 1k visits/mo -> 3-5 sales -> $100-200 MRR
- 3k visits/mo -> $800 MRR -> valuation $16k-20k

---

## 5. Technical Handover Checklist

- [ ] Transfer GitHub repo
- [ ] Vercel project transfer (1 click) or redeploy
- [ ] Neon DB transfer (change DATABASE_URL)
- [ ] Set ENV: DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL, CRYPTO_* wallets, TRONGRID_API_KEY, EVM RPCs
- [ ] Run `prisma migrate deploy` + `prisma generate`
- [ ] Test /pricing payment flow + admin /admin -> Transactions
- [ ] Set owner email via /bootstrap-owner

**All docs included:** LAUNCH_CHECKLIST.md, PRODUCTION_CHECKLIST.md, MONETIZATION_PLAN_CRYPTO.md

---

## 6. Comparable Sales

- Starter job boards (no revenue, good code): $800-2000 on Flippa
- Job boards with crypto payments + SEO engine: $2500-5000 (rare)
- Micro-SaaS job board with $500 MRR: $12k-18k (20-30x)

**This site advantages vs comparables:** 12 languages, AI tools, clean code, crypto-auto-verify (most have manual Stripe only)

---

## 7. For the Buyer Who Wants Flip

You can list immediately on:
- **Flippa** - Starter Sites category - $1,500-3k BIN
- **Microns.io** - $2k-5k
- **Acquire.com** - if you get to $300+ MRR first

Or keep 2-3 months, hit $500 MRR, sell on Acquire for $12k+.

---

**Contact Seller:** via platform DM + include Vercel preview + GitHub read-only access
**Demo:** global-job-matching.vercel.app
**Price:** Open to offers. BIN $2,900 for starter (code + handover call)
