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
import { useLogout } from '@/presentation/hooks/auth/useLogout';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { UserStatusBanner } from '@/presentation/components/common/UserStatusBanner/UserStatusBanner';

export default function DashboardPage() {
  const { user, loading, isAuthenticated, refreshUser } = useAuth();
  const { logout } = useLogout();
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
          <Button onClick={logout} variant="secondary">
            Logout
          </Button>
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
