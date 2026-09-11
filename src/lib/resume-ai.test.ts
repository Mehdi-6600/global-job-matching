import { describe, expect, it } from "vitest";
import {
  isWeakResumeOutput,
  looksHallucinated,
  normalizeTone,
  scrubResumeText,
  toneInstruction,
} from "@/lib/resume-ai";

describe("normalizeTone", () => {
  it("accepts known tones", () => {
    expect(normalizeTone("confident")).toBe("confident");
    expect(normalizeTone("concise")).toBe("concise");
    expect(normalizeTone("professional")).toBe("professional");
  });
  it("defaults unknown", () => {
    expect(normalizeTone("loud")).toBe("professional");
  });
});

describe("toneInstruction", () => {
  it("returns non-empty for all tones", () => {
    expect(toneInstruction("professional").length).toBeGreaterThan(10);
    expect(toneInstruction("confident")).toMatch(/confident/i);
    expect(toneInstruction("concise")).toMatch(/concise/i);
  });
});

describe("isWeakResumeOutput", () => {
  it("flags short or refusal text", () => {
    expect(isWeakResumeOutput("hi")).toBe(true);
    expect(isWeakResumeOutput("I'm sorry I cannot help with that")).toBe(true);
  });
  it("accepts longer text", () => {
    expect(
      isWeakResumeOutput(
        "SUMMARY\nExperienced developer with strong React skills and product focus."
      )
    ).toBe(false);
  });
});

describe("looksHallucinated", () => {
  it("flags invented tenure when experience empty", () => {
    const text =
      "EXPERIENCE\n- Senior Engineer at Acme Corp 2019-2023\n- Built platforms";
    expect(looksHallucinated(text, { experience: "", education: "" })).toBe(
      true
    );
  });
  it("allows tenure when user provided experience", () => {
    const text = "EXPERIENCE\n- Engineer at Acme 2019-2023";
    expect(
      looksHallucinated(text, {
        experience: "Acme Corp engineer 2019-2023",
        education: "",
      })
    ).toBe(false);
  });
});

describe("scrubResumeText", () => {
  it("strips tags and fences", () => {
    expect(scrubResumeText("<b>Hi</b> ```x```")).not.toMatch(/</);
  });
});
