/**
 * Submit Quote Validation Schema
 *
 * Zod schema for the SubmitQuoteDialog form (supplier responding to RFQs).
 * Validates all fields before submitting a quote to Cloud Functions.
 *
 * Follows the same structure and export style as offerSchema.js
 */

import { z } from 'zod';

// Valid currency codes supported in the form
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY', 'CNY', 'JPY', 'AED', 'SAR', 'CAD', 'AUD'];

// Valid Incoterms 2020 codes
const VALID_INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

// Valid shipping methods
const VALID_SHIPPING_METHODS = ['sea_fcl', 'sea_lcl', 'air', 'express', 'road', 'rail', 'multimodal'];

// Valid payment terms
const VALID_PAYMENT_TERMS = ['tt_100', 'tt_30_70', 'lc', 'dp', 'cad', 'oa', 'escrow'];

// Valid warranty options
const VALID_WARRANTY_OPTIONS = ['none', '6_months', '12_months', '24_months', 'lifetime'];

export const submitQuoteSchema = z.object({
  // Unit price — must be a positive number (HTML number input returns a string, coerced)
  unitPrice: z
    .string({ required_error: 'Unit price is required' })
    .min(1, 'Unit price is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Price must be greater than 0',
    }),

  // Currency code (3-char ISO 4217)
  currency: z
    .string({ required_error: 'Currency is required' })
    .refine((val) => VALID_CURRENCIES.includes(val), {
      message: 'Please select a valid currency',
    }),

  // Incoterms 2020 code
  incoterms: z
    .string({ required_error: 'Incoterms are required' })
    .refine((val) => VALID_INCOTERMS.includes(val), {
      message: 'Please select a valid Incoterm',
    }),

  // Shipping method
  shippingMethod: z
    .string({ required_error: 'Shipping method is required' })
    .refine((val) => VALID_SHIPPING_METHODS.includes(val), {
      message: 'Please select a valid shipping method',
    }),

  // Port of loading — optional free text (max 200 chars)
  portOfLoading: z
    .string()
    .max(200, 'Port of loading must be 200 characters or fewer')
    .optional()
    .default(''),

  // Lead time — optional free text (e.g. "15-20 Days")
  leadTime: z
    .string()
    .max(100, 'Lead time must be 100 characters or fewer')
    .optional()
    .default(''),

  // Minimum order quantity — optional positive integer
  moq: z
    .string()
    .optional()
    .default('')
    .refine((val) => val === '' || (!isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0), {
      message: 'MOQ must be a positive number',
    }),

  // Supply capacity — optional free text
  supplyCapacity: z
    .string()
    .max(100, 'Supply capacity must be 100 characters or fewer')
    .optional()
    .default(''),

  // Payment terms
  paymentTerms: z
    .string({ required_error: 'Payment terms are required' })
    .refine((val) => VALID_PAYMENT_TERMS.includes(val), {
      message: 'Please select valid payment terms',
    }),

  // Product warranty
  warranty: z
    .string({ required_error: 'Warranty option is required' })
    .refine((val) => VALID_WARRANTY_OPTIONS.includes(val), {
      message: 'Please select a valid warranty option',
    }),

  // Price validity date — optional (HTML date input returns YYYY-MM-DD string)
  priceValidUntil: z
    .string()
    .optional()
    .default('')
    .refine((val) => val === '' || !isNaN(Date.parse(val)), {
      message: 'Price validity must be a valid date',
    })
    .refine((val) => val === '' || new Date(val) > new Date(), {
      message: 'Price validity must be a future date',
    }),

  // Technical specifications & competitive advantages — optional (max 5000 chars)
  specifications: z
    .string()
    .max(5000, 'Specifications must be 5000 characters or fewer')
    .optional()
    .default(''),
});

export default submitQuoteSchema;
