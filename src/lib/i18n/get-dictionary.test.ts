import { describe, it, expect } from "vitest";
import { t, getDictionary } from "./get-dictionary";
import { locales } from "./config";

describe("getDictionary + t", () => {
  it("loads English dictionary", () => {
    const dict = getDictionary("en");
    expect(dict).toBeTruthy();
    expect(t(dict, "Nav.home")).toBe("Home");
  });

  it("loads Persian dictionary", () => {
    const dict = getDictionary("fa");
    expect(t(dict, "Nav.home")).toBe("خانه");
  });

  it("loads every product locale without throwing", () => {
    for (const locale of locales) {
      const dict = getDictionary(locale);
      expect(dict).toBeTruthy();
      expect(typeof t(dict, "Nav.home")).toBe("string");
      expect(t(dict, "Nav.home").length).toBeGreaterThan(0);
    }
  });

  it("returns fallback for missing keys", () => {
    const dict = getDictionary("en");
    expect(t(dict, "Does.Not.Exist", "fallback")).toBe("fallback");
  });

  it("returns key when no fallback", () => {
    const dict = getDictionary("en");
    expect(t(dict, "Missing.Key")).toBe("Missing.Key");
  });
});
