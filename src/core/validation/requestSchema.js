/**
 * Request (RFQ) Validation Schema
 *
 * Using Zod for type-safe validation
 */

import { z } from 'zod';
import { UNITS, UNIT_CATEGORIES } from '@/core/constants/units';

// Extract valid unit codes and categories
const validUnitCodes = UNITS.map((unit) => unit.code);
const validUnitCategories = UNIT_CATEGORIES.map((cat) => cat.value);

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
    .positive('Quantity must be greater than 0'),

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

  // Budget (required, 0 = Negotiable)
  budget: z
    .number({ invalid_type_error: 'Please enter a valid budget amount' })
    .min(0, 'Budget cannot be negative'),
});

export default requestSchema;
