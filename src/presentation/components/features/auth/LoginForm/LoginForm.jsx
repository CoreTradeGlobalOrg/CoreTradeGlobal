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
import { DeletedAccountDialog } from '@/presentation/components/features/auth/DeletedAccountDialog/DeletedAccountDialog';
import { Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState(null);
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

      // Success - redirect to homepage or intended page (from URL param only)
      toast.success('Login successful!');

      // Clear any stored redirect from ViewLimitGuard
      localStorage.removeItem('ctg_auth_redirect');

      // Only use URL redirect param, otherwise go to homepage
      router.push(redirectTo || '/');
    } catch (err) {
      console.error('Login failed:', err);

      // Check if account is deleted/banned
      if (err.message === 'ACCOUNT_DELETED' && err.deletionInfo) {
        setDeletionInfo(err.deletionInfo);
        setShowDeletedDialog(true);
        return;
      }

      toast.error(error || 'Login failed. Please check your credentials.');
    }
  };

  const handleAccountRecovered = () => {
    // Clear form and show success message
    setEmail('');
    setPassword('');
    toast.success('Your account has been recovered. Please log in again.');
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
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input-anasyf pr-12"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="remember" className="w-4 h-4 accent-[#FFD700] cursor-pointer" />
            <label htmlFor="remember" className="text-[13px] text-[#A0A0A0] cursor-pointer">Remember me</label>
          </div>
          <Link href="/forgot-password" className="text-[13px] text-[#FFD700] font-medium hover:text-white hover:underline transition-colors">
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
          Don't have an account? <Link href="/register" className="text-[#FFD700] font-semibold hover:text-white transition-colors">Register Now</Link>
        </p>
      </form>

      {/* Deleted/Banned Account Dialog */}
      <DeletedAccountDialog
        isOpen={showDeletedDialog}
        onClose={() => setShowDeletedDialog(false)}
        deletionInfo={deletionInfo}
        onRecovered={handleAccountRecovered}
      />
    </div>
  );
}

export default LoginForm;
