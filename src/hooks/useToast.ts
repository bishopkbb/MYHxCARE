import { useToastContext } from '@providers/ToastProvider';

const DURATIONS = {
  success: 4_000,
  error: 6_000,
  warning: 5_000,
  info: 4_000,
} as const;

export function useToast() {
  const { add, remove } = useToastContext();

  return {
    success(title: string, description?: string) {
      add({
        variant: 'success',
        title,
        duration: DURATIONS.success,
        ...(description !== undefined && { description }),
      });
    },
    error(title: string, description?: string) {
      add({
        variant: 'error',
        title,
        duration: DURATIONS.error,
        ...(description !== undefined && { description }),
      });
    },
    warning(title: string, description?: string) {
      add({
        variant: 'warning',
        title,
        duration: DURATIONS.warning,
        ...(description !== undefined && { description }),
      });
    },
    info(title: string, description?: string) {
      add({
        variant: 'info',
        title,
        duration: DURATIONS.info,
        ...(description !== undefined && { description }),
      });
    },
    dismiss: remove,
  };
}
