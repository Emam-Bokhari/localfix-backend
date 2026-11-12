import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createServiceZodSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Service name is required" })
      .trim()
      .min(1, "Service name is required"),
    category: z
      .string({ required_error: "Category is required" })
      .trim()
      .regex(objectIdRegex, "Invalid category ID"),
    description: z
      .string({ required_error: "Service description is required" })
      .trim()
      .min(1, "Service description is required"),
  }),
});

const updateServiceZodSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, "Service name cannot be empty").optional(),
      category: z
        .string()
        .trim()
        .regex(objectIdRegex, "Invalid category ID")
        .optional(),
      description: z
        .string()
        .trim()
        .min(1, "Service description cannot be empty")
        .optional(),
    })
    .refine(
      (data) =>
        data.name !== undefined ||
        data.category !== undefined ||
        data.description !== undefined,
      {
        message: "At least one field must be provided to update",
      },
    ),
});

export const ServiceValidation = {
  createServiceZodSchema,
  updateServiceZodSchema,
};

