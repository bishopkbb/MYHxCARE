import { cn } from '@lib/utils';
import {
  VISIT_STATUS_DISPLAY,
  type VisitStatus,
  type VisitStatusVariant,
} from '@/types/visit.types';

interface VisitStatusBadgeProps {
  status: VisitStatus;
  className?: string;
}

const VARIANT_STYLES: Record<VisitStatusVariant, string> = {
  neutral: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  muted: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  danger: 'bg-destructive/10 text-destructive',
};

export function VisitStatusBadge({ status, className }: VisitStatusBadgeProps) {
  const display = VISIT_STATUS_DISPLAY[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        VARIANT_STYLES[display.variant],
        className,
      )}
      title={display.description}
    >
      {display.label}
    </span>
  );
}
