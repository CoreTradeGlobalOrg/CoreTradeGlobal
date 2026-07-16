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

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs, where, query } from 'firebase/firestore';
import { Handshake, Truck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useGetAllUsers } from '@/presentation/hooks/admin/useGetAllUsers';
import { db } from '@/core/config/firebase.config';
import { DEAL_STATUS } from '@/core/constants/dealConstants';

// Admin tab content loaded lazily — these are heavy components not needed until tab opens
function AdminTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse" />
      <div className="h-64 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
      <div className="h-48 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
    </div>
  );
}

const StatsCards = dynamic(
  () => import('@/presentation/components/features/admin/StatsCards/StatsCards').then(m => ({ default: m.StatsCards })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const UsersTable = dynamic(
  () => import('@/presentation/components/features/admin/UsersTable/UsersTable').then(m => ({ default: m.UsersTable })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const CategoriesManager = dynamic(
  () => import('@/presentation/components/features/admin/CategoriesManager/CategoriesManager').then(m => ({ default: m.CategoriesManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const FairsManager = dynamic(
  () => import('@/presentation/components/features/admin/FairsManager/FairsManager').then(m => ({ default: m.FairsManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const NewsManager = dynamic(
  () => import('@/presentation/components/features/admin/NewsManager/NewsManager').then(m => ({ default: m.NewsManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const ConversationsManager = dynamic(
  () => import('@/presentation/components/features/admin/ConversationsManager/ConversationsManager').then(m => ({ default: m.ConversationsManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const ProductsRequestsManager = dynamic(
  () => import('@/presentation/components/features/admin/ProductsRequestsManager/ProductsRequestsManager').then(m => ({ default: m.ProductsRequestsManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const AnnouncementManager = dynamic(
  () => import('@/presentation/components/features/admin/AnnouncementManager/AnnouncementManager').then(m => ({ default: m.default })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const ProductUploadRequestsManager = dynamic(
  () => import('@/presentation/components/features/admin/ProductUploadRequestsManager/ProductUploadRequestsManager').then(m => ({ default: m.ProductUploadRequestsManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const TradesManager = dynamic(
  () => import('@/presentation/components/features/admin/TradesManager/TradesManager').then(m => ({ default: m.TradesManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const TestimonialsManager = dynamic(
  () => import('@/presentation/components/features/admin/TestimonialsManager/TestimonialsManager').then(m => ({ default: m.TestimonialsManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const ResendBackfillCard = dynamic(
  () => import('@/presentation/components/features/admin/ResendBackfill/ResendBackfillCard').then(m => ({ default: m.ResendBackfillCard })),
  { ssr: false }
);
const AdInquiriesManager = dynamic(
  () => import('@/presentation/components/features/admin/AdInquiriesManager/AdInquiriesManager').then(m => ({ default: m.AdInquiriesManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);
const AdCampaignsManager = dynamic(
  () => import('@/presentation/components/features/admin/AdCampaignsManager/AdCampaignsManager').then(m => ({ default: m.AdCampaignsManager })),
  { loading: () => <AdminTabSkeleton />, ssr: false }
);

// ─────────────────────────────────────────────────────────────────────────────
// Trade Overview Stats
// ─────────────────────────────────────────────────────────────────────────────

function TradeOverviewStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const dealsRef = collection(db, 'deals');
        const [totalSnap, activeSnap, deliveredSnap] = await Promise.all([
          getDocs(dealsRef),
          getDocs(query(dealsRef, where('status', '==', DEAL_STATUS.PROVIDERS_SELECTED))),
          getDocs(query(dealsRef, where('status', '==', DEAL_STATUS.DELIVERED))),
        ]);
        setStats({
          total: totalSnap.size,
          active: activeSnap.size,
          delivered: deliveredSnap.size,
        });
      } catch (err) {
        console.error('TradeOverviewStats: failed to fetch', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const cards = [
    {
      icon: <Handshake className="w-5 h-5 text-[#FFD700]" />,
      label: 'Total Deals',
      value: stats?.total ?? '—',
      bg: 'bg-[#FFD700]/5 border-[#FFD700]/20',
    },
    {
      icon: <Truck className="w-5 h-5 text-blue-400" />,
      label: 'Active Shipments',
      value: stats?.active ?? '—',
      bg: 'bg-blue-900/10 border-blue-700/20',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      label: 'Completed Deliveries',
      value: stats?.delivered ?? '—',
      bg: 'bg-green-900/10 border-green-700/20',
    },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">
        Trade Overview
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl p-4 border flex items-center gap-3 ${c.bg}`}
          >
            {c.icon}
            <div>
              {loading ? (
                <div className="h-5 w-8 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-1" />
              ) : (
                <p className="text-xl font-bold text-white">{c.value}</p>
              )}
              <p className="text-xs text-[#A0A0A0]">{c.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminPage
// ─────────────────────────────────────────────────────────────────────────────

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, profileLoading, isAuthenticated } = useAuth();
  const { users, loading, error, refetch } = useGetAllUsers();
  const validTabs = ['users', 'trades', 'messages', 'categories', 'fairs', 'news', 'testimonials', 'announcements', 'product-requests', 'ad-inquiries', 'ad-campaigns'];
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(tabFromUrl) ? tabFromUrl : 'users'
  );

  // Auth check - redirect if not admin (wait for profile to load role)
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!isAuthenticated) {
        router.replace('/login?redirect=/admin');
      } else if (user?.role !== 'admin') {
        router.replace('/');
      }
    }
  }, [authLoading, profileLoading, isAuthenticated, user, router]);

  // Show loading while checking auth or loading profile
  if (authLoading || profileLoading) {
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
    <div className="min-h-screen bg-[#0F1B2B] px-4 py-6 pt-[calc(var(--navbar-height)+24px)] md:px-8 md:py-8 md:pt-[calc(var(--navbar-height)+24px)]">
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
          {['users', 'trades', 'messages', 'categories', 'fairs', 'news', 'testimonials', 'announcements', 'product-requests', 'ad-inquiries', 'ad-campaigns'].map((tab) => {
            const tabLabels = {
              users: 'Users',
              trades: 'Trades',
              messages: 'Messages',
              categories: 'Categories',
              fairs: 'Fairs',
              news: 'News',
              testimonials: 'Testimonials',
              announcements: 'Announcements',
              'product-requests': 'Product Requests',
              'ad-inquiries': 'Ad Inquiries',
              'ad-campaigns': 'Ad Campaigns',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${activeTab === tab
                    ? 'border-[#FFD700] text-[#FFD700]'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                  } whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors flex-shrink-0`}
              >
                {tabLabels[tab] || tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          {/* Trade Overview Stats */}
          <TradeOverviewStats />

          {/* User Stats Cards */}
          <StatsCards users={users} />

          {/* Add Product / Request on behalf of user */}
          <ProductsRequestsManager users={users} />

          {/* Users Table */}
          <UsersTable users={users} onRefresh={refetch} />

          {/* Resend Audience Backfill — one-off admin utility */}
          <ResendBackfillCard />

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

      {/* Trades Tab */}
      {activeTab === 'trades' && (
        <div className="text-white">
          <TradesManager users={users} />
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

      {/* Testimonials Tab */}
      {activeTab === 'testimonials' && (
        <div className="text-white">
          <TestimonialsManager />
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="text-white">
          <AnnouncementManager />
        </div>
      )}

      {/* Product Requests Tab */}
      {activeTab === 'product-requests' && (
        <div className="text-white">
          <ProductUploadRequestsManager users={users} />
        </div>
      )}

      {/* Ad Inquiries Tab */}
      {activeTab === 'ad-inquiries' && (
        <div className="text-white">
          <AdInquiriesManager />
        </div>
      )}

      {/* Ad Campaigns Tab */}
      {activeTab === 'ad-campaigns' && (
        <div className="text-white">
          <AdCampaignsManager />
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0F1B2B]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#FFD700] border-r-transparent"></div>
          <p className="mt-4 text-[#A0A0A0]">Loading admin dashboard...</p>
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
