import { describe, it, expect } from "vitest";
import {
  shouldNoindexListingUrl,
  isPublicListingPath,
} from "@/lib/seo/listing-policy";

describe("listing-policy noindex rules", () => {
  it("indexes clean listing paths", () => {
    expect(shouldNoindexListingUrl("/jobs", "")).toBe(false);
    expect(shouldNoindexListingUrl("/companies", "")).toBe(false);
    expect(shouldNoindexListingUrl("/search", "")).toBe(false);
  });

  it("noindexes filtered query strings on listing paths", () => {
    expect(shouldNoindexListingUrl("/jobs", "q=react")).toBe(true);
    expect(shouldNoindexListingUrl("/jobs", "page=2")).toBe(true);
    expect(shouldNoindexListingUrl("/search", "location=berlin")).toBe(true);
  });

  it("respects locale prefixes when stripping", () => {
    expect(shouldNoindexListingUrl("/fa/jobs", "")).toBe(false);
    expect(shouldNoindexListingUrl("/de/jobs", "remote=1")).toBe(true);
  });

  it("does not treat private paths as public listings", () => {
    expect(isPublicListingPath("/dashboard")).toBe(false);
    expect(isPublicListingPath("/jobs")).toBe(true);
  });
});
