/**
 * EmailSubscriptionsSection
 *
 * Displays a marketing email subscription toggle.
 * Reads initial state from /api/subscription-status and writes via
 * /api/unsubscribe or /api/resubscribe (Phase 9 pattern).
 */

'use client';

import { Mail } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useEmailSubscriptions } from '@/presentation/hooks/settings/useEmailSubscriptions';

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      aria-pressed={enabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-[#FFD700]' : 'bg-[rgba(255,255,255,0.2)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function EmailSubscriptionsSection() {
  const { user } = useAuth();
  const { subscribed, toggleSubscription, loading, updating } = useEmailSubscriptions(
    user?.email
  );

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="w-1 h-5 bg-green-500 rounded-full flex-shrink-0" />
        <Mail className="w-5 h-5 text-[#A0A0A0]" />
        <h3 className="text-lg font-bold text-white">Email Subscriptions</h3>
      </div>
      <p className="text-sm text-[#A0A0A0] mb-6">
        Manage your email marketing preferences.
      </p>

      {/* Loading spinner */}
      {loading ? (
        <div className="flex items-center gap-3 py-3">
          <div className="w-5 h-5 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm text-[#A0A0A0]">Checking subscription status...</span>
        </div>
      ) : (
        <div className="flex items-center justify-between py-3 border-t border-[rgba(255,255,255,0.06)]">
          <div>
            <p className="text-sm font-medium text-white">Marketing &amp; Product Updates</p>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              Newsletters, product announcements, and promotional emails
            </p>
          </div>
          <Toggle
            enabled={subscribed}
            onChange={toggleSubscription}
            disabled={updating}
          />
        </div>
      )}
    </div>
  );
}

export default EmailSubscriptionsSection;
