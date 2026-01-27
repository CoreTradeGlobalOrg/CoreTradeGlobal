import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Star, MoreVertical, Check, Ban, Trash2, Eye, Shield } from 'lucide-react';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import { useApproveUser } from '@/presentation/hooks/admin/useApproveUser';
import { useSuspendUser } from '@/presentation/hooks/admin/useSuspendUser';
import { useDeleteUser } from '@/presentation/hooks/admin/useDeleteUser';

export function UsersTable({ users = [], onRefresh }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerified, setFilterVerified] = useState('all'); // 'all', 'verified', 'unverified'
  const [filterApproved, setFilterApproved] = useState('all'); // 'all', 'approved', 'pending'
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'admin', 'member'
  const [actionLoading, setActionLoading] = useState(null); // Track which user action is loading
  const [activeActionMenu, setActiveActionMenu] = useState(null); // Track open menu

  const { approveUser } = useApproveUser();
  const { suspendUser } = useSuspendUser();
  const { deleteUser } = useDeleteUser();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveActionMenu(null);
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
  const handleToggleAdmin = async (userId, currentRole, userName) => {
    const isCurrentlyAdmin = currentRole === 'admin';
    const newRole = isCurrentlyAdmin ? 'member' : 'admin';
    const action = isCurrentlyAdmin ? 'remove admin rights from' : 'grant admin rights to';

    if (!confirm(`⚠️ Are you sure you want to ${action} ${userName}?`)) return;

    setActionLoading(userId);
    try {
      const userRepository = container.getUserRepository();
      await userRepository.update(userId, { role: newRole });
      toast.success(`${userName} is ${isCurrentlyAdmin ? 'no longer an admin' : 'now an admin'}!`);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Toggle admin error:', error);
      toast.error('Failed to update admin status');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle approve user
  const handleApprove = async (userId, userName) => {
    if (!confirm(`Are you sure you want to approve ${userName}?`)) return;

    setActionLoading(userId);
    try {
      await approveUser(userId);
      toast.success(`${userName} has been approved!`);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(`Failed to approve user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle suspend/unsuspend user
  const handleSuspend = async (userId, userName, currentStatus) => {
    const action = currentStatus ? 'unsuspend' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} ${userName}?`)) return;

    setActionLoading(userId);
    try {
      await suspendUser(userId, !currentStatus);
      toast.success(`${userName} has been ${action}ed!`);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(`Failed to ${action} user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete user
  const handleDelete = async (userId, userName) => {
    if (!confirm(`⚠️ WARNING: Are you sure you want to DELETE ${userName}? This action cannot be undone!`)) return;

    setActionLoading(userId);
    try {
      await deleteUser(userId);
      toast.success(`${userName} has been deleted`);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(`Failed to delete user: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
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

    // Approval filter
    const matchesApproval =
      filterApproved === 'all' ||
      (filterApproved === 'approved' && user.adminApproved === true) ||
      (filterApproved === 'pending' && user.adminApproved !== true);

    // Role filter
    const matchesRole =
      filterRole === 'all' ||
      (filterRole === 'admin' && user.role === 'admin') ||
      (filterRole === 'member' && user.role !== 'admin');

    return matchesSearch && matchesVerification && matchesApproval && matchesRole;
  });

  return (
    <div
      className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[#D4AF37]/20 backdrop-blur-md shadow-2xl"
    >
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-xl font-bold text-white">
            All Users ({filteredUsers.length})
          </h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 pl-10 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-lg text-white placeholder:text-gray-500 focus:border-[#D4AF37] focus:outline-none transition-colors"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                🔍
              </span>
            </div>

            {/* Verification Filter */}
            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="px-4 py-2 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="verified">Email Verified</option>
              <option value="unverified">Email Unverified</option>
            </select>

            {/* Approval Filter */}
            <select
              value={filterApproved}
              onChange={(e) => setFilterApproved(e.target.value)}
              className="px-4 py-2 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer"
            >
              <option value="all">All Approval</option>
              <option value="approved">Admin Approved</option>
              <option value="pending">Pending Approval</option>
            </select>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="member">Members Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[400px]">
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
              <th className="px-6 py-4 text-left text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
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
                <tr key={user.id} className={`group hover:bg-[rgba(255,255,255,0.03)] transition-colors ${user.isSuspended ? 'bg-red-900/10' : ''}`}>
                  {/* User Info */}
                  <td className="px-6 py-4">
                    <div
                      onClick={() => router.push(`/profile/${user.id}`)}
                      className="cursor-pointer"
                    >
                      <div className="font-semibold text-white group-hover:text-[#D4AF37] transition-colors">
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
                    <div className="flex flex-col gap-1.5">
                      {/* Admin Badge */}
                      {user.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
                          <Shield size={12} /> Admin
                        </span>
                      )}
                      {/* Status Badge */}
                      {user.isSuspended ? (
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
                    </div>
                  </td>

                  {/* Registration Date */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">{formatDate(user.createdAt)}</div>
                  </td>

                  {/* Actions Dropdown */}
                  <td className="px-6 py-4 text-right">
                    <select
                      className="bg-[#0F1B2B] text-white border border-[#D4AF37]/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#D4AF37] cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors appearance-none pr-8 relative"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23D4AF37' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
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
                        else if (value === 'admin') handleAction(handleToggleAdmin, user.id, user.role, user.displayName);
                        else if (value === 'approve') handleAction(handleApprove, user.id, user.displayName);
                        else if (value === 'suspend') handleAction(handleSuspend, user.id, user.displayName, user.isSuspended);
                        else if (value === 'profile') router.push(`/profile/${user.id}`);
                        else if (value === 'delete') handleAction(handleDelete, user.id, user.displayName);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="" disabled>Actions</option>

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

                      <option value="profile" className="text-black">View Profile</option>

                      <option value="delete" className="text-red-600 font-bold">Delete User</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {filteredUsers.length > 0 && (
        <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.2)]">
          <p className="text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>
      )}
    </div>
  );
}

export default UsersTable;
