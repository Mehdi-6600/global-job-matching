import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(200),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(/[A-Za-z]/, "Password must include a letter")
      .regex(/[0-9]/, "Password must include a number"),
    role: z.enum(["JOB_SEEKER", "EMPLOYER"]).optional().default("JOB_SEEKER"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
