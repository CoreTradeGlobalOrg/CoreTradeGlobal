/**
 * LoginForm Component
 *
 * Login form with email and password
 * Uses useLogin hook for login functionality
 * MATCHES UI: login sayfası.html (Radial gradient background, glassmorphism)
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLogin } from '@/presentation/hooks/auth/useLogin';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { container } from '@/core/di/container';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useLogin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

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

      // Success - redirect to intended page or profile
      toast.success('Login successful!');

      // Check localStorage for redirect (from registration flow)
      const storedRedirect = localStorage.getItem('ctg_auth_redirect');
      if (storedRedirect) {
        localStorage.removeItem('ctg_auth_redirect');
        router.push(storedRedirect);
      } else {
        router.push(redirectTo || `/profile/${user.uid}`);
      }
    } catch (err) {
      console.error('Login failed:', err);
      toast.error(error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="login-card w-full max-w-[440px] p-10 text-center relative z-10">
      <h1 className="text-[32px] font-bold text-white mb-2">Welcome Back</h1>
      <p className="text-sm text-[#A0A0A0] mb-8 leading-relaxed">Access your dashboard, messages, and trade opportunities.</p>

      <form onSubmit={handleSubmit} className="text-left">
        <div className="mb-5">
          <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="form-input-anasyf"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-5">
          <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="form-input-anasyf"
            required
            disabled={loading}
          />
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="remember" className="w-4 h-4 accent-[#D4AF37] cursor-pointer" />
            <label htmlFor="remember" className="text-[13px] text-[#A0A0A0] cursor-pointer">Remember me</label>
          </div>
          <Link href="/forgot-password" className="text-[13px] text-[#D4AF37] font-medium hover:text-white hover:underline transition-colors">
            Forgot Password?
          </Link>
        </div>

        {error && (
          <div className="p-3 mb-5 bg-red-900/20 border border-red-500/50 text-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p className="mt-6 text-center text-sm text-[#A0A0A0]">
          Don't have an account? <Link href="/register" className="text-[#D4AF37] font-semibold hover:text-white transition-colors">Register Now</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;
