import { describe, it, expect } from "vitest";
import {
  notificationPatchSchema,
  notificationDeleteSchema,
} from "./notification";

describe("notificationPatchSchema", () => {
  it("accepts single notification id", () => {
    expect(
      notificationPatchSchema.safeParse({ id: "notif_1" }).success
    ).toBe(true);
  });

  it("accepts readAll true without id", () => {
    expect(
      notificationPatchSchema.safeParse({ readAll: true }).success
    ).toBe(true);
  });

  it("rejects readAll true together with id", () => {
    expect(
      notificationPatchSchema.safeParse({
        readAll: true,
        id: "notif_1",
      }).success
    ).toBe(false);
  });

  it("rejects empty patch", () => {
    expect(notificationPatchSchema.safeParse({}).success).toBe(false);
  });
});

describe("notificationDeleteSchema", () => {
  it("accepts id", () => {
    expect(
      notificationDeleteSchema.safeParse({ id: "notif_1" }).success
    ).toBe(true);
  });

  it("rejects empty id", () => {
    expect(
      notificationDeleteSchema.safeParse({ id: "   " }).success
    ).toBe(false);
  });
});
