# Email templates with direct purchase link — no back-and-forth

Base production URL: **https://global-job-matching.vercel.app**
- Featured purchase (no subscription): **https://global-job-matching.vercel.app/pricing** → scroll to "Featured Job Boost"
- Direct post + feature flow: **https://global-job-matching.vercel.app/employer/post-job** → post job → auto-upsell to Feature

Both links create crypto payment intent (USDT ~$1 fee, auto-verified ~5 min). No need to reply "yes".

---

## Template EN — ready to copy (with link)

**Subject:** `Feature your [Role] for $39 — vs $499 on CryptoJobsList (direct link, no email needed)`

```
Hi [Name / Hiring Team at Company],

Saw your [Exact Role] on [CryptoJobsList/RemoteOK/Arbeitnow] — great role.

Quick question: Are you getting enough qualified crypto-native applicants?

We run **Global Job Matching** — crypto-first board (2,000+ live jobs, 12 languages, USDT ~$1 fees).

You can feature your job **directly** without emailing us — one-time, no subscription:

→ **Buy now:** https://global-job-matching.vercel.app/pricing
  • $19 — 7 days on homepage + top of search + gold ★ FEATURED badge
  • $39 — 30 days (best value) — same placement is $499 on CryptoJobsList
  • Pay with USDT/BTC/ETH/BNB via QR → on-chain verified in ~5 min → live

Or post & feature in one flow: https://global-job-matching.vercel.app/employer/post-job

90% of our employers love $1 USDT fees vs $25 PayPal. No lock-in — don't renew if you don't like results.

Want me to reserve homepage spotlight for [Role]? Just use the link above — takes 2 minutes.

Best,
Mehdi Veysi
Founder, Global Job Matching
https://global-job-matching.vercel.app/pricing — https://global-job-matching.vercel.app/crypto-jobs
veysi.mehdi@gmail.com
```

**Why this converts:** Single CTA (click link) → no friction. Still personal (role + source) + number vs number ($39 vs $499).

---

## Template FA — فارسی با لینک مستقیم

**Subject:** `آگهی [Role] شما → 3 برابر متقاضی با $19 کریپتو (لینک خرید مستقیم)`

```
سلام [Name] عزیز،

آگهی [Role] شما در [RemoteOK] رو دیدم — عالیه.

برای گرفتن متقاضی کریپتو-محور کافی نیست؟

ما **Global Job Matching** هستیم — جاب‌بورد کریپتو-محور (۲۰۰۰+ شغل، کارمزد USDT ~$1).

می‌تونی **مستقیم** بدون ایمیل به ما، آگهی رو فیچر کنی:

→ **خرید مستقیم:** https://global-job-matching.vercel.app/pricing
  • $19 (۷ روز) یا $39 (۳۰ روز) — پین در صفحه اصلی + بالای سرچ + بج طلایی
  • تایید آنچین در ۵ دقیقه، بدون اشتراک (CryptoJobsList $499 می‌گیره)

یا: https://global-job-matching.vercel.app/employer/post-job → ثبت آگهی + فیچر در یک مرحله

مهدی ویسی
Global Job Matching — https://global-job-matching.vercel.app/pricing
veysi.mehdi@gmail.com
```

---

## Usage notes for next 10 sends

1. Replace `[Company]`, `[Role]`, `[Source board]` with exact posting.
2. Paste EN block for all 30 leads in `docs/EMPLOYER_LEADS_30.md` — they are all EN.
3. From Gmail `veysi.mehdi@gmail.com`, send max 10/day (copy To + Subject + Body as-is).
4. Links are production — no need for "reply yes" anymore; still keep reply handling for those who reply instead of clicking.

## Where the link goes (verification)

- `/pricing` → shows `Featured Job Boost — Get 10× More Views` with 2 cards ($19 / $39) → CTA `Post & Feature Job` → `/employer/post-job`
- `/employer/post-job` → create job → success state → upsell card → `Create Featured Intent` → `/api/jobs/[id]/feature/intent` → QR + address → verify via `/api/cron/verify-payments` (every 10 min) or manual Admin→Payments

No second email required — payment intent + auto-verify handles it.
