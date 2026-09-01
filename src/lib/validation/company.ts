import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .nullable()
  .optional();

export const companyCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(150),

    description:
      optionalText(5000),

    location:
      optionalText(200),

    website:
      optionalUrl,
  })
  .strict();

export const companyUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(150)
      .optional(),

    description:
      optionalText(5000),

    location:
      optionalText(200),

    website:
      optionalUrl,
  })
  .strict();

export type CompanyCreateInput =
  z.infer<
    typeof companyCreateSchema
  >;

export type CompanyUpdateInput =
  z.infer<
    typeof companyUpdateSchema
  >;
