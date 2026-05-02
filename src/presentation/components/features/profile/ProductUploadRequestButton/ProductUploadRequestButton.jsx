/**
 * ProductUploadRequestButton
 *
 * Allows a user to request admin-assisted product upload from their own profile page.
 * Creates a Firestore document in productUploadRequests and notifies all admin users.
 * Only rendered when viewing one's own profile.
 */

'use client';

import { useState, useEffect } from 'react';
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

/**
 * @param {{ user: import('firebase/auth').User & { companyName?: string } }} props
 */
export function ProductUploadRequestButton({ user }) {
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState(false);

  // Check for existing pending request on mount
  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    (async () => {
      try {
        const q = query(
          collection(db, 'productUploadRequests'),
          where('uid', '==', user.uid),
          where('status', '==', 'pending'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!cancelled && !snap.empty) {
          setExistingRequest(true);
        }
      } catch {
        // Non-critical — degrade gracefully; button remains enabled
      }
    })();

    return () => { cancelled = true; };
  }, [user?.uid]);

  const handleRequest = async () => {
    if (loading || requested || existingRequest) return;

    setLoading(true);
    try {
      // 1. Create the request document
      await addDoc(collection(db, 'productUploadRequests'), {
        uid: user.uid,
        companyName: user.companyName || '',
        displayName: user.displayName || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 2. Notify all admin users
      const adminsSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'admin'), limit(50))
      );

      const notificationBase = {
        type: 'product_upload_request',
        title: 'Product Upload Request',
        body: `${user.displayName || 'A user'} (${user.companyName || ''}) has requested product upload assistance.`,
        link: '/admin',
        isRead: false,
        createdAt: serverTimestamp(),
      };

      // Fire-and-forget — notification failure must not block UX feedback
      await Promise.allSettled(
        adminsSnap.docs.map((adminDoc) =>
          addDoc(
            collection(db, 'users', adminDoc.id, 'notifications'),
            notificationBase
          )
        )
      );

      setRequested(true);
    } catch (err) {
      console.error('[ProductUploadRequestButton] Failed to submit request:', err);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = existingRequest || requested || loading;

  if (existingRequest) {
    return (
      <p className="text-[#A0A0A0] text-sm" aria-live="polite">
        Request already submitted
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={handleRequest}
        disabled={isDisabled}
        aria-busy={loading}
        aria-label="Request admin-assisted product upload"
        className={`border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10 rounded-xl px-5 py-2.5 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700] ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? 'Submitting…' : 'Request Product Upload'}
      </button>
      {requested && (
        <p className="text-green-400 text-sm mt-2" aria-live="polite">
          Our team will upload your products for you.
        </p>
      )}
    </div>
  );
}

export default ProductUploadRequestButton;
