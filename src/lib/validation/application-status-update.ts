import { z } from "zod";

export const applicationStatusUpdateSchema =
  z
    .object({
      status: z
        .string()
        .trim()
        .min(1)
        .max(50),
    })
    .strict();

export type ApplicationStatusUpdateInput =
  z.infer<
    typeof applicationStatusUpdateSchema
  >;
