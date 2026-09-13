import { describe, it, expect } from "vitest";
import {
  locales,
  defaultLocale,
  isLocale,
  isRtlLocale,
  localeLabels,
  LOCALE_COOKIE,
} from "@/lib/i18n/config";

describe("i18n config", () => {
  it("exposes 7 locales with English default", () => {
    expect(locales).toHaveLength(7);
    expect(defaultLocale).toBe("en");
    expect(LOCALE_COOKIE).toBe("NEXT_LOCALE");
  });

  it("isLocale guards values", () => {
    expect(isLocale("fa")).toBe(true);
    expect(isLocale("xx")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("has labels for every locale", () => {
    for (const locale of locales) {
      expect(localeLabels[locale].length).toBeGreaterThan(0);
    }
  });

  it("RTL set is only ar and fa", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("fa")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
  });
});
