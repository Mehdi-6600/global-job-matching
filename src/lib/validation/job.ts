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
    .array(z.string().trim().min(1).max(maxItemLength))
    .max(maxItems)
    .optional()
    .default([]);

/** Coerce number-like form values safely */
const optionalNonNegInt = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return null;
  if (typeof val === "string" && val.trim() === "") return null;
  if (typeof val === "string" || typeof val === "number") {
    const n = Number(val);
    return Number.isFinite(n) ? Math.trunc(n) : val;
  }
  return val;
}, z.number().int().min(0).max(100_000_000).nullable().optional());

export const jobStatusSchema = z.enum([
  "active",
  "inactive",
  "closed",
  "draft",
  "pending",
  "rejected",
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

/**
 * Accept ISO datetime OR date-only (YYYY-MM-DD) from forms.
 */
const optionalDeadline = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return null;
  if (typeof val !== "string") return val;
  const s = val.trim();
  if (!s) return null;
  // date-only → end of that day UTC-ish parseable ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s}T23:59:59.000Z`;
  }
  return s;
}, z.string().datetime().nullable().optional());

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
      .max(50)
      .optional()
      .default("Full-time"),
    /** Existing company id (optional if companyName provided) */
    companyId: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .nullable()
      .optional(),
    /**
     * Used by /api/employer/jobs when employer has no company yet.
     * Kept for backward compatibility with current UI.
     */
    companyName: z
      .string()
      .trim()
      .min(2)
      .max(200)
      .nullable()
      .optional(),
    remote: z.boolean().optional().default(false),
    experience: optionalText(100),
    salaryMin: optionalNonNegInt,
    salaryMax: optionalNonNegInt,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code")
      .optional()
      .default("USD"),
    requirements: optionalStringArray(50, 300),
    responsibilities: optionalStringArray(50, 500),
    benefits: optionalStringArray(50, 300),
    tags: optionalStringArray(30, 100),
    deadline: optionalDeadline,
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

/**
 * Partial update schema (for future edit route).
 */
export const jobUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(20).max(30000).optional(),
    location: z.string().trim().min(2).max(200).optional(),
    salary: optionalText(200),
    type: z.string().trim().min(2).max(50).optional(),
    companyId: z.string().trim().min(1).max(100).nullable().optional(),
    remote: z.boolean().optional(),
    experience: optionalText(100),
    salaryMin: optionalNonNegInt,
    salaryMax: optionalNonNegInt,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    requirements: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
    responsibilities: z
      .array(z.string().trim().min(1).max(500))
      .max(50)
      .optional(),
    benefits: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
    tags: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    deadline: optionalDeadline,
    categoryId: z.string().trim().min(1).max(100).nullable().optional(),
    status: jobStatusSchema.optional(),
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

export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;
