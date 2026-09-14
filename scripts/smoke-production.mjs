#!/usr/bin/env node
/**
 * Production smoke checks (no auth cookies required).
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
  { path: "/sitemaps.xml", expect: [200] },
  { path: "/", expect: [200] },
  { path: "/jobs", expect: [200] },
  { path: "/pricing", expect: [200] },
  { path: "/categories", expect: [200] },
  { path: "/locations", expect: [200] },
  { path: "/login", expect: [200] },
  { path: "/register", expect: [200] },
  { path: "/contact", expect: [200] },
  { path: "/about", expect: [200] },
  { path: "/career-risk", expect: [200] },
  { path: "/api/crypto-payment", expect: [401] },
];

let failed = 0;

async function check(item) {
  const url = BASE + item.path;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "gjm-smoke/1.0" },
    });
    const ms = Date.now() - t0;
    const ok = item.expect.includes(res.status);
    const line = `${ok ? "OK " : "FAIL"} ${res.status} ${ms}ms ${item.path}`;
    console.log(line);
    if (!ok) failed += 1;

    if (item.path === "/api/health" && res.ok) {
      const body = await res.json();
      console.log(
        `     health.status=${body.status} db=${body.checks?.database?.status} redis=${body.checks?.rateLimit?.status} wallets=${body.checks?.payments?.walletsConfigured ?? body.checks?.config?.cryptoWalletsConfigured}`
      );
      if (Array.isArray(body.warnings) && body.warnings.length) {
        for (const w of body.warnings) console.log(`     WARN: ${w}`);
      }
    }
  } catch (e) {
    failed += 1;
    console.log(`FAIL ERR ${item.path} ${e?.message || e}`);
  }
}

console.log(`Smoke against ${BASE}`);
for (const item of paths) {
  await check(item);
}
console.log(failed === 0 ? "\nALL PASSED" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
