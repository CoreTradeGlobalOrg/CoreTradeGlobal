/**
 * NotificationPrompt Component
 *
 * Prompts users to enable push notifications
 * Shows as a dismissible banner
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '@/presentation/hooks/usePushNotifications';
import { useAuth } from '@/presentation/contexts/AuthContext';
import './NotificationPrompt.css';

export function NotificationPrompt() {
  const { isAuthenticated } = useAuth();
  const {
    permission,
    isSupported,
    loading,
    requestPermission,
    isPushEnabled,
  } = usePushNotifications();

  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Check if user has dismissed the prompt before
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasDismissed = localStorage.getItem('notification-prompt-dismissed');
      if (wasDismissed) {
        setDismissed(true);
      }
    }
  }, []);

  // Don't show if:
  // - Not authenticated
  // - Not supported
  // - Already granted (permission already given)
  // - Already denied (can't ask again)
  // - Already dismissed
  // - Still loading
  if (
    !isAuthenticated ||
    !isSupported ||
    permission === 'granted' ||
    permission === 'denied' ||
    dismissed ||
    loading
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
