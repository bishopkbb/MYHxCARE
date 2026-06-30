'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      console.error('[SW] Registration failed:', err);
    });
  }, []);

  return null;
}
