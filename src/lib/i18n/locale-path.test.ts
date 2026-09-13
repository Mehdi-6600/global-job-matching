import { describe, it, expect } from "vitest";
import {
  parseLocalePath,
  stripLocaleFromPathname,
  localizePath,
} from "@/lib/i18n/locale-path";

describe("locale-path", () => {
  it("parses prefixed paths", () => {
    expect(parseLocalePath("/fa/jobs")).toEqual({
      localeFromPath: "fa",
      pathname: "/jobs",
    });
    expect(parseLocalePath("/de")).toEqual({
      localeFromPath: "de",
      pathname: "/",
    });
  });

  it("parses bare paths", () => {
    expect(parseLocalePath("/jobs")).toEqual({
      localeFromPath: null,
      pathname: "/jobs",
    });
  });

  it("localizePath uses no prefix for English", () => {
    expect(localizePath("/jobs", "en")).toBe("/jobs");
    expect(localizePath("/jobs", "fa")).toBe("/fa/jobs");
    expect(localizePath("/", "ar")).toBe("/ar");
    expect(localizePath("/", "en")).toBe("/");
  });

  it("strip is idempotent", () => {
    expect(stripLocaleFromPathname("/fa/jobs")).toBe("/jobs");
    expect(stripLocaleFromPathname("/jobs")).toBe("/jobs");
  });
});
