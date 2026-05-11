'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import { getFunctionsInstance } from '@/core/config/firebase.config';
import { container } from '@/core/di/container';
import { ROLES } from '@/core/constants/roles';
import { useApproveUser } from '@/presentation/hooks/admin/useApproveUser';
import { useSuspendUser } from '@/presentation/hooks/admin/useSuspendUser';
import { useDeleteUser } from '@/presentation/hooks/admin/useDeleteUser';
import { useBanUser } from '@/presentation/hooks/admin/useBanUser';
import { useUnbanUser } from '@/presentation/hooks/admin/useUnbanUser';

/**
 * useUserActions - All user management action handlers for the UsersTable.
 */
export function useUserActions({ onRefresh }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [banReasonInput, setBanReasonInput] = useState('Violation of terms of service');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, user: null });

  const { approveUser } = useApproveUser();
  const { suspendUser } = useSuspendUser();
  const { deleteUser } = useDeleteUser();
  const { banUser } = useBanUser();
  const { unbanUser } = useUnbanUser();

  const openDialog = (type, user) => {
    setConfirmDialog({ isOpen: true, type, user });
    if (type === 'ban') setBanReasonInput('Violation of terms of service');
  };

  const closeDialog = () => setConfirmDialog({ isOpen: false, type: null, user: null });

  const run = async (userId, fn, successMsg, errorMsg) => {
    setActionLoading(userId);
    try { await fn(); toast.success(successMsg); closeDialog(); if (onRefresh) onRefresh(); }
    catch (error) { toast.error(`${errorMsg}: ${error.message}`); }
    finally { setActionLoading(null); }
  };

  const handleToggleFeatured = (userId, currentStatus, userName) =>
    run(userId,
      () => container.getUserRepository().update(userId, { featured: !currentStatus }),
      `${userName} is ${!currentStatus ? 'now featured!' : 'no longer featured.'}`,
      'Failed to update featured status'
    );

  const handleToggleAdmin = (user) => {
    const isAdmin = user.role === 'admin';
    const newRole = isAdmin ? ROLES.MEMBER : ROLES.ADMIN;
    return run(user.id,
      async () => { const fn = httpsCallable(getFunctionsInstance(), 'setUserRole'); await fn({ userId: user.id, role: newRole }); },
      `${user.displayName} is ${isAdmin ? 'no longer an admin' : 'now an admin'}!`,
      'Failed to update admin status'
    );
  };

  const handleApprove = (user) =>
    run(user.id, () => approveUser(user.id), `${user.displayName} has been approved!`, 'Failed to approve user');

  const handleSuspend = (user) => {
    const action = user.isSuspended ? 'unsuspend' : 'suspend';
    return run(user.id, () => suspendUser(user.id, !user.isSuspended), `${user.displayName} has been ${action}ed!`, `Failed to ${action} user`);
  };

  const handleDelete = (user) =>
    run(user.id, () => deleteUser(user.id), `${user.displayName} has been permanently deleted`, 'Failed to delete user');

  const handleBan = (user) =>
    run(user.id, () => banUser(user.id, banReasonInput), `${user.displayName} has been banned`, 'Failed to ban user');

  const handleUnban = (user) =>
    run(user.id, () => unbanUser(user.id), `${user.displayName} has been unbanned`, 'Failed to unban user');

  const handleReset2FA = (user) =>
    run(user.id,
      async () => { const fn = httpsCallable(getFunctionsInstance(), 'resetUser2FA'); await fn({ userId: user.id }); },
      `2FA has been reset for ${user.displayName}`,
      'Failed to reset 2FA'
    );

  const handleConfirmAction = async () => {
    const { type, user } = confirmDialog;
    if (!user) return;
    const map = { delete: handleDelete, ban: handleBan, unban: handleUnban, suspend: handleSuspend, approve: handleApprove, admin: handleToggleAdmin, reset2fa: handleReset2FA };
    await map[type]?.(user);
  };

  const handleDirectAction = (type, user) => {
    if (type === 'feature') handleToggleFeatured(user.id, user.featured, user.displayName);
  };

  const getDialogConfig = () => {
    const { type, user } = confirmDialog;
    if (!user) return {};
    return {
      delete: { title: 'Permanently Delete User', message: `Are you sure you want to permanently delete ${user.displayName}? This action cannot be undone and will remove all their data.`, confirmText: 'Delete Permanently', variant: 'danger' },
      ban: { title: 'Ban User', message: `Are you sure you want to ban ${user.displayName}? They will not be able to log in until unbanned.`, confirmText: 'Ban User', variant: 'ban' },
      unban: { title: 'Unban User', message: `Are you sure you want to unban ${user.displayName}? They will be able to log in again.`, confirmText: 'Unban User', variant: 'success' },
      suspend: { title: user.isSuspended ? 'Unsuspend User' : 'Suspend User', message: user.isSuspended ? `Are you sure you want to unsuspend ${user.displayName}?` : `Are you sure you want to suspend ${user.displayName}?`, confirmText: user.isSuspended ? 'Unsuspend' : 'Suspend', variant: user.isSuspended ? 'success' : 'warning' },
      approve: { title: 'Approve User', message: `Are you sure you want to approve ${user.displayName}?`, confirmText: 'Approve', variant: 'success' },
      admin: { title: user.role === 'admin' ? 'Remove Admin Rights' : 'Grant Admin Rights', message: user.role === 'admin' ? `Are you sure you want to remove admin rights from ${user.displayName}?` : `Are you sure you want to grant admin rights to ${user.displayName}?`, confirmText: user.role === 'admin' ? 'Remove Admin' : 'Make Admin', variant: user.role === 'admin' ? 'warning' : 'success' },
      reset2fa: { title: 'Reset Two-Factor Authentication', message: `Are you sure you want to reset 2FA for ${user.displayName}? They will be able to log in without an authenticator code and can re-enroll from Settings.`, confirmText: 'Reset 2FA', variant: 'warning' },
    }[type] || {};
  };

  return {
    actionLoading, banReasonInput, setBanReasonInput, confirmDialog,
    openDialog, closeDialog, handleConfirmAction, handleDirectAction, getDialogConfig,
  };
}
