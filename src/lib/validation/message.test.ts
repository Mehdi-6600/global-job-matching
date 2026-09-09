import { describe, it, expect } from "vitest";
import { messageCreateSchema, messageQuerySchema } from "./message";

describe("messageCreateSchema", () => {
  it("accepts valid message", () => {
    const parsed = messageCreateSchema.safeParse({
      receiverId: "user_2",
      content: "Hello, are you available for a call?",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty content", () => {
    const parsed = messageCreateSchema.safeParse({
      receiverId: "user_2",
      content: "   ",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing receiverId", () => {
    const parsed = messageCreateSchema.safeParse({
      content: "Hello",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const parsed = messageCreateSchema.safeParse({
      receiverId: "user_2",
      content: "Hello",
      spam: true,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("messageQuerySchema", () => {
  it("accepts withUserId", () => {
    expect(
      messageQuerySchema.safeParse({ withUserId: "user_2" }).success
    ).toBe(true);
  });

  it("rejects empty withUserId", () => {
    expect(
      messageQuerySchema.safeParse({ withUserId: "  " }).success
    ).toBe(false);
  });
});
