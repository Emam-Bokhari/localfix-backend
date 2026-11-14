import { z } from "zod";

const createMarqueeZodSchema = z.object({
  body: z.object({
    keyword: z
      .string({ required_error: "Service keyword is required" })
      .trim()
      .min(1, "Service keyword cannot be empty"),
    isEnabled: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
  }),
});

const updateMarqueeZodSchema = z.object({
  body: z.object({
    keyword: z
      .string()
      .trim()
      .min(1, "Service keyword cannot be empty")
      .optional(),
    isEnabled: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
  }),
});

const toggleMarqueeStatusZodSchema = z.object({
  body: z
    .object({
      isEnabled: z.boolean().optional(),
    })
    .optional()
    .default({}),
});

export const MarqueeValidation = {
  createMarqueeZodSchema,
  updateMarqueeZodSchema,
  toggleMarqueeStatusZodSchema,
};
