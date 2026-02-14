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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { StatsCards } from '@/presentation/components/features/admin/StatsCards/StatsCards';
import { UsersTable } from '@/presentation/components/features/admin/UsersTable/UsersTable';
import { CategoriesManager } from '@/presentation/components/features/admin/CategoriesManager/CategoriesManager';
import { FairsManager } from '@/presentation/components/features/admin/FairsManager/FairsManager';
import { NewsManager } from '@/presentation/components/features/admin/NewsManager/NewsManager';
import { ConversationsManager } from '@/presentation/components/features/admin/ConversationsManager/ConversationsManager';
import { ProductsRequestsManager } from '@/presentation/components/features/admin/ProductsRequestsManager/ProductsRequestsManager';
import { useGetAllUsers } from '@/presentation/hooks/admin/useGetAllUsers';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { users, loading, error, refetch } = useGetAllUsers();
  const [activeTab, setActiveTab] = useState('users');

  // Auth check - redirect if not admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace('/login?redirect=/admin');
      } else if (user?.role !== 'admin') {
        router.replace('/');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1B2B]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#FFD700] border-r-transparent"></div>
          <p className="mt-4 text-[#A0A0A0]">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render if not admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-[#0F1B2B]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#FFD700] border-r-transparent"></div>
          <p className="mt-4 text-[#A0A0A0]">Loading users data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-[#0F1B2B]">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Data</h2>
          <p className="text-[#A0A0A0] mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-6 py-3 bg-[#FFD700] hover:bg-[#B59325] text-[#0F1B2B] rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1B2B] px-4 py-6 pt-[100px] md:px-8 md:py-8 md:pt-[120px]">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Admin Dashboard</h2>
        <p className="text-sm md:text-base text-[#A0A0A0]">
          Manage users, categories, and platform settings
        </p>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="mb-6 md:mb-8 border-b border-[rgba(255,255,255,0.1)] -mx-4 px-4 md:mx-0 md:px-0">
        <nav className="-mb-px flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide pb-px">
          {['users', 'messages', 'categories', 'fairs', 'news'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab
                  ? 'border-[#FFD700] text-[#FFD700]'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                } whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm capitalize transition-colors flex-shrink-0`}
            >
              {tab === 'users' ? 'Users' : tab === 'messages' ? 'Messages' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          {/* Stats Cards */}
          <StatsCards users={users} />

          {/* Add Product / Request on behalf of user */}
          <ProductsRequestsManager users={users} />

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

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="text-white">
          <ConversationsManager />
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
