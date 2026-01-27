/**
 * Login Page
 *
 * URL: /login
 * Public page - no authentication required
 */

import { Suspense } from 'react';
import { LoginForm } from '@/presentation/components/features/auth/LoginForm/LoginForm';

export const metadata = {
  title: 'Login | CoreTradeGlobal',
  description: 'Login to your CoreTradeGlobal account',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-radial-auth"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
