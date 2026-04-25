import { z } from "zod";

export const cardIdParamSchema = z
  .coerce
  .number({ message: "Card id must be a number." })
  .int({ message: "Card id must be an integer." })
  .positive({ message: "Card id must be greater than 0." });

export const cardPaginationQuerySchema = z.object({
  page: z
    .coerce
    .number({ message: "Page must be a number." })
    .int({ message: "Page must be an integer." })
    .min(1, { message: "Page must be at least 1." })
    .default(1),
  pageSize: z
    .coerce
    .number({ message: "Page size must be a number." })
    .int({ message: "Page size must be an integer." })
    .min(1, { message: "Page size must be at least 1." })
    .max(100, { message: "Page size must be 100 or lower." })
    .default(10),
});
