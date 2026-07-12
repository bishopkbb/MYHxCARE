import type { Session } from '@/types/auth.types';
import { apiClient } from '@lib/api/client';
import type { ApiSuccessResponse } from '@lib/api/types';
import { IS_MOCK } from '@/env';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const sessionsService = {
  async getSessions(): Promise<Session[]> {
    if (IS_MOCK) {
      const { getMockSessions } = await import('@features/auth/__mocks__/sessionFixtures');
      await sleep(500);
      return getMockSessions();
    }
    const res = await apiClient.get<ApiSuccessResponse<Session[]>>('/me/sessions');
    return res.data.data;
  },

  async revokeSession(sessionId: string): Promise<void> {
    if (IS_MOCK) {
      const { mockRevokeSession } = await import('@features/auth/__mocks__/sessionFixtures');
      await sleep(400);
      mockRevokeSession(sessionId);
      return;
    }
    await apiClient.delete(`/me/sessions/${sessionId}`);
  },

  async revokeAllSessions(): Promise<void> {
    if (IS_MOCK) {
      const { mockRevokeAllSessions } = await import('@features/auth/__mocks__/sessionFixtures');
      await sleep(400);
      mockRevokeAllSessions();
      return;
    }
    await apiClient.delete('/me/sessions');
  },
};
