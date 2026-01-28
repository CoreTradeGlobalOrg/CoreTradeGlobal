/**
 * Stats Cards Component
 *
 * Displays admin statistics in card format:
 * - Total users
 * - Email verified users
 * - Admin approved users
 * - Pending approval
 * - Suspended users
 * - New users (last 7 days)
 */

'use client';

export function StatsCards({ users = [] }) {
  // Calculate stats from users array
  const totalUsers = users.length;

  const verifiedUsers = users.filter((user) => user.emailVerified === true).length;

  const approvedUsers = users.filter((user) => user.adminApproved === true).length;

  const pendingApproval = users.filter(
    (user) => user.emailVerified === true && user.adminApproved !== true && !user.isSuspended
  ).length;

  const suspendedUsers = users.filter((user) => user.isSuspended === true).length;

  // Users created in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const newUsers = users.filter((user) => {
    if (!user.createdAt) return false;
    // Handle Firestore timestamp
    const userDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
    return userDate >= sevenDaysAgo;
  }).length;

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: '👥',
      color: 'blue',
      description: 'All registered users',
    },
    {
      title: 'Admin Approved',
      value: approvedUsers,
      icon: '✅',
      color: 'green',
      description: 'Fully approved users',
    },
    {
      title: 'Pending Approval',
      value: pendingApproval,
      icon: '⏳',
      color: 'orange',
      description: 'Awaiting admin approval',
    },
    {
      title: 'Email Verified',
      value: verifiedUsers,
      icon: '📧',
      color: 'cyan',
      description: 'Email verified accounts',
    },
    {
      title: 'Suspended',
      value: suspendedUsers,
      icon: '🚫',
      color: 'red',
      description: 'Suspended accounts',
    },
    {
      title: 'New (7 days)',
      value: newUsers,
      icon: '🆕',
      color: 'purple',
      description: 'Recent registrations',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 backdrop-blur-md hover:border-[#FFD700]/30 transition-all group"
        >
          {/* Icon and Title */}
          <div className="flex items-center justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}
            >
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
      ))}
    </div>
  );
}

export default StatsCards;
