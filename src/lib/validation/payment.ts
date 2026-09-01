import { z } from "zod";

export const paymentSchema = z
  .object({
    planId: z.enum(["free", "pro", "business", "enterprise"]),
  })
  .strict();

export type PaymentInput = z.infer<typeof paymentSchema>;
