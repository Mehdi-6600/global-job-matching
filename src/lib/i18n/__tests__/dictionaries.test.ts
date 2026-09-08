import { describe, it, expect } from "vitest";
import {
  auditDictionaryCompleteness,
  flattenKeys,
  dictionaries,
  LOCALES,
  findEmptyKeys,
} from "../assert-dictionaries";

describe("i18n dictionaries", () => {
  it("includes all 7 product locales", () => {
    expect(LOCALES).toEqual(
      expect.arrayContaining(["en", "es", "ar", "fa", "hi", "fr", "de"])
    );
    expect(LOCALES).toHaveLength(7);
  });

  it("English has a non-empty key set", () => {
    const keys = flattenKeys(dictionaries.en);
    expect(keys.length).toBeGreaterThan(20);
  });

  it("English has no empty translation values", () => {
    expect(findEmptyKeys(dictionaries.en)).toEqual([]);
  });

  it("every locale matches English keys exactly (no missing, no extra)", () => {
    const report = auditDictionaryCompleteness();
    for (const [locale, data] of Object.entries(report)) {
      expect(data.missing, `${locale} missing keys`).toEqual([]);
      expect(data.extra, `${locale} extra keys`).toEqual([]);
      expect(data.empty, `${locale} empty values`).toEqual([]);
    }
  });
});
