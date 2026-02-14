/**
 * Firebase Messaging Service Worker
 *
 * Handles push notifications when the app is in the background
 */

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase config - same as in your app
const firebaseConfig = {
  apiKey: "AIzaSyCcaUZDmLXsHFthz3Se1a4EbULPVwjsdJA",
  authDomain: "core-trade-global.firebaseapp.com",
  projectId: "core-trade-global",
  storageBucket: "core-trade-global.firebasestorage.app",
  messagingSenderId: "697939085347",
  appId: "1:697939085347:web:02f2f463a23d4e7f60c996",
  measurementId: "G-MV8N1HJ29Q"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages (data-only messages)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Use data fields since we're using data-only messages
  const notificationTitle = payload.data?.senderName || 'New Message';
  const notificationOptions = {
    body: payload.data?.messageContent || 'You have a new message',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: payload.data?.conversationId || 'message',
    data: payload.data,
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Build full URL to open
  const conversationId = event.notification.data?.conversationId;
  const path = conversationId ? `/messages/${conversationId}` : '/messages';
  const urlToOpen = new URL(path, self.location.origin).href;

  console.log('[firebase-messaging-sw.js] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already an open window on our origin
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          // Navigate existing window to the conversation
          return client.focus().then(() => {
            return client.navigate(urlToOpen);
          });
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
