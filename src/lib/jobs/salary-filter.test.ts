import { describe, expect, it } from "vitest";
import {
  salaryRangesOverlap,
  prismaSalaryOverlapWhere,
} from "@/lib/jobs/salary-filter";

describe("salaryRangesOverlap", () => {
  describe("closed intervals", () => {
    it("rejects job fully below user range", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 20000, salaryMax: 30000 },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(false);
    });

    it("rejects job fully above user range", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 90000, salaryMax: 120000 },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(false);
    });

    it("accepts partial overlap", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 40000, salaryMax: 55000 },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(true);
    });

    it("accepts exact boundary touch", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 20000, salaryMax: 50000 },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(true);
    });

    it("accepts job fully inside user range", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 52000, salaryMax: 58000 },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(true);
    });

    it("accepts job fully covering user range", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 10000, salaryMax: 90000 },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(true);
    });
  });

  describe("single-sided user filter", () => {
    it("minSalary only: requires job upper end >= min", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 20000, salaryMax: 40000 },
          { minSalary: 50000 },
        ),
      ).toBe(false);
      expect(
        salaryRangesOverlap(
          { salaryMin: 20000, salaryMax: 80000 },
          { minSalary: 50000 },
        ),
      ).toBe(true);
    });

    it("minSalary only: accepts exact boundary touch", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 20000, salaryMax: 50000 },
          { minSalary: 50000 },
        ),
      ).toBe(true);
    });

    it("maxSalary only: requires job lower end <= max", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 90000, salaryMax: 120000 },
          { maxSalary: 60000 },
        ),
      ).toBe(false);
      expect(
        salaryRangesOverlap(
          { salaryMin: 40000, salaryMax: 90000 },
          { maxSalary: 60000 },
        ),
      ).toBe(true);
    });

    it("maxSalary only: accepts exact boundary touch", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 60000, salaryMax: 90000 },
          { maxSalary: 60000 },
        ),
      ).toBe(true);
    });
  });

  describe("open-ended job bounds", () => {
    it("open-ended job max still overlaps when min is in range band", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 55000, salaryMax: null },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(true);
    });

    it("open-ended job max does not overlap when job min is above userMax", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 70000, salaryMax: null },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(false);
    });

    it("open-ended job min overlaps when job max is within user range", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: null, salaryMax: 55000 },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(true);
    });

    it("open-ended job min does not overlap when job max is below userMin", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: null, salaryMax: 40000 },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(false);
    });

    it("fully open job interval overlaps with any finite filter", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: null, salaryMax: null },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(false); // no salary data on job → fail closed
    });
  });

  describe("missing or empty job salary", () => {
    it("null job salaries do not match a filter", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: null, salaryMax: null },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(false);
    });

    it("undefined job salaries do not match a filter", () => {
      expect(
        salaryRangesOverlap(
          {},
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(false);
    });
  });

  describe("empty user filter", () => {
    it("no user bounds matches any job with salary data", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 20000, salaryMax: 30000 },
          {},
        ),
      ).toBe(true);
    });

    it("no user bounds matches job with no salary data", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: null, salaryMax: null },
          {},
        ),
      ).toBe(true);
    });
  });

  describe("invalid numeric values", () => {
    it("NaN in user filter is treated as no bound", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 20000, salaryMax: 30000 },
          { minSalary: NaN, maxSalary: NaN },
        ),
      ).toBe(true);
    });

    it("Infinity in user filter is treated as no bound", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: 20000, salaryMax: 30000 },
          { minSalary: Infinity, maxSalary: -Infinity },
        ),
      ).toBe(true);
    });

    it("NaN in job bounds is treated as open end", () => {
      expect(
        salaryRangesOverlap(
          { salaryMin: NaN, salaryMax: 55000 },
          { minSalary: 50000, maxSalary: 60000 },
        ),
      ).toBe(true);
    });
  });
});

describe("prismaSalaryOverlapWhere", () => {
  it("returns null when no user bounds are provided", () => {
    expect(prismaSalaryOverlapWhere({})).toBeNull();
    expect(prismaSalaryOverlapWhere({ minSalary: null, maxSalary: null })).toBeNull();
    expect(prismaSalaryOverlapWhere({ minSalary: NaN, maxSalary: NaN })).toBeNull();
  });

  it("requires at least one job salary bound", () => {
    const where = prismaSalaryOverlapWhere({ minSalary: 50000 });
    expect(where).toEqual({
      AND: [
        { OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }] },
        {
          OR: [
            { salaryMax: { gte: 50000 } },
            { salaryMax: null },
          ],
        },
      ],
    });
  });

  it("builds minSalary and maxSalary clauses together", () => {
    const where = prismaSalaryOverlapWhere({
      minSalary: 50000,
      maxSalary: 60000,
    });
    expect(where).toEqual({
      AND: [
        { OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }] },
        {
          OR: [
            { salaryMax: { gte: 50000 } },
            { salaryMax: null },
          ],
        },
        {
          OR: [
            { salaryMin: { lte: 60000 } },
            { salaryMin: null },
          ],
        },
      ],
    });
  });

  it("omits userMin clause when only maxSalary is set", () => {
    const where = prismaSalaryOverlapWhere({ maxSalary: 60000 });
    expect(where).toEqual({
      AND: [
        { OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }] },
        {
          OR: [
            { salaryMin: { lte: 60000 } },
            { salaryMin: null },
          ],
        },
      ],
    });
  });

  it("treats non-finite values as missing bounds", () => {
    expect(prismaSalaryOverlapWhere({ minSalary: NaN })).toBeNull();
    expect(prismaSalaryOverlapWhere({ maxSalary: Infinity })).toBeNull();
  });
});
