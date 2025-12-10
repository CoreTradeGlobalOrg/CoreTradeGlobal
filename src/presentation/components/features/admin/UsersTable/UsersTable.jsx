/**
 * Users Table Component
 *
 * Displays all registered users in a table format with:
 * - User info (name, email, company)
 * - Email verification status
 * - Admin approval status
 * - Country with flag
 * - Registration date
 * - Admin actions (approve, suspend, delete, edit)
 * - Search and filter functionality
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { COUNTRIES } from '@/core/constants/countries';
import { useApproveUser } from '@/presentation/hooks/admin/useApproveUser';
import { useSuspendUser } from '@/presentation/hooks/admin/useSuspendUser';
import { useDeleteUser } from '@/presentation/hooks/admin/useDeleteUser';

export function UsersTable({ users = [], onRefresh }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerified, setFilterVerified] = useState('all'); // 'all', 'verified', 'unverified'
  const [filterApproved, setFilterApproved] = useState('all'); // 'all', 'approved', 'pending'
  const [actionLoading, setActionLoading] = useState(null); // Track which user action is loading

  const { approveUser } = useApproveUser();
  const { suspendUser } = useSuspendUser();
  const { deleteUser } = useDeleteUser();

  // Get country label with flag
  const getCountryLabel = (countryCode) => {
    const country = COUNTRIES.find((c) => c.value === countryCode);
    return country ? country.label : countryCode;
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

  // Filter users based on search, verification and approval status
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

    return matchesSearch && matchesVerification && matchesApproval;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-slate-100">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">
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
                className="w-full sm:w-64 px-4 py-2 pl-10 border-2 border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
            </div>

            {/* Verification Filter */}
            <select
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="verified">Email Verified</option>
              <option value="unverified">Email Unverified</option>
            </select>

            {/* Approval Filter */}
            <select
              value={filterApproved}
              onChange={(e) => setFilterApproved(e.target.value)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Approval</option>
              <option value="approved">Admin Approved</option>
              <option value="pending">Pending Approval</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Email Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Admin Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Registered
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                  {searchTerm || filterVerified !== 'all' || filterApproved !== 'all'
                    ? 'No users found matching your filters'
                    : 'No users registered yet'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.isSuspended ? 'bg-red-50' : ''}`}>
                  {/* User Info */}
                  <td className="px-6 py-4">
                    <div
                      onClick={() => router.push(`/profile/${user.id}`)}
                      className="cursor-pointer hover:bg-slate-100 p-2 -m-2 rounded transition-colors"
                    >
                      <div className="font-semibold text-blue-600 hover:text-blue-700">
                        {user.displayName || `${user.firstName} ${user.lastName}` || 'N/A'}
                      </div>
                      <div className="text-sm text-slate-600">{user.email}</div>
                      {user.position && (
                        <div className="text-xs text-slate-500 mt-1">{user.position}</div>
                      )}
                    </div>
                  </td>

                  {/* Company */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">
                      {user.companyName || 'N/A'}
                    </div>
                    {user.companyCategory && (
                      <div className="text-sm text-slate-600">{user.companyCategory}</div>
                    )}
                  </td>

                  {/* Country */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">
                      {user.country ? getCountryLabel(user.country) : 'N/A'}
                    </div>
                  </td>

                  {/* Email Verification Status */}
                  <td className="px-6 py-4">
                    {user.emailVerified ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        ✅ Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        ⏳ Pending
                      </span>
                    )}
                  </td>

                  {/* Admin Approval Status */}
                  <td className="px-6 py-4">
                    {user.isSuspended ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        🚫 Suspended
                      </span>
                    ) : user.adminApproved ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        ✅ Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                        ⏳ Pending
                      </span>
                    )}
                  </td>

                  {/* Registration Date */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{formatDate(user.createdAt)}</div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {/* Approve Button */}
                      {!user.adminApproved && !user.isSuspended && (
                        <button
                          onClick={() => handleApprove(user.id, user.displayName || user.email)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold transition-colors disabled:opacity-50"
                          title="Approve user"
                        >
                          Approve
                        </button>
                      )}

                      {/* Suspend/Unsuspend Button */}
                      <button
                        onClick={() => handleSuspend(user.id, user.displayName || user.email, user.isSuspended)}
                        disabled={actionLoading === user.id}
                        className={`px-3 py-1 ${user.isSuspended ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white text-xs rounded font-semibold transition-colors disabled:opacity-50`}
                        title={user.isSuspended ? 'Unsuspend user' : 'Suspend user'}
                      >
                        {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(user.id, user.displayName || user.email)}
                        disabled={actionLoading === user.id}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-semibold transition-colors disabled:opacity-50"
                        title="Delete user"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {filteredUsers.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>
      )}
    </div>
  );
}

export default UsersTable;
