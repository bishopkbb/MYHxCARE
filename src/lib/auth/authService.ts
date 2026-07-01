import type { LoginCredentials, LoginResponse, User } from '@/types/auth.types';

import { tokenStore } from './tokenStore';

const IS_MOCK = process.env['NEXT_PUBLIC_APP_ENV'] === 'development';

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

type ErrorEnvelope = { error?: { code?: string; message?: string } };
type SuccessEnvelope<T> = { data: T };

async function apiFetch<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = tokenStore.getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const envelope = (await res.json().catch(() => null)) as ErrorEnvelope | null;
    const code = envelope?.error?.code ?? 'UNKNOWN_ERROR';
    const message = envelope?.error?.message ?? 'An unexpected error occurred.';
    throw new AuthError(code, message);
  }

  return res.json() as Promise<T>;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    if (IS_MOCK) {
      const { createMockLoginResponse } = await import('@features/auth/__mocks__/authFixtures');
      await sleep(700);
      const id = credentials.identifier.toLowerCase();
      if (id.includes('locked')) {
        throw new AuthError('ACCOUNT_LOCKED', 'Account locked after too many failed attempts.');
      }
      if (id.includes('conflict')) {
        throw new AuthError(
          'CONCURRENT_SESSION',
          'Another active session exists for this account.',
        );
      }
      if (credentials.password !== 'password') {
        throw new AuthError('INVALID_CREDENTIALS', 'Invalid staff ID or password.');
      }
      return createMockLoginResponse();
    }
    return apiFetch<LoginResponse>('POST', '/auth/login', credentials);
  },

  async refreshToken(): Promise<string> {
    if (IS_MOCK) {
      const { createMockAccessToken } = await import('@features/auth/__mocks__/authFixtures');
      return createMockAccessToken();
    }
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken)
      throw new AuthError('NO_REFRESH_TOKEN', 'Session expired. Please sign in again.');
    const data = await apiFetch<{ access_token: string }>('POST', '/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data.access_token;
  },

  async logout(): Promise<void> {
    if (!IS_MOCK) {
      await apiFetch<void>('POST', '/auth/logout').catch(() => undefined);
    }
    tokenStore.clearAll();
  },

  async passwordResetRequest(identifier: string): Promise<void> {
    if (IS_MOCK) {
      await sleep(700);
      return;
    }
    await apiFetch<void>('POST', '/auth/password-reset', { identifier });
  },

  async getMe(): Promise<User> {
    if (IS_MOCK) {
      const { MOCK_USER } = await import('@features/auth/__mocks__/authFixtures');
      await sleep(200);
      return MOCK_USER;
    }
    const envelope = await apiFetch<SuccessEnvelope<User>>('GET', '/me');
    return envelope.data;
  },
};
