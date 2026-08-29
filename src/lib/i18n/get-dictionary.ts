import type { Locale } from "./config";
import { defaultLocale } from "./config";

import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import ar from "../../../messages/ar.json";
import fa from "../../../messages/fa.json";
import hi from "../../../messages/hi.json";
import fr from "../../../messages/fr.json";

const dictionaries: Record<Locale, typeof en> = {
  en,
  es,
  ar,
  fa,
  hi,
  fr,
};

export type Dictionary = typeof en;

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
