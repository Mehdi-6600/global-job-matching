import { z } from "zod";

export const JOB_STATUSES = [
  "active",
  "pending",
  "rejected",
  "closed",
] as const;

export const jobStatusSchema = z.enum(JOB_STATUSES);

export const jobUpdateSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),

    description: z.string().min(20).max(20000).optional(),

    location: z.string().min(2).max(200).optional(),

    salary: z.string().max(100).nullable().optional(),

    type: z.string().min(1).max(50).optional(),

    remote: z.boolean().optional(),

    experience: z.string().max(50).nullable().optional(),

    salaryMin: z.number().int().min(0).nullable().optional(),

    salaryMax: z.number().int().min(0).nullable().optional(),

    currency: z.string().min(3).max(10).optional(),

    requirements: z
      .array(z.string().max(500))
      .max(100)
      .optional(),

    responsibilities: z
      .array(z.string().max(500))
      .max(100)
      .optional(),

    benefits: z
      .array(z.string().max(500))
      .max(100)
      .optional(),

    tags: z
      .array(z.string().max(100))
      .max(100)
      .optional(),

    deadline: z.coerce.date().nullable().optional(),

    status: jobStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.salaryMin !== undefined &&
      data.salaryMax !== undefined &&
      data.salaryMin !== null &&
      data.salaryMax !== null &&
      data.salaryMin > data.salaryMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryMax"],
        message:
          "salaryMax must be greater than or equal to salaryMin",
      });
    }
  });

export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;
