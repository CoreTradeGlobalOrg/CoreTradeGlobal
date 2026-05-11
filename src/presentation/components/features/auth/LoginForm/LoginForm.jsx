/**
 * LoginForm Component
 *
 * Login form with email and password
 * Uses useLogin hook for login functionality
 * Supports MFA (TOTP) second step
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
import { useTrackEvent } from '@/presentation/hooks/analytics';
import { Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const { login, completeMfaLogin, loginWithBackupCode, clearError, loading, error, mfaRequired } = useLogin();
  const { trackLogin } = useTrackEvent();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const handleLoginSuccess = async (user) => {
    // Check if email is verified
    const authRepo = container.getAuthRepository();
    if (!authRepo.isEmailVerified()) {
      toast.error('Please verify your email before logging in.');
      router.push('/verify-email');
      return;
    }

    // Fire session cookie POST without blocking navigation — middleware will
    // pick it up on the next request, and AuthContext handles client-side auth
    try {
      const firebaseUser = authRepo.getCurrentUser();
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        // Don't await — let it complete in the background
        fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, role: user.role }),
        }).catch((err) => console.error('Session cookie error:', err));
      }
    } catch (cookieError) {
      console.error('Failed to get ID token:', cookieError);
    }

    trackLogin('email');
    toast.success('Login successful!');
    localStorage.removeItem('ctg_auth_redirect');
    window.location.href = redirectTo || '/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const user = await login(email, password);
      if (!user) return; // MFA required — form will switch to TOTP input
      await handleLoginSuccess(user);
    } catch (err) {
      console.error('Login failed:', err);

      if (err.message === 'ACCOUNT_DELETED' && err.deletionInfo) {
        setDeletionInfo(err.deletionInfo);
        setShowDeletedDialog(true);
        return;
      }

      toast.error(error || 'Login failed. Please check your credentials.');
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setMfaLoading(true);

    try {
      if (useBackupCode) {
        const user = await loginWithBackupCode(email, backupCode);
        if (user.remainingBackupCodes !== undefined) {
          toast.success(`Logged in with backup code. ${user.remainingBackupCodes} codes remaining.`);
        }
        await handleLoginSuccess(user);
      } else {
        const user = await completeMfaLogin(totpCode);
        await handleLoginSuccess(user);
      }
    } catch (err) {
      console.error('MFA verification failed:', err);
      toast.error(err.message || (useBackupCode ? 'Invalid backup code.' : 'Invalid authenticator code.'));
      setMfaLoading(false);
    }
  };

  const handleAccountRecovered = () => {
    setEmail('');
    setPassword('');
    toast.success('Your account has been recovered. Please log in again.');
  };

  // MFA step — show TOTP code or backup code input
  if (mfaRequired) {
    const isBusy = loading || mfaLoading;
    const isSubmitDisabled = useBackupCode
      ? isBusy || backupCode.trim().length === 0
      : isBusy || totpCode.length !== 6;

    return (
      <div className="login-card w-full max-w-[440px] p-10 text-center relative z-10">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
            {useBackupCode
              ? <KeyRound className="w-8 h-8 text-[#FFD700]" />
              : <ShieldCheck className="w-8 h-8 text-[#FFD700]" />
            }
          </div>
        </div>
        <h1 className="text-[28px] font-bold text-white mb-2">
          {useBackupCode ? 'Backup Code' : 'Two-Factor Authentication'}
        </h1>
        <p className="text-sm text-[#A0A0A0] mb-8 leading-relaxed">
          {useBackupCode
            ? 'Enter one of your backup codes to sign in.'
            : 'Enter the 6-digit code from your authenticator app to continue.'
          }
        </p>

        <form onSubmit={handleMfaSubmit} className="text-left">
          {useBackupCode ? (
            <div className="mb-5">
              <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Backup Code
              </label>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX"
                className="form-input-anasyf text-center text-xl tracking-widest font-mono"
                required
                autoFocus
                disabled={isBusy}
              />
            </div>
          ) : (
            <div className="mb-5">
              <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Authenticator Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="form-input-anasyf text-center text-2xl tracking-[0.5em] font-mono"
                required
                autoFocus
                disabled={isBusy}
              />
            </div>
          )}

          {error && (
            <div className="p-3 mb-5 bg-red-900/20 border border-red-500/50 text-red-200 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? 'Verifying...' : 'Verify & Log In'}
          </button>

          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              clearError();
              setTotpCode('');
              setBackupCode('');
            }}
            className="w-full mt-3 p-3 text-sm text-[#A0A0A0] hover:text-[#FFD700] transition-colors"
          >
            {useBackupCode ? 'Use authenticator app instead' : 'Lost your device? Use a backup code'}
          </button>

          <p className="mt-2 text-center text-xs text-[#A0A0A0]">
            Having trouble? Contact{' '}
            <a href="mailto:support@coretradeglobal.com" className="text-[#FFD700]">
              support@coretradeglobal.com
            </a>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="login-card w-full max-w-[440px] p-10 text-center relative z-10">
      <h1 className="text-[32px] font-bold text-white mb-2">Welcome Back</h1>
      <p className="text-sm text-[#A0A0A0] mb-8 leading-relaxed">Access your dashboard, messages, and trade opportunities.</p>

      <form onSubmit={handleSubmit} className="text-left">
        <div className="mb-5">
          <label htmlFor="login-email" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">Email Address</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="form-input-anasyf"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="login-password" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">Password</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input-anasyf pr-12"
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700] rounded"
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
