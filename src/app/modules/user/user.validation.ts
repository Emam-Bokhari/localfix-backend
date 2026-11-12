import { z } from "zod";
import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";
import { signUpBodyZodSchema } from "../auth/auth.validation";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const locationZodSchema = z
  .object({
    type: z.literal("Point").optional().default("Point"),
    coordinates: z
      .tuple([
        z.coerce
          .number()
          .min(-180, "Longitude must be between -180 and 180")
          .max(180, "Longitude must be between -180 and 180"),
        z.coerce
          .number()
          .min(-90, "Latitude must be between -90 and 90")
          .max(90, "Latitude must be between -90 and 90"),
      ])
      .optional(),
    address: z.string().trim().optional(),
  })
  .optional();

const tradeLicenseZodSchema = z
  .object({
    licenseNumber: z.string().trim().optional(),
    state: z.string().trim().optional(),
    certificateUrl: z.string().trim().optional(),
  })
  .optional();

const liabilityInsuranceZodSchema = z
  .object({
    carrier: z.string().trim().optional(),
    coverage: z.union([z.string(), z.number()]).optional(),
    expires: z.string().trim().optional(),
    expiresAt: z.string().trim().optional(),
    certificateUrl: z.string().trim().optional(),
  })
  .optional();

const businessDayHoursZodSchema = z
  .object({
    isOpen: z.union([z.boolean(), z.string()]).optional(),
    openTime: z.string().trim().optional(),
    closeTime: z.string().trim().optional(),
  })
  .optional();

const businessHoursZodSchema = z
  .object({
    mode: z.enum(["all_days", "customize"]).optional(),
    allDays: businessDayHoursZodSchema,
    days: z
      .object({
        monday: businessDayHoursZodSchema,
        tuesday: businessDayHoursZodSchema,
        wednesday: businessDayHoursZodSchema,
        thursday: businessDayHoursZodSchema,
        friday: businessDayHoursZodSchema,
        saturday: businessDayHoursZodSchema,
        sunday: businessDayHoursZodSchema,
      })
      .optional(),
    emergencyDispatchAvailable: z.union([z.boolean(), z.string()]).optional(),
  })
  .optional();

const projectPhotoItemZodSchema = z.object({
  image: z.string().trim().min(1, "Project photo image is required"),
  title: z.string().trim().min(1, "Project photo title is required"),
  category: z.string().trim().min(1, "Project photo category is required"),
});

const optionalUserFields = {
  profileImage: z.string().optional(),
  dateOfBirth: z
    .union([
      z.string().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date of birth format",
      }),
      z.date(),
    ])
    .optional(),
  gender: z.nativeEnum(GENDER).optional(),
  about: z.string().trim().optional(),
  serviceRadiusInMiles: z.union([z.number(), z.string()]).optional(),
  yearsOfExperience: z.string().trim().optional(),
  category: z
    .string()
    .regex(objectIdRegex, "Invalid category ID")
    .nullable()
    .optional(),
  phone: z.string().trim().optional(),
  countryCode: z.string().trim().optional(),
  deviceToken: z.string().optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  streetAddress: z.string().trim().optional(),
  address: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  businessName: z.string().trim().optional(),
  licenseNumber: z.string().trim().optional(),
  licenseState: z.string().trim().optional(),
  tradeLicenseCertificate: z.string().trim().optional(),
  tradeLicense: z.union([tradeLicenseZodSchema, z.string()]).optional(),
  insuranceCarrier: z.string().trim().optional(),
  insuranceCoverage: z.union([z.string(), z.number()]).optional(),
  insuranceExpires: z.string().trim().optional(),
  coiCertificate: z.string().trim().optional(),
  insuranceCertificate: z.string().trim().optional(),
  liabilityInsurance: liabilityInsuranceZodSchema,
  businessHours: businessHoursZodSchema,
  emergencyDispatchAvailable: z.union([z.boolean(), z.string()]).optional(),
  acceptedPayments: z.array(z.string().trim().min(1)).optional(),
  projectPhotos: z.array(projectPhotoItemZodSchema).optional(),
  location: locationZodSchema,
  timezone: z.string().trim().optional(),
};

const createAdminZodSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(1, "Name is required"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    password: z
      .string({ required_error: "Password is required" })
      .min(8, "Password must be at least 8 characters"),
    role: z
      .enum([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN])
      .optional()
      .default(USER_ROLES.ADMIN),
    phone: z.string().trim().optional(),
    countryCode: z.string().trim().optional(),
    profileImage: z.string().optional(),
    timezone: z.string().trim().optional(),
  }),
});

const createUserZodSchema = z.object({
  body: signUpBodyZodSchema,
});

const updateProfileZodSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name cannot be empty").optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional(),
    ...optionalUserFields,
  }),
});

const updateUserStatusZodSchema = z.object({
  body: z.object({
    status: z.nativeEnum(STATUS, {
      required_error: "Status is required (active or inactive)",
    }),
  }),
});

const addProjectPhotoZodSchema = z.object({
  body: z.object({
    image: z.string().trim().optional(),
    projectPhoto: z.string().trim().optional(),
    title: z
      .string({ required_error: "Title is required" })
      .trim()
      .min(1, "Title cannot be empty"),
    category: z
      .string({ required_error: "Category is required" })
      .trim()
      .min(1, "Category cannot be empty"),
  }),
});

const updateProjectPhotoZodSchema = z.object({
  body: z.object({
    image: z.string().trim().optional(),
    projectPhoto: z.string().trim().optional(),
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    category: z.string().trim().min(1, "Category cannot be empty").optional(),
  }),
});

export const UserValidation = {
  createAdminZodSchema,
  createUserZodSchema,
  updateProfileZodSchema,
  updateUserStatusZodSchema,
  addProjectPhotoZodSchema,
  updateProjectPhotoZodSchema,
};
