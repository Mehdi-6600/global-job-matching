import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";
import ar from "../../../messages/ar.json";
import es from "../../../messages/es.json";
import fr from "../../../messages/fr.json";
import hi from "../../../messages/hi.json";

type Dict = Record<string, unknown>;

export const LOCALES = ["en", "fa", "ar", "es", "fr", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

export const dictionaries: Record<Locale, Dict> = {
  en: en as Dict,
  fa: fa as Dict,
  ar: ar as Dict,
  es: es as Dict,
  fr: fr as Dict,
  hi: hi as Dict,
};

/** Flatten nested JSON keys to dot paths */
export function flattenKeys(
  obj: Dict,
  prefix = ""
): string[] {
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

export function findMissingKeys(
  base: Dict,
  other: Dict
): string[] {
  const baseKeys = new Set(flattenKeys(base));
  const otherKeys = new Set(flattenKeys(other));
  return [...baseKeys].filter((k) => !otherKeys.has(k)).sort();
}

/** Compare all locales against English; returns map locale → missing keys */
export function auditDictionaryCompleteness(): Record<
  string,
  { missing: string[]; extra: string[] }
> {
  const enKeys = new Set(flattenKeys(dictionaries.en));
  const report: Record<string, { missing: string[]; extra: string[] }> = {};

  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const keys = new Set(flattenKeys(dictionaries[locale]));
    const missing = [...enKeys].filter((k) => !keys.has(k)).sort();
    const extra = [...keys].filter((k) => !enKeys.has(k)).sort();
    report[locale] = { missing, extra };
  }

  return report;
}
