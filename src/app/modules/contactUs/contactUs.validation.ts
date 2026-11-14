import { z } from "zod";
import { CONTACT_US_PRIORITY, CONTACT_US_STATUS } from "./contactUs.constant";

const createContactUsZodSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Full name is required" })
      .min(1, "Full name cannot be empty"),
    email: z
      .string({ required_error: "Email address is required" })
      .email("Invalid email address"),
    subject: z
      .string({ required_error: "Subject is required" })
      .min(1, "Subject cannot be empty"),
    message: z
      .string({ required_error: "Message is required" })
      .min(1, "Message cannot be empty"),
    priority: z.nativeEnum(CONTACT_US_PRIORITY).optional(),
  }),
});

const updateContactUsStatusZodSchema = z.object({
  body: z.object({
    status: z.nativeEnum(CONTACT_US_STATUS).optional(),
    priority: z.nativeEnum(CONTACT_US_PRIORITY).optional(),
  }),
});

export const ContactUsValidation = {
  createContactUsZodSchema,
  updateContactUsStatusZodSchema,
};
