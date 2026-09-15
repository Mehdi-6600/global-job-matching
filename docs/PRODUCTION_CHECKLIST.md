---

### ۲) `scripts/smoke-production.mjs` (کامل)

**PATH:** `scripts/smoke-production.mjs`

```js
#!/usr/bin/env node
/**
 * Production smoke checks (no auth cookies required).
 *
 * Usage:
 *   node scripts/smoke-production.mjs
 *   BASE_URL=https://global-job-matching.vercel.app node scripts/smoke-production.mjs
 */

const BASE = (process.env.BASE_URL || "https://global-job-matching.vercel.app").replace(
  /\/$/,
  ""
);

const paths = [
  { path: "/api/health", expect: [200] },
  { path: "/robots.txt", expect: [200] },
  { path: "/sitemap.xml", expect: [200] },
  { path: "/", expect: [200] },
  { path: "/jobs", expect: [200] },
  { path: "/pricing", expect: [200] },
  { path: "/categories", expect: [200] },
  { path: "/locations", expect: [200] },
  { path: "/companies", expect: [200] },
  { path: "/login", expect: [200] },
  { path: "/register", expect: [200] },
  { path: "/contact", expect: [200] },
  { path: "/about", expect: [200] },
  { path: "/career-risk", expect: [200] },
  { path: "/blog", expect: [200] },
  // Auth-required payment endpoints must not be open
  { path: "/api/crypto-payment", expect: [401] },
  { path: "/api/crypto-payment/intent", expect: [401, 405] },
];

let failed = 0;

async function check(item) {
  const url = BASE + item.path;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "gjm-smoke/1.1" },
    });
    const ms = Date.now() - t0;
    const ok = item.expect.includes(res.status);
    const line = `${ok ? "OK  " : "FAIL"} ${res.status} ${String(ms).padStart(4)}ms  ${item.path}`;
    console.log(line);
    if (!ok) failed += 1;

    if (item.path === "/api/health" && res.ok) {
      const body = await res.json().catch(() => ({}));
      const db = body.checks?.database?.status ?? "?";
      const redis = body.checks?.rateLimit?.status ?? "?";
      const wallets =
        body.checks?.payments?.walletsConfigured ??
        body.checks?.config?.cryptoWalletsConfigured ??
        "?";
      console.log(
        `      health.status=${body.status}  db=${db}  redis=${redis}  wallets=${wallets}`
      );
      if (Array.isArray(body.warnings) && body.warnings.length) {
        for (const w of body.warnings) console.log(`      WARN: ${w}`);
      }
      if (body.status !== "ok") {
        failed += 1;
        console.log("      FAIL: health.status is not ok");
      }
    }

    if (item.path === "/robots.txt" && res.ok) {
      const text = await res.text();
      if (!text.includes("Sitemap:")) {
        failed += 1;
        console.log("      FAIL: robots.txt missing Sitemap line");
      }
      if (text.includes("/sitemaps.xml")) {
        failed += 1;
        console.log("      FAIL: robots.txt still references /sitemaps.xml");
      }
    }
  } catch (e) {
    failed += 1;
    console.log(`FAIL ERR  ${item.path}  ${e?.message || e}`);
  }
}

console.log(`Smoke against ${BASE}\n`);
for (const item of paths) {
  await check(item);
}
console.log(failed === 0 ? "\nALL PASSED" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
