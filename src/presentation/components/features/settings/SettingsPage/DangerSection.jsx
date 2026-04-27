/**
 * DangerSection
 *
 * Provides logout and account deletion (15-day soft delete with DELETE confirmation).
 * Migrated from profile page Account Settings section.
 */

'use client';

import { useState } from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLogout } from '@/presentation/hooks/auth/useLogout';
import { useDeleteAccount } from '@/presentation/hooks/auth/useDeleteAccount';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';

export function DangerSection() {
  const { user } = useAuth();
  const { logout } = useLogout();
  const { deleteAccount, loading: deleteLoading } = useDeleteAccount();
  const router = useRouter();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
      // useLogout already redirects to /login
    } catch {
      toast.error('Failed to log out');
    }
  };

  const handleOpenDeleteModal = () => {
    setDeleteModalOpen(true);
    setDeleteConfirmText('');
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteConfirmText('');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    try {
      await deleteAccount(user?.uid);
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      await logout();
      toast.success(
        'Your account has been scheduled for deletion. You can recover it within 15 days by logging in again.'
      );
      router.push('/');
    } catch (err) {
      console.error('Failed to delete account:', err);
      toast.error(err.message || 'Failed to delete account');
    }
  };

  return (
    <>
      <div className="glass-card p-6 border border-red-900/30">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-5 bg-red-500 rounded-full flex-shrink-0" />
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
        </div>

        <div className="space-y-6">
          {/* Logout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Log Out</p>
              <p className="text-xs text-[#A0A0A0] mt-0.5">
                Log out of your account on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>

          {/* Delete account */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-red-900/20">
            <div>
              <p className="text-sm font-medium text-white">Delete Account</p>
              <p className="text-xs text-[#A0A0A0] mt-0.5">
                If you decide to delete your account will be scheduled for deletion with a 15-day recovery period.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenDeleteModal}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-medium flex-shrink-0"
            >
              Permanently Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteAccount}
        title="Delete Your Account?"
        message="Your account will be scheduled for deletion. You have 15 days to recover it by logging in again. After 15 days, all your data will be permanently deleted."
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="danger"
        loading={deleteLoading}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Type <span className="font-bold text-white">DELETE</span> to confirm:
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
          />
        </div>
      </ConfirmDialog>
    </>
  );
}

export default DangerSection;
