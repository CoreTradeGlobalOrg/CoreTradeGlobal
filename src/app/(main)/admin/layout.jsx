/**
 * Admin Layout
 *
 * Layout for admin pages
 * Provides consistent navigation and styling for admin area
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Check if user is authenticated
      if (!user) {
        toast.error('You must be logged in to access admin panel');
        router.push('/login');
        return;
      }

      // Check if user is admin
      // For now, check if email is admin email
      // Later you can add role field to user profile
      const adminEmails = ['mertfatihsimsek06@gmail.com'];

      if (!adminEmails.includes(user.email)) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-sm text-slate-600">CoreTradeGlobal Administration</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Admin: <span className="font-semibold text-slate-900">{user?.email}</span>
              </span>
              <a
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
