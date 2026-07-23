/**
 * useNotificationSound
 *
 * Small client-only hook that owns the "play a chime when a new
 * in-app notification arrives" preference. Stored in localStorage
 * (per-device) — a user might want the ping on their phone but not
 * on their office desktop, so device-level state fits better than
 * a cross-device Firestore field.
 *
 * Default: enabled.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ctg.notificationSoundEnabled';

function readStoredValue() {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true; // default: enabled
    return raw === '1';
  } catch {
    return true;
  }
}

export function useNotificationSound() {
  // Start with the default so SSR and first paint match; hydrate from
  // localStorage after mount.
  const [enabled, setEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnabled(readStoredValue());
    setHydrated(true);
  }, []);

  const setSoundEnabled = useCallback((next) => {
    setEnabled(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // localStorage disabled / full — silently degrade
      }
    }
  }, []);

  return { enabled, setSoundEnabled, hydrated };
}

/**
 * Bare read for non-hook consumers (e.g. inside a snapshot handler
 * that only needs the current preference on the fly, not a subscription).
 */
export function readNotificationSoundEnabled() {
  return readStoredValue();
}

export default useNotificationSound;
