import { describe, it, expect } from "vitest";
import { companyCreateSchema, companyUpdateSchema } from "./company";

describe("companyCreateSchema", () => {
  it("accepts minimal valid company", () => {
    const parsed = companyCreateSchema.safeParse({
      name: "Acme GmbH",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts full payload", () => {
    const parsed = companyCreateSchema.safeParse({
      name: "Acme GmbH",
      description: "A software company",
      location: "Berlin",
      website: "https://acme.example",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects short name", () => {
    const parsed = companyCreateSchema.safeParse({
      name: "A",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid website", () => {
    const parsed = companyCreateSchema.safeParse({
      name: "Acme GmbH",
      website: "not-a-url",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const parsed = companyCreateSchema.safeParse({
      name: "Acme GmbH",
      ownerId: "hack",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("companyUpdateSchema", () => {
  it("accepts partial update", () => {
    const parsed = companyUpdateSchema.safeParse({
      location: "Munich",
    });
    expect(parsed.success).toBe(true);
  });
});
