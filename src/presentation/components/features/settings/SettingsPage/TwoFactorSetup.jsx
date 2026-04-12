/**
 * TwoFactorSetup
 *
 * Multi-step UI for TOTP 2FA enrollment. Loaded dynamically (ssr:false) from
 * SecuritySection to avoid SSR issues with qrcode.react and SubtleCrypto.
 *
 * Steps handled:
 *  - reauthenticating: password prompt before generating secret
 *  - scanning: show QR code + 6-digit input to verify before enrolling
 *  - showCodes: display 10 backup codes with copy/download
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QRCodeSVG } from 'qrcode.react';
import { totpVerifySchema } from '@/core/validation/totpVerifySchema';
import { Eye, EyeOff, Copy, Download, Check } from 'lucide-react';

export function TwoFactorSetup({
  step,
  qrCodeUrl,
  backupCodes,
  loading,
  error,
  reauthAndGenerateSecret,
  verifyAndEnroll,
  reset,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetVerifyForm,
  } = useForm({
    resolver: zodResolver(totpVerifySchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });

  // -----------------------------------------------------------------------
  // step: reauthenticating
  // -----------------------------------------------------------------------
  if (step === 'reauthenticating') {
    const handleReauth = async (e) => {
      e.preventDefault();
      if (!reauthPassword) return;
      await reauthAndGenerateSecret(reauthPassword);
    };

    return (
      <div className="mt-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-4">
        <p className="text-sm text-[#A0A0A0]">
          Enter your current password to continue setting up two-factor authentication.
        </p>

        <form onSubmit={handleReauth} className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              placeholder="Current password"
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] pr-10 focus:outline-none focus:border-[#FFD700]/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !reauthPassword}
              className="bg-[#FFD700] !text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#FFC700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-[#A0A0A0] hover:text-white px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // step: scanning (combined with verification — QR + code input together)
  // -----------------------------------------------------------------------
  if (step === 'scanning') {
    const onVerify = async (data) => {
      await verifyAndEnroll(data.code);
      resetVerifyForm();
    };

    return (
      <div className="mt-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-5">
        <div>
          <h4 className="text-sm font-medium text-white mb-1">
            Scan with your authenticator app
          </h4>
          <p className="text-xs text-[#A0A0A0]">
            Use Google Authenticator, Authy, or any TOTP app to scan the QR code below.
          </p>
        </div>

        {qrCodeUrl && (
          <div className="flex justify-center">
            <QRCodeSVG
              value={qrCodeUrl}
              size={200}
              bgColor="white"
              fgColor="black"
              className="p-3 bg-white rounded-lg"
            />
          </div>
        )}

        <form onSubmit={handleSubmit(onVerify)} className="space-y-3">
          <div>
            <label className="text-xs text-[#A0A0A0] block mb-1">
              Enter the 6-digit code from your app
            </label>
            <input
              {...register('code')}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className={`w-full bg-[rgba(255,255,255,0.05)] border rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] tracking-widest font-mono focus:outline-none focus:border-[#FFD700]/50 ${
                errors.code ? 'border-red-500' : 'border-[rgba(255,255,255,0.1)]'
              }`}
            />
            {errors.code && (
              <p className="text-xs text-red-400 mt-1">{errors.code.message}</p>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#FFD700] !text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#FFC700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-[#A0A0A0] hover:text-white px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // step: showCodes
  // -----------------------------------------------------------------------
  if (step === 'showCodes') {
    const handleCopyAll = async () => {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };

    const handleDownload = () => {
      const content = [
        'CoreTradeGlobal - 2FA Backup Codes',
        '====================================',
        'Keep these codes in a safe place. Each code can only be used once.',
        '',
        ...backupCodes,
        '',
        `Generated: ${new Date().toISOString()}`,
      ].join('\n');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ctg-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="mt-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 space-y-5">
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">Save your backup codes</h4>
          <p className="text-xs text-amber-400">
            These codes will not be shown again. Store them securely.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((code) => (
            <div
              key={code}
              className="font-mono text-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] px-3 py-2 rounded text-white text-center tracking-widest"
            >
              {code}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-2 text-sm text-[#A0A0A0] hover:text-white px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? 'Copied!' : 'Copy All'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 text-sm text-[#A0A0A0] hover:text-white px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>

        <button
          type="button"
          onClick={reset}
          className="w-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-white text-sm font-medium px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] transition-colors"
        >
          I&apos;ve saved my codes
        </button>
      </div>
    );
  }

  return null;
}

export default TwoFactorSetup;
