import { z } from "zod";

const toggleFavoriteZodSchema = z.object({
  body: z.object({
    referenceId: z.string().optional(),
    id: z.string().optional(),
  }),
});

export const FavoriteValidation = {
  toggleFavoriteZodSchema,
};

