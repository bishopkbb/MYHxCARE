import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QK } from '@/constants/queryKeys';
import { sessionsService } from '@features/auth/services/sessionsService';

export function useSessionsQuery() {
  return useQuery({
    queryKey: QK.me.sessions(),
    queryFn: () => sessionsService.getSessions(),
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => sessionsService.revokeSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.me.sessions() });
    },
  });
}

export function useRevokeAllSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sessionsService.revokeAllSessions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.me.sessions() });
    },
  });
}
