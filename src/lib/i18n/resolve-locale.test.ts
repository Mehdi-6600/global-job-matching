import { describe, it, expect } from "vitest";
import { resolveLocale, resolveLocaleFromCandidates } from "./resolve-locale";
import { defaultLocale } from "./config";

describe("resolveLocale", () => {
  it("returns valid locales", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("fa")).toBe("fa");
    expect(resolveLocale("de")).toBe("de");
  });

  it("falls back for undefined/null/invalid", () => {
    expect(resolveLocale(undefined)).toBe(defaultLocale);
    expect(resolveLocale(null)).toBe(defaultLocale);
    expect(resolveLocale("")).toBe(defaultLocale);
    expect(resolveLocale("xx")).toBe(defaultLocale);
    expect(resolveLocale(123)).toBe(defaultLocale);
  });

  it("resolveLocaleFromCandidates picks first valid", () => {
    expect(resolveLocaleFromCandidates(undefined, "fa", "en")).toBe("fa");
    expect(resolveLocaleFromCandidates("bad", null, "de")).toBe("de");
    expect(resolveLocaleFromCandidates("bad", null)).toBe(defaultLocale);
  });
});
