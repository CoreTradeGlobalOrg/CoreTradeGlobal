/**
 * Register Page
 *
 * URL: /register
 * Public page - no authentication required
 */

import { RegisterForm } from '@/presentation/components/features/auth/RegisterForm/RegisterForm';

export const metadata = {
  title: 'Register | CoreTradeGlobal',
  description: 'Create your CoreTradeGlobal B2B account',
};

export default function RegisterPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Create Your Account</h1>
        <p className="text-slate-600 mt-2">
          Join CoreTradeGlobal B2B Platform
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
