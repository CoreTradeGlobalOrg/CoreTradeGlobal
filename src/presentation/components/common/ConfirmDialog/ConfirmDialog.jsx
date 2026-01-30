/**
 * ConfirmDialog Component
 *
 * Reusable confirmation dialog for dangerous actions
 */

'use client';

import { X, AlertTriangle, Trash2, ShieldX, ShieldCheck } from 'lucide-react';

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    confirmBg: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
    confirmBg: 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600',
  },
  ban: {
    icon: ShieldX,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    confirmBg: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600',
  },
  success: {
    icon: ShieldCheck,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
    confirmBg: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  children,
}) {
  if (!isOpen) return null;

  const config = VARIANTS[variant] || VARIANTS.danger;
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a283b] to-[#0f1b2b] border border-white/10 rounded-2xl shadow-2xl p-6 animate-scaleIn">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${config.iconBg}`}>
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          {title}
        </h2>

        {/* Message */}
        <p className="text-gray-300 text-center mb-4">
          {message}
        </p>

        {/* Custom content (e.g., input fields) */}
        {children && (
          <div className="mb-4">
            {children}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-3 ${config.confirmBg} text-white font-semibold rounded-xl transition-all disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default ConfirmDialog;
