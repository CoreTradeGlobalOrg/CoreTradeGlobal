'use client';

import { ArrowRight, Eye, EyeOff, Loader2, User } from 'lucide-react';

/**
 * IdentityStep (Step 1) - Email + password sign-in form for onboarding.
 */
export function IdentityStep({ registerStep1, handleStep1Submit, onSubmit, step1Errors, isLoading, showPassword, setShowPassword, showConfirm, setShowConfirm }) {
  return (
    <div className="login-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
          <User className="w-5 h-5 text-[#FFD700]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Verify Your Identity</h2>
          <p className="text-xs text-gray-400">Sign in with your invite link and set a password</p>
        </div>
      </div>

      <form onSubmit={handleStep1Submit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">Your Email Address</label>
          <input type="email" {...registerStep1('email')} placeholder="you@company.com" disabled={isLoading} className="form-input-anasyf" />
          {step1Errors.email && <p className="mt-1 text-xs text-red-400">{step1Errors.email.message}</p>}
          <p className="mt-1 text-xs text-gray-500">Enter the email address this invite was sent to</p>
        </div>

        <div>
          <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">Set Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} {...registerStep1('password')} placeholder="Min. 8 characters" disabled={isLoading} className="form-input-anasyf pr-12" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors" tabIndex={-1}>
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {step1Errors.password && <p className="mt-1 text-xs text-red-400">{step1Errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">Confirm Password</label>
          <div className="relative">
            <input type={showConfirm ? 'text' : 'password'} {...registerStep1('confirmPassword')} placeholder="Re-enter your password" disabled={isLoading} className="form-input-anasyf pr-12" />
            <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors" tabIndex={-1}>
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {step1Errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{step1Errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="w-full p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : <>Verify & Continue <ArrowRight className="w-5 h-5" /></>}
        </button>
      </form>
    </div>
  );
}
