import axios, { isAxiosError } from 'axios';

import type { LoginCredentials, LoginResponse, User } from '@/types/auth.types';
import { apiClient } from '@lib/api/client';
import type { ApiSuccessResponse } from '@lib/api/types';
import { IS_MOCK } from '@/env';

import { decodeJwt } from './jwt';
import { tokenStore } from './tokenStore';

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Dedicated axios instance for auth endpoints — no 401-retry interceptor to
// avoid a circular import with apiClient (which calls authService for refresh).
const authAxios = axios.create({
  baseURL: `${process.env['NEXT_PUBLIC_API_BASE_URL'] ?? ''}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

function toAuthError(error: unknown): AuthError {
  if (isAxiosError(error)) {
    const body = error.response?.data as
      { error?: { code?: string; message?: string } } | undefined;
    const code = body?.error?.code ?? 'UNKNOWN_ERROR';
    const message = body?.error?.message ?? error.message ?? 'An unexpected error occurred.';
    return new AuthError(code, message);
  }
  if (error instanceof Error) return new AuthError('NETWORK_ERROR', error.message);
  return new AuthError('UNKNOWN_ERROR', 'An unexpected error occurred.');
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    if (IS_MOCK) {
      const { getMockUser, createMockLoginResponse } =
        await import('@features/auth/__mocks__/authFixtures');
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
      const user = getMockUser(credentials.identifier);
      return createMockLoginResponse(user.id, user.workspaceRole);
    }
    try {
      const res = await authAxios.post<LoginResponse>('/auth/login', credentials);
      return res.data;
    } catch (error) {
      throw toAuthError(error);
    }
  },

  async refreshToken(): Promise<string> {
    if (IS_MOCK) {
      const { createMockAccessToken } = await import('@features/auth/__mocks__/authFixtures');
      // Preserve the actor and workspace across refresh so the user doesn't change
      const current = tokenStore.getAccessToken();
      const claims = current ? decodeJwt(current) : null;
      const actorId = claims?.actor_id ?? 'usr_001';
      const workspaceRole = claims?.workspace_role ?? 'CONSULTANT';
      return createMockAccessToken(actorId, workspaceRole);
    }
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken) {
      throw new AuthError('NO_REFRESH_TOKEN', 'Session expired. Please sign in again.');
    }
    try {
      const res = await authAxios.post<{ access_token: string }>('/auth/refresh', {
        refresh_token: refreshToken,
      });
      return res.data.access_token;
    } catch (error) {
      throw toAuthError(error);
    }
  },

  async logout(): Promise<void> {
    if (!IS_MOCK) {
      const token = tokenStore.getAccessToken();
      await authAxios
        .post('/auth/logout', null, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        .catch(() => undefined);
    }
    tokenStore.clearAll();
  },

  async passwordResetRequest(identifier: string): Promise<void> {
    if (IS_MOCK) {
      await sleep(700);
      return;
    }
    try {
      await authAxios.post('/auth/password-reset', { identifier });
    } catch (error) {
      throw toAuthError(error);
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (IS_MOCK) {
      await sleep(700);
      if (token === 'invalid') {
        throw new AuthError('INVALID_TOKEN', 'This password reset link is invalid or has expired.');
      }
      return;
    }
    try {
      await authAxios.post('/auth/password-reset/confirm', {
        token,
        new_password: newPassword,
      });
    } catch (error) {
      throw toAuthError(error);
    }
  },

  async getMe(): Promise<User> {
    if (IS_MOCK) {
      const { getMockUserById } = await import('@features/auth/__mocks__/authFixtures');
      await sleep(200);
      const current = tokenStore.getAccessToken();
      const claims = current ? decodeJwt(current) : null;
      return getMockUserById(claims?.actor_id ?? 'usr_001');
    }
    const res = await apiClient.get<ApiSuccessResponse<User>>('/me');
    return res.data.data;
  },
};
