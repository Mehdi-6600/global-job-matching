import { z } from "zod";

/**
 * Employer-facing application status update schema.
 *
 * Accepts the canonical statuses plus legacy aliases so the UI can
 * keep sending historical values during a transition period. Aliases
 * are validated against the same whitelist as canonical values.
 *
 * The route still runs `normalizeApplicationStatus` after parsing,
 * which maps aliases to canonical values and rejects anything outside
 * this set. This is the first of two validation layers.
 */
const ALLOWED_INPUT_STATUSES = [
  // Canonical
  "pending",
  "viewed",
  "interview",
  "rejected",
  "hired",
  // Legacy aliases (see ALIASES in @/lib/application-status)
  "applied",
  "shortlisted",
] as const;

export const applicationStatusUpdateSchema = z
  .object({
    status: z.enum(ALLOWED_INPUT_STATUSES),
  })
  .strict();

export type ApplicationStatusUpdateInput = z.infer<
  typeof applicationStatusUpdateSchema
>;
