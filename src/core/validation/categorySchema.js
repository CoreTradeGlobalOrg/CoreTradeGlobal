/**
 * Category Validation Schema
 *
 * Zod schema for validating category data
 */

import { z } from 'zod';

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name must be less than 50 characters'),

  iconUrl: z
    .string()
    .min(1, 'Icon is required')
    .max(10, 'Icon must be a single emoji character'),

  parentId: z
    .string()
    .nullable()
    .optional(),
});

export default categorySchema;
