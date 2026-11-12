import { z } from "zod";

const upsertBannerValidationSchema = z.object({
  body: z.object({
    headline: z.string().trim().min(1, "Headline cannot be empty").optional(),
    description: z
      .string()
      .trim()
      .min(1, "Description cannot be empty")
      .optional(),
    image: z.string().min(1, "Image cannot be empty").optional(),
  }),
});

export const BannerZodValidation = {
  upsertBannerValidationSchema,
};
