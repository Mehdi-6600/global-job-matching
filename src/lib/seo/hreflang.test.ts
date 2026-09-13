import { describe, it, expect } from "vitest";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { buildHreflangLanguages } from "@/lib/seo/hreflang";
import { localizePath } from "@/lib/i18n/locale-path";

describe("hreflang — all 7 languages", () => {
  it("emits every product locale plus x-default for /jobs", () => {
    const languages = buildHreflangLanguages("/jobs");
    for (const locale of locales) {
      expect(languages[locale]).toBeTruthy();
      expect(languages[locale]).toContain(
        localizePath("/jobs", locale) === "/jobs"
          ? "/jobs"
          : `/${locale}/jobs`
      );
    }
    expect(languages["x-default"]).toBeTruthy();
    expect(languages[defaultLocale]).toBe(languages["x-default"]);
  });

  it("uses unprefixed URL only for English default", () => {
    const languages = buildHreflangLanguages("/about");
    expect(languages.en).not.toContain("/en/");
    expect(languages.es).toContain("/es/about");
    expect(languages.ar).toContain("/ar/about");
    expect(languages.fa).toContain("/fa/about");
    expect(languages.hi).toContain("/hi/about");
    expect(languages.fr).toContain("/fr/about");
    expect(languages.de).toContain("/de/about");
  });

  it("covers dynamic job paths for all locales", () => {
    const languages = buildHreflangLanguages("/jobs/abc123");
    expect(Object.keys(languages).sort()).toEqual(
      [...locales, "x-default"].sort()
    );
    expect(languages.de).toContain("/de/jobs/abc123");
    expect(languages.hi).toContain("/hi/jobs/abc123");
  });
});
