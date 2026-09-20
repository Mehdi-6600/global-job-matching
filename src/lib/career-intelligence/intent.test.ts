/**
 * Intent classification tests — Phase 5.
 */
import { describe, it, expect } from "vitest";
import { classifyIntent, intentLabel, CAREER_INTENTS } from "./intent";

describe("intent classification", () => {
  it("classifies risk-related questions as risk_analysis", () => {
    for (const q of [
      "Is my job at risk of automation?",
      "Will AI replace my role?",
      "ریسک شغلی من چقدره؟",
      "ما هو خطر الأتمتة على وظيفتي؟",
    ]) {
      const r = classifyIntent({ question: q });
      expect(r.intent).toBe("risk_analysis");
      expect(r.confidence).toBeGreaterThan(0);
    }
  });

  it("classifies skill questions as skill_gap", () => {
    for (const q of [
      "What skills should I learn next?",
      "چه مهارت‌هایی یاد بگیرم؟",
      "¿Qué habilidades debería aprender?",
    ]) {
      const r = classifyIntent({ question: q });
      expect(r.intent).toBe("skill_gap");
    }
  });

  it("classifies migration questions as migration", () => {
    for (const q of [
      "Can I immigrate to Germany?",
      "چطور می‌توانم مهاجرت کنم؟",
      "¿Cómo puedo migrar a Canadá?",
    ]) {
      const r = classifyIntent({ question: q });
      expect(r.intent).toBe("migration");
    }
  });

  it("falls back to general for vague input", () => {
    const r = classifyIntent({ question: "hello" });
    expect(r.intent).toBe("general");
    expect(r.confidence).toBeLessThan(0.5);
  });

  it("uses profile signals when the question is empty", () => {
    const r = classifyIntent({
      question: "",
      profile: {
        ...({
          currentRole: "Engineer",
        } as never),
        transition: {
          fromFamily: "software_engineering",
          toFamily: "management",
          fromRole: "Engineer",
          toRole: "Manager",
          bridgeSkills: [],
          gapSkills: [],
        },
      } as never,
    });
    expect(r.intent).toBe("career_transition");
  });

  it("is deterministic for the same input", () => {
    const a = classifyIntent({ question: "Will AI replace my role?" });
    const b = classifyIntent({ question: "Will AI replace my role?" });
    expect(a).toEqual(b);
  });

  it("includes every intent in CAREER_INTENTS", () => {
    expect(CAREER_INTENTS.length).toBeGreaterThan(0);
    expect(CAREER_INTENTS).toContain("risk_analysis");
    expect(CAREER_INTENTS).toContain("migration");
  });

  it("intentLabel returns non-empty text for every intent and locale", () => {
    const locales = ["en", "fa", "ar", "es", "fr", "de", "hi"] as const;
    for (const intent of CAREER_INTENTS) {
      for (const locale of locales) {
        const label = intentLabel(intent, locale);
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });
});
