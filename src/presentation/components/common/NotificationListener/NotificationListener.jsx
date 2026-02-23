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
          console.log('[FCM] Not supported in this browser');
          return;
        }

        // Register service worker if not already registered
        let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (!registration) {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('[FCM] Service worker registered');
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
          console.log('[FCM] Token refreshed and saved');
        }

        // Listen for foreground messages (data-only messages)
        unsubscribe = onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground message received:', payload);

          const dataType = payload.data?.type;

          // Determine notification content based on type
          let notificationTitle;
          let notificationBody;
          let clickUrl;
          let tag;

          if (dataType === 'deal_event') {
            // Deal event notifications
            const eventType = payload.data?.eventType || 'update';
            const eventLabels = {
              new_deal: 'New Deal',
              counter_offer: 'Counter-Offer Received',
              accepted: 'Deal Accepted',
              rejected: 'Deal Rejected',
              withdrawn: 'Deal Withdrawn',
              expired: 'Deal Expired',
              renewed: 'Offer Renewed',
            };
            notificationTitle = eventLabels[eventType] || 'Deal Update';
            notificationBody = `You have a deal ${eventType.replace('_', ' ')} notification`;
            clickUrl = payload.data?.click_action || `/deals/${payload.data?.dealId}`;
            tag = `deal-${payload.data?.dealId || 'unknown'}`;
          } else {
            // Default: message notifications (existing behavior)
            notificationTitle = payload.data?.senderName || 'New Message';
            notificationBody = payload.data?.messageContent || 'You have a new message';
            clickUrl = payload.data?.conversationId
              ? `/messages/${payload.data.conversationId}`
              : '/messages';
            tag = payload.data?.conversationId || 'message';
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
              if (dataType === 'deal_event') {
                // Navigate to deal page
                window.location.href = clickUrl;
              } else {
                // Open FAB with the conversation (existing behavior)
                const conversationId = payload.data?.conversationId;
                if (conversationId && openConversationRef.current) {
                  openConversationRef.current(conversationId);
                }
              }
              notification.close();
            };

            console.log('[FCM] Notification shown via native API');
          } catch (err) {
            console.error('[FCM] Native notification failed:', err);

            // Fallback to service worker
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(notificationTitle, {
                body: notificationBody,
                icon: '/icons/icon-192x192.png',
                tag,
                data: { ...payload.data, clickUrl },
              });
              console.log('[FCM] Notification shown via service worker');
            });
          }
        });

        setIsSetup(true);
        console.log('[FCM] Listener setup complete');
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
