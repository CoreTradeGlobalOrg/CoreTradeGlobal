import { z } from 'zod';

export const totpVerifySchema = z.object({
  code: z.string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
});
