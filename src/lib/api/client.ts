import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';

import { tokenStore } from '@lib/auth/tokenStore';
import { IS_MOCK } from '@/env';
import { ApiError } from './types';

// One shared in-flight refresh so concurrent 401s don't trigger multiple refreshes.
let refreshPromise: Promise<string> | null = null;

// Called only by the 401 interceptor — plain fetch avoids a circular import
// with authService (which itself imports apiClient).
async function acquireNewAccessToken(): Promise<string> {
  if (IS_MOCK) {
    const { createMockAccessToken } = await import('@features/auth/__mocks__/authFixtures');
    return createMockAccessToken();
  }
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) {
    throw new ApiError('NO_REFRESH_TOKEN', 'Session expired. Please sign in again.', 401);
  }
  const base = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? '';
  const res = await fetch(`${base}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new ApiError('REFRESH_FAILED', 'Session expired. Please sign in again.', 401);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export const apiClient = axios.create({
  baseURL: `${process.env['NEXT_PUBLIC_API_BASE_URL'] ?? ''}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Request: inject Bearer token + per-request correlation ID ──────────────

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  config.headers['X-Request-ID'] = crypto.randomUUID();
  return config;
});

// ── Response: map errors to ApiError; retry 401s with a silent refresh ─────

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error)) throw error;

    const config = error.config as RetryConfig | undefined;

    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = acquireNewAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        tokenStore.setAccessToken(newToken);
        config.headers['Authorization'] = `Bearer ${newToken}`;
        return await apiClient(config);
      } catch {
        // Refresh failed — fall through to throw ApiError.
      }
    }

    const status = error.response?.status ?? 0;
    const requestId = error.response?.headers?.['x-request-id'] as string | undefined;
    const body = error.response?.data as
      { error?: { code?: string; message?: string } } | undefined;
    const code = body?.error?.code ?? 'UNKNOWN_ERROR';
    const message = body?.error?.message ?? error.message ?? 'An unexpected error occurred.';

    throw new ApiError(code, message, status, requestId);
  },
);
