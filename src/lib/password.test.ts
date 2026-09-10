import { describe, it, expect } from "vitest";
import {
  validatePassword,
  hashPassword,
  verifyPassword,
} from "./password";

describe("validatePassword", () => {
  it("accepts a strong enough password", () => {
    const result = validatePassword("Secret123");
    expect(result.ok).toBe(true);
  });

  it("rejects short password", () => {
    const result = validatePassword("Ab1");
    expect(result.ok).toBe(false);
  });

  it("rejects password without number", () => {
    const result = validatePassword("SecretOnly");
    expect(result.ok).toBe(false);
  });

  it("rejects password without letter", () => {
    const result = validatePassword("12345678");
    expect(result.ok).toBe(false);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("Secret123");
    expect(hash).not.toBe("Secret123");
    expect(await verifyPassword("Secret123", hash)).toBe(true);
    expect(await verifyPassword("Wrong123", hash)).toBe(false);
  });
});
