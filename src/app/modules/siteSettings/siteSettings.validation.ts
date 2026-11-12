import { z } from "zod";

const upsertSiteSettingsValidationSchema = z.object({
  body: z.object({
    platformBrandName: z
      .string()
      .trim()
      .min(1, "Platform brand name cannot be empty")
      .optional(),
    headerLogo: z.string().min(1, "Header logo cannot be empty").optional(),
    footerLogo: z.string().min(1, "Footer logo cannot be empty").optional(),
    favicon: z.string().min(1, "Favicon cannot be empty").optional(),
    supportEmail: z
      .string()
      .trim()
      .email("Invalid support email address")
      .optional(),
    supportPhone: z
      .string()
      .trim()
      .min(1, "Support phone cannot be empty")
      .optional(),
    address: z.string().trim().min(1, "Address cannot be empty").optional(),
    facebookUrl: z.string().trim().url("Invalid Facebook URL").optional().or(z.literal("")),
    instagramUrl: z.string().trim().url("Invalid Instagram URL").optional().or(z.literal("")),
    linkedinUrl: z.string().trim().url("Invalid LinkedIn URL").optional().or(z.literal("")),
  }),
});

export const SiteSettingsZodValidation = {
  upsertSiteSettingsValidationSchema,
};

