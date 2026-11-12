import { z } from "zod";

const createChatValidationSchema = z.object({
  body: z.object({
    participant: z
      .string({ required_error: "Participant ID is required" })
      .min(1, "Participant ID is required"),
  }),
});

export const chatValidation = {
  createChatValidationSchema,
};
