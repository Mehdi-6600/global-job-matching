import { describe, it, expect } from "vitest";
import { locales } from "@/lib/i18n/config";
import {
  ogLocaleByAppLocale,
  toOgLocale,
  allOgLocales,
} from "@/lib/i18n/og-locale";

describe("og-locale", () => {
  it("maps every product locale to an OG tag", () => {
    for (const locale of locales) {
      expect(ogLocaleByAppLocale[locale]).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
      expect(toOgLocale(locale)).toBe(ogLocaleByAppLocale[locale]);
    }
  });

  it("covers all 7 locales in allOgLocales", () => {
    const all = allOgLocales();
    expect(all).toHaveLength(7);
    expect(all).toContain("en_US");
    expect(all).toContain("fa_IR");
    expect(all).toContain("de_DE");
  });
});
