import { z } from "zod";

const booleanLike = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((v) => v === "true"),
]);

const initiateBackgroundCheckZodSchema = z.object({
  body: z
    .object({
      consentAccepted: booleanLike.optional(),
      forceNew: booleanLike.optional(),
    })
    .optional()
    .default({}),
});

const startScreeningZodSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Full name is required" })
      .trim()
      .min(1, "Full name is required"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    phone: z.string().trim().optional(),
    zipCode: z.string().trim().optional(),
    state: z.string().trim().optional(),
    consentAccepted: booleanLike.refine((val) => val === true, {
      message: "You must agree to complete the background check on Checkr",
    }),
  }),
});

export const CheckrValidation = {
  initiateBackgroundCheckZodSchema,
  startScreeningZodSchema,
};

