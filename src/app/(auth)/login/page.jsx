/**
 * Login Page
 *
 * URL: /login
 * Public page - no authentication required
 */

import { LoginForm } from '@/presentation/components/features/auth/LoginForm/LoginForm';

export const metadata = {
  title: 'Login | CoreTradeGlobal',
  description: 'Login to your CoreTradeGlobal account',
};

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">Welcome Back</h2>
      <LoginForm />
    </div>
  );
}
