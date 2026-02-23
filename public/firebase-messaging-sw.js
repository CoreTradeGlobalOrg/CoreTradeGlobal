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

  const dataType = payload.data?.type;

  let notificationTitle;
  let notificationBody;
  let tag;
  let clickUrl;

  if (dataType === 'deal_event') {
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
    notificationBody = 'You have a deal ' + (eventType.replace('_', ' ')) + ' notification';
    tag = 'deal-' + (payload.data?.dealId || 'unknown');
    clickUrl = payload.data?.click_action || ('/deals/' + payload.data?.dealId);
  } else {
    notificationTitle = payload.data?.senderName || 'New Message';
    notificationBody = payload.data?.messageContent || 'You have a new message';
    tag = payload.data?.conversationId || 'message';
    clickUrl = payload.data?.conversationId
      ? ('/messages/' + payload.data.conversationId)
      : '/messages';
  }

  const notificationOptions = {
    body: notificationBody,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: tag,
    data: { ...payload.data, clickUrl },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' },
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

  // Use clickUrl from notification data (set in onBackgroundMessage)
  const clickUrl = event.notification.data?.clickUrl;
  const path = clickUrl || '/';
  const urlToOpen = new URL(path, self.location.origin).href;

  console.log('[firebase-messaging-sw.js] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            return client.navigate(urlToOpen);
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
