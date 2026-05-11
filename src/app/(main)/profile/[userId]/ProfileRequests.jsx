'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RequestList } from '@/presentation/components/features/request/RequestList/RequestList';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';

/**
 * ProfileRequests - Requests section with pagination and create/edit modal.
 */
export function ProfileRequests({
  userId,
  requests,
  requestsLoading,
  categories,
  canEdit,
  isOwnProfile,
  requestPage,
  setRequestPage,
  itemsPerPage,
  requestModalOpen,
  editingRequest,
  // Handlers
  onOpenModal,
  onEditRequest,
  onDeleteRequest,
  onCloseRequest,
  onReopenRequest,
  onSendMessage,
  onRequestSubmit,
  onCloseModal,
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 bg-[#3b82f6] rounded-full"></span>
          <h3 className="text-base font-bold text-white">
            {isOwnProfile ? 'My Requests' : 'Requests'}{' '}
            <span className="text-sm text-[#A0A0A0] font-normal">({requests?.length || 0})</span>
          </h3>
        </div>
        {canEdit && (
          <Button
            onClick={onOpenModal}
            className="bg-[#3b82f6] text-white hover:bg-blue-400 font-bold border-none text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
          >
            + Create Request
          </Button>
        )}
      </div>

      <RequestList
        requests={requests?.slice((requestPage - 1) * itemsPerPage, requestPage * itemsPerPage)}
        categories={categories}
        loading={requestsLoading}
        isOwnProfile={canEdit}
        onEdit={onEditRequest}
        onDelete={onDeleteRequest}
        onClose={onCloseRequest}
        onReopen={onReopenRequest}
        onSendMessage={onSendMessage}
      />

      {/* Pagination */}
      {requests && requests.length > itemsPerPage && (
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)]">
          <button
            onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
            disabled={requestPage === 1}
            aria-label="Previous requests page"
            className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
          >
            ← Previous
          </button>
          <span className="text-sm text-[#A0A0A0]" aria-live="polite" aria-atomic="true">
            Page <span className="text-white font-medium">{requestPage}</span> of{' '}
            <span className="text-white font-medium">{Math.ceil(requests.length / itemsPerPage)}</span>
          </span>
          <button
            onClick={() => setRequestPage((p) => Math.min(Math.ceil(requests.length / itemsPerPage), p + 1))}
            disabled={requestPage >= Math.ceil(requests.length / itemsPerPage)}
            aria-label="Next requests page"
            className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
          >
            Next →
          </button>
        </div>
      )}

      {/* Request Modal - backdrop click disabled to prevent accidental close.
          Use the X button or Cancel button inside RequestForm to dismiss. */}
      <Modal
        isOpen={requestModalOpen}
        onClose={onCloseModal}
        preventBackdropClose
        title={editingRequest ? 'Edit Request' : 'Create New Request'}
        variant="blue"
      >
        <RequestForm
          request={editingRequest}
          categories={categories}
          onSubmit={onRequestSubmit}
          onCancel={onCloseModal}
          userId={userId}
        />
      </Modal>
    </div>
  );
}
