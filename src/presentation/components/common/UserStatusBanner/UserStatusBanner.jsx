/**
 * User Status Banner
 *
 * Displays user verification status and restrictions
 * Shows warnings if user is not fully verified
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import { User } from '@/domain/entities/User';

export function UserStatusBanner() {
  const { user } = useAuth();

  if (!user) return null;

  // Don't show banner if user is fully verified
  if (User.isFullyVerified(user)) {
    return null;
  }

  // Get status message
  const statusMessage = User.getUserStatusMessage(user);

  // Determine banner color based on status
  let bannerColor = 'bg-yellow-50 border-yellow-200';
  let textColor = 'text-yellow-800';
  let icon = '⏳';

  if (user.isSuspended) {
    bannerColor = 'bg-red-50 border-red-200';
    textColor = 'text-red-800';
    icon = '🚫';
  } else if (!user.emailVerified) {
    bannerColor = 'bg-blue-50 border-blue-200';
    textColor = 'text-blue-800';
    icon = '📧';
  }

  return (
    <div
      className={`mb-6 p-4 border-2 rounded-lg ${bannerColor} flex items-start gap-3`}
    >
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className={`flex-1 ${textColor}`}>
        <h3 className="font-semibold mb-1">Account Status</h3>
        <p className="text-sm">{statusMessage}</p>

        {!user.emailVerified && (
          <div className="mt-3">
            <a
              href="/verify-email"
              className="text-sm font-semibold underline hover:no-underline"
            >
              Resend Verification Email
            </a>
          </div>
        )}

        {user.emailVerified && !user.adminApproved && !user.isSuspended && (
          <div className="mt-3">
            <div className="bg-slate-50 rounded-lg p-4 mb-3 border border-slate-200">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                ⏳ Waiting for Admin Approval
              </p>
              <p className="text-xs text-slate-600 mb-3">
                Your account is currently being reviewed by our admin team. This usually takes 24-48 hours.
              </p>
              <a
                href="mailto:support@coretradeglobal.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                  e.currentTarget.style.color = 'white';
                }}
              >
                <span>📧</span>
                <span>Contact Support</span>
              </a>
            </div>
            <p className="text-sm font-medium">
              What you can do while waiting:
            </p>
            <ul className="text-sm list-disc list-inside mt-1 space-y-1">
              <li>Browse products and suppliers</li>
              <li>View company profiles</li>
              <li>Send messages to suppliers</li>
            </ul>
            <p className="text-sm mt-2">
              What you cannot do yet:
            </p>
            <ul className="text-sm list-disc list-inside mt-1 space-y-1">
              <li>Create RFQs (Request for Quotations)</li>
              <li>Add products to catalog</li>
              <li>Manage company settings</li>
            </ul>
          </div>
        )}

        {user.isSuspended && (
          <div className="mt-3">
            <div className="bg-slate-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm font-semibold text-slate-900 mb-3">
                🚫 Need Help?
              </p>
              <a
                href="mailto:support@coretradeglobal.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: 'var(--color-error)',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-error)';
                  e.currentTarget.style.color = 'white';
                }}
              >
                <span>📧</span>
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserStatusBanner;
