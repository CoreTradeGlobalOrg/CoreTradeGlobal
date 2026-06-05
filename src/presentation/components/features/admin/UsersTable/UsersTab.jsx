'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Check, Ban, Trash2, Eye, Shield, ShieldX, ShieldOff, ChevronDown } from 'lucide-react';
import { COUNTRIES } from '@/core/constants/countries';
import { ROLES, ROLE_DISPLAY_NAMES, ROLE_BADGE_COLORS } from '@/core/constants/roles';

function getCountryLabel(countryCode) {
  const country = COUNTRIES.find((c) => c.value === countryCode);
  return country ? country.label : countryCode;
}

function formatDate(date) {
  if (!date) return 'N/A';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

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

/**
 * UsersTab - filter controls + user list (desktop table + mobile cards).
 */
export function UsersTab({ users = [], onAction, onOpenDialog, actionLoading }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerified, setFilterVerified] = useState('all');
  const [filterApproved, setFilterApproved] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null);

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.email?.toLowerCase().includes(searchLower) ||
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.companyName?.toLowerCase().includes(searchLower);

    const matchesVerification =
      filterVerified === 'all' ||
      (filterVerified === 'verified' && user.emailVerified === true) ||
      (filterVerified === 'unverified' && user.emailVerified === false);

    const isExpiredSelfDelete =
      user.isDeleted && user.deletionType === 'self' && user.canRecoverUntil &&
      new Date() > new Date(user.canRecoverUntil.seconds * 1000);

    const matchesApproval =
      filterApproved === 'all' ||
      (filterApproved === 'approved' && user.adminApproved === true && !user.isDeleted) ||
      (filterApproved === 'pending' && user.adminApproved !== true && !user.isDeleted) ||
      (filterApproved === 'banned' && user.isDeleted === true && user.deletionType === 'admin_ban') ||
      (filterApproved === 'expired' && isExpiredSelfDelete);

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesVerification && matchesApproval && matchesRole;
  });

  const closeMobileDropdown = () => setMobileDropdownOpen(null);

  const handleSelectAction = (value, user) => {
    if (!value) return;
    if (value === 'feature') onAction('feature', user);
    else if (value === 'profile') router.push(`/profile/${user.id}`);
    else onOpenDialog(value, user);
  };

  const renderStatusBadges = (user) => {
    const isExpired =
      user.isDeleted && user.deletionType === 'self' && user.canRecoverUntil &&
      new Date() > new Date(user.canRecoverUntil.seconds * 1000);

    return (
      <div className="flex flex-col gap-1.5">
        {user.role && (
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border w-fit ${getRoleBadgeClasses(user.role)}`}>
            {user.role === ROLES.ADMIN && <Shield size={12} />}
            {ROLE_DISPLAY_NAMES[user.role] || user.role}
          </span>
        )}
        {user.isDeleted ? (
          isExpired ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-500/30 w-fit">Expired</span>
          ) : user.deletionType === 'admin_ban' ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-600/20 text-red-400 border border-red-500/30 w-fit"><ShieldX size={12} /> Banned</span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 w-fit">Self-Deleted</span>
          )
        ) : user.isSuspended ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 w-fit">Suspended</span>
        ) : user.adminApproved ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 w-fit">Approved</span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 w-fit">Pending</span>
        )}
        {user.isDeleted && user.banReason && (
          <span className="text-xs text-gray-500 truncate max-w-[150px]" title={user.banReason}>{user.banReason}</span>
        )}
        {user.isDeleted && user.deletionType === 'self' && user.canRecoverUntil && (
          <span className="text-xs text-gray-500">
            {isExpired ? 'Expired: ' : 'Expires: '}
            {new Date(user.canRecoverUntil.seconds * 1000).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  };

  const emptyMsg = searchTerm || filterVerified !== 'all' || filterApproved !== 'all'
    ? 'No users found matching your filters'
    : 'No users registered yet';

  return (
    <>
      {/* Filters */}
      <div className="px-4 md:px-6 pb-4 flex flex-col gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-lg text-white placeholder:text-gray-500 focus:border-[#FFD700] focus:outline-none transition-colors text-sm"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
          <select value={filterVerified} onChange={(e) => setFilterVerified(e.target.value)} className="px-3 py-2 bg-[#1a2a3a] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:border-[#FFD700] focus:outline-none cursor-pointer text-sm flex-shrink-0 min-w-[100px]">
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
          <select value={filterApproved} onChange={(e) => setFilterApproved(e.target.value)} className="px-3 py-2 bg-[#1a2a3a] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:border-[#FFD700] focus:outline-none cursor-pointer text-sm flex-shrink-0 min-w-[110px]">
            <option value="all">All Approval</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="banned">Banned</option>
            <option value="expired">Expired</option>
          </select>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-3 py-2 bg-[#1a2a3a] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:border-[#FFD700] focus:outline-none cursor-pointer text-sm flex-shrink-0 min-w-[130px]">
            <option value="all">All Roles</option>
            <option value={ROLES.MEMBER}>Members</option>
            <option value={ROLES.LOGISTICS_PROVIDER}>Logistics Providers</option>
            <option value={ROLES.INSURANCE_PROVIDER}>Insurance Providers</option>
            <option value={ROLES.LAWYER}>Lawyers</option>
            <option value={ROLES.ADMIN}>Admins</option>
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto min-h-[400px]">
        <table className="w-full">
          <thead className="bg-[#0F1B2B]/50 border-b border-[rgba(255,255,255,0.05)]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Country</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Email Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Status / Role</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Registered</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#FFD700] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">{emptyMsg}</td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className={`group hover:bg-[rgba(255,255,255,0.03)] transition-colors ${user.isDeleted ? 'bg-red-900/20 opacity-75' : user.isSuspended ? 'bg-red-900/10' : ''}`}>
                  <td className="px-6 py-4">
                    <div onClick={() => router.push(`/profile/${user.id}`)} className="cursor-pointer">
                      <div className="font-semibold text-white group-hover:text-[#FFD700] transition-colors">
                        {user.displayName || `${user.firstName} ${user.lastName}` || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                      {user.position && <div className="text-xs text-gray-500 mt-1">{user.position}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{user.companyName || 'N/A'}</div>
                    {user.companyCategory && <div className="text-sm text-gray-400">{user.companyCategory}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{user.country ? getCountryLabel(user.country) : 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    {user.emailVerified ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Verified</span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{renderStatusBadges(user)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">{formatDate(user.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      className="bg-[#0F1B2B] text-white border border-[#FFD700]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#FFD700] cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors appearance-none pr-8 relative"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23FFD700' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                      value=""
                      onChange={(e) => { e.stopPropagation(); handleSelectAction(e.target.value, user); }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="" disabled>Actions</option>
                      {user.isDeleted ? (
                        <>
                          <option value="unban" className="text-green-600 font-medium">Unban User</option>
                          <option value="profile" className="text-black">View Profile</option>
                          <option value="delete" className="text-red-600 font-bold">Permanently Delete</option>
                        </>
                      ) : (
                        <>
                          {!user.isSuspended && user.adminApproved && <option value="feature">{user.featured ? 'Unfeature User' : 'Feature User'}</option>}
                          {!user.isSuspended && user.adminApproved && <option value="admin">{user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</option>}
                          {!user.isSuspended && <option value="changeRole">Change Role</option>}
                          {!user.adminApproved && !user.isSuspended && <option value="approve">Approve User</option>}
                          <option value="suspend">{user.isSuspended ? 'Unsuspend User' : 'Suspend User'}</option>
                          <option value="reset2fa">Reset 2FA</option>
                          {user.role !== 'admin' && <option value="ban">Ban User</option>}
                          <option value="profile">View Profile</option>
                          <option value="delete">Permanently Delete</option>
                        </>
                      )}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 p-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{emptyMsg}</div>
        ) : (
          filteredUsers.map((user) => {
            const isExpired = user.isDeleted && user.deletionType === 'self' && user.canRecoverUntil &&
              new Date() > new Date(user.canRecoverUntil.seconds * 1000);
            return (
              <div key={user.id} className={`bg-[rgba(255,255,255,0.03)] border border-[#FFD700]/20 rounded-xl overflow-hidden hover:border-[#FFD700]/40 transition-colors ${user.isDeleted ? 'bg-red-900/20 opacity-75' : user.isSuspended ? 'bg-red-900/10' : ''}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div onClick={() => router.push(`/profile/${user.id}`)} className="cursor-pointer flex-1 min-w-0">
                      <div className="font-semibold text-white">{user.displayName || `${user.firstName} ${user.lastName}` || 'N/A'}</div>
                      <div className="text-sm text-gray-400 truncate">{user.email}</div>
                    </div>
                    {user.role && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getRoleBadgeClasses(user.role)}`}>
                        {user.role === ROLES.ADMIN && <Shield size={12} />}
                        {ROLE_DISPLAY_NAMES[user.role] || user.role}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm"><span className="text-[#A0A0A0]">Company:</span><span className="text-white">{user.companyName || 'N/A'}</span></div>
                    <div className="flex items-center gap-2 text-sm"><span className="text-[#A0A0A0]">Country:</span><span className="text-white">{user.country ? getCountryLabel(user.country) : 'N/A'}</span></div>
                    <div className="flex items-center gap-2 text-sm"><span className="text-[#A0A0A0]">Registered:</span><span className="text-white">{formatDate(user.createdAt)}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {user.emailVerified ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Email Verified</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Email Pending</span>
                    )}
                    {user.isDeleted ? (
                      isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-500/30">Expired</span>
                      ) : user.deletionType === 'admin_ban' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-600/20 text-red-400 border border-red-500/30"><ShieldX size={12} /> Banned</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-500/30">Self-Deleted</span>
                      )
                    ) : user.isSuspended ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Suspended</span>
                    ) : user.adminApproved ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Approved</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">Pending</span>
                    )}
                  </div>
                  {user.isDeleted && user.banReason && <div className="text-xs text-gray-500 mb-2 truncate">Reason: {user.banReason}</div>}
                  {user.isDeleted && user.deletionType === 'self' && user.canRecoverUntil && (
                    <div className="text-xs text-gray-500 mb-2">{isExpired ? 'Expired: ' : 'Expires: '}{new Date(user.canRecoverUntil.seconds * 1000).toLocaleDateString()}</div>
                  )}

                  {/* Mobile dropdown */}
                  <div className="pt-3 border-t border-[rgba(255,255,255,0.05)] mobile-action-dropdown">
                    <button
                      type="button"
                      onClick={() => setMobileDropdownOpen(mobileDropdownOpen === user.id ? null : user.id)}
                      className="w-full bg-[#1a2a3a] text-white border border-[#FFD700]/30 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-[#FFD700] cursor-pointer hover:bg-[#243444] transition-colors flex items-center justify-between"
                    >
                      <span>Select Action...</span>
                      <ChevronDown className={`w-5 h-5 text-[#FFD700] transition-transform ${mobileDropdownOpen === user.id ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileDropdownOpen === user.id && (
                      <div className="mt-2 bg-[#1a2a3a] border border-[#FFD700]/40 rounded-lg shadow-2xl overflow-hidden">
                        {user.isDeleted ? (
                          <>
                            <button type="button" onClick={() => { closeMobileDropdown(); onOpenDialog('unban', user); }} className="w-full px-4 py-3 text-left text-base text-green-400 hover:bg-[#243444] flex items-center gap-3"><Check className="w-5 h-5" /> Unban User</button>
                            <button type="button" onClick={() => { closeMobileDropdown(); router.push(`/profile/${user.id}`); }} className="w-full px-4 py-3 text-left text-base text-white hover:bg-[#243444] flex items-center gap-3"><Eye className="w-5 h-5" /> View Profile</button>
                            <button type="button" onClick={() => { closeMobileDropdown(); onOpenDialog('delete', user); }} className="w-full px-4 py-3 text-left text-base text-red-400 hover:bg-red-900/30 flex items-center gap-3"><Trash2 className="w-5 h-5" /> Permanently Delete</button>
                          </>
                        ) : (
                          <>
                            {!user.isSuspended && user.adminApproved && <button type="button" onClick={() => { closeMobileDropdown(); onAction('feature', user); }} className="w-full px-4 py-3 text-left text-base text-white hover:bg-[#243444] flex items-center gap-3"><Star className="w-5 h-5" /> {user.featured ? 'Unfeature User' : 'Feature User'}</button>}
                            {!user.isSuspended && user.adminApproved && <button type="button" onClick={() => { closeMobileDropdown(); onOpenDialog('admin', user); }} className="w-full px-4 py-3 text-left text-base text-purple-400 hover:bg-[#243444] flex items-center gap-3"><Shield className="w-5 h-5" /> {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</button>}
                            {!user.isSuspended && <button type="button" onClick={() => { closeMobileDropdown(); onOpenDialog('changeRole', user); }} className="w-full px-4 py-3 text-left text-base text-cyan-400 hover:bg-[#243444] flex items-center gap-3"><Shield className="w-5 h-5" /> Change Role</button>}
                            {!user.adminApproved && !user.isSuspended && <button type="button" onClick={() => { closeMobileDropdown(); onOpenDialog('approve', user); }} className="w-full px-4 py-3 text-left text-base text-green-400 hover:bg-[#243444] flex items-center gap-3"><Check className="w-5 h-5" /> Approve User</button>}
                            <button type="button" onClick={() => { closeMobileDropdown(); onOpenDialog('suspend', user); }} className="w-full px-4 py-3 text-left text-base text-yellow-400 hover:bg-[#243444] flex items-center gap-3"><Ban className="w-5 h-5" /> {user.isSuspended ? 'Unsuspend User' : 'Suspend User'}</button>
                            <button type="button" onClick={() => { closeMobileDropdown(); onOpenDialog('reset2fa', user); }} className="w-full px-4 py-3 text-left text-base text-blue-400 hover:bg-[#243444] flex items-center gap-3"><ShieldOff className="w-5 h-5" /> Reset 2FA</button>
                            {user.role !== 'admin' && <button type="button" onClick={() => { closeMobileDropdown(); onOpenDialog('ban', user); }} className="w-full px-4 py-3 text-left text-base text-orange-400 hover:bg-[#243444] flex items-center gap-3"><ShieldX className="w-5 h-5" /> Ban User</button>}
                            <button type="button" onClick={() => { closeMobileDropdown(); router.push(`/profile/${user.id}`); }} className="w-full px-4 py-3 text-left text-base text-white hover:bg-[#243444] flex items-center gap-3"><Eye className="w-5 h-5" /> View Profile</button>
                            <button type="button" onClick={() => { closeMobileDropdown(); onOpenDialog('delete', user); }} className="w-full px-4 py-3 text-left text-base text-red-400 hover:bg-red-900/30 flex items-center gap-3"><Trash2 className="w-5 h-5" /> Permanently Delete</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {filteredUsers.length > 0 && (
        <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.2)]">
          <p className="text-sm text-gray-500">Showing {filteredUsers.length} of {users.length} users</p>
        </div>
      )}
    </>
  );
}
