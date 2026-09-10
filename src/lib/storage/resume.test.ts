import { describe, it, expect } from "vitest";
import {
  isPdfMagic,
  isHttpUrl,
  sanitizeResumeFilename,
} from "./resume";

describe("isPdfMagic", () => {
  it("accepts %PDF header", () => {
    const buf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(isPdfMagic(buf)).toBe(true);
  });

  it("rejects non-pdf", () => {
    const buf = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(isPdfMagic(buf)).toBe(false);
  });
});

describe("sanitizeResumeFilename", () => {
  it("strips unsafe chars and ensures .pdf", () => {
    expect(sanitizeResumeFilename("../../etc/passwd")).toMatch(/\.pdf$/);
    expect(sanitizeResumeFilename("My Resume (final).PDF").toLowerCase()).toContain(
      ".pdf"
    );
  });
});

describe("isHttpUrl", () => {
  it("detects http(s)", () => {
    expect(isHttpUrl("https://example.com/a.pdf")).toBe(true);
    expect(isHttpUrl("not-a-url")).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
  });
});
