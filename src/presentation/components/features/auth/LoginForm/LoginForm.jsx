/**
 * LoginForm Component
 *
 * Login form with email and password
 * Uses useLogin hook for login functionality
 *
 * Usage:
 * <LoginForm />
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLogin } from '@/presentation/hooks/auth/useLogin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { container } from '@/core/di/container';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useLogin();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const user = await login(email, password);

      // Check if email is verified
      const authRepo = container.getAuthRepository();
      if (!authRepo.isEmailVerified()) {
        toast.error('Please verify your email before logging in.');
        router.push('/verify-email');
        return;
      }

      // Success
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (err) {
      // Error is already handled by useLogin hook
      console.error('Login failed:', err);
      toast.error(error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={loading}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <a
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Logging in...' : 'Login'}
      </Button>

      <div className="text-center text-sm">
        <span className="text-gray-600">Don&apos;t have an account? </span>
        <a href="/register" className="text-blue-600 hover:underline">
          Register
        </a>
      </div>
    </form>
  );
}

export default LoginForm;
