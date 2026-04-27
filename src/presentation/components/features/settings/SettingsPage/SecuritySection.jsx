/**
 * SecuritySection
 *
 * Password change form (zodResolver + Phase 7 validation standard) and
 * TOTP 2FA toggle (enable/disable with re-authentication gate).
 *
 * TwoFactorSetup is loaded dynamically (ssr:false) to avoid SSR issues
 * with qrcode.react and SubtleCrypto APIs.
 */

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Shield, ShieldOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { changePasswordSchema } from '@/core/validation/changePasswordSchema';
import { usePasswordChange } from '@/presentation/hooks/settings/usePasswordChange';
import { useTwoFactor } from '@/presentation/hooks/settings/useTwoFactor';

// Loaded dynamically — avoids SSR issues with qrcode.react and SubtleCrypto
const TwoFactorSetup = dynamic(
  () =>
    import('./TwoFactorSetup').then((m) => m.TwoFactorSetup),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Password Change sub-section
// ---------------------------------------------------------------------------
function PasswordChangeSection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { changePassword, loading, error: hookError } = usePasswordChange();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });

  const onSubmit = async (data) => {
    const result = await changePassword(data.currentPassword, data.newPassword);
    if (result.success) {
      toast.success('Password updated successfully');
      reset();
    }
  };

  const inputBase =
    'w-full bg-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] pr-10 focus:outline-none focus:border-[#FFD700]/50';

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-5">
      <h4 className="text-sm font-semibold text-white mb-4">Change Password</h4>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Current password */}
        <div>
          <label className="text-xs text-[#A0A0A0] block mb-1">Current Password</label>
          <div className="relative">
            <input
              {...register('currentPassword')}
              type={showCurrent ? 'text' : 'password'}
              placeholder="Enter current password"
              className={`${inputBase} border ${
                errors.currentPassword
                  ? 'border-red-500'
                  : 'border-[rgba(255,255,255,0.1)]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-xs text-red-400 mt-1">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New password */}
        <div>
          <label className="text-xs text-[#A0A0A0] block mb-1">New Password</label>
          <div className="relative">
            <input
              {...register('newPassword')}
              type={showNew ? 'text' : 'password'}
              placeholder="Enter new password"
              className={`${inputBase} border ${
                errors.newPassword
                  ? 'border-red-500'
                  : 'border-[rgba(255,255,255,0.1)]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-red-400 mt-1">{errors.newPassword.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="text-xs text-[#A0A0A0] block mb-1">Confirm New Password</label>
          <div className="relative">
            <input
              {...register('confirmPassword')}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm new password"
              className={`${inputBase} border ${
                errors.confirmPassword
                  ? 'border-red-500'
                  : 'border-[rgba(255,255,255,0.1)]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Hook-level error (reauthentication failure, etc.) */}
        {hookError && (
          <p className="text-xs text-red-400">{hookError}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-[#FFD700] !text-black text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#FFC700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Two-Factor Authentication sub-section
// ---------------------------------------------------------------------------
function TwoFactorSection() {
  const [disablePassword, setDisablePassword] = useState('');
  const [disableTotpCode, setDisableTotpCode] = useState('');
  const [showDisablePw, setShowDisablePw] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [regenPassword, setRegenPassword] = useState('');
  const [regenTotpCode, setRegenTotpCode] = useState('');
  const [showRegenPw, setShowRegenPw] = useState(false);
  const [showRegenForm, setShowRegenForm] = useState(false);

  const {
    step,
    qrCodeUrl,
    backupCodes,
    loading,
    error,
    isEnrolled,
    remainingCodes,
    startEnrollment,
    reauthAndGenerateSecret,
    verifyAndEnroll,
    disableTwoFactor,
    regenerateBackupCodes,
    reset,
  } = useTwoFactor();

  const handleDisable = async (e) => {
    e.preventDefault();
    setDisabling(true);
    await disableTwoFactor(disablePassword, disableTotpCode);
    setDisabling(false);
    if (!error) {
      toast.success('Two-factor authentication disabled');
      setDisablePassword('');
      setDisableTotpCode('');
    }
  };

  const handleRegenerate = async (e) => {
    e.preventDefault();
    await regenerateBackupCodes(regenPassword, regenTotpCode);
    if (!error) {
      setRegenPassword('');
      setRegenTotpCode('');
      setShowRegenForm(false);
    }
  };

  const isSetupActive = step !== 'idle' && step !== 'showCodes';
  const isShowingCodes = step === 'showCodes';

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white">Two-Factor Authentication</h4>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isEnrolled
              ? 'bg-green-900/40 text-green-400 border border-green-800/50'
              : 'bg-[rgba(255,255,255,0.05)] text-[#A0A0A0] border border-[rgba(255,255,255,0.08)]'
          }`}
        >
          {isEnrolled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <p className="text-xs text-[#A0A0A0] mb-4">
        {isEnrolled
          ? 'Your account is protected with a TOTP authenticator app.'
          : 'Add an extra layer of security by requiring a code from an authenticator app.'}
      </p>

      {/* Not enrolled: show Enable button or setup flow */}
      {!isEnrolled && !isSetupActive && !isShowingCodes && (
        <button
          type="button"
          onClick={startEnrollment}
          className="flex items-center gap-2 bg-[#FFD700] !text-black text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#FFC700] transition-colors"
        >
          <Shield className="w-4 h-4" />
          Enable 2FA
        </button>
      )}

      {/* Setup flow: reauthenticating | scanning */}
      {(isSetupActive || isShowingCodes) && (
        <TwoFactorSetup
          step={step}
          qrCodeUrl={qrCodeUrl}
          backupCodes={backupCodes}
          loading={loading}
          error={error}
          reauthAndGenerateSecret={reauthAndGenerateSecret}
          verifyAndEnroll={verifyAndEnroll}
          reset={reset}
        />
      )}

      {/* Enrolled: show backup codes status + regenerate */}
      {isEnrolled && step === 'idle' && remainingCodes !== null && (
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#A0A0A0] font-medium">Backup Codes</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              remainingCodes <= 3
                ? 'bg-red-900/40 text-red-400 border border-red-800/50'
                : 'bg-[rgba(255,255,255,0.05)] text-[#A0A0A0] border border-[rgba(255,255,255,0.08)]'
            }`}>
              {remainingCodes} remaining
            </span>
          </div>

          {remainingCodes <= 3 && (
            <div className="flex items-start gap-2 mb-3 p-2 bg-amber-900/20 border border-amber-700/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                {remainingCodes === 0
                  ? 'You have no backup codes left. Regenerate new codes now.'
                  : 'You are running low on backup codes. Consider regenerating new ones.'}
              </p>
            </div>
          )}

          {!showRegenForm ? (
            <button
              type="button"
              onClick={() => setShowRegenForm(true)}
              className="flex items-center gap-2 text-sm text-[#A0A0A0] hover:text-white px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate Backup Codes
            </button>
          ) : (
            <form onSubmit={handleRegenerate} className="space-y-3">
              <p className="text-xs text-amber-400">
                This will invalidate all existing backup codes and generate 10 new ones.
              </p>
              <div className="relative">
                <input
                  type={showRegenPw ? 'text' : 'password'}
                  value={regenPassword}
                  onChange={(e) => setRegenPassword(e.target.value)}
                  placeholder="Enter password to confirm"
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] pr-10 focus:outline-none focus:border-[#FFD700]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowRegenPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white"
                >
                  {showRegenPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={regenTotpCode}
                onChange={(e) => setRegenTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit authenticator code"
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] focus:outline-none focus:border-[#FFD700]/50"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !regenPassword || regenTotpCode.length !== 6}
                  className="flex items-center gap-2 bg-[#FFD700] !text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#FFC700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {loading ? 'Generating...' : 'Generate New Codes'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRegenForm(false); setRegenPassword(''); setRegenTotpCode(''); }}
                  className="text-sm text-[#A0A0A0] hover:text-white px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Enrolled: show Disable form */}
      {isEnrolled && step === 'idle' && (
        <form onSubmit={handleDisable} className="space-y-3">
          <div className="relative">
            <input
              type={showDisablePw ? 'text' : 'password'}
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Enter password to disable 2FA"
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] pr-10 focus:outline-none focus:border-red-500/50"
            />
            <button
              type="button"
              onClick={() => setShowDisablePw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white"
            >
              {showDisablePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={disableTotpCode}
            onChange={(e) => setDisableTotpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit authenticator code"
            className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] focus:outline-none focus:border-red-500/50"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={disabling || !disablePassword || disableTotpCode.length !== 6}
            className="flex items-center gap-2 bg-red-900/40 hover:bg-red-900/60 text-red-400 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldOff className="w-4 h-4" />
            {disabling ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SecuritySection (exported)
// ---------------------------------------------------------------------------
export function SecuritySection() {
  return (
    <div className="glass-card p-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <span className="w-1 h-5 bg-blue-500 rounded-full" />
        <Lock className="w-5 h-5 text-[#A0A0A0]" />
        <h3 className="text-lg font-bold text-white">Security</h3>
      </div>

      <PasswordChangeSection />
      <TwoFactorSection />
    </div>
  );
}

export default SecuritySection;
