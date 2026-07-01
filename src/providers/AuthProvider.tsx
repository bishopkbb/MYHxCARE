'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AuthState, JwtClaims, LoginCredentials, User } from '@/types/auth.types';
import { authService } from '@lib/auth/authService';
import { decodeJwt, msUntilExpiry } from '@lib/auth/jwt';
import { tokenStore } from '@lib/auth/tokenStore';

const REFRESH_BUFFER_MS = 60_000;

export type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  isSessionExpired: boolean;
  user: User | null;
  claims: JwtClaims | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  resumeSession: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const hydrateUser = useCallback(async (accessToken: string) => {
    tokenStore.setAccessToken(accessToken);
    try {
      const user = await authService.getMe();
      const claims = decodeJwt(accessToken);
      if (!claims) throw new Error('Malformed access token.');
      setState({ status: 'authenticated', user, claims });
    } catch {
      tokenStore.clearAll();
      setState({ status: 'unauthenticated' });
    }
  }, []);

  // Auto-refresh fires 60s before expiry. On success it updates state.claims,
  // which re-triggers this effect and reschedules the next refresh automatically.
  // On failure, transitions to session-expired so the overlay can re-auth in place.
  useEffect(() => {
    if (state.status !== 'authenticated') return;

    const ms = msUntilExpiry(state.claims) - REFRESH_BUFFER_MS;
    if (ms <= 0) return;

    const timerId = setTimeout(async () => {
      try {
        const newToken = await authService.refreshToken();
        tokenStore.setAccessToken(newToken);
        const newClaims = decodeJwt(newToken);
        if (!newClaims) throw new Error('Malformed token in refresh response.');
        setState((prev) =>
          prev.status === 'authenticated' ? { ...prev, claims: newClaims } : prev,
        );
      } catch {
        tokenStore.clearAll();
        setState((prev) =>
          prev.status === 'authenticated'
            ? { status: 'session-expired', user: prev.user }
            : { status: 'unauthenticated' },
        );
      }
    }, ms);

    return () => clearTimeout(timerId);
  }, [state]);

  // Cold start: attempt silent refresh using the sessionStorage refresh token.
  // Failure here means no prior session — go straight to unauthenticated (no overlay).
  useEffect(() => {
    let cancelled = false;

    async function silentRefresh() {
      const rt = tokenStore.getRefreshToken();
      if (!rt) {
        if (!cancelled) setState({ status: 'unauthenticated' });
        return;
      }
      try {
        const accessToken = await authService.refreshToken();
        if (!cancelled) await hydrateUser(accessToken);
      } catch {
        tokenStore.clearAll();
        if (!cancelled) setState({ status: 'unauthenticated' });
      }
    }

    void silentRefresh();
    return () => {
      cancelled = true;
    };
  }, [hydrateUser]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await authService.login(credentials);
      tokenStore.setRefreshToken(response.refresh_token);
      await hydrateUser(response.access_token);
    },
    [hydrateUser],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setState({ status: 'unauthenticated' });
  }, []);

  // Re-authenticates the current user from the session-expired overlay.
  // Uses the stored email so the user only needs to enter their password.
  const resumeSession = useCallback(
    async (password: string) => {
      if (state.status !== 'session-expired') return;
      const response = await authService.login({ identifier: state.user.email, password });
      tokenStore.setRefreshToken(response.refresh_token);
      await hydrateUser(response.access_token);
    },
    [state, hydrateUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: state.status === 'loading',
      isAuthenticated: state.status === 'authenticated',
      isSessionExpired: state.status === 'session-expired',
      user: 'user' in state ? state.user : null,
      claims: state.status === 'authenticated' ? state.claims : null,
      login,
      logout,
      resumeSession,
    }),
    [state, login, logout, resumeSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
