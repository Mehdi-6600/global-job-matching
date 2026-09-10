import { describe, it, expect } from "vitest";
import { stripHtmlToText, isSafeHttpUrl } from "./sanitize-text";

describe("stripHtmlToText", () => {
  it("removes tags", () => {
    expect(stripHtmlToText("<b>Hello</b> world")).toBe("Hello world");
  });

  it("strips script blocks", () => {
    expect(stripHtmlToText('<script>alert(1)</script>Hi')).toBe("Hi");
  });
});

describe("isSafeHttpUrl", () => {
  it("allows https", () => {
    expect(isSafeHttpUrl("https://example.com")).toBe(true);
  });

  it("rejects javascript", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
  });
});
