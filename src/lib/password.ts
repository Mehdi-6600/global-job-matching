import { z } from "zod";
import bcrypt from "bcryptjs";

/** Single password policy for register / reset / change */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

export function validatePassword(password: unknown): {
  ok: true;
  password: string;
} | {
  ok: false;
  error: string;
} {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message || "Invalid password",
    };
  }
  return { ok: true, password: result.data };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
