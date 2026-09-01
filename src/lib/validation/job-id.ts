import { z } from "zod";

export const jobIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(100);

export type JobIdInput = z.infer<
  typeof jobIdSchema
>;
