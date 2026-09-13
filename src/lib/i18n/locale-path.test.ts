import { describe, it, expect } from "vitest";
import {
  parseLocalePath,
  stripLocaleFromPathname,
  localizePath,
  isLocalePrefixedPath,
} from "@/lib/i18n/locale-path";
import { locales } from "@/lib/i18n/config";

describe("locale-path helpers", () => {
  it("detects prefixed paths for every non-default locale", () => {
    for (const locale of locales) {
      if (locale === "en") {
        expect(isLocalePrefixedPath("/jobs")).toBe(false);
        continue;
      }
      expect(isLocalePrefixedPath(`/${locale}/jobs`)).toBe(true);
      expect(stripLocaleFromPathname(`/${locale}/jobs`)).toBe("/jobs");
    }
  });

  it("parseLocalePath extracts locale and rest", () => {
    const fa = parseLocalePath("/fa/career-risk");
    expect(fa.locale).toBe("fa");
    expect(fa.pathname).toBe("/career-risk");

    const bare = parseLocalePath("/career-risk");
    expect(bare.locale).toBe("en");
    expect(bare.pathname).toBe("/career-risk");
  });

  it("localizePath is idempotent for en", () => {
    expect(localizePath("/companies", "en")).toBe("/companies");
    expect(localizePath("/companies", "de")).toBe("/de/companies");
  });
});
