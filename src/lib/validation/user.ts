import { z } from "zod";

export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().max(200).optional(),
    image: z.string().trim().url().max(500).nullable().optional(),
    avatar: z.string().trim().url().max(500).nullable().optional(),
    phone: z.string().trim().max(50).optional(),
    location: z.string().trim().max(200).optional(),
    bio: z.string().trim().max(2000).optional(),
  })
  .strict();

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
