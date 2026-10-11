import { describe, expect, it } from "vitest";
import {
  initials,
  relativeTime,
  salaryLabel,
  splitHeroTitle,
  type HomeJob,
} from "./content";

describe("home content helpers", () => {
  describe("initials", () => {
    it("uses the first letters of the first two words", () => {
      expect(initials("Global Job Matching")).toBe("GJ");
      expect(initials("acme")).toBe("A");
    });

    it("falls back to the brand mark for empty input", () => {
      expect(initials(undefined)).toBe("GJ");
      expect(initials(null)).toBe("GJ");
      expect(initials("   ")).toBe("GJ");
    });
  });

  describe("relativeTime", () => {
    const now = Date.parse("2026-01-10T12:00:00.000Z");

    it("returns an empty label for missing or invalid dates", () => {
      expect(relativeTime(undefined, now)).toBe("");
      expect(relativeTime("not-a-date", now)).toBe("");
    });

    it("never reports less than a minute for a brand new listing", () => {
      expect(relativeTime("2026-01-10T11:59:30.000Z", now)).toBe("1m ago");
    });

    it("scales through minutes, hours, days and months", () => {
      expect(relativeTime("2026-01-10T11:45:00.000Z", now)).toBe("15m ago");
      expect(relativeTime("2026-01-10T09:00:00.000Z", now)).toBe("3h ago");
      expect(relativeTime("2026-01-07T12:00:00.000Z", now)).toBe("3d ago");
      expect(relativeTime("2025-11-10T12:00:00.000Z", now)).toBe("2mo ago");
    });

    it("clamps future timestamps to zero instead of going negative", () => {
      expect(relativeTime("2026-01-10T13:00:00.000Z", now)).toBe("1m ago");
    });
  });

  describe("salaryLabel", () => {
    const base: HomeJob = { id: "1", title: "Engineer" };

    it("returns null when no salary data is published", () => {
      expect(salaryLabel(base)).toBeNull();
    });

    it("prefers free-text salary over numeric bounds", () => {
      expect(
        salaryLabel({ ...base, salary: "Competitive", salaryMin: 1000 }),
      ).toBe("Competitive");
    });

    it("formats a range, a floor and a ceiling", () => {
      expect(salaryLabel({ ...base, salaryMin: 50000, salaryMax: 90000 })).toBe(
        "USD 50,000–90,000",
      );
      expect(salaryLabel({ ...base, salaryMin: 50000 })).toBe("USD 50,000+");
      expect(salaryLabel({ ...base, salaryMax: 90000 })).toBe("Up to USD 90,000");
    });

    it("honours the published currency", () => {
      expect(
        salaryLabel({ ...base, currency: "EUR", salaryMin: 1000, salaryMax: 2000 }),
      ).toBe("EUR 1,000–2,000");
    });

    it("formats numbers and the salary ceiling in the active locale", () => {
      expect(
        salaryLabel({ ...base, salaryMin: 50000, salaryMax: 90000 }, "de-DE"),
      ).toBe("USD 50.000–90.000");
      expect(
        salaryLabel({ ...base, salaryMax: 90000 }, "de-DE", "Bis zu"),
      ).toBe("Bis zu USD 90.000");
    });
  });

  describe("splitHeroTitle", () => {
    it("splits the English headline at the emphasised clause", () => {
      const result = splitHeroTitle(
        "Find Your Next Opportunity. Anywhere in the World.",
      );
      expect(result.line1).toBe("Find Your Next Opportunity.");
      expect(result.line2).toBe("Anywhere in the World.");
    });

    it("splits other locales on their own sentence punctuation", () => {
      expect(splitHeroTitle("فرصت بعدی‌ات را پیدا کن. هر جای دنیا.")).toEqual({
        line1: "فرصت بعدی‌ات را پیدا کن.",
        line2: "هر جای دنیا.",
      });

      expect(
        splitHeroTitle("اعثر على فرصتك القادمة. في أي مكان في العالم."),
      ).toEqual({
        line1: "اعثر على فرصتك القادمة.",
        line2: "في أي مكان في العالم.",
      });

      expect(splitHeroTitle("अपना अगला अवसर खोजें। दुनिया में कहीं भी।")).toEqual({
        line1: "अपना अगला अवसर खोजें।",
        line2: "दुनिया में कहीं भी।",
      });

      expect(splitHeroTitle("Finde deine nächste Chance. Überall auf der Welt."))
        .toEqual({
          line1: "Finde deine nächste Chance.",
          line2: "Überall auf der Welt.",
        });
    });

    it("keeps a single-sentence headline on one line", () => {
      expect(splitHeroTitle("One short headline")).toEqual({
        line1: "One short headline",
        line2: "",
      });
    });

    it("never loses characters while splitting", () => {
      const samples = [
        "Find Your Next Opportunity. Anywhere in the World.",
        "فرصت بعدی‌ات را پیدا کن. هر جای دنیا.",
        "Trouvez votre prochaine opportunité. Partout dans le monde.",
      ];

      for (const sample of samples) {
        const { line1, line2 } = splitHeroTitle(sample);
        const rejoined = `${line1} ${line2}`.replace(/\s+/g, " ").trim();
        expect(rejoined).toBe(sample.replace(/\s+/g, " ").trim());
      }
    });

    it("handles empty input", () => {
      expect(splitHeroTitle("   ")).toEqual({ line1: "", line2: "" });
    });
  });
});
