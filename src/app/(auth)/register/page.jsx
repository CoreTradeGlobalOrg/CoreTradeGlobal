/**
 * Register Page
 *
 * URL: /register
 * Public page - no authentication required
 */

import { Suspense } from 'react';
import { RegisterForm } from '@/presentation/components/features/auth/RegisterForm/RegisterForm';

export const metadata = {
  title: 'Register | CoreTradeGlobal',
  description: 'Create your CoreTradeGlobal B2B account',
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-radial-auth"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
