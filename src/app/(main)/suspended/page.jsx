/**
 * Suspended Account Page
 *
 * Displayed when user account is suspended
 * Provides contact information and logout option
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLogout } from '@/presentation/hooks/auth/useLogout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SuspendedPage() {
  const { user, loading } = useAuth();
  const { logout } = useLogout();
  const router = useRouter();

  useEffect(() => {
    // If not logged in, redirect to login
    if (!loading && !user) {
      router.push('/login');
    }

    // If user is not suspended, redirect to homepage
    if (!loading && user && !user.isSuspended) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 p-8">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full text-4xl mb-4">
              🚫
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Account Suspended
            </h1>
          </div>

          {/* Message */}
          <div className="space-y-4 text-center">
            <p className="text-slate-700">
              Your account has been suspended by our administration team.
            </p>
            <p className="text-slate-600 text-sm">
              If you believe this is a mistake or would like to appeal this decision,
              please contact our support team.
            </p>

            {/* User Info */}
            {user && (
              <div className="bg-slate-50 rounded-lg p-4 text-left">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">Account:</span> {user.email}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-semibold">Company:</span> {user.companyName || 'N/A'}
                </p>
              </div>
            )}

            {/* Contact Support Button */}
            <div className="pt-4">
              <a
                href="mailto:support@coretradeglobal.com?subject=Account Suspension Appeal"
                className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: 'var(--color-error)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error)'}
              >
                <span>📧</span>
                <span>Contact Support</span>
              </a>
            </div>

            {/* Logout Button */}
            <div>
              <button
                onClick={handleLogout}
                className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-semibold transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Support Info */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Support Email: <a href="mailto:support@coretradeglobal.com" className="text-blue-600 hover:underline">support@coretradeglobal.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
