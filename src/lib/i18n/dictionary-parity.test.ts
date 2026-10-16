import { describe, it, expect } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import ar from "../../../messages/ar.json";
import fa from "../../../messages/fa.json";
import hi from "../../../messages/hi.json";
import fr from "../../../messages/fr.json";
import de from "../../../messages/de.json";
import pt from "../../../messages/pt.json";
import tr from "../../../messages/tr.json";
import zh from "../../../messages/zh.json";
import ja from "../../../messages/ja.json";
import id from "../../../messages/id.json";

type Dict = Record<string, unknown>;

function collectKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return prefix ? [prefix] : [];
  }
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Dict)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...collectKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const locales: Record<string, Dict> = {
  en: en as Dict,
  es: es as Dict,
  ar: ar as Dict,
  fa: fa as Dict,
  hi: hi as Dict,
  fr: fr as Dict,
  de: de as Dict,
  pt: pt as Dict,
  tr: tr as Dict,
  zh: zh as Dict,
  ja: ja as Dict,
  id: id as Dict,
};

describe("i18n dictionary key parity vs en", () => {
  const enKeys = new Set(collectKeys(locales.en).sort());

  for (const locale of [
    "es",
    "ar",
    "fa",
    "hi",
    "fr",
    "de",
    "pt",
    "tr",
    "zh",
    "ja",
    "id",
  ] as const) {
    it(`${locale} has no extra top-level gaps vs en (missing keys reported)`, () => {
      const keys = new Set(collectKeys(locales[locale]));
      const missing = [...enKeys].filter((k) => !keys.has(k));
      // Allow deep-merge runtime fallback, but fail CI if >5% keys missing
      const ratio = missing.length / Math.max(enKeys.size, 1);
      expect(
        ratio,
        missing.slice(0, 30).join(", ") +
          (missing.length > 30 ? ` … (+${missing.length - 30})` : "")
      ).toBeLessThan(0.05);
    });
  }

  it("all 12 locales are registered and non-empty", () => {
    for (const [code, dict] of Object.entries(locales)) {
      expect(Object.keys(dict).length).toBeGreaterThan(5);
      expect(dict.Nav).toBeTruthy();
    }
  });
});
