/**
 * useNotificationPreferences Hook
 *
 * Subscribes to the user's notification preferences in Firestore
 * and provides an updater function for individual category/channel toggles.
 *
 * Preferences shape stored in users/{uid}.preferences:
 * {
 *   deals:     { email: boolean, push: boolean },
 *   messages:  { email: boolean, push: boolean },
 *   legal:     { email: boolean, push: boolean },
 *   providers: { email: boolean, push: boolean },
 *   system:    { email: boolean, push: boolean },
 * }
 */

'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import toast from 'react-hot-toast';

const DEFAULT_PREFERENCES = {
  deals: { email: true, push: true },
  messages: { email: true, push: true },
  legal: { email: true, push: true },
  providers: { email: true, push: true },
  system: { email: true, push: true },
};

export function useNotificationPreferences(uid) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const prefs = data.preferences;

          if (prefs) {
            // Merge with defaults to ensure all categories/channels are present
            setPreferences({
              deals: { ...DEFAULT_PREFERENCES.deals, ...prefs.deals },
              messages: { ...DEFAULT_PREFERENCES.messages, ...prefs.messages },
              legal: { ...DEFAULT_PREFERENCES.legal, ...prefs.legal },
              providers: { ...DEFAULT_PREFERENCES.providers, ...prefs.providers },
              system: { ...DEFAULT_PREFERENCES.system, ...prefs.system },
            });
          } else {
            // No preferences set yet — use defaults
            setPreferences(DEFAULT_PREFERENCES);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error('useNotificationPreferences subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  /**
   * Update a single preference toggle in Firestore.
   *
   * @param {string} category - One of: deals, messages, legal, providers, system
   * @param {string} channel  - One of: email, push
   * @param {boolean} value   - New toggle state
   */
  const updatePreference = async (category, channel, value) => {
    if (!uid) return;

    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        [`preferences.${category}.${channel}`]: value,
      });
      toast.success('Preference updated');
    } catch (err) {
      console.error('Failed to update notification preference:', err);
      toast.error('Failed to update preference');
    }
  };

  return { preferences, updatePreference, loading };
}

export default useNotificationPreferences;
