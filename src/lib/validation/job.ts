import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional();

const optionalStringArray = (maxItems: number, maxItemLength: number) =>
  z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(maxItemLength)
    )
    .max(maxItems)
    .optional()
    .default([]);

export const jobCreateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Job title must be at least 3 characters")
      .max(200, "Job title is too long"),

    description: z
      .string()
      .trim()
      .min(20, "Job description must be at least 20 characters")
      .max(30000, "Job description is too long"),

    location: z
      .string()
      .trim()
      .min(2, "Location is required")
      .max(200, "Location is too long"),

    salary: optionalText(200),

    type: z
      .string()
      .trim()
      .min(2)
      .max(50),

    companyId: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .nullable()
      .optional(),

    remote: z
      .boolean()
      .optional()
      .default(false),

    experience: optionalText(100),

    salaryMin: z
      .number()
      .int()
      .min(0)
      .max(100_000_000)
      .nullable()
      .optional(),

    salaryMax: z
      .number()
      .int()
      .min(0)
      .max(100_000_000)
      .nullable()
      .optional(),

    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z]{3}$/,
        "Currency must be a 3-letter ISO-style code"
      )
      .optional()
      .default("USD"),

    requirements: optionalStringArray(50, 300),

    responsibilities: optionalStringArray(50, 500),

    benefits: optionalStringArray(50, 300),

    tags: optionalStringArray(30, 100),

    deadline: z
      .string()
      .datetime()
      .nullable()
      .optional(),

    categoryId: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.salaryMin != null &&
      data.salaryMax != null &&
      data.salaryMin > data.salaryMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryMax"],
        message: "Maximum salary cannot be lower than minimum salary",
      });
    }

    if (data.deadline) {
      const deadline = new Date(data.deadline);

      if (Number.isNaN(deadline.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deadline"],
          message: "Invalid deadline",
        });
      } else if (deadline.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deadline"],
          message: "Deadline must be in the future",
        });
      }
    }
  });

export type JobCreateInput = z.infer<typeof jobCreateSchema>;
