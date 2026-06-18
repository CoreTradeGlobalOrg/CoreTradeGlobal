/**
 * Complete-Profile Validation Schema
 *
 * Used by OAuth users (Google/LinkedIn) to fill in the business details that
 * the provider does not supply. Mirrors registerSchema minus email & password
 * (the provider supplies a verified email; OAuth users have no password).
 */

import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

export const completeProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name is too long')
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/, 'Only letters are allowed'),

  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name is too long')
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/, 'Only letters are allowed'),

  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(25, 'Phone number is too long')
    .refine((phone) => {
      try {
        return isValidPhoneNumber(phone);
      } catch {
        return false;
      }
    }, 'Invalid phone number. Please enter a valid international phone number (e.g., +1 234 567 8900)'),

  position: z
    .string()
    .min(2, 'Position must be at least 2 characters')
    .max(100, 'Position is too long'),

  companyType: z.enum(['trade', 'logistics', 'insurance'], {
    required_error: 'Please select a company type',
  }),

  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(200, 'Company name is too long'),

  companyCategory: z.string().min(1, 'Please select a company category'),

  country: z.string().min(1, 'Please select a country'),

  acceptPolicies: z.boolean().refine((val) => val === true, {
    message: 'You must accept all policies to continue',
  }),
});

export default completeProfileSchema;
