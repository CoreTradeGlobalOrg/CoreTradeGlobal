'use client';

import { useState, useCallback } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';

export function useDeleteMessage() {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const deleteMessage = useCallback(async (conversationId, messageId) => {
    if (!user?.uid) throw new Error('You must be logged in');
    setDeleting(true);
    try {
      const messageRepo = container.getMessageRepository();
      const conversationRepo = container.getConversationRepository();

      await messageRepo.delete(conversationId, messageId);

      // Update lastMessage to the previous message
      const recent = await messageRepo.getRecentMessages(conversationId, 1);
      if (recent.length > 0) {
        const last = recent[0];
        await conversationRepo.updateLastMessage(conversationId, {
          content: last.content || '',
          senderId: last.senderId,
          senderName: last.senderName || '',
          createdAt: last.createdAt,
          type: last.type || 'text',
          hasAttachments: (last.attachments?.length || 0) > 0,
        });
      } else {
        await conversationRepo.updateLastMessage(conversationId, null);
      }
    } finally {
      setDeleting(false);
    }
  }, [user]);

  const deleteConversation = useCallback(async (conversationId) => {
    if (!user?.uid) throw new Error('You must be logged in');
    setDeleting(true);
    try {
      // Soft-delete: add user to deletedBy array using raw Firestore SDK
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        deletedBy: arrayUnion(user.uid),
      });
    } finally {
      setDeleting(false);
    }
  }, [user]);

  return { deleteMessage, deleteConversation, deleting };
}

export default useDeleteMessage;
