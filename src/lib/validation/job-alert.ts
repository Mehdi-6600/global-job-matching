import { z } from "zod";

export const jobAlertCreateSchema = z
  .object({
    keywords: z.string().trim().max(200).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    remote: z.boolean().nullable().optional(),
    type: z.string().trim().max(50).nullable().optional(),
    minSalary: z.coerce.number().int().min(0).nullable().optional(),
  })
  .strict();

export const jobAlertDeleteSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export type JobAlertCreateInput = z.infer<typeof jobAlertCreateSchema>;
