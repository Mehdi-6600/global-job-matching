import { z } from "zod";
import { passwordSchema } from "@/lib/password";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(200),
    password: passwordSchema,
    role: z.enum(["JOB_SEEKER", "EMPLOYER"]).optional().default("JOB_SEEKER"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
