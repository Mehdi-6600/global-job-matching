import { describe, it, expect } from "vitest";
import { contactSchema } from "./contact";

describe("contactSchema", () => {
  it("accepts a valid contact message", () => {
    const parsed = contactSchema.safeParse({
      name: "Sam",
      email: "sam@example.com",
      subject: "Partnership",
      message: "Hello, I would like to partner with you.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const parsed = contactSchema.safeParse({
      name: "Sam",
      email: "bad-email",
      subject: "Hi",
      message: "Hello there",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty message", () => {
    const parsed = contactSchema.safeParse({
      name: "Sam",
      email: "sam@example.com",
      subject: "Hi",
      message: "   ",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const parsed = contactSchema.safeParse({
      name: "Sam",
      email: "sam@example.com",
      subject: "Hi",
      message: "Hello",
      website: "https://spam.example",
    });
    expect(parsed.success).toBe(false);
  });
});
