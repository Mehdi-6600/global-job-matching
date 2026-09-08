import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";
import ar from "../../../messages/ar.json";
import es from "../../../messages/es.json";
import fr from "../../../messages/fr.json";
import hi from "../../../messages/hi.json";
import de from "../../../messages/de.json";

type Dict = Record<string, unknown>;

/** All product locales — must stay in sync with config.ts */
export const LOCALES = ["en", "fa", "ar", "es", "fr", "hi", "de"] as const;
export type AssertLocale = (typeof LOCALES)[number];

export const dictionaries: Record<AssertLocale, Dict> = {
  en: en as Dict,
  fa: fa as Dict,
  ar: ar as Dict,
  es: es as Dict,
  fr: fr as Dict,
  hi: hi as Dict,
  de: de as Dict,
};

/** Flatten nested JSON keys to dot paths */
export function flattenKeys(obj: Dict, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Dict, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

export function findMissingKeys(base: Dict, other: Dict): string[] {
  const baseKeys = new Set(flattenKeys(base));
  const otherKeys = new Set(flattenKeys(other));
  return [...baseKeys].filter((k) => !otherKeys.has(k)).sort();
}

export function findEmptyKeys(obj: Dict, prefix = ""): string[] {
  const empty: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      empty.push(...findEmptyKeys(v as Dict, path));
    } else if (typeof v === "string" && v.trim() === "") {
      empty.push(path);
    } else if (v === null || v === undefined) {
      empty.push(path);
    }
  }
  return empty;
}

/** Compare all locales against English */
export function auditDictionaryCompleteness(): Record<
  string,
  { missing: string[]; extra: string[]; empty: string[] }
> {
  const enKeys = new Set(flattenKeys(dictionaries.en));
  const report: Record<
    string,
    { missing: string[]; extra: string[]; empty: string[] }
  > = {};

  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const keys = new Set(flattenKeys(dictionaries[locale]));
    const missing = [...enKeys].filter((k) => !keys.has(k)).sort();
    const extra = [...keys].filter((k) => !enKeys.has(k)).sort();
    const empty = findEmptyKeys(dictionaries[locale]);
    report[locale] = { missing, extra, empty };
  }

  return report;
}
