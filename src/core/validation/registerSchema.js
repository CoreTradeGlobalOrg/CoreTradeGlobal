/**
 * Registration Form Validation Schema
 *
 * Using Zod for type-safe validation
 */

import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

// List of common temporary email domains to block
const TEMP_EMAIL_DOMAINS = [
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', '10minutemail.com',
  'mailinator.com', 'maildrop.cc', 'throwaway.email', 'yopmail.com',
  'fakeinbox.com', 'temp-mail.io', 'getnada.com', 'disposablemail.com',
  'trashmail.com', 'mintemail.com', 'sharklasers.com', 'guerrillamailblock.com',
  'pokemail.net', 'spam4.me', 'grr.la', 'mailnesia.com', 'tempinbox.com',
  'emailondeck.com', 'burnermail.io', 'discard.email', 'getairmail.com',
  'armyspy.com', 'cuvox.de', 'dayrep.com', 'einrot.com', 'fleckens.hu',
  'gustr.com', 'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us',
];

export const registerSchema = z
  .object({
    // Personal Information
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

    email: z
      .string()
      .email('Invalid email address')
      .transform(val => val.toLowerCase())
      .refine((email) => {
        const domain = email.split('@')[1];
        return !TEMP_EMAIL_DOMAINS.includes(domain?.toLowerCase());
      }, 'Temporary email addresses are not allowed. Please use a business email.'),

    phone: z
      .string()
      .min(7, 'Phone number is too short')
      .max(25, 'Phone number is too long')
      .refine((phone) => {
        try {
          // Try to parse and validate phone number
          return isValidPhoneNumber(phone);
        } catch (err) {
          return false;
        }
      }, 'Invalid phone number. Please enter a valid international phone number (e.g., +1 234 567 8900)'),

    position: z
      .string()
      .min(2, 'Position must be at least 2 characters')
      .max(100, 'Position is too long'),

    // Company Information
    companyName: z
      .string()
      .min(2, 'Company name must be at least 2 characters')
      .max(200, 'Company name is too long'),

    companyCategory: z
      .string()
      .min(1, 'Please select a company category'),

    country: z
      .string()
      .min(1, 'Please select a country'),

    // Password
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password is too long'),

    confirmPassword: z
      .string()
      .min(6, 'Please confirm your password'),

    // Terms & Conditions
    acceptPolicies: z
      .boolean()
      .refine((val) => val === true, {
        message: 'You must accept all policies to create an account',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default registerSchema;
