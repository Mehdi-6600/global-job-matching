import type { Locale } from "./config";
import { defaultLocale } from "./config";

import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import ar from "../../../messages/ar.json";
import fa from "../../../messages/fa.json";
import hi from "../../../messages/hi.json";
import fr from "../../../messages/fr.json";

/** Loose type so all locale files can differ slightly */
export type Dictionary = Record<string, unknown>;

const dictionaries: Record<Locale, Dictionary> = {
  en: en as Dictionary,
  es: es as Dictionary,
  ar: ar as Dictionary,
  fa: fa as Dictionary,
  hi: hi as Dictionary,
  fr: fr as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries[defaultLocale];
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
