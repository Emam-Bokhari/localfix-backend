import { z } from "zod";

const booleanSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
  }
  return val;
}, z.boolean());

const createCategoryZodSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Category name is required" })
      .trim()
      .min(1, "Category name is required"),
    coverImage: z.string().optional(),
    icon: z.string().optional(),
    isActive: booleanSchema.optional().default(true),
  }),
});

const updateCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Category name cannot be empty").optional(),
    coverImage: z.string().optional(),
    icon: z.string().optional(),
    isActive: booleanSchema.optional(),
  }),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};

