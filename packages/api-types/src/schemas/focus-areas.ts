import { z } from "@hono/zod-openapi";

// Focus area entity schema
export const FocusAreaSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    displayOrder: z.number().nullable(),
  })
  .openapi("FocusArea");

export const FocusAreaListSchema = z
  .array(FocusAreaSchema)
  .openapi("FocusAreaList");

// Inferred types
export type FocusArea = z.infer<typeof FocusAreaSchema>;
export type FocusAreaList = z.infer<typeof FocusAreaListSchema>;
