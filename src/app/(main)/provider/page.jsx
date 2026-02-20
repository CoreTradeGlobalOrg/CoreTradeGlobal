/**
 * Provider Dashboard Page
 *
 * URL: /provider
 * Access: logistics_provider, insurance_provider, admin (enforced by middleware)
 *
 * Placeholder with tab structure ready for Phase 4 implementation.
 * Tabs: Quote Requests | Submitted Quotes | History
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { RoleBadge } from '@/presentation/components/common/RoleBadge/RoleBadge';
import { FileText, CheckSquare, Clock } from 'lucide-react';

const TABS = [
  { id: 'requests', label: 'Quote Requests', icon: FileText },
  { id: 'submitted', label: 'Submitted Quotes', icon: CheckSquare },
  { id: 'history', label: 'History', icon: Clock },
];

export default function ProviderDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div className="min-h-screen bg-radial-navy pt-[100px] pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Provider Dashboard</h1>
            <p className="text-[#A0A0A0] mt-1 text-sm">
              Manage quote requests and track your activity
            </p>
          </div>
          {user && <RoleBadge role={user.role} size="md" />}
        </div>

        {/* Tabs */}
        <div className="glass-card overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-[rgba(255,255,255,0.1)]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors flex-1 sm:flex-none justify-center sm:justify-start ${
                    isActive
                      ? 'text-[#FFD700] border-b-2 border-[#FFD700] -mb-px'
                      : 'text-[#A0A0A0] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'requests' && (
              <div className="text-center py-12 space-y-3">
                <FileText className="w-12 h-12 text-[#A0A0A0] mx-auto" />
                <p className="text-white font-semibold">No quote requests yet</p>
                <p className="text-[#A0A0A0] text-sm">
                  Quote requests from members will appear here in Phase 4.
                </p>
              </div>
            )}
            {activeTab === 'submitted' && (
              <div className="text-center py-12 space-y-3">
                <CheckSquare className="w-12 h-12 text-[#A0A0A0] mx-auto" />
                <p className="text-white font-semibold">No submitted quotes yet</p>
                <p className="text-[#A0A0A0] text-sm">
                  Quotes you&apos;ve submitted will appear here.
                </p>
              </div>
            )}
            {activeTab === 'history' && (
              <div className="text-center py-12 space-y-3">
                <Clock className="w-12 h-12 text-[#A0A0A0] mx-auto" />
                <p className="text-white font-semibold">No history yet</p>
                <p className="text-[#A0A0A0] text-sm">
                  Your completed quote activity will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
