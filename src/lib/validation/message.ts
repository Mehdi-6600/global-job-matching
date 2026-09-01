import { z } from "zod";

export const messageCreateSchema = z
  .object({
    receiverId: z
      .string()
      .trim()
      .min(1)
      .max(100),

    content: z
      .string()
      .trim()
      .min(1)
      .max(5000),
  })
  .strict();

export const messageQuerySchema = z.object({
  withUserId: z
    .string()
    .trim()
    .min(1)
    .max(100),
});

export type MessageCreateInput =
  z.infer<typeof messageCreateSchema>;

export type MessageQueryInput =
  z.infer<typeof messageQuerySchema>;
