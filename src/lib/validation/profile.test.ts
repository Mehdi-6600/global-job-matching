import { describe, it, expect } from "vitest";
import { profileUpdateSchema } from "./profile";

describe("profileUpdateSchema", () => {
  it("accepts partial profile update", () => {
    const parsed = profileUpdateSchema.safeParse({
      name: "Sam Example",
      title: "Frontend Developer",
      location: "Berlin",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts valid social urls", () => {
    const parsed = profileUpdateSchema.safeParse({
      linkedin: "https://linkedin.com/in/sam",
      github: "https://github.com/sam",
      portfolio: "https://sam.dev",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid linkedin url", () => {
    const parsed = profileUpdateSchema.safeParse({
      linkedin: "linkedin.com/in/sam",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const parsed = profileUpdateSchema.safeParse({
      name: "Sam",
      role: "ADMIN",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects too-long bio", () => {
    const parsed = profileUpdateSchema.safeParse({
      bio: "x".repeat(2001),
    });
    expect(parsed.success).toBe(false);
  });
});
