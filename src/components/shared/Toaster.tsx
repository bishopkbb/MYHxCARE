'use client';

import { CheckCircle, Info, TriangleAlert, X, XCircle } from 'lucide-react';

import { cn } from '@lib/utils';
import { useToastContext, type ToastItem, type ToastVariant } from '@providers/ToastProvider';

const ICON: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
};

const STYLE: Record<ToastVariant, { wrapper: string; icon: string }> = {
  success: {
    wrapper: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
    icon: 'text-green-600 dark:text-green-400',
  },
  error: {
    wrapper: 'border-destructive/20 bg-destructive/5 dark:border-destructive/40',
    icon: 'text-destructive',
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    wrapper: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
    icon: 'text-blue-600 dark:text-blue-400',
  },
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const { remove } = useToastContext();
  const Icon = ICON[toast.variant];
  const style = STYLE[toast.variant];

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'animate-in slide-in-from-right-4 fade-in duration-200',
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg',
        style.wrapper,
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', style.icon)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{toast.title}</p>
        {toast.description && (
          <p className="text-muted-foreground mt-0.5 text-sm">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => remove(toast.id)}
        aria-label="Dismiss notification"
        className="text-muted-foreground hover:text-foreground shrink-0 transition-colors duration-150"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToastContext();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-4 z-[200] flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
