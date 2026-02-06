/**
 * usePushNotifications Hook
 *
 * Manages push notification permissions and FCM token
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import app from '@/core/config/firebase.config';

// Your VAPID key from Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [permission, setPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const [isSupported_, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          setIsSupported(false);
          setLoading(false);
          return;
        }

        // Check if notifications API exists
        if (!('Notification' in window)) {
          setIsSupported(false);
          setLoading(false);
          return;
        }

        // Check if service worker is supported
        if (!('serviceWorker' in navigator)) {
          setIsSupported(false);
          setLoading(false);
          return;
        }

        // Check if FCM is supported
        const supported = await isSupported();
        setIsSupported(supported);

        // Get current permission status
        setPermission(Notification.permission);

        setLoading(false);
      } catch (err) {
        console.error('Error checking push notification support:', err);
        setIsSupported(false);
        setLoading(false);
      }
    };

    checkSupport();
  }, []);

  // Request notification permission and get FCM token
  const requestPermission = useCallback(async () => {
    if (!isSupported_ || !isAuthenticated || !user?.uid) {
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setLoading(false);
        return null;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      // Get FCM token
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        setFcmToken(token);

        // Save token to user's document in Firestore
        await saveTokenToFirestore(user.uid, token);

        return token;
      }

      setLoading(false);
      return null;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, [isSupported_, isAuthenticated, user?.uid]);

  // Save FCM token to Firestore
  const saveTokenToFirestore = async (userId, token) => {
    try {
      const userRepo = container.getUserRepository();
      await userRepo.update(userId, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date(),
        fcmTokenPlatform: getPlatform(),
      });
      console.log('[FCM] Token saved to Firestore');
    } catch (err) {
      console.error('Error saving FCM token to Firestore:', err);
    }
  };

  // Get platform info
  const getPlatform = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (/android/i.test(userAgent)) {
      return 'android';
    }

    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return 'ios';
    }

    return 'web';
  };

  // Note: Foreground message listening is handled by NotificationListener component
  // to avoid duplicate notifications. This hook only handles permission and token management.

  // Remove FCM token when user logs out
  const removeToken = useCallback(async () => {
    if (!fcmToken || !user?.uid) return;

    try {
      const userRepo = container.getUserRepository();
      await userRepo.update(user.uid, {
        fcmToken: null,
        fcmTokenUpdatedAt: null,
        fcmTokenPlatform: null,
      });
      setFcmToken(null);
      console.log('[FCM] Token removed from Firestore');
    } catch (err) {
      console.error('Error removing FCM token:', err);
    }
  }, [fcmToken, user?.uid]);

  return {
    permission,
    fcmToken,
    isSupported: isSupported_,
    loading,
    error,
    requestPermission,
    removeToken,
    isPushEnabled: permission === 'granted' && !!fcmToken,
  };
}

export default usePushNotifications;
