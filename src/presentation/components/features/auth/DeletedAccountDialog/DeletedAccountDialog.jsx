/**
 * DeletedAccountDialog Component
 *
 * Shows when a user tries to log in with a deleted/banned account
 * - Self-deleted: Shows recovery option within 15 days
 * - Admin banned: Shows contact support message
 */

'use client';

import { useState } from 'react';
import { X, AlertTriangle, Mail, RefreshCw, ShieldX } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';
import toast from 'react-hot-toast';

export function DeletedAccountDialog({ isOpen, onClose, deletionInfo, onRecovered }) {
  const [recovering, setRecovering] = useState(false);

  if (!isOpen || !deletionInfo) return null;

  const { userId, deletionType, canRecoverUntil, banReason } = deletionInfo;

  // Check if recovery is still possible (within 15 days)
  const canRecover = deletionType === 'self' && canRecoverUntil && new Date() < new Date(canRecoverUntil.seconds * 1000);

  // Calculate days remaining for recovery
  const getDaysRemaining = () => {
    if (!canRecoverUntil) return 0;
    const deadline = new Date(canRecoverUntil.seconds * 1000);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handleRecover = async () => {
    setRecovering(true);
    try {
      const recoverAccount = httpsCallable(functions, 'recoverAccount');
      await recoverAccount({ userId });
      toast.success('Account recovered successfully! Please log in again.');
      onRecovered?.();
      onClose();
    } catch (error) {
      console.error('Recovery failed:', error);
      toast.error(error.message || 'Failed to recover account. Please try again.');
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-content-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a283b] to-[#0f1b2b] border border-red-500/30 rounded-2xl shadow-2xl p-6 animate-scaleIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${deletionType === 'admin_ban' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
            {deletionType === 'admin_ban' ? (
              <ShieldX className="w-8 h-8 text-red-500" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          {deletionType === 'admin_ban' ? 'Account Banned' : 'Account Scheduled for Deletion'}
        </h2>

        {/* Message */}
        {deletionType === 'admin_ban' ? (
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              Your account has been banned by an administrator.
            </p>
            {banReason && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-400 mb-1">Reason:</p>
                <p className="text-red-300">{banReason}</p>
              </div>
            )}
            <p className="text-gray-400 text-sm mb-6">
              If you believe this is a mistake, please contact our support team.
            </p>
          </div>
        ) : (
          <div className="text-center">
            {canRecover ? (
              <>
                <p className="text-gray-300 mb-4">
                  Your account is scheduled for deletion. You have <span className="text-yellow-400 font-semibold">{getDaysRemaining()} days</span> left to recover it.
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  Click the button below to restore your account and all your data.
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-300 mb-4">
                  Your account deletion request has been processed.
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  The recovery period has expired. Please contact support if you need assistance.
                </p>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {deletionType === 'self' && canRecover && (
            <button
              onClick={handleRecover}
              disabled={recovering}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {recovering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Recovering...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Recover My Account
                </>
              )}
            </button>
          )}

          <a
            href="mailto:support@coretradeglobal.com"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Close
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

export default DeletedAccountDialog;
