import { z } from "zod";
import { FAQ_ROLES, normalizeFaqRole } from "./faq.constant";

const roleSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      return normalizeFaqRole(val);
    }
    return val;
  },
  z.enum(FAQ_ROLES, {
    errorMap: () => ({
      message: `Invalid role. Role must be one of: ${FAQ_ROLES.join(", ")}`,
    }),
  }),
);

const createFaqZodSchema = z.object({
  body: z.object({
    question: z
      .string({ required_error: "Question is required" })
      .min(1, "Question cannot be empty"),
    answer: z
      .string({ required_error: "Answer is required" })
      .min(1, "Answer cannot be empty"),
    role: roleSchema.optional(),
    type: roleSchema.optional(),
    category: roleSchema.optional(),
    order: z.number().int().min(0).optional(),
  }),
});

const updateFaqZodSchema = z.object({
  body: z.object({
    question: z.string().min(1, "Question cannot be empty").optional(),
    answer: z.string().min(1, "Answer cannot be empty").optional(),
    role: roleSchema.optional(),
    type: roleSchema.optional(),
    category: roleSchema.optional(),
    order: z.number().int().min(0).optional(),
  }),
});

export const FaqValidation = {
  createFaqZodSchema,
  updateFaqZodSchema,
};
