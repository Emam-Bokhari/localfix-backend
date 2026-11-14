import { z } from "zod";

const createPackageZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Package name is required" }).min(1),
    description: z.string().optional(),
    price: z
      .number({ required_error: "Package price is required" })
      .min(0, "Price must be greater than or equal to 0"),
    billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
    features: z.array(z.string()).default([]),
    leadLimit: z
      .number({ required_error: "Lead limit is required" })
      .default(-1), // -1 for unlimited
    hasTrial: z.boolean().default(false),
    trialDays: z
      .number()
      .min(0, "Trial days cannot be negative")
      .default(0),
    isPopular: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
    stripeProductId: z.string().optional(),
    stripePriceId: z.string().optional(),
  }),
});

const updatePackageZodSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.number().min(0).optional(),
    billingCycle: z.enum(["monthly", "yearly"]).optional(),
    features: z.array(z.string()).optional(),
    leadLimit: z.number().optional(),
    hasTrial: z.boolean().optional(),
    trialDays: z.number().min(0, "Trial days cannot be negative").optional(),
    isPopular: z.boolean().optional(),
    isActive: z.boolean().optional(),
    stripeProductId: z.string().optional(),
    stripePriceId: z.string().optional(),
  }),
});

export const PackageValidation = {
  createPackageZodSchema,
  updatePackageZodSchema,
};
