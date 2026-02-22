/**
 * Offer Validation Schema
 *
 * Zod schema for the offer/counter-offer form.
 * Validates all terms submitted when creating or countering a deal offer.
 *
 * Follows the same structure and export style as productSchema.js
 */

import { z } from 'zod';
import { DEAL_UNITS, PAYMENT_TERMS, INSURANCE_PREFERENCE, EXPIRY_DEFAULT_HOURS } from '@/core/constants/dealConstants';
import { INCOTERMS_2020 } from '@/core/constants/incoterms';

// Extract valid enum values from constants
const validUnitValues = DEAL_UNITS.map((u) => u.value);
const validPaymentTermValues = PAYMENT_TERMS.map((p) => p.value);
const validIncotermCodes = INCOTERMS_2020.map((t) => t.code);
const validInsuranceValues = Object.values(INSURANCE_PREFERENCE);

export const offerSchema = z.object({
  // Price per unit (must be a positive number)
  price: z
    .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a number' })
    .positive('Price must be greater than zero'),

  // Quantity (must be a positive number)
  quantity: z
    .number({ required_error: 'Quantity is required', invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be greater than zero'),

  // Unit of measure (kg, ton, pieces, etc.)
  unit: z
    .string({ required_error: 'Unit is required' })
    .refine((val) => validUnitValues.includes(val), {
      message: 'Please select a valid unit',
    }),

  // Currency code (3-char ISO 4217, e.g. USD, EUR, TRY)
  currency: z
    .string({ required_error: 'Currency is required' })
    .length(3, 'Currency must be a 3-character code (e.g., USD, EUR)'),

  // Conversion rate — optional, used when offer currency differs from product base currency
  conversionRate: z
    .number()
    .positive('Conversion rate must be greater than zero')
    .nullable()
    .optional()
    .default(null),

  // Incoterm 2020 code (EXW, FOB, CIF, etc.)
  incoterm: z
    .string({ required_error: 'Incoterm is required' })
    .refine((val) => validIncotermCodes.includes(val), {
      message: 'Please select a valid Incoterm 2020',
    }),

  // Named place (port, city, or address depending on selected Incoterm)
  namedPlace: z
    .string({ required_error: 'Named place is required' })
    .min(1, 'Named place is required'),

  // Delivery deadline (must be a future date)
  deliveryDeadline: z
    .date({ required_error: 'Delivery deadline is required', invalid_type_error: 'Delivery deadline must be a valid date' })
    .refine((date) => date > new Date(), {
      message: 'Delivery deadline must be in the future',
    }),

  // Payment terms (cash, 30_days, lc, etc.)
  paymentTerms: z
    .string({ required_error: 'Payment terms are required' })
    .refine((val) => validPaymentTermValues.includes(val), {
      message: 'Please select valid payment terms',
    }),

  // Insurance responsibility
  insurancePreference: z
    .string({ required_error: 'Insurance preference is required' })
    .refine((val) => validInsuranceValues.includes(val), {
      message: 'Please select a valid insurance preference',
    }),

  // Optional freeform notes (max 2000 chars)
  notes: z
    .string()
    .max(2000, 'Notes must be 2000 characters or fewer')
    .nullable()
    .optional()
    .default(null),

  // Custom expiry window in hours (defaults to EXPIRY_DEFAULT_HOURS = 72)
  expiryHours: z
    .number()
    .positive('Expiry hours must be greater than zero')
    .optional()
    .default(EXPIRY_DEFAULT_HOURS),
});

export default offerSchema;
