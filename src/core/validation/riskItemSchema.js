/**
 * Risk Item Validation Schema
 *
 * Zod schema for the risk flagging form in QuickActionToolbar (lawyer only).
 * Validates risk title, severity, and description before submitting to Cloud Functions.
 *
 * Follows the same structure and export style as offerSchema.js
 */

import { z } from 'zod';

// Valid severity levels — mirrors RISK_SEVERITY constant in legalConstants.js
const VALID_SEVERITY_VALUES = ['low', 'medium', 'high'];

export const riskItemSchema = z.object({
  // Risk title — required, 1-200 chars
  title: z
    .string({ required_error: 'Risk title is required' })
    .min(1, 'Risk title is required')
    .max(200, 'Risk title must be 200 characters or fewer'),

  // Severity level — required enum
  severity: z
    .string({ required_error: 'Severity is required' })
    .refine((val) => VALID_SEVERITY_VALUES.includes(val), {
      message: 'Please select a valid severity level',
    }),

  // Description — optional, max 2000 chars
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional()
    .default(''),
});

export default riskItemSchema;
