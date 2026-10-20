import { describe, expect, it } from "vitest";
import { planHistoryRepair } from "../../../scripts/repair-migration-history.mjs";

const row = (id: string, migration_name: string, applied = true, rolledBack = false) => ({
  id,
  migration_name,
  finished: applied,
  rolled_back: rolledBack,
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
    expect(plan.voids).toEqual([]);
    expect(plan.renames).toEqual([
      { id: "1", from: "20260905120000_ensur", to: "20260905120000_ensure_integrity" },
    ]);
  });

  it("leaves a clean history alone", () => {
    const plan = planHistoryRepair(
      [row("1", LOCAL[0]), row("2", LOCAL[1]), row("3", LOCAL[2])],
      LOCAL,
    );

    expect(plan).toEqual({ renames: [], voids: [], problems: [] });
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

  it("voids a shortened row when the full name is already applied", () => {
    const plan = planHistoryRepair(
      [row("1", "20260905120000_ensur"), row("2", "20260905120000_ensure_integrity")],
      LOCAL,
    );

    expect(plan.problems).toEqual([]);
    expect(plan.renames).toEqual([]);
    expect(plan.voids).toEqual([
      { id: "1", from: "20260905120000_ensur", to: "20260905120000_ensure_integrity" },
    ]);
  });

  it("refuses to void when the full name is not applied", () => {
    const plan = planHistoryRepair(
      [row("1", "20260905120000_ensur"), row("2", "20260905120000_ensure_integrity", false)],
      LOCAL,
    );

    expect(plan.voids).toEqual([]);
    expect(plan.problems[0]?.reason).toContain("not applied");
  });

  it("ignores rows that are already voided", () => {
    const plan = planHistoryRepair(
      [row("1", "20260905120000_ensur", true, true), row("2", "20260905120000_ensure_integrity")],
      LOCAL,
    );

    expect(plan).toEqual({ renames: [], voids: [], problems: [] });
  });

  it("does not rename a half-applied row", () => {
    const plan = planHistoryRepair([row("1", "20260905120000_ensur", false)], LOCAL);

    expect(plan.renames).toEqual([]);
    expect(plan.problems[0]?.reason).toContain("half-applied");
  });

  it("never maps two damaged rows onto the same migration", () => {
    const plan = planHistoryRepair(
      [row("1", "20260905120000_ensur"), row("2", "20260905120000_ensure")],
      LOCAL,
    );

    expect(plan.renames).toHaveLength(1);
    expect(plan.problems).toHaveLength(1);
    expect(plan.problems[0]?.reason).toContain("already maps to");
  });
});
