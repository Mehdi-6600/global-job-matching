import { describe, expect, it } from "vitest";
import { planHistoryRepair } from "../../../scripts/repair-migration-history.mjs";

const row = (id: string, migration_name: string, applied = true) => ({
  id,
  migration_name,
  finished: applied,
  rolled_back: false,
});

const LOCAL = [
  "20260825050000_add_job_alert_and_crypto",
  "20260902090000_production_baseline",
  "20260905120000_ensure_integrity",
  "20260926120000_add_company_external_identity",
  "20260926120100_add_source_company",
];

describe("planHistoryRepair", () => {
  it("maps a shortened history row to the single migration it prefixes", () => {
    const plan = planHistoryRepair([row("1", "20260905120000_ensur")], LOCAL);

    expect(plan.problems).toEqual([]);
    expect(plan.renames).toEqual([
      { id: "1", from: "20260905120000_ensur", to: "20260905120000_ensure_integrity" },
    ]);
  });

  it("leaves a clean history alone", () => {
    const plan = planHistoryRepair(
      [row("1", LOCAL[0]), row("2", LOCAL[1]), row("3", LOCAL[2])],
      LOCAL,
    );

    expect(plan).toEqual({ renames: [], problems: [] });
  });

  it("refuses a row that matches no local migration", () => {
    const plan = planHistoryRepair([row("1", "20250101000000_gone")], LOCAL);

    expect(plan.renames).toEqual([]);
    expect(plan.problems).toEqual([
      { from: "20250101000000_gone", reason: "no migration in prisma/migrations starts with this name" },
    ]);
  });

  it("refuses an ambiguous prefix", () => {
    const plan = planHistoryRepair([row("1", "20260926")], LOCAL);

    expect(plan.renames).toEqual([]);
    expect(plan.problems[0]?.reason).toContain("ambiguous");
  });

  it("refuses when the full name is already recorded", () => {
    const plan = planHistoryRepair(
      [row("1", "20260905120000_ensur"), row("2", "20260905120000_ensure_integrity")],
      LOCAL,
    );

    expect(plan.renames).toEqual([]);
    expect(plan.problems[0]?.reason).toContain("already exists");
  });

  it("does not rename failed or rolled-back rows", () => {
    const plan = planHistoryRepair([row("1", "20260905120000_ensur", false)], LOCAL);

    expect(plan.renames).toEqual([]);
    expect(plan.problems[0]?.reason).toContain("failed or rolled back");
  });

  it("never maps two damaged rows onto the same migration", () => {
    const plan = planHistoryRepair(
      [row("1", "20260905120000_ensur"), row("2", "20260905120000_ensure")],
      LOCAL,
    );

    expect(plan.renames).toHaveLength(1);
    expect(plan.problems).toHaveLength(1);
    expect(plan.problems[0]?.reason).toContain("already exists");
  });
});
