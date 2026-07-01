'use client';

import { WifiLow, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

type NetworkState = 'online' | 'offline' | 'slow';

// Narrowed to the subset of NetworkInformation the banner actually reads.
interface NetworkConnection extends EventTarget {
  readonly effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
}

function getNetworkState(): NetworkState {
  if (!navigator.onLine) return 'offline';
  const conn = (navigator as { connection?: NetworkConnection }).connection;
  if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return 'slow';
  return 'online';
}

export function OfflineBanner() {
  // Initialise optimistically (online) — matches SSR output, avoids hydration mismatch.
  const [state, setState] = useState<NetworkState>('online');

  useEffect(() => {
    const handleOnline = () => setState('online');
    const handleOffline = () => setState('offline');
    const handleConnChange = () => setState(getNetworkState());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as { connection?: NetworkConnection }).connection;
    conn?.addEventListener('change', handleConnChange);

    // Defer initial state check — avoids synchronous setState in effect body.
    const id = setTimeout(() => {
      setState(getNetworkState());
    }, 0);

    return () => {
      clearTimeout(id);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      conn?.removeEventListener('change', handleConnChange);
    };
  }, []);

  if (state === 'online') return null;

  if (state === 'offline') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="bg-destructive text-destructive-foreground fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm"
      >
        <WifiOff className="size-4 shrink-0" aria-hidden />
        <span>No internet connection — changes may not be saved</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm text-white"
    >
      <WifiLow className="size-4 shrink-0" aria-hidden />
      <span>Slow network detected — some features may be delayed</span>
    </div>
  );
}
