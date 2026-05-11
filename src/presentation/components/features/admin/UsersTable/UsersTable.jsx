/**
 * UsersTable - Admin user management panel.
 * Orchestrates: UsersTab (user list + filters), InvitesTab (invite list).
 */

import { useState, useCallback } from 'react';
import { UserPlus } from 'lucide-react';
import { useGetInvites } from '@/presentation/hooks/admin/useGetInvites';
import { useResendInvite } from '@/presentation/hooks/admin/useResendInvite';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';
import { InviteModal } from '@/presentation/components/features/admin/InviteModal/InviteModal';
import { UsersTab } from './UsersTab';
import { InvitesTab } from './InvitesTab';
import { useUserActions } from './useUserActions';

export function UsersTable({ users = [], onRefresh }) {
  const [activeTab, setActiveTab] = useState('users');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const { invites, loading: invitesLoading } = useGetInvites();
  const { resendInvite, loading: resendLoading } = useResendInvite();

  const {
    actionLoading, banReasonInput, setBanReasonInput, confirmDialog,
    openDialog, closeDialog, handleConfirmAction, handleDirectAction, getDialogConfig,
  } = useUserActions({ onRefresh });

  const wrappedDirectAction = useCallback((action, user) => {
    handleDirectAction(action, user);
  }, [handleDirectAction]);

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[#FFD700]/20 backdrop-blur-md shadow-2xl">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-bold text-white">User Management</h2>
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-sm rounded-lg shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#0F1B2B]/50 rounded-lg p-1 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'users' ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'text-gray-400 hover:text-white'}`}
            >
              Users ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invites')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'invites' ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'text-gray-400 hover:text-white'}`}
            >
              Invites ({invites.length})
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <UsersTab users={users} onAction={wrappedDirectAction} onOpenDialog={openDialog} actionLoading={actionLoading} />
      )}

      {activeTab === 'invites' && (
        <InvitesTab invites={invites} invitesLoading={invitesLoading} resendInvite={resendInvite} resendLoading={resendLoading} />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen} onClose={closeDialog} onConfirm={handleConfirmAction}
        loading={actionLoading === confirmDialog.user?.id}
        {...getDialogConfig()}
      >
        {confirmDialog.type === 'ban' && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Ban Reason:</label>
            <input
              type="text" value={banReasonInput} onChange={(e) => setBanReasonInput(e.target.value)}
              className="w-full px-4 py-2 bg-[#0F1B2B] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-red-500 focus:outline-none"
              placeholder="Enter reason for ban..."
            />
          </div>
        )}
      </ConfirmDialog>

      {/* Invite Modal */}
      <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onSuccess={onRefresh} />
    </div>
  );
}

export default UsersTable;
