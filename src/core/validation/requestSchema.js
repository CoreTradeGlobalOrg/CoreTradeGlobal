/**
 * Request (RFQ) Validation Schema
 *
 * Using Zod for type-safe validation
 */

import { z } from 'zod';

export const requestSchema = z.object({
  // Product name
  productName: z
    .string()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name is too long (max 200 characters)'),

  // Category
  categoryId: z
    .string()
    .min(1, 'Please select a category'),

  // Target country
  targetCountry: z
    .string()
    .min(1, 'Please select a target country'),

  // Quantity
  quantity: z
    .number()
    .min(1, 'Quantity must be at least 1')
    .int('Quantity must be a whole number'),

  // Description
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description is too long (max 2000 characters)'),

  // Status (optional, defaults to active)
  status: z
    .enum(['active', 'closed'])
    .default('active')
    .optional(),
});

export default requestSchema;
