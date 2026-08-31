import { z } from "zod";

export const notificationPatchSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    readAll: z
      .boolean()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.readAll === true && data.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["id"],
        message:
          "Do not provide id when readAll is true",
      });
    }

    if (
      data.readAll !== true &&
      !data.id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["id"],
        message:
          "Notification ID is required",
      });
    }
  });

export type NotificationPatchInput =
  z.infer<
    typeof notificationPatchSchema
  >;

export const notificationDeleteSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(100),
  });

export type NotificationDeleteInput =
  z.infer<
    typeof notificationDeleteSchema
  >;
