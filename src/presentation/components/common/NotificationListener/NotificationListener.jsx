/**
 * NotificationListener Component
 *
 * Invisible component that listens for FCM messages
 * Must be mounted at all times to receive notifications
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { container } from '@/core/di/container';
import app from '@/core/config/firebase.config';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function NotificationListener() {
  const { user, isAuthenticated } = useAuth();
  const { openConversation } = useMessages();
  const [isSetup, setIsSetup] = useState(false);
  const openConversationRef = useRef(openConversation);

  // Keep ref updated
  useEffect(() => {
    openConversationRef.current = openConversation;
  }, [openConversation]);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !user?.uid) return;
    // Check if Notification API exists and permission is granted
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    let unsubscribe = () => {};

    const setupFCM = async () => {
      try {
        // Check if FCM is supported
        const supported = await isSupported();
        if (!supported) {
          return;
        }

        // Register service worker if not already registered
        let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (!registration) {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        }
        // Wait for the service worker to be ready
        if (!registration.active) {
          await navigator.serviceWorker.ready;
          registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        }

        // Get messaging instance
        const messaging = getMessaging(app);

        // Get token and save to Firestore
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          // Save token to Firestore
          const userRepo = container.getUserRepository();
          await userRepo.update(user.uid, {
            fcmToken: token,
            fcmTokenUpdatedAt: new Date(),
          });
        }

        // Listen for foreground messages (data-only messages)
        unsubscribe = onMessage(messaging, (payload) => {

          const dataType = payload.data?.type;

          // Determine notification content based on type
          let notificationTitle;
          let notificationBody;
          let clickUrl;
          let tag;

          if (dataType === 'deal_event') {
            notificationTitle = payload.data?.title || 'Deal Update';
            notificationBody = payload.data?.body || 'You have a new deal update';
            clickUrl = payload.data?.click_action || `/deals/${payload.data?.dealId}`;
            tag = `deal-${payload.data?.dealId || 'unknown'}`;
          } else if (dataType === 'new_message') {
            // Direct message notifications
            notificationTitle = payload.data?.senderName || 'New Message';
            notificationBody = payload.data?.messageContent || 'You have a new message';
            clickUrl = payload.data?.conversationId
              ? `/messages/${payload.data.conversationId}`
              : '/messages';
            tag = payload.data?.conversationId || 'message';
          } else {
            // Generic fallback — handles rfq_created, new_user_approval, quote_received,
            // announcement, and any future notification types. Uses title/body fields
            // that all new CF triggers are required to set in their FCM data payload.
            // VAPID_KEY must be set in .env.local and production env for FCM to work.
            notificationTitle = payload.data?.title || 'CoreTradeGlobal';
            notificationBody = payload.data?.body || payload.data?.messageContent || 'You have a new notification';
            clickUrl = payload.data?.click_action || payload.data?.link || '/';
            tag = dataType || 'general';
          }

          // Show notification
          try {
            const notification = new Notification(notificationTitle, {
              body: notificationBody,
              icon: '/icons/icon-192x192.png',
              tag,
              data: { ...payload.data, clickUrl },
            });

            notification.onclick = () => {
              window.focus();
              if (dataType === 'new_message') {
                // Open FAB with the conversation (message-specific behavior)
                const conversationId = payload.data?.conversationId;
                if (conversationId && openConversationRef.current) {
                  openConversationRef.current(conversationId);
                } else {
                  window.location.href = clickUrl;
                }
              } else {
                // Navigate to the target URL for all other notification types
                // (deal_event, rfq_created, new_user_approval, quote_received, etc.)
                window.location.href = clickUrl;
              }
              notification.close();
            };

          } catch (err) {
            console.error('[FCM] Native notification failed:', err);
          }
        });

        setIsSetup(true);
      } catch (err) {
        console.error('[FCM] Setup error:', err);
      }
    };

    setupFCM();

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user?.uid]);

  // This component renders nothing - it just listens
  return null;
}

export default NotificationListener;
