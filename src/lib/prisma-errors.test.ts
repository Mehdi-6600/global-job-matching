import { describe, it, expect } from "vitest";
import {
  isPrismaError,
  prismaErrorCode,
  isPrismaNotFoundLike,
} from "@/lib/prisma-errors";

describe("prisma-errors", () => {
  it("detects prisma-like errors", () => {
    expect(isPrismaError({ name: "PrismaClientKnownRequestError", code: "P2025" })).toBe(
      true
    );
    expect(isPrismaError(new Error("nope"))).toBe(false);
    expect(isPrismaError(null)).toBe(false);
  });

  it("reads code", () => {
    expect(prismaErrorCode({ code: "P2021" })).toBe("P2021");
    expect(prismaErrorCode({})).toBeNull();
  });

  it("classifies not-found-like codes", () => {
    expect(isPrismaNotFoundLike({ code: "P2025" })).toBe(true);
    expect(isPrismaNotFoundLike({ code: "P2021" })).toBe(true);
    expect(isPrismaNotFoundLike({ code: "P2002" })).toBe(false);
  });
});
