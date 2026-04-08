/**
 * useGetInvites Hook
 *
 * Queries the Firestore `invites` collection in real-time using onSnapshot.
 * Applies client-side expiry check: if status is 'pending' and expiresAt < now,
 * the invite is shown as 'expired' even if Firestore TTL hasn't deleted it yet.
 */

'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';

export function useGetInvites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const invitesQuery = query(
      collection(db, 'invites'),
      orderBy('invitedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      invitesQuery,
      (snapshot) => {
        const now = new Date();

        const inviteList = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Convert Firestore Timestamps to JS Dates for display
          const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : null;
          const invitedAt = data.invitedAt?.toDate ? data.invitedAt.toDate() : null;

          // Client-side expiry check: pending + past expiry = expired
          let displayStatus = data.status;
          if (displayStatus === 'pending' && expiresAt && now > expiresAt) {
            displayStatus = 'expired';
          }

          return {
            id: doc.id,
            email: data.email,
            role: data.role,
            name: data.name,
            company: data.company,
            status: displayStatus,
            rawStatus: data.status,
            invitedAt,
            expiresAt,
            invitedBy: data.invitedBy,
          };
        });

        setInvites(inviteList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching invites:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { invites, loading, error };
}

export default useGetInvites;
