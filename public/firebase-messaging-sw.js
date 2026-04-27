/**
 * Firebase Messaging Service Worker
 *
 * Uses Firebase compat SDK for token management (required by getToken).
 * Uses native push event handler for notification display (avoids compat SDK hang).
 */

importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCcaUZDmLXsHFthz3Se1a4EbULPVwjsdJA",
  authDomain: "core-trade-global.firebaseapp.com",
  projectId: "core-trade-global",
  storageBucket: "core-trade-global.firebasestorage.app",
  messagingSenderId: "697939085347",
  appId: "1:697939085347:web:02f2f463a23d4e7f60c996",
  measurementId: "G-MV8N1HJ29Q"
};

firebase.initializeApp(firebaseConfig);
// Initialize messaging instance — required for getToken() to work from the client
const messaging = firebase.messaging();
// Suppress compat SDK's default notification — we handle push natively below
messaging.onBackgroundMessage(() => {});

// Handle push events natively (more reliable than onBackgroundMessage)
self.addEventListener('push', (event) => {
  // Skip if Firebase SDK already handled it via onBackgroundMessage
  if (event.__handled) return;

  console.log('[firebase-messaging-sw.js] Push received');

  let data = {};
  try {
    const payload = event.data?.json();
    data = payload?.data || payload || {};
  } catch {
    data = { messageContent: event.data?.text() || 'New notification' };
  }

  const dataType = data.type;
  let notificationTitle;
  let notificationBody;
  let tag;
  let clickUrl;

  if (dataType === 'deal_event') {
    notificationTitle = data.title || 'Deal Update';
    notificationBody = data.body || 'You have a new deal update';
    tag = 'deal-' + (data.dealId || 'unknown');
    clickUrl = data.click_action || ('/deals/' + data.dealId);
  } else if (dataType === 'new_message') {
    notificationTitle = data.senderName || 'New Message';
    notificationBody = data.messageContent || 'You have a new message';
    tag = data.conversationId || 'message';
    clickUrl = data.conversationId
      ? ('/messages/' + data.conversationId)
      : '/messages';
  } else {
    notificationTitle = data.title || 'CoreTradeGlobal';
    notificationBody = data.body || data.messageContent || 'You have a new notification';
    tag = 'general';
    clickUrl = '/';
  }

  event.waitUntil(
    // Skip if a client window is focused (foreground onMessage handler will show it)
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const hasFocusedClient = clientList.some((client) => client.visibilityState === 'visible');
      if (hasFocusedClient) return;

      return self.registration.showNotification(notificationTitle, {
      body: notificationBody,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: tag,
      data: { ...data, clickUrl },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Close' },
      ],
    });
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const clickUrl = event.notification.data?.clickUrl;
  const path = clickUrl || '/';
  const urlToOpen = new URL(path, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
