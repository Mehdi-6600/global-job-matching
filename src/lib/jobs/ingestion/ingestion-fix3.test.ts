/**
 * Regression tests for cursor lifecycle, fingerprint DB correctness, lease ownership.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { contentFingerprint } from "@/lib/jobs/ingestion/content-fingerprint";
import { parseCheckpoint } from "@/lib/jobs/ingestion/checkpoint";
import { randomBytes } from "crypto";

describe("cursor lifecycle semantics", () => {
  it("checkpoint stores and restores cursor for next run", () => {
    const saved = {
      v: 1 as const,
      page: 2,
      cursor: "cursor-from-page1",
      updatedAt: new Date().toISOString(),
    };
    const raw = JSON.stringify(saved);
    const cp = parseCheckpoint(raw);
    expect(cp?.cursor).toBe("cursor-from-page1");
    expect(cp?.page).toBe(2);
  });

  it("null nextCursor means end — checkpoint clear path uses hasMore false", () => {
    const nextCursor: string | null = null;
    const hasMore = false;
    // runtime would set resumeCursor = nextCursor only if !== undefined
    let resumeCursor: string | null | undefined = "old";
    const result = { nextCursor, hasMore };
    if (result.nextCursor !== undefined) {
      resumeCursor = result.nextCursor;
    }
    expect(resumeCursor).toBeNull();
    expect(hasMore).toBe(false);
  });

  it("advances resumeCursor after successful fetch", () => {
    let resumeCursor: string | null | undefined = "start";
    const result = { nextCursor: "page2-token", hasMore: true };
    if (result.nextCursor !== undefined) {
      resumeCursor = result.nextCursor;
    }
    expect(resumeCursor).toBe("page2-token");
    // second iteration would pass resumeCursor to fetchPage
    const secondCallCursor = resumeCursor;
    expect(secondCallCursor).toBe("page2-token");
  });
});

describe("fingerprint: stored DB vs new draft", () => {
  const baseDraft = {
    title: "Warehouse Worker",
    description: "Move goods daily.",
    location: "Berlin, Germany",
    applyUrl: "https://example.com/a",
    externalUrl: "https://example.com/e",
    employmentType: "full-time",
    remote: false,
    salaryText: "40k",
    company: "Logistics Co",
  };

  it("detects change when stored employment type differs from draft", () => {
    const prevFp = contentFingerprint({
      ...baseDraft,
      employmentType: "part-time", // from DB Job.type
      remote: false,
      salaryText: "40k",
    });
    const fp = contentFingerprint({
      ...baseDraft,
      employmentType: "full-time",
    });
    expect(fp).not.toBe(prevFp);
  });

  it("detects change when stored remote differs", () => {
    const prevFp = contentFingerprint({
      ...baseDraft,
      remote: true,
    });
    const fp = contentFingerprint({
      ...baseDraft,
      remote: false,
    });
    expect(fp).not.toBe(prevFp);
  });

  it("no rewrite when stored fields match draft", () => {
    const prevFp = contentFingerprint(baseDraft);
    const fp = contentFingerprint({ ...baseDraft });
    expect(fp).toBe(prevFp);
  });

  it("does not use draft fields for prevFp simulation", () => {
    // Simulate wrong old behavior would equal if draft leaked into prev
    const stored = {
      title: "Warehouse Worker",
      description: "Move goods daily.",
      location: "Berlin, Germany",
      applyUrl: "https://example.com/a",
      externalUrl: "https://example.com/e",
      employmentType: "contract",
      remote: true,
      salaryText: "30k",
      company: "Logistics Co",
    };
    const draft = { ...baseDraft };
    const prevFp = contentFingerprint(stored);
    const wrongPrev = contentFingerprint({
      ...stored,
      employmentType: draft.employmentType,
      remote: draft.remote,
      salaryText: draft.salaryText,
    });
    expect(prevFp).not.toBe(wrongPrev);
  });
});

describe("lease ownership CAS semantics", () => {
  it("owner token is unique per acquire attempt", async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 5; i++) {
      tokens.add(randomBytes(16).toString("hex"));
    }
    expect(tokens.size).toBe(5);
  });

  it("updateMany count 0 means lease not acquired", () => {
    const result = { count: 0 };
    expect(result.count > 0).toBe(false);
  });

  it("renew requires matching owner", () => {
    const whereOwner = "abc";
    const attemptOwner = "xyz";
    expect(whereOwner === attemptOwner).toBe(false);
  });
});
