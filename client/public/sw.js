// Service Worker for Push Notifications
const CACHE_NAME = 'emergency-alert-v2';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  // Skip waiting to update immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]).catch(() => {
        // Continue even if caching fails
        return Promise.resolve();
      });
    })
  );
});

// Listen for push subscription changes (Android requirement)
self.addEventListener('pushsubscriptionchange', (event) => {
  // Re-subscribe logic would go here if needed
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  
  let notificationData = {
    title: 'Emergency Alert',
    body: 'New emergency alert received',
    icon: '/icon-192x192.svg',
    badge: '/icon-192x192.svg',
    tag: 'emergency-alert',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {}
  };

  // Parse incoming push data
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (error) {
      // Use default notification data if parsing fails
    }
  }

  // Show notification with Android-specific optimizations
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    vibrate: notificationData.vibrate || [200, 100, 200],
    data: notificationData.data,
    // Android-specific enhancements
    silent: false,
    timestamp: Date.now(),
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .catch((error) => {
        // Fallback: try showing a simpler notification
        return self.registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
          tag: 'emergency-fallback'
        });
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === self.location.origin + '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not open, open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});