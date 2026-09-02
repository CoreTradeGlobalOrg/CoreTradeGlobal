/**
 * AdminMessageButton
 *
 * Profile-page CTA that opens a direct conversation between the
 * viewing admin and the profile owner. Reuses the existing
 * CreateConversationUseCase — the use case dedupes so a second click
 * on a member the admin has already messaged reopens the same thread
 * instead of forking a new one.
 *
 * Guarded upstream: the parent only renders this component when the
 * viewer is an admin AND it's not their own profile. The button
 * assumes those checks already ran and does not repeat them.
 */

'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, MessageSquare } from 'lucide-react';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { CreateConversationUseCase } from '@/domain/usecases/messaging/CreateConversationUseCase';

export function AdminMessageButton({ targetUserId }) {
  const { user } = useAuth();
  const { openConversation } = useMessages();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!user?.uid || !targetUserId || busy) return;
    setBusy(true);
    try {
      const conversationRepo = container.getConversationRepository();

      // Reuse a pending direct conversation (product/RFQ context is
      // deliberately null — admin outreach is generic, not tied to a
      // listing).
      const existing = await conversationRepo.findDirectConversation(
        user.uid,
        targetUserId,
        { productId: null, requestId: null },
      );

      if (existing?.id) {
        openConversation(existing.id);
        return;
      }

      const useCase = new CreateConversationUseCase(
        conversationRepo,
        container.getMessageRepository(),
        container.getNotificationRepository(),
        container.getUserRepository(),
      );
      const conversation = await useCase.execute({
        type: 'direct',
        participantIds: [user.uid, targetUserId],
        creatorId: user.uid,
      });
      if (conversation?.id) {
        openConversation(conversation.id);
      } else {
        toast.error('Could not open the conversation.');
      }
    } catch (err) {
      console.error('[AdminMessageButton] failed:', err);
      toast.error(err?.message || 'Could not start the conversation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-[#FFD700]/10 hover:bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {busy ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Opening…
        </>
      ) : (
        <>
          <MessageSquare className="w-3.5 h-3.5" />
          Message member
        </>
      )}
    </button>
  );
}

export default AdminMessageButton;
