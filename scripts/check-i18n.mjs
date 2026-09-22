#!/usr/bin/env node
/**
 * i18n quality gate.
 *
 * Verifies, for every locale in messages/, that:
 *   1. Every key present in en.json is present in the locale.
 *   2. No locale has extra keys that don't exist in en.json.
 *   3. No value is empty/whitespace-only.
 *   4. Interpolation variables ({var}) match the English source.
 *   5. Flags non-English locales whose value is identical to English
 *      (as a warning, not a hard failure — proper nouns and technical
 *      terms are legitimate exceptions).
 *
 * Exit codes:
 *   0 — no hard errors
 *   1 — hard errors present (missing keys, extra keys, empty values,
 *       interpolation mismatch)
 *
 * Usage: node scripts/check-i18n.mjs
 *        node scripts/check-i18n.mjs --strict  (treat English-identical as error)
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MESSAGES_DIR = path.join(ROOT, "messages");

const STRICT = process.argv.includes("--strict");

/**
 * Strings that are legitimately identical to English across locales.
 * Add more here only when the exception is genuinely justified
 * (brand names, product names, technical terms that should not be translated,
 * or loanwords that are standard in the target language).
 */
const ALLOWED_IDENTICAL = new Set([
  // Brand / product
  "Global Job Matching",
  "Global Job Matching ·",
  "Global Job Matching.",
  // Technology names
  "Email",
  "GitHub",
  "LinkedIn",
  "Website",
  "PDF only · Max 5MB",
  "BTC, ETH, BNB, USDT, USDC, DOGE (only those configured by the site).",
  // Universal tokens
  "ID",
  "OK",
  "API",
  "Pro",
  "Business",
  "Enterprise",
  "Free",
  "Admin",
  "Resume",
  "Dashboard",
  "Login",
  "Blog",
  "Social",
  "Popular",
  "Month",
  "Status",
  "Horizon",
  "Confidence",
  "Demand",
  "Pathway",
  "Caveats",
  "Resource",
  "Help",
  "Search",
  // Loanwords / international terms that are standard in target languages
  "Freelance",
  "Legal",
  "Lead / Manager",
]);

/**
 * Extract {var} names from a string.
 * @param {string} s
 * @returns {string[]}
 */
function vars(s) {
  const out = [];
  const re = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    out.push(m[1]);
  }
  return out.sort();
}

/**
 * Flatten a nested dictionary into { "a.b.c": value }.
 * @param {unknown} obj
 * @param {string} prefix
 * @param {Record<string, unknown>} out
 */
function flatten(obj, prefix, out) {
  if (obj === null || obj === undefined) return;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    out[prefix] = obj;
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
}

async function loadLocale(name) {
  const file = path.join(MESSAGES_DIR, `${name}.json`);
  const raw = await readFile(file, "utf8");
  const json = JSON.parse(raw);
  const flat = {};
  flatten(json, "", flat);
  return flat;
}

async function main() {
  let entries;
  try {
    entries = await readdir(MESSAGES_DIR);
  } catch (err) {
    console.error(`Cannot read messages dir: ${MESSAGES_DIR}`);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const locales = entries
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();

  if (!locales.includes("en")) {
    console.error("messages/en.json not found — cannot determine source keys.");
    process.exit(1);
  }

  const en = await loadLocale("en");
  const enKeys = Object.keys(en).sort();

  console.log(`i18n check — locales: ${locales.join(", ")}`);
  console.log(`English keys: ${enKeys.length}`);
  if (STRICT) console.log("Mode: STRICT (English-identical values are errors)");

  let hardErrors = 0;
  let softWarnings = 0;

  for (const locale of locales) {
    if (locale === "en") continue;

    const dict = await loadLocale(locale);
    const dictKeys = new Set(Object.keys(dict));
    const enKeySet = new Set(enKeys);

    const missing = enKeys.filter((k) => !dictKeys.has(k));
    const extra = Object.keys(dict).filter((k) => !enKeySet.has(k));
    const empty = [];
    const varMismatch = [];
    const identicalToEn = [];

    for (const key of enKeys) {
      const enVal = en[key];
      const locVal = dict[key];
      if (locVal === undefined) continue;

      if (typeof locVal === "string" && locVal.trim() === "") {
        empty.push(key);
        continue;
      }

      if (typeof enVal === "string" && typeof locVal === "string") {
        const enVars = vars(enVal);
        const locVars = vars(locVal);
        if (enVars.join(",") !== locVars.join(",")) {
          varMismatch.push({
            key,
            en: enVars.join(",") || "(none)",
            loc: locVars.join(",") || "(none)",
          });
        }

        if (
          locVal === enVal &&
          enVal.trim().length > 2 &&
          !ALLOWED_IDENTICAL.has(enVal)
        ) {
          identicalToEn.push(key);
        }
      }
    }

    const localeHardErrors =
      missing.length + extra.length + empty.length + varMismatch.length;
    const localeSoft = identicalToEn.length;

    const status = localeHardErrors === 0 ? "OK" : "FAIL";
    console.log("");
    console.log(`── ${locale} [${status}]`);
    console.log(`   keys: ${Object.keys(dict).length}/${enKeys.length}`);

    if (missing.length > 0) {
      console.log(`   ❌ missing keys (${missing.length}):`);
      for (const k of missing.slice(0, 20)) console.log(`      - ${k}`);
      if (missing.length > 20) console.log(`      … +${missing.length - 20} more`);
    }

    if (extra.length > 0) {
      console.log(`   ❌ extra keys (${extra.length}):`);
      for (const k of extra.slice(0, 20)) console.log(`      + ${k}`);
      if (extra.length > 20) console.log(`      … +${extra.length - 20} more`);
    }

    if (empty.length > 0) {
      console.log(`   ❌ empty values (${empty.length}):`);
      for (const k of empty.slice(0, 20)) console.log(`      ∅ ${k}`);
      if (empty.length > 20) console.log(`      … +${empty.length - 20} more`);
    }

    if (varMismatch.length > 0) {
      console.log(`   ❌ interpolation mismatch (${varMismatch.length}):`);
      for (const v of varMismatch.slice(0, 20)) {
        console.log(`      ⚠ ${v.key}  en={${v.en}}  ${locale}={${v.loc}}`);
      }
      if (varMismatch.length > 20) {
        console.log(`      … +${varMismatch.length - 20} more`);
      }
    }

    if (localeSoft > 0) {
      const label = STRICT ? "❌" : "⚠️";
      console.log(`   ${label} identical-to-English values (${localeSoft}):`);
      for (const k of identicalToEn.slice(0, 10)) console.log(`      ~ ${k}`);
      if (localeSoft > 10) console.log(`      … +${localeSoft - 10} more`);
    }

    if (STRICT) {
      hardErrors += localeHardErrors + localeSoft;
    } else {
      hardErrors += localeHardErrors;
      softWarnings += localeSoft;
    }
  }

  console.log("");
  console.log("=".repeat(60));
  if (hardErrors === 0) {
    console.log(`✅ i18n check PASSED`);
    if (softWarnings > 0) {
      console.log(`   ${softWarnings} English-identical values (warnings only).`);
      console.log(`   Run with --strict to fail on them.`);
    }
    process.exit(0);
  } else {
    console.log(`❌ i18n check FAILED — ${hardErrors} error(s).`);
    if (softWarnings > 0) {
      console.log(`   plus ${softWarnings} English-identical warning(s).`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
