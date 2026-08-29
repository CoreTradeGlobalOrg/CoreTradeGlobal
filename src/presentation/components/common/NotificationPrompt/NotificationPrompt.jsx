/**
 * NotificationPrompt Component
 *
 * Prompts users to enable push notifications
 * Shows as a dismissible banner
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '@/presentation/hooks/usePushNotifications';
import { useAuth } from '@/presentation/contexts/AuthContext';
import './NotificationPrompt.css';

// Trigger rule: show the notification prompt only after the user has
// finished the onboarding tour AND on their first visit to a /profile/
// route. Rationale — signup landing was drowning in stacked CTAs
// (tour overlay + notification banner + profile-completion card).
// Profile is where messaging becomes meaningful, so the ask lands
// with context instead of on cold arrival.
const SHOWN_KEY = 'notification-prompt-shown';
const PROFILE_ROUTE_PREFIX = '/profile/';

export function NotificationPrompt() {
  const { isAuthenticated, user } = useAuth();
  const pathname = usePathname();
  const {
    permission,
    isSupported,
    loading,
    requestPermission,
    isPushEnabled,
  } = usePushNotifications();

  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [alreadyShown, setAlreadyShown] = useState(true); // start true; flipped after client-side check

  // Client-side check of the "already shown once" flag — SSR safe.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAlreadyShown(localStorage.getItem(SHOWN_KEY) === 'true');
  }, []);

  // Check if user has dismissed the prompt before
  // But if permission was reset to 'default', show prompt again
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasDismissed = localStorage.getItem('notification-prompt-dismissed');
      const lastKnownPermission = localStorage.getItem('notification-last-permission');

      // If permission changed back to 'default' (user reset it), clear dismiss state
      if (permission === 'default' && lastKnownPermission && lastKnownPermission !== 'default') {
        localStorage.removeItem('notification-prompt-dismissed');
        localStorage.setItem('notification-last-permission', 'default');
        setDismissed(false);
      } else if (wasDismissed && permission === 'default') {
        setDismissed(true);
      }

      // Store current permission for future comparison
      if (permission) {
        localStorage.setItem('notification-last-permission', permission);
      }
    }
  }, [permission]);

  const onProfileRoute = pathname?.startsWith(PROFILE_ROUTE_PREFIX);
  const tourFinished = user?.onboardingTourCompleted === true;

  // Once the render conditions line up, mark the prompt as shown so
  // subsequent visits don't re-surface it (dismiss is a separate,
  // permission-reset-aware flag preserved from the old behavior).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !isSupported || loading) return;
    if (permission !== 'default') return;
    if (!onProfileRoute || !tourFinished || dismissed || alreadyShown) return;
    localStorage.setItem(SHOWN_KEY, 'true');
  }, [isAuthenticated, isSupported, loading, permission, onProfileRoute, tourFinished, dismissed, alreadyShown]);

  // Don't show if:
  // - Not authenticated / not supported / still loading
  // - Permission already granted or denied
  // - User dismissed a prior prompt
  // - Onboarding tour hasn't finished yet (would stack with tour overlay)
  // - Not on a /profile/ route (this is the deliberate trigger point)
  // - Already surfaced once (persisted across sessions)
  if (
    !isAuthenticated ||
    !isSupported ||
    permission === 'granted' ||
    permission === 'denied' ||
    dismissed ||
    loading ||
    !tourFinished ||
    !onProfileRoute ||
    alreadyShown
  ) {
    return null;
  }

  const handleEnable = async () => {
    setRequesting(true);
    await requestPermission();
    setRequesting(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  return (
    <div className="notification-prompt">
      <div className="notification-prompt-content">
        <div className="notification-prompt-icon">
          <Bell className="w-5 h-5" />
        </div>
        <div className="notification-prompt-text">
          <p className="notification-prompt-title">Enable Push Notifications</p>
          <p className="notification-prompt-description">
            Get notified when you receive new messages
          </p>
        </div>
        <div className="notification-prompt-actions">
          <button
            className="notification-prompt-enable"
            onClick={handleEnable}
            disabled={requesting}
          >
            {requesting ? 'Enabling...' : 'Enable'}
          </button>
          <button
            className="notification-prompt-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationPrompt;
