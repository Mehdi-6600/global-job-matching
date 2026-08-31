import { z } from "zod";

export const interviewStatusSchema = z.enum([
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const interviewCreateSchema = z
  .object({
    jobId: z.string().trim().min(1).max(100),

    userId: z.string().trim().min(1).max(100),

    scheduledAt: z.coerce.date(),

    duration: z.coerce
      .number()
      .int()
      .min(15)
      .max(480)
      .default(30),

    type: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .default("video"),

    notes: z
      .string()
      .trim()
      .max(5000)
      .nullable()
      .optional(),

    meetLink: z
      .string()
      .trim()
      .url()
      .max(2000)
      .nullable()
      .optional(),
  })
  .strict();

export const interviewUpdateSchema = z
  .object({
    status: interviewStatusSchema.optional(),

    notes: z
      .string()
      .trim()
      .max(5000)
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.status !== undefined ||
      data.notes !== undefined,
    {
      message: "At least one field is required",
    }
  );

export type InterviewCreateInput = z.infer<
  typeof interviewCreateSchema
>;

export type InterviewUpdateInput = z.infer<
  typeof interviewUpdateSchema
>;
