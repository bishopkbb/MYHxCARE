'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@hooks/useAuth';
import { tokenStore } from '@lib/auth/tokenStore';
import { IS_MOCK } from '@/env';
import type { RawWsMessage, WsEventMap } from '@/types/ws.types';

const MAX_RECONNECT_ATTEMPTS = 5;

export type WsContextValue = {
  isConnected: boolean;
  // True when WebSocket failed after MAX_RECONNECT_ATTEMPTS — domain
  // components should fall back to manual REST polling in this state.
  isPolling: boolean;
  subscribe: <K extends keyof WsEventMap>(
    event: K,
    handler: (payload: WsEventMap[K]) => void,
  ) => () => void;
};

const WsContext = createContext<WsContextValue | null>(null);

export function useWs(): WsContextValue {
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error('useWs must be used within <WsProvider>');
  return ctx;
}

type WsState = 'disconnected' | 'connected' | 'polling';

export function WsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  // Raw socket state — consumers see isConnected/isPolling derived below.
  const [wsState, setWsState] = useState<WsState>('disconnected');
  const listenersRef = useRef<Map<string, Set<(payload: unknown) => void>>>(new Map());

  // Derived: connection is only meaningful when the user is authenticated.
  const isConnected = isAuthenticated && wsState === 'connected';
  const isPolling = isAuthenticated && wsState === 'polling';

  useEffect(() => {
    // When not authenticated, the derived values are already false — no
    // setState needed here. The previous run's cleanup resets wsState.
    if (!isAuthenticated) return;

    if (IS_MOCK) {
      // Defer so the setState happens in an async callback, not synchronously
      // in the effect body (satisfies react-hooks/set-state-in-effect).
      const id = setTimeout(() => {
        setWsState('connected');
      }, 0);
      return () => {
        clearTimeout(id);
        setWsState('disconnected');
      };
    }

    let cancelled = false;
    let currentWs: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    function doConnect() {
      if (cancelled) return;

      const wsUrl = process.env['NEXT_PUBLIC_WS_URL'];
      const token = tokenStore.getAccessToken();
      if (!wsUrl || !token) return;

      const ws = new WebSocket(`${wsUrl}/ws?token=${encodeURIComponent(token)}`);
      currentWs = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        attempts = 0;
        setWsState('connected');
      };

      ws.onclose = () => {
        if (cancelled) return;
        currentWs = null;

        if (attempts >= MAX_RECONNECT_ATTEMPTS) {
          setWsState('polling');
          return;
        }

        setWsState('disconnected');
        // Exponential back-off: 1 s → 2 s → 4 s … capped at 30 s.
        const delay = Math.min(1_000 * 2 ** attempts, 30_000);
        attempts++;
        reconnectTimer = setTimeout(doConnect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        try {
          const msg = JSON.parse(event.data) as RawWsMessage;
          listenersRef.current.get(msg.type)?.forEach((h) => h(msg.payload));
        } catch {
          // Ignore malformed messages.
        }
      };
    }

    doConnect();

    return () => {
      cancelled = true;
      currentWs?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setWsState('disconnected');
    };
  }, [isAuthenticated]);

  const subscribe = useCallback(
    <K extends keyof WsEventMap>(
      event: K,
      handler: (payload: WsEventMap[K]) => void,
    ): (() => void) => {
      const listeners = listenersRef.current;
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      const set = listeners.get(event);
      if (!set) return () => {};
      const h = handler as (payload: unknown) => void;
      set.add(h);
      return () => {
        set.delete(h);
      };
    },
    [],
  );

  const value = useMemo<WsContextValue>(
    () => ({ isConnected, isPolling, subscribe }),
    [isConnected, isPolling, subscribe],
  );

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}
