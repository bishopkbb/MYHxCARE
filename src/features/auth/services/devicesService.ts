import type { TrustedDevice } from '@/types/auth.types';
import { apiClient } from '@lib/api/client';
import type { ApiSuccessResponse } from '@lib/api/types';
import { IS_MOCK } from '@/env';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const devicesService = {
  async getDevices(): Promise<TrustedDevice[]> {
    if (IS_MOCK) {
      const { getMockDevices } = await import('@features/auth/__mocks__/deviceFixtures');
      await sleep(500);
      return getMockDevices();
    }
    const res = await apiClient.get<ApiSuccessResponse<TrustedDevice[]>>('/me/devices');
    return res.data.data;
  },

  async revokeDevice(deviceId: string): Promise<void> {
    if (IS_MOCK) {
      const { mockRevokeDevice } = await import('@features/auth/__mocks__/deviceFixtures');
      await sleep(400);
      mockRevokeDevice(deviceId);
      return;
    }
    await apiClient.delete(`/me/devices/${deviceId}`);
  },

  async revokeAllDevices(): Promise<void> {
    if (IS_MOCK) {
      const { mockRevokeAllDevices } = await import('@features/auth/__mocks__/deviceFixtures');
      await sleep(400);
      mockRevokeAllDevices();
      return;
    }
    await apiClient.delete('/me/devices');
  },
};
