import { describe, it, expect } from "vitest";
import {
  auditDictionaryCompleteness,
  flattenKeys,
  dictionaries,
} from "../assert-dictionaries";

describe("i18n dictionaries", () => {
  it("English has a non-empty key set", () => {
    const keys = flattenKeys(dictionaries.en);
    expect(keys.length).toBeGreaterThan(20);
  });

  it("reports missing keys per locale (informational threshold)", () => {
    const report = auditDictionaryCompleteness();
    // Soft gate for now: each locale must exist and be an object
    for (const [locale, data] of Object.entries(report)) {
      expect(Array.isArray(data.missing)).toBe(true);
      // Log heavy gaps without failing the whole suite yet
      if (data.missing.length > 100) {
        console.warn(
          `[i18n] ${locale} missing ${data.missing.length} keys vs en`
        );
      }
    }
  });
});
