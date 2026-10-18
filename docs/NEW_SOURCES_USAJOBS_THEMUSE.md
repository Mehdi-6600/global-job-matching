# منابع جدید — فقط با مجوز صریح

> **اصل طلایی پروژه:** هیچ سورسی بدون `licenseStatus=APPROVED` + `termsStatus=allowed` + `robotsStatus=allowed` وارد pipeline نمی‌شود. هرچه این ۳ تا پاس نشود، `isProductionIngestAllowed()==false` و کلاً skip می‌شود — هم در Cron ساعت ۳، هم در اجرای دستی ادمین.

## ۲ منبع جدید اضافه شد (پرآگهی + قانونی)

| # | Source | Key | آدرس API | مجوز کجاست؟ | چرا قدرتمند؟ | حجم |
|---|--------|-----|---------|------------|--------------|-----|
| 1 | **USAJOBS** | `usajobs` | `https://data.usajobs.gov/api/search` | TOS Sec 2: *"Public Data may be copied, stored, reformatted, adapted, analyzed, published, redistributed for lawful commercial/noncommercial without prior OPM approval"* — 44 U.S.C. §§3502/3506(b)(6) open license. فدرال، public domain. | همه مشاغل دولت آمریکا — 30k+ آگهی فعال همیشه، روزی 2k+ جدید. نیاز نامحدود کارجوهای بین‌المللی که ویزای دولتی می‌خوان. | 10k/کوئری |
| 2 | **The Muse** | `themuse` | `https://www.themuse.com/api/public/jobs` | Developer Terms 3.1: grants *limited license to obtain, use, distribute and transmit Muse Content via Apps*. API صفحه می‌گه *publicly available to other companies*. | 415k آگهی فعال (20749 صفحه ×20) — بزرگترین دیتابیس tech/business/design. بدون احراز هویت هم 500 req/hr، با کلید 3600/hr. | 415k کل |

### چرا Remotive / Adzuna / Working Nomads اضافه نشدند؟
- **Remotive:** TOS می‌گه *"Please do not submit Remotive jobs to third Party websites, including Jooble, Neuvoo, Google Jobs, LinkedIn Jobs"* — سایت ما خودش job board است → ممنوع. رد شد.
- **Adzuna:** Commercial use = *14-day trial only, then licence agreement required* + باید کل دیتا را با اتمام قرارداد پاک کنی → بدون قرارداد کتبی نمی‌شود. رد شد.
- **Working Nomads:** به‌صورت مستند می‌گه *restrict commercial exploitation* — redistribution grant تایید نشده. رد شد.
- **Reed.co.uk:** Content Rights: *"no copying for any commercial or business use is permitted"* → حتی با API، ریسک حقوقی بالا. رد شد.
- **Himalayas:** از قبل `RESTRICTED` با دلیل clauses 2/30/93. باقی می‌ماند disabled.

> اگر روزی قرارداد کتبی با هرکدام گرفتی، فقط `licenseStatus` را در `registry.ts` به `APPROVED` تغییر بده و `enabled:true` — بدون کد اضافه فعال می‌شود.

## رفتار سیستم (بدون تغییر کد اضافه)

### ۱) اتومات ساعت ۳ (فرمت سایت خودشان)
- `vercel.json` → `crons: { path: "/api/jobs/sync", schedule: "0 3 * * *" }` (UTC)
- این endpoint تمام `SOURCE_REGISTRY.filter(isProductionIngestAllowed)` را پیمایش می‌کند — الان 9 تا: `arbeitnow, jobicy, remoteok, greenhouse, smartrecruiters, workable, recruitee, usajobs, themuse`
- هر آداپتور طبق capabilities خودش صفحه‌بندی می‌کند (`page` برای USAJOBS/TheMuse/Arbeitnow؛ `single` برای RemoteOK/Jobicy) — دقیقاً فرمت سایت مبدا.

### ۲) اجرای دستی در طول روز (پنل ادمین)
- آدرس: `/admin/sync` → `SyncClient.tsx`
- دکمه‌ها به‌صورت خودکار از `GET /api/admin/sync/sources` می‌آیند — هر سورس جدید به‌محض اضافه شدن به رجیستری، دکمه‌اش ظاهر می‌شود.
- می‌توانی **هر منبع را جداگانه** بزنی: `POST /api/admin/sync?source=usajobs` یا `?source=themuse` یا `?source=usajobs,themuse` یا بدون پارامتر = همه.
- هر دکمه بودجه زمانی کامل خودش را دارد (پیشنهاد پیاده‌سازی: جدا بزنی تا timeout ورسل Hobby نخورد).

### ۳) بدون آگهی تکراری
- `pipeline.ts` → `findDedupCandidate` سه سطح:
  1. `externalId` دقیق (مثل `usajobs:ABC-123`, `themuse:21438954`)
  2. `externalUrl` دقیق
  3. `applyUrl` دقیق
  4. `company + title + location` نورمالایز شده
- اگر هرکدام match شد → `duplicates++` و skip insert. آگهی کارفرمای خودت (`postedById != null`) اصلاً لمس نمی‌شود.

### ۴) بدون آگهی قدیمی
- داخل هر آداپتور جدید: `isTooOld()` → اگر `publishedAt` بیش از 30 روز قبل باشد، `return null` (کلاً وارد pipeline نمی‌شود).
- بیرون آداپتور: `quality.ts` → `description <20 chars` یا spam و... → `qualityRejected`.
- داخل pipeline: اگر `expiresAt < now()` → skip.
- بعد از ingesiton: `freshness.ts` → `fresh 3d / aging 10d / stale 21d / expired 45d` — بعد از `FULL` sync، `applyAbsenceFreshness` آگهی‌های دیده‌نشده را stale می‌کند.

## تنظیمات لازم (.env)

```env
# USAJOBS — رایگان از https://developer.usajobs.gov/apirequest/index (ایمیل + توضیح کوتاه use-case)
USAJOBS_API_KEY="your-key-from-developer.usajobs.gov"
USAJOBS_USER_AGENT="you@yourcompany.com"
# یا USAJOBS_EMAIL="you@yourcompany.com" (alias)

# The Muse — اختیاری (بدون کلید هم کار می‌کند، 500/hr؛ با کلید 3600/hr)
THEMUSE_API_KEY=""

# اگر هر دو خالی بماند: USAJOBS به‌صورت graceful skip می‌شود (خطای missing_credentials)
# و The Muse بدون کلید با 500/hr کار می‌کند — هیچ کرش یا بلاکی برای بقیه منابع رخ نمی‌دهد.
```

`.env.example` آپدیت شد — بعد از `vercel env pull` یا افزودن دستی در Vercel Dashboard، Cron ساعت ۳ به‌طور خودکار هر دو را می‌گیرد.

## تست سریع (بعد از deploy)

```bash
# کل سیستم (همه منابع، including جدید)
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.vercel.app/api/jobs/sync

# فقط USAJOBS
curl -X POST -H "Cookie: <admin session>" https://your-domain.vercel.app/api/admin/sync?source=usajobs

# فقط The Muse
curl -X POST -H "Cookie: <admin session>" https://your-domain.vercel.app/api/admin/sync?source=themuse

# بررسی اینکه enabled + APPROVED هستند
curl -H "Cookie: <admin session>" https://your-domain.vercel.app/api/admin/sync/sources
# باید شامل { key: "usajobs", runnable: true } و { key: "themuse", runnable: true } باشد
```

## چک‌لیست قبل از پروداکشن

- [ ] در Vercel: `USAJOBS_API_KEY` و `USAJOBS_USER_AGENT` را ست کن (از developer.usajobs.gov)
- [ ] (اختیاری) `THEMUSE_API_KEY` از https://www.themuse.com/developers/api/v2/apps
- [ ] Deploy → `/admin/sync` را باز کن → باید دو دکمه جدید **USAJOBS** (سرمه‌ای) و **The Muse** (فیروزه‌ای) ببینی
- [ ] هرکدام را یک بار جدا بزن → `created` باید >0 باشد، `duplicates` هم نشان‌دهنده dedup صحیح است
- [ ] Cron ساعت ۳ به‌طور خودکار فردا شب هر 9 منبع را می‌گیرد — لاگ Vercel → `/api/jobs/sync` را چک کن

