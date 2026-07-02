import { cn } from '@lib/utils';
import { getTriageDisplay, type TriagePriority } from '@utils/triage';

interface TriagePriorityBadgeProps {
  priority: TriagePriority;
  showLabel?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  immediate: 'bg-destructive text-destructive-foreground',
  urgent: 'bg-orange-500 text-white dark:bg-orange-600',
  'less-urgent': 'bg-amber-400 text-amber-950 dark:bg-amber-500',
  'non-urgent': 'bg-green-500 text-white dark:bg-green-600',
};

export function TriagePriorityBadge({
  priority,
  showLabel = true,
  className,
}: TriagePriorityBadgeProps) {
  const display = getTriageDisplay(priority);
  const variantClass = VARIANT_STYLES[display.variant] ?? '';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variantClass,
        className,
      )}
      title={display.description}
    >
      {display.pulse && (
        <span
          className="size-1.5 animate-pulse rounded-full bg-current opacity-90"
          aria-hidden="true"
        />
      )}
      {showLabel ? display.label : display.shortLabel}
    </span>
  );
}
