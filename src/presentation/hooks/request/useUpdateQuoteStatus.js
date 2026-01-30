/**
 * useUpdateQuoteStatus Hook
 *
 * Handles accepting and rejecting quotes for RFQs.
 * Updates the quote status and sends notification to the quote submitter.
 */

import { useState } from 'react';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { Notification } from '@/domain/entities/Notification';
import toast from 'react-hot-toast';

export function useUpdateQuoteStatus() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Update quote status and send notification
   * @param {Object} params
   * @param {string} params.requestId - RFQ ID
   * @param {string} params.quoteId - Quote ID
   * @param {string} params.status - New status
   * @param {string} params.quoteUserId - User ID of quote submitter (for notification)
   * @param {string} params.productName - Product name (for notification)
   * @param {string} params.reason - Rejection reason (optional)
   */
  const updateQuoteStatus = async ({
    requestId,
    quoteId,
    status,
    quoteUserId = null,
    productName = null,
    reason = null
  }) => {
    if (!requestId || !quoteId || !status) {
      throw new Error('Request ID, Quote ID, and status are required');
    }

    if (!['accepted', 'rejected', 'pending'].includes(status)) {
      throw new Error('Invalid status. Must be: accepted, rejected, or pending');
    }

    setLoading(true);
    setError(null);

    try {
      const firestoreDS = container.getFirestoreDataSource();
      const notificationRepository = container.getNotificationRepository();

      const updateData = {
        status,
        statusUpdatedAt: new Date(),
      };

      // Add rejection reason if provided
      if (reason && status === 'rejected') {
        updateData.rejectionReason = reason;
      }

      // Update quote status in subcollection
      await firestoreDS.updateInSubcollection(
        'requests',
        requestId,
        'quotes',
        quoteId,
        updateData
      );

      // Send notification to quote submitter
      if (quoteUserId && productName && (status === 'accepted' || status === 'rejected')) {
        const buyerName = user?.companyName || user?.displayName || 'The buyer';

        let notificationData;
        if (status === 'accepted') {
          notificationData = Notification.createQuoteAcceptedNotification(
            requestId,
            quoteId,
            productName,
            buyerName
          );
        } else {
          notificationData = Notification.createQuoteRejectedNotification(
            requestId,
            quoteId,
            productName,
            buyerName,
            reason
          );
        }

        await notificationRepository.create(quoteUserId, notificationData);
      }

      const statusMessages = {
        accepted: 'Quote accepted successfully!',
        rejected: 'Quote rejected.',
        pending: 'Quote status reset to pending.',
      };

      toast.success(statusMessages[status]);
      return { success: true };
    } catch (err) {
      console.error('Error updating quote status:', err);
      setError(err.message);
      toast.error('Failed to update quote status. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Accept a quote
   * @param {string} requestId - RFQ ID
   * @param {string} quoteId - Quote ID
   * @param {string} quoteUserId - User ID of quote submitter
   * @param {string} productName - Product name for notification
   */
  const acceptQuote = async (requestId, quoteId, quoteUserId = null, productName = null) => {
    return updateQuoteStatus({
      requestId,
      quoteId,
      status: 'accepted',
      quoteUserId,
      productName,
    });
  };

  /**
   * Reject a quote
   * @param {string} requestId - RFQ ID
   * @param {string} quoteId - Quote ID
   * @param {string} quoteUserId - User ID of quote submitter
   * @param {string} productName - Product name for notification
   * @param {string} reason - Rejection reason (optional)
   */
  const rejectQuote = async (requestId, quoteId, quoteUserId = null, productName = null, reason = null) => {
    return updateQuoteStatus({
      requestId,
      quoteId,
      status: 'rejected',
      quoteUserId,
      productName,
      reason,
    });
  };

  return {
    updateQuoteStatus,
    acceptQuote,
    rejectQuote,
    loading,
    error,
  };
}

export default useUpdateQuoteStatus;
