import type { Locale } from "./config";
import { defaultLocale } from "./config";

import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import ar from "../../../messages/ar.json";
import fa from "../../../messages/fa.json";
import hi from "../../../messages/hi.json";
import fr from "../../../messages/fr.json";

export type Dictionary = Record<string, unknown>;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge overlay onto base (base fills missing keys). */
export function deepMergeDictionary(
  base: Dictionary,
  overlay: Dictionary
): Dictionary {
  const out: Dictionary = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (isObject(value) && isObject(out[key])) {
      out[key] = deepMergeDictionary(
        out[key] as Dictionary,
        value as Dictionary
      );
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

const raw: Record<Locale, Dictionary> = {
  en: en as Dictionary,
  es: es as Dictionary,
  ar: ar as Dictionary,
  fa: fa as Dictionary,
  hi: hi as Dictionary,
  fr: fr as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  const primary = raw[locale] || raw[defaultLocale];
  if (locale === "en") {
    return primary;
  }
  // Missing keys always fall back to English
  return deepMergeDictionary(raw.en, primary);
}

/** Nested key: "Nav.jobs" */
export function t(
  dict: Dictionary,
  key: string,
  fallback?: string
): string {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return fallback ?? key;
    }
  }
  return typeof cur === "string" ? cur : fallback ?? key;
}
