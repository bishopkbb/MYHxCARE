import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QK } from '@/constants/queryKeys';
import { devicesService } from '@features/auth/services/devicesService';

export function useDevicesQuery() {
  return useQuery({
    queryKey: QK.me.devices(),
    queryFn: () => devicesService.getDevices(),
  });
}

export function useRevokeDeviceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => devicesService.revokeDevice(deviceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.me.devices() });
    },
  });
}

export function useRevokeAllDevicesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => devicesService.revokeAllDevices(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.me.devices() });
    },
  });
}
