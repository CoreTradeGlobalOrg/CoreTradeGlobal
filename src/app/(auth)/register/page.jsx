/**
 * Register Page
 *
 * URL: /register
 * Public page - no authentication required
 *
 * Uses next/dynamic with ssr:false to prevent SSR crash caused by
 * useSearchParams and browser-only APIs (reCAPTCHA, libphonenumber-js) inside RegisterForm.
 */

'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const RegisterForm = dynamic(
  () => import('@/presentation/components/features/auth/RegisterForm/RegisterForm').then(m => ({ default: m.RegisterForm })),
  { ssr: false }
);

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>}>
      <RegisterForm />
    </Suspense>
  );
}
