/**
 * Product Validation Schema
 *
 * Using Zod for type-safe validation
 */

import { z } from 'zod';
import { UNITS, UNIT_CATEGORIES } from '@/core/constants/units';

// Extract valid unit codes and categories
const validUnitCodes = UNITS.map((unit) => unit.code);
const validUnitCategories = UNIT_CATEGORIES.map((cat) => cat.value);

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

  // Unit (UNECE code)
  unit: z
    .string()
    .refine((val) => validUnitCodes.includes(val), {
      message: 'Please select a valid unit',
    }),

  // Unit Category
  unitCategory: z
    .string()
    .refine((val) => validUnitCategories.includes(val), {
      message: 'Please select a valid unit category',
    }),

  // Price (0 = Negotiable)
  price: z
    .number()
    .min(0, 'Price cannot be negative'),

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
