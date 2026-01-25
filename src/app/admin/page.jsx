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

import { useState } from 'react';
import { StatsCards } from '@/presentation/components/features/admin/StatsCards/StatsCards';
import { UsersTable } from '@/presentation/components/features/admin/UsersTable/UsersTable';
import { CategoriesManager } from '@/presentation/components/features/admin/CategoriesManager/CategoriesManager';
import { FairsManager } from '@/presentation/components/features/admin/FairsManager/FairsManager';
import { NewsManager } from '@/presentation/components/features/admin/NewsManager/NewsManager';
import { useGetAllUsers } from '@/presentation/hooks/admin/useGetAllUsers';

export default function AdminPage() {
  const { users, loading, error, refetch } = useGetAllUsers();
  const [activeTab, setActiveTab] = useState('users');

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
    <div className="min-h-screen bg-[#0F1B2B] p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h2>
        <p className="text-[#A0A0A0]">
          Manage users, categories, and platform settings
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-[rgba(255,255,255,0.1)]">
        <nav className="-mb-px flex space-x-8">
          {['users', 'categories', 'fairs', 'news'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors`}
            >
              {tab === 'users' ? 'Users Management' : `${tab.charAt(0).toUpperCase() + tab.slice(1)} Management`}
            </button>
          ))}
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          {/* Stats Cards */}
          <StatsCards users={users} />

          {/* Users Table */}
          <UsersTable users={users} onRefresh={refetch} />

          {/* Refresh Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={refetch}
              className="px-6 py-3 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white rounded-lg font-semibold transition-colors flex items-center gap-2 border border-[rgba(255,255,255,0.1)]"
            >
              <span>🔄</span>
              Refresh Data
            </button>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="text-white">
          <CategoriesManager />
        </div>
      )}

      {/* Fairs Tab */}
      {activeTab === 'fairs' && (
        <div className="text-white">
          <FairsManager />
        </div>
      )}

      {/* News Tab */}
      {activeTab === 'news' && (
        <div className="text-white">
          <NewsManager />
        </div>
      )}
    </div>
  );
}
