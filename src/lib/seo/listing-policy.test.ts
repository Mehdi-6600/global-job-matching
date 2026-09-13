import { describe, it, expect } from "vitest";
import {
  LISTING_PATHS_NOINDEX_QUERY,
  pathShouldNoindexWhenQueried,
  urlHasIndexableQueryNoise,
} from "@/lib/seo/listing-policy";

describe("listing-policy", () => {
  it("includes core public listing paths", () => {
    expect(LISTING_PATHS_NOINDEX_QUERY).toEqual(
      expect.arrayContaining([
        "/jobs",
        "/search",
        "/companies",
        "/locations",
        "/categories",
        "/blog",
      ])
    );
  });

  it("pathShouldNoindexWhenQueried matches listing roots", () => {
    expect(pathShouldNoindexWhenQueried("/jobs")).toBe(true);
    expect(pathShouldNoindexWhenQueried("/jobs/")).toBe(true);
    expect(pathShouldNoindexWhenQueried("/search")).toBe(true);
    expect(pathShouldNoindexWhenQueried("/about")).toBe(false);
    expect(pathShouldNoindexWhenQueried("/jobs/abc")).toBe(false);
  });

  it("urlHasIndexableQueryNoise detects non-empty params", () => {
    expect(urlHasIndexableQueryNoise(new URLSearchParams())).toBe(false);
    expect(urlHasIndexableQueryNoise(new URLSearchParams("q="))).toBe(false);
    expect(urlHasIndexableQueryNoise(new URLSearchParams("q=dev"))).toBe(true);
    expect(
      urlHasIndexableQueryNoise(new URLSearchParams("page=2&remote=1"))
    ).toBe(true);
  });
});
