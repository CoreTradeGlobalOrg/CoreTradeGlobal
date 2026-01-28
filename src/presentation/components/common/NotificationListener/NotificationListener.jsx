/**
 * NotificationListener Component
 *
 * Invisible component that listens for FCM messages
 * Must be mounted at all times to receive notifications
 */

'use client';

import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import app from '@/core/config/firebase.config';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function NotificationListener() {
  const { user, isAuthenticated } = useAuth();
  const [isSetup, setIsSetup] = useState(false);

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

        // Listen for foreground messages
        unsubscribe = onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground message received:', payload);

          const { title, body } = payload.notification || {};
          const notificationTitle = title || 'New Message';
          const notificationBody = body || 'You have a new message';

          // Try native Notification API first (works better in Chrome)
          try {
            const notification = new Notification(notificationTitle, {
              body: notificationBody,
              icon: '/icons/icon-192x192.png',
              tag: payload.data?.conversationId || 'message',
              data: payload.data,
            });

            notification.onclick = () => {
              window.focus();
              const conversationId = payload.data?.conversationId;
              if (conversationId) {
                window.location.href = `/messages/${conversationId}`;
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
                tag: payload.data?.conversationId || 'message',
                data: payload.data,
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
