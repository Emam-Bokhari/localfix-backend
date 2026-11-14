import { z } from "zod";
import { JOB_REQUEST_STATUS } from "../../../enums/jobRequest";

const serviceLocationValidationSchema = z.object({
  zipCode: z
    .string({ required_error: "Zip code is required" })
    .trim()
    .min(1, "Zip code is required"),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  location: z
    .object({
      type: z.literal("Point").default("Point"),
      coordinates: z.tuple([z.number(), z.number()]),
      address: z.string().optional(),
    })
    .optional(),
});

const estimatedBudgetSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.]/g, "");
    const num = Number(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return Number(val);
}, z.number().min(0, "Estimated budget must be a positive number").optional());

const createJobRequestZodSchema = z.object({
  body: z
    .object({
      category: z
        .string({ required_error: "Trade category is required" })
        .trim()
        .min(1, "Trade category is required"),
      headline: z.string().trim().min(1, "Project headline is required").optional(),
      title: z.string().trim().min(1, "Project title is required").optional(),
      description: z
        .string({ required_error: "Detailed work description is required" })
        .trim()
        .min(1, "Work description is required"),
      projectPhotos: z.array(z.string()).optional(),
      timeframe: z
        .string({ required_error: "Timeframe is required" })
        .trim()
        .min(1, "Timeframe is required"),
      serviceLocation: serviceLocationValidationSchema.optional(),
      zipCode: z.string().trim().optional(),
      address: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      preferredArrivalWindow: z.string().trim().optional(),
      propertyType: z
        .string({ required_error: "Property type is required" })
        .trim()
        .min(1, "Property type is required"),
      partsAndMaterials: z
        .string({ required_error: "Parts & materials preference is required" })
        .trim()
        .min(1, "Parts & materials preference is required"),
      estimatedBudget: estimatedBudgetSchema,
      professional: z.string().trim().optional().nullable(),
    })
    .refine((data) => Boolean(data.headline || data.title), {
      message: "Project headline or title is required",
      path: ["headline"],
    })
    .refine(
      (data) => Boolean(data.serviceLocation?.zipCode || data.zipCode),
      {
        message: "Service location ZIP code is required",
        path: ["zipCode"],
      },
    ),
});

const updateJobRequestZodSchema = z.object({
  body: z.object({
    category: z.string().trim().optional(),
    headline: z.string().trim().optional(),
    title: z.string().trim().optional(),
    description: z.string().trim().optional(),
    projectPhotos: z.array(z.string()).optional(),
    timeframe: z.string().trim().optional(),
    serviceLocation: serviceLocationValidationSchema.partial().optional(),
    zipCode: z.string().trim().optional(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    preferredArrivalWindow: z.string().trim().optional(),
    propertyType: z.string().trim().optional(),
    partsAndMaterials: z.string().trim().optional(),
    estimatedBudget: estimatedBudgetSchema,
    professional: z.string().trim().optional().nullable(),
    status: z.nativeEnum(JOB_REQUEST_STATUS).optional(),
  }),
});

export const JobRequestValidation = {
  createJobRequestZodSchema,
  updateJobRequestZodSchema,
};

