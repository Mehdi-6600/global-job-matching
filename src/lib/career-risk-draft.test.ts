import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveCareerRiskDraft,
  loadCareerRiskDraft,
  clearCareerRiskDraft,
  markCareerRiskDraftAutoSubmit,
} from "@/lib/career-risk-draft";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
  vi.stubGlobal("window", globalThis);
});

describe("career-risk-draft", () => {
  it("saves and loads form with autoSubmit flag", () => {
    saveCareerRiskDraft(
      {
        jobTitle: "Physiotherapist",
        country: "Iran",
        location: "Tehran",
        skills: "Rehab",
      },
      { autoSubmit: true }
    );
    const draft = loadCareerRiskDraft();
    expect(draft).not.toBeNull();
    expect(draft?.form.jobTitle).toBe("Physiotherapist");
    expect(draft?.form.country).toBe("Iran");
    expect(draft?.autoSubmit).toBe(true);
  });

  it("clears draft", () => {
    saveCareerRiskDraft({ jobTitle: "Dev" }, { autoSubmit: false });
    clearCareerRiskDraft();
    expect(loadCareerRiskDraft()).toBeNull();
  });

  it("markCareerRiskDraftAutoSubmit updates flag", () => {
    saveCareerRiskDraft({ jobTitle: "Nurse" }, { autoSubmit: false });
    markCareerRiskDraftAutoSubmit(true);
    expect(loadCareerRiskDraft()?.autoSubmit).toBe(true);
  });
});
