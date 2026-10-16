import { describe, expect, it } from "vitest";
import { yearsIn } from "@/lib/matching/score";

/**
 * yearsIn extracts an experience figure from free text.
 * Numeric values require an explicit year unit, so calendar years ("2019"),
 * money ("5000 USD") and counts ("2 projects") are not read as experience.
 */
describe("yearsIn — English", () => {
  it.each([
    ["3 years", 3],
    ["3+ years", 3],
    ["3 yrs", 3],
    ["3 yr", 3],
    ["3 years of experience", 3],
    ["5 years minimum", 5],
    ["min. 4 years", 4],
    ["at least 3 years", 3],
    ["more than 3 years", 3],
    ["2-4 years", 3],
    ["2 to 4 years", 3],
    ["1.5-2.5 years", 2],
  ])("%s → %s", (text, expected) => {
    expect(yearsIn(text)).toBe(expected);
  });
});

describe("yearsIn — Persian", () => {
  it.each([
    ["۳ سال", 3],
    ["۳+ سال", 3],
    ["حداقل ۳ سال", 3],
    ["بیش از ۳ سال", 3],
    ["۲ تا ۴ سال", 3],
    ["۲–۴ سال", 3],
    ["۵ سال سابقه", 5],
  ])("%s → %s", (text, expected) => {
    expect(yearsIn(text)).toBe(expected);
  });
});

describe("yearsIn — Arabic unit words", () => {
  it.each([
    ["٣ سنوات", 3],
    ["٣ سنة", 3],
    ["٣ سنه", 3],
    ["٢-٤ سنوات", 3],
    ["2 to 4 سنوات", 3],
  ])("%s → %s", (text, expected) => {
    expect(yearsIn(text)).toBe(expected);
  });
});

describe("yearsIn — rejects non-experience numbers", () => {
  it.each(["Built the 2019 platform", "since 2015", "5000 USD", "2 projects", "no experience mentioned"])(
    "%s → null",
    (text) => {
      expect(yearsIn(text)).toBeNull();
    },
  );
});
