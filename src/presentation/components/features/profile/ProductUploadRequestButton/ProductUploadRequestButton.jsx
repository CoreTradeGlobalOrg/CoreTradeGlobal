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
import Link from 'next/link';
import { Upload, MessageSquare, CheckCircle, Loader2, FileUp, Download, Sparkles, ArrowUpRight } from 'lucide-react';
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

  const createConversationWithAdmin = useCallback(async (requestType, csvUrl, csvAttachment = null) => {
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
      ? "Hi! I've uploaded my product list for review. The CSV file is attached below — please process it when you get a chance. Thank you!"
      : 'I would like help uploading my products. Please assist me with the product upload process.';

    // Include all admins as participants (like contact form pattern)
    const participantIds = [...adminIds, user.uid];

    const conversation = await useCase.execute({
      type: 'product_upload',
      participantIds,
      creatorId: user.uid,
      initialMessage,
      attachments: csvAttachment ? [csvAttachment] : [],
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

  const handleDownloadTemplate = useCallback(() => {
    const headers = ['Product Name', 'Category', 'Price', 'Currency', 'Quantity', 'Unit', 'Description', 'Image URLs'];
    const toRow = (cells) => cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
    const csv = `${toRow(headers)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coretradeglobal-product-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleCsvUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    // We intentionally do NOT block on `existingRequest` here — after
    // sending a help request the user should still be able to attach a
    // CSV as a follow-up (a new productUploadRequests doc + fresh
    // conversation keep the admin's queue tidy per file).
    if (!file || loading) return;

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

      // 3. Create conversation with admin — attach the CSV as a clean file card
      const csvAttachment = {
        url: csvUrl,
        name: file.name,
        type: file.type || 'text/csv',
        size: file.size,
      };
      const conversation = await createConversationWithAdmin('csv_upload', csvUrl, csvAttachment);

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

  // After a help request is sent (or if a pending one exists from an
  // earlier session) the template download + CSV upload affordances
  // stay visible — users often want to grab the template or attach a
  // file *after* asking for help. Only the "Request Help" button
  // itself is disabled so admins don't get spammed with duplicates.
  const hasPendingRequest = existingRequest || submitted;

  return (
    <div className="rounded-xl border border-[rgba(255,215,0,0.2)] bg-[#0F1B2B] p-4 md:p-5">
      <h4 className="text-white font-semibold text-sm mb-1">Need help uploading products?</h4>
      <p className="text-[#A0A0A0] text-xs mb-3">
        Download the template, fill in your products, then upload the CSV — or request assistance from our team.
      </p>

      {/* Self-serve bulk upload CTA — landing → guide → action page.
          The two paths coexist: users who want to DIY get a real tool
          with live validation; users who want a human keep the Request
          Help path unchanged. */}
      <Link
        href="/bulk-upload"
        className="flex items-center gap-2 mb-4 rounded-lg border border-[rgba(255,215,0,0.35)] bg-gradient-to-r from-[rgba(255,215,0,0.12)] to-[rgba(253,185,49,0.04)] px-3 py-2 hover:from-[rgba(255,215,0,0.18)] hover:to-[rgba(253,185,49,0.06)] transition-colors no-underline group"
        style={{ color: '#FFD700' }}
      >
        <Sparkles className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[#FFD700] text-xs font-bold uppercase tracking-wider">Do it yourself</p>
          <p className="text-white text-xs">Bulk-import your catalog in minutes — CSV in, live validation, publish.</p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-[#FFD700] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </Link>

      {hasPendingRequest && (
        <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 mb-3 text-green-300 text-xs">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {submitted
              ? 'Request submitted! Our team will assist you shortly — you can still download the template or attach a CSV below.'
              : "You already have a pending request. Our team is on it — attach a CSV below if you'd like to add more."}
          </span>
        </div>
      )}

      {/* Download template */}
      <button
        type="button"
        onClick={handleDownloadTemplate}
        className="inline-flex items-center gap-2 mb-4 text-[#FFD700] text-xs font-medium hover:underline"
      >
        <Download className="w-4 h-4" />
        Download CSV Template
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upload CSV Option — stays enabled even after a help request */}
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

        {/* Request Help Option — disabled once a request exists so the
            admin inbox doesn't get duplicate help pings. */}
        <button
          type="button"
          onClick={handleHelpRequest}
          disabled={loading || hasPendingRequest}
          className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.05)] hover:bg-[rgba(255,215,0,0.1)] hover:border-[rgba(255,215,0,0.3)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
          ) : hasPendingRequest ? (
            <CheckCircle className="w-6 h-6 text-green-400" />
          ) : (
            <MessageSquare className="w-6 h-6 text-[#FFD700]" />
          )}
          <span className="text-[#FFD700] text-sm font-medium">
            {hasPendingRequest ? 'Help Requested' : 'Request Help'}
          </span>
          <span className="text-[#A0A0A0] text-xs text-center">
            {hasPendingRequest
              ? 'Our team has been notified'
              : 'Our team will help upload your products'}
          </span>
        </button>
      </div>
    </div>
  );
}

export default ProductUploadRequestButton;
