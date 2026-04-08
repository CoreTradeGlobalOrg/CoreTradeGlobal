/**
 * AdminSummaryStats Component
 *
 * Displays admin statistics in card format:
 * - Total users + role-specific counts (member, logistics_provider, insurance_provider, lawyer, admin)
 * - Email verified, pending approval, suspended
 * - Invite metrics: total, pending, accepted, expired
 */

'use client';

import { useGetInvites } from '@/presentation/hooks/admin/useGetInvites';
import { ROLES, ROLE_DISPLAY_NAMES } from '@/core/constants/roles';

export function AdminSummaryStats({ users = [] }) {
  const { invites } = useGetInvites();

  // User stats
  const totalUsers = users.length;
  const verifiedUsers = users.filter((u) => u.emailVerified === true).length;
  const approvedUsers = users.filter((u) => u.adminApproved === true).length;
  const pendingApproval = users.filter(
    (u) => u.emailVerified === true && u.adminApproved !== true && !u.isSuspended
  ).length;
  const suspendedUsers = users.filter((u) => u.isSuspended === true).length;

  // New users in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newUsers = users.filter((u) => {
    if (!u.createdAt) return false;
    const d = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
    return d >= sevenDaysAgo;
  }).length;

  // Role-specific counts
  const memberCount = users.filter((u) => u.role === ROLES.MEMBER || !u.role).length;
  const logisticsCount = users.filter((u) => u.role === ROLES.LOGISTICS_PROVIDER).length;
  const insuranceCount = users.filter((u) => u.role === ROLES.INSURANCE_PROVIDER).length;
  const lawyerCount = users.filter((u) => u.role === ROLES.LAWYER).length;
  const adminCount = users.filter((u) => u.role === ROLES.ADMIN).length;

  // Invite metrics
  const totalInvites = invites.length;
  const pendingInvites = invites.filter((i) => i.status === 'pending').length;
  const acceptedInvites = invites.filter((i) => i.status === 'accepted').length;
  const expiredInvites = invites.filter((i) => i.status === 'expired').length;

  const primaryStats = [
    { title: 'Total Users', value: totalUsers, icon: '👥', color: 'blue', description: 'All registered users' },
    { title: 'Admin Approved', value: approvedUsers, icon: '✅', color: 'green', description: 'Fully approved users' },
    { title: 'Pending Approval', value: pendingApproval, icon: '⏳', color: 'orange', description: 'Awaiting admin approval' },
    { title: 'Email Verified', value: verifiedUsers, icon: '📧', color: 'cyan', description: 'Email verified accounts' },
    { title: 'Suspended', value: suspendedUsers, icon: '🚫', color: 'red', description: 'Suspended accounts' },
    { title: 'New (7 days)', value: newUsers, icon: '🆕', color: 'purple', description: 'Recent registrations' },
  ];

  const roleStats = [
    { title: ROLE_DISPLAY_NAMES[ROLES.MEMBER], value: memberCount, icon: '👤', color: 'blue', description: 'Registered members' },
    { title: ROLE_DISPLAY_NAMES[ROLES.LOGISTICS_PROVIDER], value: logisticsCount, icon: '🚚', color: 'green', description: 'Active logistics providers' },
    { title: ROLE_DISPLAY_NAMES[ROLES.INSURANCE_PROVIDER], value: insuranceCount, icon: '🛡️', color: 'orange', description: 'Insurance providers' },
    { title: ROLE_DISPLAY_NAMES[ROLES.LAWYER], value: lawyerCount, icon: '⚖️', color: 'purple', description: 'Legal advisors' },
    { title: ROLE_DISPLAY_NAMES[ROLES.ADMIN], value: adminCount, icon: '🔑', color: 'red', description: 'Platform administrators' },
  ];

  const inviteStats = [
    { title: 'Total Invites', value: totalInvites, icon: '✉️', color: 'blue', description: 'All invites sent' },
    { title: 'Pending', value: pendingInvites, icon: '⏳', color: 'yellow', description: 'Waiting for acceptance' },
    { title: 'Accepted', value: acceptedInvites, icon: '✅', color: 'green', description: 'Completed onboarding' },
    { title: 'Expired', value: expiredInvites, icon: '❌', color: 'red', description: 'Link expired — resend needed' },
  ];

  const colorClasses = {
    blue: 'border-blue-500/20 hover:border-blue-500/40',
    green: 'border-green-500/20 hover:border-green-500/40',
    yellow: 'border-yellow-500/20 hover:border-yellow-500/40',
    orange: 'border-orange-500/20 hover:border-orange-500/40',
    red: 'border-red-500/20 hover:border-red-500/40',
    cyan: 'border-cyan-500/20 hover:border-cyan-500/40',
    purple: 'border-purple-500/20 hover:border-purple-500/40',
  };

  const StatCard = ({ stat }) => (
    <div className={`bg-[rgba(255,255,255,0.03)] border rounded-xl p-6 backdrop-blur-md transition-all group ${colorClasses[stat.color] || 'border-[rgba(255,255,255,0.1)] hover:border-[#FFD700]/30'}`}>
      {/* Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
          {stat.icon}
        </div>
      </div>
      {/* Value */}
      <div className="mb-2">
        <div className="text-3xl font-bold text-[#FFD700]">{stat.value}</div>
      </div>
      {/* Title and Description */}
      <div>
        <div className="text-sm font-semibold text-white">{stat.title}</div>
        <div className="text-xs text-[#A0A0A0] mt-1">{stat.description}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 mb-8">
      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {primaryStats.map((stat) => (
          <StatCard key={stat.title} stat={stat} />
        ))}
      </div>

      {/* Role Breakdown */}
      <div>
        <h3 className="text-sm font-bold text-[#A0A0A0] uppercase tracking-wider mb-3">Users by Role</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {roleStats.map((stat) => (
            <StatCard key={stat.title} stat={stat} />
          ))}
        </div>
      </div>

      {/* Invite Metrics */}
      <div>
        <h3 className="text-sm font-bold text-[#A0A0A0] uppercase tracking-wider mb-3">Invite Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {inviteStats.map((stat) => (
            <StatCard key={stat.title} stat={stat} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminSummaryStats;
