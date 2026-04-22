'use client';

/**
 * AnnouncementManager
 *
 * Orchestrator for the admin Announcements tab.
 * Subscribes to the `announcements` Firestore collection for real-time history.
 * Renders AnnouncementForm (top) and AnnouncementHistory (bottom).
 */

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Megaphone } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import AnnouncementForm from './AnnouncementForm';
import AnnouncementHistory from './AnnouncementHistory';

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const historyRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAnnouncements(items);
        setLoading(false);
      },
      (err) => {
        console.error('AnnouncementManager: snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  function handleSent() {
    // Scroll to history after a short delay for the new item to appear
    setTimeout(() => {
      if (historyRef.current) {
        historyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
          <Megaphone className="w-4 h-4 text-[#FFD700]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">System Announcements</h2>
          <p className="text-xs text-[#A0A0A0]">
            Broadcast messages to all or specific-role users via in-app, push, or email channels.
          </p>
        </div>
      </div>

      {/* Announcement Form */}
      <AnnouncementForm onSent={handleSent} />

      {/* Announcement History */}
      <div ref={historyRef}>
        <h3 className="text-sm font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">
          Announcement History ({announcements.length})
        </h3>
        <AnnouncementHistory announcements={announcements} loading={loading} />
      </div>
    </div>
  );
}
