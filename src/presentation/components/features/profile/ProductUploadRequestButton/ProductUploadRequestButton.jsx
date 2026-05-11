/**
 * ProductUploadRequestButton
 *
 * Allows a user to request admin-assisted product upload from their own profile page.
 * Provides two options:
 * - Upload CSV: Upload a CSV file to Firebase Storage and create a request
 * - Request Help: Create a help request directly with admin
 *
 * Both create a productUploadRequests doc and a conversation with admin.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, MessageSquare, CheckCircle, Loader2, FileUp } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import {
  collection,
  addDoc,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { container } from '@/core/di/container';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { CreateConversationUseCase } from '@/domain/usecases/messaging/CreateConversationUseCase';

/**
 * @param {{ user: import('firebase/auth').User & { companyName?: string } }} props
 */
export function ProductUploadRequestButton({ user }) {
  const [existingRequest, setExistingRequest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const fileInputRef = useRef(null);
  const { openConversation } = useMessages();

  // Check for existing pending request on mount
  useEffect(() => {
    if (!user?.uid) {
      setCheckingExisting(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const q = query(
          collection(db, 'productUploadRequests'),
          where('uid', '==', user.uid),
          where('status', 'in', ['pending', 'in-progress']),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!cancelled && !snap.empty) {
          setExistingRequest(true);
        }
      } catch {
        // Non-critical degrade gracefully
      } finally {
        if (!cancelled) setCheckingExisting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.uid]);

  const findAllAdminIds = useCallback(async () => {
    const adminsSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'), limit(50))
    );
    if (adminsSnap.empty) return [];
    return adminsSnap.docs.map((d) => d.id);
  }, []);

  const notifyAdmins = useCallback(async (requestType) => {
    const adminsSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'), limit(50))
    );

    const typeLabel = requestType === 'csv_upload' ? 'CSV upload' : 'help';
    const notificationBase = {
      type: 'product_upload_request',
      title: 'Product Upload Request',
      body: `${user.displayName || 'A user'} (${user.companyName || ''}) has requested product ${typeLabel} assistance.`,
      link: '/admin?tab=product-requests',
      isRead: false,
      createdAt: serverTimestamp(),
    };

    await Promise.allSettled(
      adminsSnap.docs.map((adminDoc) =>
        addDoc(
          collection(db, 'users', adminDoc.id, 'notifications'),
          notificationBase
        )
      )
    );
  }, [user?.displayName, user?.companyName]);

  const createConversationWithAdmin = useCallback(async (requestType, csvUrl) => {
    const adminIds = await findAllAdminIds();
    if (adminIds.length === 0) return null;

    const conversationRepo = container.getConversationRepository();
    const messageRepo = container.getMessageRepository();
    const notificationRepo = container.getNotificationRepository();
    const userRepo = container.getUserRepository();

    const useCase = new CreateConversationUseCase(
      conversationRepo,
      messageRepo,
      notificationRepo,
      userRepo
    );

    const typeLabel = requestType === 'csv_upload' ? 'CSV Upload' : 'Help Request';
    const initialMessage = requestType === 'csv_upload'
      ? `I have uploaded a CSV file for product upload. Please review and process it.\n\nCSV File: ${csvUrl}`
      : 'I would like help uploading my products. Please assist me with the product upload process.';

    // Include all admins as participants (like contact form pattern)
    const participantIds = [...adminIds, user.uid];

    const conversation = await useCase.execute({
      type: 'product_upload',
      participantIds,
      creatorId: user.uid,
      initialMessage,
      metadata: {
        source: 'product_upload',
        subject: `Product Upload - ${typeLabel}`,
        contactName: user.displayName || user.email || 'Unknown',
        uploadType: requestType,
        csvUrl: csvUrl || null,
      },
    });

    return conversation;
  }, [user?.uid, user?.displayName, user?.email, findAllAdminIds]);

  const handleCsvUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || loading || existingRequest) return;

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      alert('Please select a CSV file.');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload CSV to Firebase Storage
      const storageDataSource = container.getFirebaseStorageDataSource();
      const timestamp = Date.now();
      const storagePath = `users/${user.uid}/product-uploads/${timestamp}_${file.name}`;
      const csvUrl = await storageDataSource.uploadFile(storagePath, file);

      // 2. Create productUploadRequests doc
      await addDoc(collection(db, 'productUploadRequests'), {
        uid: user.uid,
        displayName: user.displayName || '',
        companyName: user.companyName || '',
        status: 'pending',
        type: 'csv_upload',
        csvUrl,
        createdAt: serverTimestamp(),
      });

      // 3. Create conversation with admin
      const conversation = await createConversationWithAdmin('csv_upload', csvUrl);

      // 4. Notify admins
      await notifyAdmins('csv_upload');

      setSubmitted(true);
      setExistingRequest(true);

      // 5. Auto-open conversation in messaging widget
      if (conversation?.id) {
        openConversation(conversation.id);
      }
    } catch (err) {
      console.error('[ProductUploadRequestButton] CSV upload failed:', err);
      alert('Failed to upload CSV. Please try again.');
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [loading, existingRequest, user?.uid, user?.displayName, user?.companyName, createConversationWithAdmin, notifyAdmins, openConversation]);

  const handleHelpRequest = useCallback(async () => {
    if (loading || existingRequest) return;

    setLoading(true);
    try {
      // 1. Create productUploadRequests doc
      await addDoc(collection(db, 'productUploadRequests'), {
        uid: user.uid,
        displayName: user.displayName || '',
        companyName: user.companyName || '',
        status: 'pending',
        type: 'help_request',
        createdAt: serverTimestamp(),
      });

      // 2. Create conversation with admin
      const conversation = await createConversationWithAdmin('help_request', null);

      // 3. Notify admins
      await notifyAdmins('help_request');

      setSubmitted(true);
      setExistingRequest(true);

      // 4. Auto-open conversation in messaging widget
      if (conversation?.id) {
        openConversation(conversation.id);
      }
    } catch (err) {
      console.error('[ProductUploadRequestButton] Help request failed:', err);
      alert('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, existingRequest, user?.uid, user?.displayName, user?.companyName, createConversationWithAdmin, notifyAdmins, openConversation]);

  if (checkingExisting) {
    return (
      <div className="flex items-center gap-2 text-[#A0A0A0] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking request status...</span>
      </div>
    );
  }

  if (existingRequest || submitted) {
    return (
      <div className="rounded-xl border border-[rgba(255,215,0,0.2)] bg-[#0F1B2B] p-4">
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm font-medium">
            {submitted
              ? 'Request submitted! Our team will assist you shortly.'
              : 'You already have a pending request. Our team is working on it.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgba(255,215,0,0.2)] bg-[#0F1B2B] p-4 md:p-5">
      <h4 className="text-white font-semibold text-sm mb-1">Need help uploading products?</h4>
      <p className="text-[#A0A0A0] text-xs mb-4">
        Upload a CSV file or request assistance from our team.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upload CSV Option */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.05)] hover:bg-[rgba(255,215,0,0.1)] hover:border-[rgba(255,215,0,0.3)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
          ) : (
            <FileUp className="w-6 h-6 text-[#FFD700]" />
          )}
          <span className="text-[#FFD700] text-sm font-medium">Upload CSV</span>
          <span className="text-[#A0A0A0] text-xs text-center">
            Upload your product list as a CSV file
          </span>
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvUpload}
          className="hidden"
          aria-label="Select CSV file for product upload"
        />

        {/* Request Help Option */}
        <button
          type="button"
          onClick={handleHelpRequest}
          disabled={loading}
          className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.05)] hover:bg-[rgba(255,215,0,0.1)] hover:border-[rgba(255,215,0,0.3)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
          ) : (
            <MessageSquare className="w-6 h-6 text-[#FFD700]" />
          )}
          <span className="text-[#FFD700] text-sm font-medium">Request Help</span>
          <span className="text-[#A0A0A0] text-xs text-center">
            Our team will help upload your products
          </span>
        </button>
      </div>
    </div>
  );
}

export default ProductUploadRequestButton;
