import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Star, MoreVertical, Check, Ban, Trash2, Eye, Shield, ShieldX, ChevronDown } from 'lucide-react';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import { useApproveUser } from '@/presentation/hooks/admin/useApproveUser';
import { useSuspendUser } from '@/presentation/hooks/admin/useSuspendUser';
import { useDeleteUser } from '@/presentation/hooks/admin/useDeleteUser';
import { useBanUser } from '@/presentation/hooks/admin/useBanUser';
import { useUnbanUser } from '@/presentation/hooks/admin/useUnbanUser';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';

export function UsersTable({ users = [], onRefresh }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerified, setFilterVerified] = useState('all'); // 'all', 'verified', 'unverified'
  const [filterApproved, setFilterApproved] = useState('all'); // 'all', 'approved', 'pending', 'banned'
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'admin', 'member'
  const [actionLoading, setActionLoading] = useState(null); // Track which user action is loading
  const [activeActionMenu, setActiveActionMenu] = useState(null); // Track open menu
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null); // Track open mobile dropdown
  const [banReasonInput, setBanReasonInput] = useState('Violation of terms of service'); // For ban reason input

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null, // 'delete' | 'ban' | 'unban' | 'suspend' | 'approve' | 'admin'
    user: null,
  });

  const { approveUser } = useApproveUser();
  const { suspendUser } = useSuspendUser();
  const { deleteUser } = useDeleteUser();
  const { banUser } = useBanUser();
  const { unbanUser } = useUnbanUser();

  // Open confirm dialog
  const openDialog = (type, user) => {
    setConfirmDialog({ isOpen: true, type, user });
    if (type === 'ban') setBanReasonInput('Violation of terms of service');
  };

  // Close confirm dialog
  const closeDialog = () => {
    setConfirmDialog({ isOpen: false, type: null, user: null });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.mobile-action-dropdown')) {
        setMobileDropdownOpen(null);
      }
      setActiveActionMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Get country label with flag
  const getCountryLabel = (countryCode) => {
    const country = COUNTRIES.find((c) => c.value === countryCode);
    return country ? country.label : countryCode;
  };

  // ACTIONS (Refactored to close menu after action)
  const handleAction = async (actionFn, ...args) => {
    setActiveActionMenu(null);
    await actionFn(...args);
  };

  // Handle toggle featured status
  const handleToggleFeatured = async (userId, currentStatus, userName) => {
    setActionLoading(userId);
    try {
      const userRepository = container.getUserRepository();
      await userRepository.update(userId, { featured: !currentStatus });
      toast.success(`${userName} is ${!currentStatus ? 'now featured!' : 'no longer featured.'}`);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Toggle featured error:', error);
      toast.error('Failed to update featured status');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle toggle admin role
  const handleToggleAdmin = async (user) => {
    const isCurrentlyAdmin = user.role === 'admin';
    const newRole = isCurrentlyAdmin ? 'member' : 'admin';

    setActionLoading(user.id);
    try {
      const userRepository = container.getUserRepository();
      await userRepository.update(user.id, { role: newRole });
      toast.success(`${user.displayName} is ${isCurrentlyAdmin ? 'no longer an admin' : 'now an admin'}!`);
      closeDialog();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Toggle admin error:', error);
      toast.error('Failed to update admin status');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle approve user
  const handleApprove = async (user) => {
    setActionLoading(user.id);
    try {
      await approveUser(user.id);
      toast.success(`${user.displayName} has been approved!`);
      closeDialog();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(`Failed to approve user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle suspend/unsuspend user
  const handleSuspend = async (user) => {
    const action = user.isSuspended ? 'unsuspend' : 'suspend';

    setActionLoading(user.id);
    try {
      await suspendUser(user.id, !user.isSuspended);
      toast.success(`${user.displayName} has been ${action}ed!`);
      closeDialog();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(`Failed to ${action} user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete user (permanent - admin only)
  const handleDelete = async (user) => {
    setActionLoading(user.id);
    try {
      await deleteUser(user.id);
      toast.success(`${user.displayName} has been permanently deleted`);
      closeDialog();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(`Failed to delete user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle ban user
  const handleBan = async (user) => {
    setActionLoading(user.id);
    try {
      await banUser(user.id, banReasonInput);
      toast.success(`${user.displayName} has been banned`);
      closeDialog();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(`Failed to ban user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle unban user
  const handleUnban = async (user) => {
    setActionLoading(user.id);
    try {
      await unbanUser(user.id);
      toast.success(`${user.displayName} has been unbanned`);
      closeDialog();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(`Failed to unban user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle confirm dialog action
  const handleConfirmAction = async () => {
    const { type, user } = confirmDialog;
    if (!user) return;

    switch (type) {
      case 'delete':
        await handleDelete(user);
        break;
      case 'ban':
        await handleBan(user);
        break;
      case 'unban':
        await handleUnban(user);
        break;
      case 'suspend':
        await handleSuspend(user);
        break;
      case 'approve':
        await handleApprove(user);
        break;
      case 'admin':
        await handleToggleAdmin(user);
        break;
    }
  };

  // Get dialog config based on type
  const getDialogConfig = () => {
    const { type, user } = confirmDialog;
    if (!user) return {};

    const configs = {
      delete: {
        title: 'Permanently Delete User',
        message: `Are you sure you want to permanently delete ${user.displayName}? This action cannot be undone and will remove all their data.`,
        confirmText: 'Delete Permanently',
        variant: 'danger',
      },
      ban: {
        title: 'Ban User',
        message: `Are you sure you want to ban ${user.displayName}? They will not be able to log in until unbanned.`,
        confirmText: 'Ban User',
        variant: 'ban',
      },
      unban: {
        title: 'Unban User',
        message: `Are you sure you want to unban ${user.displayName}? They will be able to log in again.`,
        confirmText: 'Unban User',
        variant: 'success',
      },
      suspend: {
        title: user.isSuspended ? 'Unsuspend User' : 'Suspend User',
        message: user.isSuspended
          ? `Are you sure you want to unsuspend ${user.displayName}?`
          : `Are you sure you want to suspend ${user.displayName}?`,
        confirmText: user.isSuspended ? 'Unsuspend' : 'Suspend',
        variant: user.isSuspended ? 'success' : 'warning',
      },
      approve: {
        title: 'Approve User',
        message: `Are you sure you want to approve ${user.displayName}?`,
        confirmText: 'Approve',
        variant: 'success',
      },
      admin: {
        title: user.role === 'admin' ? 'Remove Admin Rights' : 'Grant Admin Rights',
        message: user.role === 'admin'
          ? `Are you sure you want to remove admin rights from ${user.displayName}?`
          : `Are you sure you want to grant admin rights to ${user.displayName}?`,
        confirmText: user.role === 'admin' ? 'Remove Admin' : 'Make Admin',
        variant: user.role === 'admin' ? 'warning' : 'success',
      },
    };

    return configs[type] || {};
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    // Handle Firestore timestamp
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter users based on search, verification, approval status and role
  const filteredUsers = users.filter((user) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.email?.toLowerCase().includes(searchLower) ||
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.companyName?.toLowerCase().includes(searchLower);

    // Verification filter
    const matchesVerification =
      filterVerified === 'all' ||
      (filterVerified === 'verified' && user.emailVerified === true) ||
      (filterVerified === 'unverified' && user.emailVerified === false);

    // Approval filter (includes banned status)
    // Check if self-delete recovery period has expired
    const isExpiredSelfDelete = user.isDeleted &&
      user.deletionType === 'self' &&
      user.canRecoverUntil &&
      new Date() > new Date(user.canRecoverUntil.seconds * 1000);

    const matchesApproval =
      filterApproved === 'all' ||
      (filterApproved === 'approved' && user.adminApproved === true && !user.isDeleted) ||
      (filterApproved === 'pending' && user.adminApproved !== true && !user.isDeleted) ||
      (filterApproved === 'banned' && user.isDeleted === true && user.deletionType === 'admin_ban') ||
      (filterApproved === 'expired' && isExpiredSelfDelete);

    // Role filter
    const matchesRole =
      filterRole === 'all' ||
      (filterRole === 'admin' && user.role === 'admin') ||
      (filterRole === 'member' && user.role !== 'admin');

    return matchesSearch && matchesVerification && matchesApproval && matchesRole;
  });

  return (
    <div
      className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[#FFD700]/20 backdrop-blur-md shadow-2xl"
    >
      {/* Table Header */}
      <div className="px-4 md:px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg md:text-xl font-bold text-white">
            All Users ({filteredUsers.length})
          </h2>

          {/* Filters - Scrollable on mobile */}
          <div className="flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-lg text-white placeholder:text-gray-500 focus:border-[#FFD700] focus:outline-none transition-colors text-sm"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                🔍
              </span>
            </div>

            {/* Filter dropdowns - Horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
              {/* Verification Filter */}
              <select
                value={filterVerified}
                onChange={(e) => setFilterVerified(e.target.value)}
                className="px-3 py-2 bg-[#1a2a3a] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:border-[#FFD700] focus:outline-none cursor-pointer text-sm flex-shrink-0 min-w-[100px]"
              >
                <option value="all" className="bg-[#1a2a3a] text-white">All Status</option>
                <option value="verified" className="bg-[#1a2a3a] text-white">Verified</option>
                <option value="unverified" className="bg-[#1a2a3a] text-white">Unverified</option>
              </select>

              {/* Approval Filter */}
              <select
                value={filterApproved}
                onChange={(e) => setFilterApproved(e.target.value)}
                className="px-3 py-2 bg-[#1a2a3a] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:border-[#FFD700] focus:outline-none cursor-pointer text-sm flex-shrink-0 min-w-[110px]"
              >
                <option value="all" className="bg-[#1a2a3a] text-white">All Approval</option>
                <option value="approved" className="bg-[#1a2a3a] text-white">Approved</option>
                <option value="pending" className="bg-[#1a2a3a] text-white">Pending</option>
                <option value="banned" className="bg-[#1a2a3a] text-white">Banned</option>
                <option value="expired" className="bg-[#1a2a3a] text-white">Expired</option>
              </select>

              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 bg-[#1a2a3a] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:border-[#FFD700] focus:outline-none cursor-pointer text-sm flex-shrink-0 min-w-[90px]"
              >
                <option value="all" className="bg-[#1a2a3a] text-white">All Roles</option>
                <option value="admin" className="bg-[#1a2a3a] text-white">Admins</option>
                <option value="member" className="bg-[#1a2a3a] text-white">Members</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto min-h-[400px]">
        <table className="w-full">
          <thead className="bg-[#0F1B2B]/50 border-b border-[rgba(255,255,255,0.05)]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
                Email Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
                Status / Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
                Registered
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#FFD700] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  {searchTerm || filterVerified !== 'all' || filterApproved !== 'all'
                    ? 'No users found matching your filters'
                    : 'No users registered yet'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className={`group hover:bg-[rgba(255,255,255,0.03)] transition-colors ${user.isDeleted ? 'bg-red-900/20 opacity-75' : user.isSuspended ? 'bg-red-900/10' : ''}`}>
                  {/* User Info */}
                  <td className="px-6 py-4">
                    <div
                      onClick={() => router.push(`/profile/${user.id}`)}
                      className="cursor-pointer"
                    >
                      <div className="font-semibold text-white group-hover:text-[#FFD700] transition-colors">
                        {user.displayName || `${user.firstName} ${user.lastName}` || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                      {user.position && (
                        <div className="text-xs text-gray-500 mt-1">{user.position}</div>
                      )}
                    </div>
                  </td>

                  {/* Company */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">
                      {user.companyName || 'N/A'}
                    </div>
                    {user.companyCategory && (
                      <div className="text-sm text-gray-400">{user.companyCategory}</div>
                    )}
                  </td>

                  {/* Country */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">
                      {user.country ? getCountryLabel(user.country) : 'N/A'}
                    </div>
                  </td>

                  {/* Email Verification Status */}
                  <td className="px-6 py-4">
                    {user.emailVerified ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        Pending
                      </span>
                    )}
                  </td>

                  {/* Admin Approval Status + Role */}
                  <td className="px-6 py-4">
                    {(() => {
                      // Check if self-delete recovery period has expired
                      const isExpired = user.isDeleted &&
                        user.deletionType === 'self' &&
                        user.canRecoverUntil &&
                        new Date() > new Date(user.canRecoverUntil.seconds * 1000);

                      return (
                        <div className="flex flex-col gap-1.5">
                          {/* Admin Badge */}
                          {user.role === 'admin' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
                              <Shield size={12} /> Admin
                            </span>
                          )}
                          {/* Status Badge - Priority: Expired > Banned > Suspended > Approved/Pending */}
                          {user.isDeleted ? (
                            isExpired ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-500/30 w-fit">
                                ⏱️ Expired
                              </span>
                            ) : user.deletionType === 'admin_ban' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-600/20 text-red-400 border border-red-500/30 w-fit">
                                <ShieldX size={12} /> Banned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 w-fit">
                                🗑️ Self-Deleted
                              </span>
                            )
                          ) : user.isSuspended ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 w-fit">
                              Suspended
                            </span>
                          ) : user.adminApproved ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 w-fit">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 w-fit">
                              Pending
                            </span>
                          )}
                          {/* Show ban reason if banned */}
                          {user.isDeleted && user.banReason && (
                            <span className="text-xs text-gray-500 truncate max-w-[150px]" title={user.banReason}>
                              {user.banReason}
                            </span>
                          )}
                          {/* Show recovery deadline for self-deleted */}
                          {user.isDeleted && user.deletionType === 'self' && user.canRecoverUntil && (
                            <span className="text-xs text-gray-500">
                              {isExpired ? 'Expired: ' : 'Expires: '}
                              {new Date(user.canRecoverUntil.seconds * 1000).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Registration Date */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">{formatDate(user.createdAt)}</div>
                  </td>

                  {/* Actions Dropdown */}
                  <td className="px-6 py-4 text-right">
                    <select
                      className="bg-[#0F1B2B] text-white border border-[#FFD700]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#FFD700] cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors appearance-none pr-8 relative"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23FFD700' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: `right 0.5rem center`,
                        backgroundRepeat: `no-repeat`,
                        backgroundSize: `1.5em 1.5em`
                      }}
                      value=""
                      onChange={(e) => {
                        e.stopPropagation();
                        const value = e.target.value;
                        if (!value) return;

                        // Reset immediately by not changing state (value is fixed to "")

                        if (value === 'feature') handleAction(handleToggleFeatured, user.id, user.featured, user.displayName);
                        else if (value === 'admin') openDialog('admin', user);
                        else if (value === 'approve') openDialog('approve', user);
                        else if (value === 'suspend') openDialog('suspend', user);
                        else if (value === 'ban') openDialog('ban', user);
                        else if (value === 'unban') openDialog('unban', user);
                        else if (value === 'profile') router.push(`/profile/${user.id}`);
                        else if (value === 'delete') openDialog('delete', user);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="" disabled>Actions</option>

                      {/* Show unban option for banned users */}
                      {user.isDeleted ? (
                        <>
                          <option value="unban" className="text-green-600 font-medium">✅ Unban User</option>
                          <option value="profile" className="text-black">View Profile</option>
                          <option value="delete" className="text-red-600 font-bold">🗑️ Permanently Delete</option>
                        </>
                      ) : (
                        <>
                          {!user.isSuspended && user.adminApproved && (
                            <option value="feature" className="text-black">
                              {user.featured ? 'Unfeature User' : 'Feature User'}
                            </option>
                          )}

                          {/* Admin Toggle - Only for approved, non-suspended users */}
                          {!user.isSuspended && user.adminApproved && (
                            <option value="admin" className="text-purple-600 font-medium">
                              {user.role === 'admin' ? '🛡️ Remove Admin' : '🛡️ Make Admin'}
                            </option>
                          )}

                          {!user.adminApproved && !user.isSuspended && (
                            <option value="approve" className="text-green-600 font-medium">Approve User</option>
                          )}

                          <option value="suspend" className="text-black">
                            {user.isSuspended ? 'Unsuspend User' : 'Suspend User'}
                          </option>

                          {/* Ban option - not available for admins */}
                          {user.role !== 'admin' && (
                            <option value="ban" className="text-red-500 font-medium">🚫 Ban User</option>
                          )}

                          <option value="profile" className="text-black">View Profile</option>

                          <option value="delete" className="text-red-600 font-bold">🗑️ Permanently Delete</option>
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
          <div className="text-center py-12 text-gray-500">
            {searchTerm || filterVerified !== 'all' || filterApproved !== 'all'
              ? 'No users found matching your filters'
              : 'No users registered yet'}
          </div>
        ) : (
          filteredUsers.map((user) => {
            // Check if self-delete recovery period has expired
            const isExpired = user.isDeleted &&
              user.deletionType === 'self' &&
              user.canRecoverUntil &&
              new Date() > new Date(user.canRecoverUntil.seconds * 1000);

            return (
              <div
                key={user.id}
                className={`bg-[rgba(255,255,255,0.03)] border border-[#FFD700]/20 rounded-xl overflow-hidden hover:border-[#FFD700]/40 transition-colors ${user.isDeleted ? 'bg-red-900/20 opacity-75' : user.isSuspended ? 'bg-red-900/10' : ''}`}
              >
                {/* Card Body */}
                <div className="p-4">
                  {/* Header - Name + Role Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div
                      onClick={() => router.push(`/profile/${user.id}`)}
                      className="cursor-pointer flex-1 min-w-0"
                    >
                      <div className="font-semibold text-white">
                        {user.displayName || `${user.firstName} ${user.lastName}` || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-400 truncate">{user.email}</div>
                    </div>
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">
                        <Shield size={12} /> Admin
                      </span>
                    )}
                  </div>

                  {/* Info Lines */}
                  <div className="space-y-2 mb-4">
                    {/* Company */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#A0A0A0]">Company:</span>
                      <span className="text-white">{user.companyName || 'N/A'}</span>
                    </div>

                    {/* Country */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#A0A0A0]">Country:</span>
                      <span className="text-white">{user.country ? getCountryLabel(user.country) : 'N/A'}</span>
                    </div>

                    {/* Registered */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#A0A0A0]">Registered:</span>
                      <span className="text-white">{formatDate(user.createdAt)}</span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Email Status */}
                    {user.emailVerified ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Email Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        Email Pending
                      </span>
                    )}

                    {/* Approval Status */}
                    {user.isDeleted ? (
                      isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-500/30">
                          ⏱️ Expired
                        </span>
                      ) : user.deletionType === 'admin_ban' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-600/20 text-red-400 border border-red-500/30">
                          <ShieldX size={12} /> Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-500/30">
                          🗑️ Self-Deleted
                        </span>
                      )
                    ) : user.isSuspended ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        Suspended
                      </span>
                    ) : user.adminApproved ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Ban reason or recovery deadline */}
                  {user.isDeleted && user.banReason && (
                    <div className="text-xs text-gray-500 mb-2 truncate" title={user.banReason}>
                      Reason: {user.banReason}
                    </div>
                  )}
                  {user.isDeleted && user.deletionType === 'self' && user.canRecoverUntil && (
                    <div className="text-xs text-gray-500 mb-2">
                      {isExpired ? 'Expired: ' : 'Expires: '}
                      {new Date(user.canRecoverUntil.seconds * 1000).toLocaleDateString()}
                    </div>
                  )}

                  {/* Actions - Custom Dropdown */}
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
                            <button type="button" onClick={() => { setMobileDropdownOpen(null); openDialog('unban', user); }} className="w-full px-4 py-3 text-left text-base text-green-400 hover:bg-[#243444] flex items-center gap-3">
                              <Check className="w-5 h-5" /> Unban User
                            </button>
                            <button type="button" onClick={() => { setMobileDropdownOpen(null); router.push(`/profile/${user.id}`); }} className="w-full px-4 py-3 text-left text-base text-white hover:bg-[#243444] flex items-center gap-3">
                              <Eye className="w-5 h-5" /> View Profile
                            </button>
                            <button type="button" onClick={() => { setMobileDropdownOpen(null); openDialog('delete', user); }} className="w-full px-4 py-3 text-left text-base text-red-400 hover:bg-red-900/30 flex items-center gap-3">
                              <Trash2 className="w-5 h-5" /> Permanently Delete
                            </button>
                          </>
                        ) : (
                          <>
                            {!user.isSuspended && user.adminApproved && (
                              <button type="button" onClick={() => { setMobileDropdownOpen(null); handleAction(handleToggleFeatured, user.id, user.featured, user.displayName); }} className="w-full px-4 py-3 text-left text-base text-white hover:bg-[#243444] flex items-center gap-3">
                                <Star className="w-5 h-5" /> {user.featured ? 'Unfeature User' : 'Feature User'}
                              </button>
                            )}
                            {!user.isSuspended && user.adminApproved && (
                              <button type="button" onClick={() => { setMobileDropdownOpen(null); openDialog('admin', user); }} className="w-full px-4 py-3 text-left text-base text-purple-400 hover:bg-[#243444] flex items-center gap-3">
                                <Shield className="w-5 h-5" /> {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                              </button>
                            )}
                            {!user.adminApproved && !user.isSuspended && (
                              <button type="button" onClick={() => { setMobileDropdownOpen(null); openDialog('approve', user); }} className="w-full px-4 py-3 text-left text-base text-green-400 hover:bg-[#243444] flex items-center gap-3">
                                <Check className="w-5 h-5" /> Approve User
                              </button>
                            )}
                            <button type="button" onClick={() => { setMobileDropdownOpen(null); openDialog('suspend', user); }} className="w-full px-4 py-3 text-left text-base text-yellow-400 hover:bg-[#243444] flex items-center gap-3">
                              <Ban className="w-5 h-5" /> {user.isSuspended ? 'Unsuspend User' : 'Suspend User'}
                            </button>
                            {user.role !== 'admin' && (
                              <button type="button" onClick={() => { setMobileDropdownOpen(null); openDialog('ban', user); }} className="w-full px-4 py-3 text-left text-base text-orange-400 hover:bg-[#243444] flex items-center gap-3">
                                <ShieldX className="w-5 h-5" /> Ban User
                              </button>
                            )}
                            <button type="button" onClick={() => { setMobileDropdownOpen(null); router.push(`/profile/${user.id}`); }} className="w-full px-4 py-3 text-left text-base text-white hover:bg-[#243444] flex items-center gap-3">
                              <Eye className="w-5 h-5" /> View Profile
                            </button>
                            <button type="button" onClick={() => { setMobileDropdownOpen(null); openDialog('delete', user); }} className="w-full px-4 py-3 text-left text-base text-red-400 hover:bg-red-900/30 flex items-center gap-3">
                              <Trash2 className="w-5 h-5" /> Permanently Delete
                            </button>
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

      {/* Table Footer */}
      {filteredUsers.length > 0 && (
        <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.2)]">
          <p className="text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeDialog}
        onConfirm={handleConfirmAction}
        loading={actionLoading === confirmDialog.user?.id}
        {...getDialogConfig()}
      >
        {/* Ban reason input for ban action */}
        {confirmDialog.type === 'ban' && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Ban Reason:</label>
            <input
              type="text"
              value={banReasonInput}
              onChange={(e) => setBanReasonInput(e.target.value)}
              className="w-full px-4 py-2 bg-[#0F1B2B] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-red-500 focus:outline-none"
              placeholder="Enter reason for ban..."
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

export default UsersTable;
