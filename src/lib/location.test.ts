import { describe, it, expect } from "vitest";
import { normalizeLocation } from "./location";

describe("normalizeLocation", () => {
  it("returns null for empty values", () => {
    expect(normalizeLocation(null)).toBeNull();
    expect(normalizeLocation(undefined)).toBeNull();
    expect(normalizeLocation("")).toBeNull();
    expect(normalizeLocation("   ")).toBeNull();
  });

  it("dedupes repeated city/country", () => {
    expect(normalizeLocation("London, London")).toBe("London");
    expect(normalizeLocation("United Kingdom, United Kingdom")).toBe(
      "United Kingdom"
    );
  });

  it("keeps distinct parts in order", () => {
    expect(normalizeLocation("Berlin, Germany")).toBe("Berlin, Germany");
    expect(normalizeLocation("Berlin, Germany, Germany")).toBe(
      "Berlin, Germany"
    );
  });

  it("is case-insensitive for duplicates", () => {
    expect(normalizeLocation("London, london")).toBe("London");
  });

  it("trims whitespace around parts", () => {
    expect(normalizeLocation("  Paris ,  France  ")).toBe("Paris, France");
  });
});
