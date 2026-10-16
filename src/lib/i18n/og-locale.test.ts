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

  it("covers all 12 locales in allOgLocales", () => {
    const all = allOgLocales();
    expect(all).toHaveLength(12);
    expect(all).toContain("en_US");
    expect(all).toContain("fa_IR");
    expect(all).toContain("de_DE");
    expect(all).toContain("pt_BR");
    expect(all).toContain("tr_TR");
    expect(all).toContain("zh_CN");
    expect(all).toContain("ja_JP");
    expect(all).toContain("id_ID");
  });
});
