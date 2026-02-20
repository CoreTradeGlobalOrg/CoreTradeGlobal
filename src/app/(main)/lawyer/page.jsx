/**
 * Lawyer Workspace Page
 *
 * URL: /lawyer
 * Access: lawyer, admin (enforced by middleware)
 *
 * Landing page with card links to Client Channels and Deal Review.
 * Actual content implemented in Phase 5.
 */

'use client';

import Link from 'next/link';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { RoleBadge } from '@/presentation/components/common/RoleBadge/RoleBadge';
import { MessageSquare, FileSearch, ArrowRight } from 'lucide-react';

const WORKSPACE_CARDS = [
  {
    href: '/lawyer/channels',
    label: 'Client Channels',
    description: 'View and manage your client communications',
    icon: MessageSquare,
    color: 'purple',
  },
  {
    href: '/lawyer/deals',
    label: 'Deal Review',
    description: 'Review deals and provide legal analysis',
    icon: FileSearch,
    color: 'blue',
  },
];

const COLOR_MAP = {
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    arrow: 'text-purple-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    arrow: 'text-blue-400',
  },
};

export default function LawyerWorkspacePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-radial-navy pt-[100px] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Lawyer Workspace</h1>
            <p className="text-[#A0A0A0] mt-1 text-sm">
              Your channels and deals will appear here once clients hire you.
            </p>
          </div>
          {user && <RoleBadge role={user.role} size="md" />}
        </div>

        {/* Workspace Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {WORKSPACE_CARDS.map((card) => {
            const Icon = card.icon;
            const colors = COLOR_MAP[card.color];
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`glass-card p-6 flex items-start gap-4 group hover:border-[rgba(255,255,255,0.2)] transition-all`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-[#FFD700] transition-colors">
                    {card.label}
                  </h3>
                  <p className="text-[#A0A0A0] text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <ArrowRight className={`w-5 h-5 ${colors.arrow} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1`} />
              </Link>
            );
          })}
        </div>

        {/* Empty State Notice */}
        <div className="glass-card p-6 text-center">
          <p className="text-[#A0A0A0] text-sm">
            Full lawyer workspace features — client channels, deal review, and legal analysis tools — will be available in Phase 5.
          </p>
        </div>

      </div>
    </div>
  );
}
