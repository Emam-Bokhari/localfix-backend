import { z } from "zod";
import { USER_ROLES } from "../../../enums/user";
import {
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_STATUS,
} from "./supportTicket.constant";

const createSupportTicketZodSchema = z.object({
  body: z.object({
    subject: z
      .string({ required_error: "Subject is required" })
      .min(1, "Subject cannot be empty"),
    description: z
      .string({ required_error: "Detailed description is required" })
      .min(1, "Detailed description cannot be empty"),
    priority: z
      .nativeEnum(SUPPORT_TICKET_PRIORITY, {
        errorMap: () => ({
          message: "Priority must be urgent, high, medium, or low",
        }),
      })
      .optional(),
    relatedJobId: z.string().optional(),
    requesterName: z.string().optional(),
    requesterEmail: z.string().email("Invalid email address").optional(),
    requesterRole: z
      .nativeEnum(USER_ROLES, {
        errorMap: () => ({ message: "Invalid requester role" }),
      })
      .optional(),
  }),
});

const updateSupportTicketZodSchema = z.object({
  body: z.object({
    status: z.nativeEnum(SUPPORT_TICKET_STATUS).optional(),
    priority: z.nativeEnum(SUPPORT_TICKET_PRIORITY).optional(),
    assignedAdmin: z.string().optional().nullable(),
  }),
});

const addReplyZodSchema = z.object({
  body: z.object({
    message: z
      .string({ required_error: "Reply message is required" })
      .min(1, "Reply message cannot be empty"),
  }),
});

export const SupportTicketValidation = {
  createSupportTicketZodSchema,
  updateSupportTicketZodSchema,
  addReplyZodSchema,
};

