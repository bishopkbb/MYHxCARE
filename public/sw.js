// Phase 2 stub — Workbox caching strategies, background sync, and offline
// queue integration are implemented in Phase 3 once the API client exists.

self.addEventListener('install', () => {
  // Take control immediately without waiting for existing tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all open clients so this SW version controls them right away
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler — no caching yet
self.addEventListener('fetch', (_event) => {});
