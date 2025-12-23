/**
 * Product Validation Schema
 *
 * Using Zod for type-safe validation
 */

import { z } from 'zod';

export const productSchema = z.object({
  // Product name
  name: z
    .string()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name is too long (max 200 characters)'),

  // Category
  categoryId: z
    .string()
    .min(1, 'Please select a category'),

  // Stock quantity
  stockQuantity: z
    .number()
    .min(0, 'Stock quantity cannot be negative')
    .int('Stock quantity must be a whole number'),

  // Price
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0'),

  // Currency
  currency: z
    .string()
    .min(1, 'Please select a currency'),

  // Description
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description is too long (max 2000 characters)'),

  // Status (optional, defaults to active)
  status: z
    .enum(['active', 'inactive'])
    .default('active')
    .optional(),
});

export default productSchema;
