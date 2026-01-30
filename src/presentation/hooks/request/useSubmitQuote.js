/**
 * useSubmitQuote Hook
 *
 * Handles quote submission to Firebase Firestore.
 * Quotes are stored as a subcollection under the request document.
 * Sends notification to RFQ owner when quote is submitted.
 */

import { useState } from 'react';
import { container } from '@/core/di/container';
import { Notification } from '@/domain/entities/Notification';
import toast from 'react-hot-toast';

export function useSubmitQuote() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitQuote = async ({ requestId, quoteData, attachments, userId, userInfo }) => {
    if (!requestId || !userId) {
      throw new Error('Request ID and User ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const firestoreDS = container.getFirestoreDataSource();
      const storageDS = container.getFirebaseStorageDataSource();
      const notificationRepository = container.getNotificationRepository();

      // Upload attachments to Firebase Storage
      const attachmentUrls = [];
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          try {
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `quotes/${requestId}/${userId}/${timestamp}_${safeName}`;
            const url = await storageDS.uploadFile(path, file);
            attachmentUrls.push({
              name: file.name,
              url,
              type: file.type,
              size: file.size,
            });
          } catch (uploadError) {
            console.error('Error uploading attachment:', uploadError);
            // Continue with other files even if one fails
          }
        }
      }

      // Prepare quote document
      const quoteDocument = {
        ...quoteData,
        attachments: attachmentUrls,
        userId,
        userInfo: {
          displayName: userInfo.displayName || 'Anonymous',
          companyName: userInfo.companyName || null,
          email: userInfo.email || null,
        },
        status: 'pending', // pending, accepted, rejected, expired
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to Firestore as subcollection: requests/{requestId}/quotes/{quoteId}
      const createdQuote = await firestoreDS.createInSubcollection('requests', requestId, 'quotes', quoteDocument);

      // Fetch request to get owner info and product name
      let requestDoc = null;
      try {
        requestDoc = await firestoreDS.getById('requests', requestId);
        const currentQuoteCount = requestDoc?.quoteCount || 0;
        await firestoreDS.update('requests', requestId, {
          quoteCount: currentQuoteCount + 1,
          lastQuoteAt: new Date(),
        });
      } catch (updateError) {
        // Non-critical, don't fail the whole operation
        console.warn('Could not update quote count:', updateError);
      }

      // Send notification to RFQ owner
      if (requestDoc?.userId && requestDoc.userId !== userId) {
        try {
          const quoterName = userInfo.companyName || userInfo.displayName || 'A supplier';
          const productName = requestDoc.productName || requestDoc.title || 'your RFQ';

          const notificationData = Notification.createQuoteNotification(
            requestId,
            createdQuote.id,
            userId,
            quoterName,
            productName,
            quoteData.unitPrice,
            quoteData.currency || 'USD'
          );

          await notificationRepository.create(requestDoc.userId, notificationData);
        } catch (notificationError) {
          // Non-critical, don't fail the whole operation
          console.warn('Could not send notification to RFQ owner:', notificationError);
        }
      }

      toast.success('Your quote has been submitted successfully!');
      return { success: true };
    } catch (err) {
      console.error('Error submitting quote:', err);
      setError(err.message);
      toast.error('Failed to submit quote. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitQuote,
    loading,
    error,
  };
}

export default useSubmitQuote;
