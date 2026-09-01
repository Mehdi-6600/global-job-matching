import { z } from "zod";

export const subscribeSchema = z
  .object({
    email: z.string().trim().email().max(200),
    name: z.string().trim().max(100).nullable().optional(),
  })
  .strict();

export type SubscribeInput = z.infer<typeof subscribeSchema>;
