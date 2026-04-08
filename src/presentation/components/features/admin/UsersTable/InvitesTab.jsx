'use client';

import { Mail, RefreshCw } from 'lucide-react';
import { ROLE_DISPLAY_NAMES, ROLE_BADGE_COLORS, ROLES } from '@/core/constants/roles';

function getRoleBadgeClasses(role) {
  const colors = ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS[ROLES.MEMBER];
  const darkMap = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return darkMap[colors.color] || darkMap.blue;
}

function getInviteStatusClasses(status) {
  switch (status) {
    case 'accepted': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'expired': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  }
}

/**
 * InvitesTab - renders the invites list table within UsersTable.
 */
export function InvitesTab({ invites, invitesLoading, resendInvite, resendLoading }) {
  if (invitesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFD700]"></div>
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No invites sent yet. Use the &ldquo;Invite User&rdquo; button to send your first invite.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto min-h-[400px]">
      <table className="w-full">
        <thead className="bg-[#0F1B2B]/50 border-b border-[rgba(255,255,255,0.05)]">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Email</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Role</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Name</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Company</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Invited</th>
            <th className="px-6 py-4 text-left text-xs font-bold text-[#FFD700] uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
          {invites.map((invite) => (
            <tr key={invite.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-white">{invite.email}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClasses(invite.role)}`}>
                  {ROLE_DISPLAY_NAMES[invite.role] || invite.role}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-white">{invite.name || 'N/A'}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-400">{invite.company || 'N/A'}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border capitalize ${getInviteStatusClasses(invite.status)}`}>
                  {invite.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-400">
                  {invite.invitedAt
                    ? invite.invitedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'N/A'}
                </span>
              </td>
              <td className="px-6 py-4">
                {(invite.status === 'pending' || invite.status === 'expired') && (
                  <button
                    type="button"
                    onClick={() => resendInvite({ email: invite.email, role: invite.role, name: invite.name, company: invite.company })}
                    disabled={resendLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#FFD700] border border-[#FFD700]/30 rounded-lg hover:bg-[#FFD700]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3 h-3 ${resendLoading ? 'animate-spin' : ''}`} />
                    Resend
                  </button>
                )}
                {invite.status === 'accepted' && (
                  <span className="text-xs text-gray-500">Accepted</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
