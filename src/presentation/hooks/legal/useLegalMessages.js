/**
 * useLegalMessages Hook
 *
 * Real-time subscription to messages for a legal engagement.
 * Also provides sendMessage and uploadAndSendAttachment actions.
 *
 * Usage:
 * const { messages, sendMessage, uploadAndSendAttachment, loading, error, sending } =
 *   useLegalMessages(engagementId, currentUser);
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { container } from '@/core/di/container';
import { LEGAL_MESSAGE_TYPE, ALLOWED_LEGAL_FILE_TYPES } from '@/core/constants/legalConstants';
import toast from 'react-hot-toast';

/**
 * Subscribe to messages for a legal engagement and provide send actions.
 *
 * @param {string|null} engagementId - Firestore engagement document ID
 * @param {Object|null} currentUser - Firebase auth user object { uid, displayName }
 * @returns {{
 *   messages: import('@/domain/entities/LegalMessage').LegalMessage[],
 *   sendMessage: (content: string, type: string, quickAction?: Object, attachments?: Array) => Promise<void>,
 *   uploadAndSendAttachment: (file: File) => Promise<void>,
 *   loading: boolean,
 *   error: string|null,
 *   sending: boolean
 * }}
 */
export function useLegalMessages(engagementId, currentUser) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  // Subscribe to messages in real-time
  useEffect(() => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const messageRepo = container.getLegalMessageRepository();

    const unsub = messageRepo.subscribeToMessages(engagementId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsub();
  }, [engagementId]);

  /**
   * Send a text or quick-action message to the channel.
   *
   * @param {string} content - Message text
   * @param {string} type - LEGAL_MESSAGE_TYPE value
   * @param {Object|null} [quickAction] - Quick action data { action, label } or null
   * @param {Array|null} [attachments] - Attachment objects array or null
   */
  const sendMessage = useCallback(
    async (content, type = LEGAL_MESSAGE_TYPE.TEXT, quickAction = null, attachments = null) => {
      if (!engagementId || !currentUser?.uid) return;

      setSending(true);
      try {
        const messageRepo = container.getLegalMessageRepository();
        await messageRepo.sendMessage(engagementId, {
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'Unknown',
          content: content || '',
          type,
          quickAction,
          attachments,
        });
      } catch (err) {
        console.error('useLegalMessages.sendMessage error:', err);
        toast.error('Failed to send message');
        setError(err?.message || 'Failed to send message');
      } finally {
        setSending(false);
      }
    },
    [engagementId, currentUser]
  );

  /**
   * Upload a file and send it as an attachment message.
   * Validates file type against ALLOWED_LEGAL_FILE_TYPES before uploading.
   *
   * @param {File} file - File object to upload and send
   */
  const uploadAndSendAttachment = useCallback(
    async (file) => {
      if (!engagementId || !currentUser?.uid || !file) return;

      // Validate file type
      if (!ALLOWED_LEGAL_FILE_TYPES.includes(file.type)) {
        toast.error('File type not allowed. Please use PDF, DOCX, XLSX, JPG, or PNG.');
        return;
      }

      setSending(true);
      try {
        const messageRepo = container.getLegalMessageRepository();

        // Upload file to Storage
        const uploadResult = await messageRepo.uploadAttachment(engagementId, file);

        // Send attachment message
        await messageRepo.sendMessage(engagementId, {
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'Unknown',
          content: `Attached: ${file.name}`,
          type: LEGAL_MESSAGE_TYPE.ATTACHMENT,
          quickAction: null,
          attachments: [uploadResult],
        });
      } catch (err) {
        console.error('useLegalMessages.uploadAndSendAttachment error:', err);
        toast.error('Failed to upload attachment');
        setError(err?.message || 'Failed to upload attachment');
      } finally {
        setSending(false);
      }
    },
    [engagementId, currentUser]
  );

  return {
    messages,
    sendMessage,
    uploadAndSendAttachment,
    loading,
    error,
    sending,
  };
}

export default useLegalMessages;
