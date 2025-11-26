/**
 * Admin Dashboard Page
 *
 * URL: /admin
 * Protected: Admin users only
 *
 * Features:
 * - User statistics (total, verified, unverified, new)
 * - User list table with search and filters
 * - Real-time data updates
 */

'use client';

import { StatsCards } from '@/presentation/components/features/admin/StatsCards/StatsCards';
import { UsersTable } from '@/presentation/components/features/admin/UsersTable/UsersTable';
import { useGetAllUsers } from '@/presentation/hooks/admin/useGetAllUsers';

export default function AdminPage() {
  const { users, loading, error, refetch } = useGetAllUsers();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading users data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Data</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Dashboard Overview</h2>
        <p className="text-slate-600">
          Manage and monitor all registered users on CoreTradeGlobal platform
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards users={users} />

      {/* Users Table */}
      <UsersTable users={users} onRefresh={refetch} />

      {/* Refresh Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={refetch}
          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          <span>🔄</span>
          Refresh Data
        </button>
      </div>
    </div>
  );
}
