/**
 * Dashboard Page
 *
 * URL: /dashboard
 * Protected route - requires authentication
 *
 * This is a basic dashboard to test the auth flow
 * You'll expand this with products, requests, etc.
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserStatusBanner } from '@/presentation/components/common/UserStatusBanner/UserStatusBanner';

export default function DashboardPage() {
  const { user, loading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const [initialRefreshDone, setInitialRefreshDone] = useState(false);

  // Refresh user data on mount to ensure latest status
  useEffect(() => {
    const doInitialRefresh = async () => {
      if (!loading && isAuthenticated && !initialRefreshDone) {
        await refreshUser();
        setInitialRefreshDone(true);
      }
    };

    doInitialRefresh();
  }, [loading, isAuthenticated, initialRefreshDone, refreshUser]);

  // Redirect to login if not authenticated
  // Redirect to suspended page if user is suspended or deleted
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }

    if (!loading && user && (user.isSuspended || user.isDeleted)) {
      router.push('/suspended');
    }
  }, [loading, isAuthenticated, user, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

          <div className="flex items-center gap-3">
            {/* Admin Dashboard Button - Only for admins */}
            {user?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Admin Dashboard
              </button>
            )}

            {/* Profile Button */}
            <button
              onClick={() => router.push(`/profile/${user?.uid}`)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* Company Logo or Building Icon */}
              {user?.companyLogo ? (
                <img
                  src={user.companyLogo}
                  alt="Company logo"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              )}

              {/* User Name */}
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.displayName || user?.email}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
                </p>
              </div>

              {/* Dropdown Icon */}
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* User Status Banner */}
        <UserStatusBanner />

        {/* Welcome Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-2">
            Welcome, {user?.displayName || user?.email}!
          </h2>
          <p className="text-gray-600">
            Company: {user?.companyName || 'Not set'}
          </p>
          <p className="text-gray-600">
            Role: {user?.role || 'member'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Products
            </h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-600 mt-2">Coming soon</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Requests
            </h3>
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-600 mt-2">Coming soon</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Messages
            </h3>
            <p className="text-3xl font-bold text-purple-600">0</p>
            <p className="text-sm text-gray-600 mt-2">Coming soon</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Next Steps
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li>✅ Authentication system is complete</li>
            <li>⬜ Add Product CRUD functionality</li>
            <li>⬜ Add Request management</li>
            <li>⬜ Add Messaging system</li>
            <li>⬜ Add Company management</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
