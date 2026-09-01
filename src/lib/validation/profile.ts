import { z } from "zod";

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    title: z.string().trim().max(100).optional(),
    bio: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(50).optional(),
    linkedin: z.string().trim().url().max(500).optional().nullable(),
    github: z.string().trim().url().max(500).optional().nullable(),
    portfolio: z.string().trim().url().max(500).optional().nullable(),
  })
  .strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
