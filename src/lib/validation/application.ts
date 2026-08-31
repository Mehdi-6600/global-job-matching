import { z } from "zod";

export const applicationCreateSchema = z
  .object({
    jobId: z.string().trim().min(1).max(100),

    coverLetter: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .nullable(),
  })
  .strict();

export const applicationUpdateSchema = z
  .object({
    status: z.enum([
      "pending",
      "viewed",
      "interview",
      "rejected",
      "hired",
    ]),
  })
  .strict();

export type ApplicationCreateInput = z.infer<
  typeof applicationCreateSchema
>;

export type ApplicationUpdateInput = z.infer<
  typeof applicationUpdateSchema
>;
