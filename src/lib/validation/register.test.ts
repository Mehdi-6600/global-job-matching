import { describe, it, expect } from "vitest";
import { registerSchema } from "./register";

describe("registerSchema", () => {
  it("accepts valid job seeker registration", () => {
    const parsed = registerSchema.safeParse({
      name: "Sam Example",
      email: "sam@example.com",
      password: "Secret123",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.role).toBe("JOB_SEEKER");
    }
  });

  it("accepts employer role", () => {
    const parsed = registerSchema.safeParse({
      name: "Alex Employer",
      email: "alex@company.com",
      password: "Secret123",
      role: "EMPLOYER",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects weak password without number", () => {
    const parsed = registerSchema.safeParse({
      name: "Sam Example",
      email: "sam@example.com",
      password: "SecretOnly",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects short password", () => {
    const parsed = registerSchema.safeParse({
      name: "Sam Example",
      email: "sam@example.com",
      password: "Ab1",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const parsed = registerSchema.safeParse({
      name: "Sam Example",
      email: "not-an-email",
      password: "Secret123",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects admin role on public register", () => {
    const parsed = registerSchema.safeParse({
      name: "Hacker",
      email: "hacker@example.com",
      password: "Secret123",
      role: "ADMIN",
    });
    expect(parsed.success).toBe(false);
  });
});
