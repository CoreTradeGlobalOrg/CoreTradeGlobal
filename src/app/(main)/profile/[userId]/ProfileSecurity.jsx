'use client';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';

/**
 * ProfileSecurity - Account settings: password change and account deletion (own profile only).
 */
export function ProfileSecurity({
  // Password form state
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  onPasswordChange,
  // Delete account state
  deleteModalOpen,
  deleteConfirmText,
  setDeleteConfirmText,
  deleteLoading,
  onOpenDeleteModal,
  onCloseDeleteModal,
  onDeleteAccount,
}) {
  return (
    <>
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-5 bg-red-500 rounded-full"></span>
          <h3 className="text-lg font-bold text-white">Account Settings</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Password */}
          <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-5">
            <h4 className="text-white font-semibold mb-4">Change Password</h4>
            <form onSubmit={onPasswordChange} className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current Password"
                required
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] focus:outline-none focus:border-[#FFD700]/50"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                required
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] focus:outline-none focus:border-[#FFD700]/50"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                required
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#A0A0A0] focus:outline-none focus:border-[#FFD700]/50"
              />
              <Button type="submit" className="w-full bg-[#FFD700] text-[#0F1B2B] hover:bg-white font-bold border-none text-sm py-2.5">
                Update Password
              </Button>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-[rgba(239,68,68,0.05)] border border-red-900/30 rounded-xl p-5">
            <h4 className="text-red-400 font-semibold mb-3">Danger Zone</h4>
            <p className="text-[#A0A0A0] text-sm mb-4">
              Your account will be scheduled for deletion with a 15-day recovery period.
            </p>
            <Button
              variant="destructive"
              onClick={onOpenDeleteModal}
              className="w-full bg-red-600 hover:bg-red-700 text-white border-none text-sm py-2.5"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={onCloseDeleteModal}
        onConfirm={onDeleteAccount}
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
