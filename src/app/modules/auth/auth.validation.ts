import { z } from "zod";
import { USER_ROLES } from "../../../enums/user";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const booleanLike = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((v) => v === "true"),
]);

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
    certificateUrl: z.string().trim().optional(),
  })
  .optional();

export const signUpBodyZodSchema = z
  .object({
    name: z
      .string({ required_error: "Full name is required" })
      .trim()
      .min(1, "Full name is required"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    phone: z
      .string({ required_error: "Phone number is required" })
      .trim()
      .min(5, "Valid phone number is required"),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().optional(),
    role: z
      .enum([USER_ROLES.HOME_OWNER, USER_ROLES.PROFESSIONAL])
      .optional()
      .default(USER_ROLES.HOME_OWNER),
    zipCode: z
      .string({ required_error: "ZIP code is required" })
      .trim()
      .min(3, "ZIP code is required"),
    countryCode: z.string().trim().optional(),
    agreedToTerms: booleanLike.optional(),
    profileImage: z.string().optional(),

    // Professional Step 2: Trade & Area
    companyName: z.string().trim().optional(),
    businessName: z.string().trim().optional(),
    category: z
      .string()
      .regex(objectIdRegex, "Invalid category ID")
      .optional(),
    serviceRadiusInMiles: z.union([z.number(), z.string()]).optional(),

    // Professional Step 3: Trade License & Liability Insurance
    licenseNumber: z.string().trim().optional(),
    licenseState: z.string().trim().optional(),
    state: z.string().trim().optional(),
    tradeLicenseCertificate: z.string().trim().optional(),
    tradeLicense: z.union([tradeLicenseZodSchema, z.string()]).optional(),

    insuranceCarrier: z.string().trim().optional(),
    carrier: z.string().trim().optional(),
    insuranceCoverage: z.union([z.string(), z.number()]).optional(),
    coverage: z.union([z.string(), z.number()]).optional(),
    coiCertificate: z.string().trim().optional(),
    insuranceCertificate: z.string().trim().optional(),
    liabilityInsurance: liabilityInsuranceZodSchema,

    // Professional Step 4: Background Check
    backgroundCheckConsent: booleanLike.optional(),
    checkrCandidateId: z.string().trim().optional(),
    checkrInvitationId: z.string().trim().optional(),
    checkrInvitationUrl: z.string().trim().optional(),

    // Push notifications / device metadata
    fcmToken: z.string().optional(),
    deviceId: z.string().optional(),
    deviceType: z.enum(["ios", "android", "web"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.confirmPassword !== undefined &&
      data.confirmPassword !== data.password
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Password and confirm password do not match",
      });
    }

    const role = data.role || USER_ROLES.HOME_OWNER;

    if (role === USER_ROLES.HOME_OWNER) {
      if (data.agreedToTerms !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["agreedToTerms"],
          message: "You must agree to the Terms & Conditions and Privacy Policy",
        });
      }
    }

    if (role === USER_ROLES.PROFESSIONAL) {
      if (data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Password must be at least 8 characters for professionals",
        });
      }

      const businessName = (data.companyName || data.businessName || "").trim();
      if (!businessName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyName"],
          message: "Business name is required for professionals",
        });
      }

      if (!data.category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["category"],
          message: "Primary trade category ID is required for professionals",
        });
      }

      const radiusRaw = data.serviceRadiusInMiles;
      const radiusMatch =
        typeof radiusRaw === "number"
          ? radiusRaw
          : typeof radiusRaw === "string"
            ? Number(radiusRaw.match(/\d+(\.\d+)?/)?.[0])
            : NaN;

      if (isNaN(radiusMatch) || radiusMatch <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["serviceRadiusInMiles"],
          message: "Valid service radius in miles is required",
        });
      }

      const nestedLicense =
        data.tradeLicense && typeof data.tradeLicense === "object"
          ? data.tradeLicense
          : {};
      const licenseNumber = (
        nestedLicense.licenseNumber ||
        data.licenseNumber ||
        ""
      ).trim();
      const licenseState = (
        nestedLicense.state ||
        data.licenseState ||
        data.state ||
        ""
      ).trim();

      if (!licenseNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["licenseNumber"],
          message: "Trade license number is required for professionals",
        });
      }

      if (!licenseState) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["licenseState"],
          message: "Trade license state is required for professionals",
        });
      }

      if (data.backgroundCheckConsent !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backgroundCheckConsent"],
          message: "You must agree to complete the background check on Checkr",
        });
      }
    }
  });

const signUpZodSchema = z.object({
  body: signUpBodyZodSchema,
});

const createVerifyEmailZodSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    oneTimeCode: z.number({ required_error: "One time code is required" }),
  }),
});

const createLoginZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }),
    password: z.string({ required_error: "Password is required" }),
    fcmToken: z.string().optional(),
    deviceId: z.string().optional(),
    deviceType: z.enum(["ios", "android", "web"]).optional(),
  }),
});

const createForgetPasswordZodSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email format"),
  }),
});

const createResetPasswordZodSchema = z.object({
  body: z.object({
    newPassword: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string({
      required_error: "Confirm Password is required",
    }),
  }),
});

const createChangePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z.string({
      required_error: "Current Password is required",
    }),
    newPassword: z
      .string({ required_error: "New Password is required" })
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string({
      required_error: "Confirm Password is required",
    }),
  }),
});

export const AuthValidation = {
  signUpZodSchema,
  createVerifyEmailZodSchema,
  createForgetPasswordZodSchema,
  createLoginZodSchema,
  createResetPasswordZodSchema,
  createChangePasswordZodSchema,
};
