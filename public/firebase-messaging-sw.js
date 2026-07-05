importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyA9lQOAxOohrbJReaZt2TSs5BScvsewQbc",
  authDomain: "performaxis-2026.firebaseapp.com",
  projectId: "performaxis-2026",
  storageBucket: "performaxis-2026.firebasestorage.app",
  messagingSenderId: "456504789678",
  appId: "1:456504789678:web:53b573fcec51334724bb3f"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Background message received but DISABLED - all push handling is done by sw.ts');
  console.log('[firebase-messaging-sw.js] Payload:', payload);

  return;
});

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.', {
    action: event.action,
    data: event.notification.data
  });

  event.notification.close();

  // Se clicou em "dismiss", apenas fecha
  if (event.action === 'dismiss') {
    return;
  }

  // Abrir ou focar na janela do app
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já existe uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(fullUrl);
              }
            });
          }
        }
        // Senão, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});
