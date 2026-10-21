# تایید اتوماتیک پرداخت‌های کریپتو — Setup کامل

**چی شد؟** من یه کرون ساختم که هر ۱۰ دقیقه خودش پرداخت‌های pending رو چک می‌کنه و اگر روی بلاکچین تایید شده بود، خودکار فعالش می‌کنه — بدون دخالت تو.

**فایل:** `src/app/api/cron/verify-payments/route.ts` + `vercel.json` cron

---

## ۱. بدون هیچ کلید اضافی (وضعیت فعلی تو) چی میشه؟

اگر فقط آدرس کیف پول‌ها رو تو Vercel گذاشتی (مثل `CRYPTO_USDT_ADDRESS`):
- کاربر $19 می‌فرسته → سایت quote می‌سازه → کاربر هش رو می‌زنه → تراکنش میشه `pending`
- کرون میاد چک می‌کنه → می‌بینه `TRONGRID_API_KEY` خالیه → می‌نویسه `verification_unavailable` و **نمی‌بنده** — می‌مونه برای تایید دستی تو
- تو میری `Admin → Transactions` → دکمه Confirm → پلن/Featured فعال میشه (۲۴ ساعت max)

**یعنی الان هم کار می‌کنه، فقط دستی.**

## ۲. برای اتوماتیک ۵ دقیقه‌ای باید چیکار کنی؟ (۲ دقیقه زمان)

**مرحله A — TronGrid (برای USDT):**
1. برو `https://www.trongrid.io/register` → ثبت نام رایگان
2. API Key رو کپی کن → برو `Vercel → Settings → Environment Variables` → جدید:
   `TRONGRID_API_KEY = your_key`

**مرحله B — BSC + ETH RPC (برای BNB/ETH/USDC/BTC/DOGE):**
- برای BNB (پیشنهاد ساده): هیچی لازم نیست — پیش‌فرض `https://bsc-dataseed.binance.org/` کار می‌کنه
- برای ETH (اختیاری): برو `https://eth.llamarpc.com` رایگانه یا `https://www.quicknode.com/` → ENV:
  `CRYPTO_BSC_RPC_URL=https://bsc-dataseed.binance.org/`
  `CRYPTO_EVM_RPC_URL=https://eth.llamarpc.com`

بعد `Redeploy` بزن.

## ۳. تست کن

1. با یه اکانت تست برو `/pricing` → Pro $9 + USDT → Get quote → آدرس رو ببین
2. از ولت خودت **مقدار دقیق** رو بفرست (مثلا `9.12 USDT`)
3. هش رو paste کن → Submit
4. صبر کن ۱۰ دقیقه → برو `Admin → Transactions` → باید `confirmed` شده باشه + Job Featured شده باشه
5. اگر نشد: `Vercel → Logs` رو چک کن یا دستی `GET /api/cron/verify-payments` با هدر `Authorization: Bearer YOUR_CRON_SECRET` بزن → JSON کامل می‌گه چرا: `verification_unavailable` یعنی کلید ناقصه.

## ۴. کرون چجوری کار می‌کنه؟

`vercel.json`:
```json
{ "path": "/api/cron/verify-payments", "schedule": "*/10 * * * *" }
```
هر ۱۰ دقیقه Vercel خودش صدا می‌زنه → ۲۰ تا قدیمی‌ترین pending رو چک می‌کنه → برای هر کدوم `verifyTxOnChain` می‌زنه:
- `confirmed` → خودکار `Transaction.status=confirmed` + `Job.featured=true` یا `activatePlanForUser` + نوتیفیکیشن
- `pending` → صبر (هنوز کانفرم نشده)
- `failed/not_found` → می‌مونه pending تا تو دستی reject کنی (fail-closed)
- `verification_unavailable` → می‌مونه pending (کلید نداری)

## ۵. امنیت

- `CRON_SECRET` باید ≥16 کاراکتر و فقط تو `Authorization: Bearer` بفرستی
- بدون این هدر، 401 می‌ده
- لاگ‌ها تو `securityLog("auto.payment_confirm")` می‌ره

## ۶. وقتی نمی‌خوای اتوماتیک؟

کافیه کلیدها رو خالی بذاری — برمی‌گرده به دستی. هیچ کدی لازم نیست پاک کنی.

---

**خلاصه برای تو:** چون کیف پول‌هات از قبل ست شده، **الان هیچ کاری لازم نیست.** کرون دستی رو نگه می‌داره. اگر خواستی ۵ دقیقه‌ای بشه، فقط ۲ تا ENV بالا رو اضافه کن.
