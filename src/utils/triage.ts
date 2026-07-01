// Triage priority types and display configuration.
// The TriagePriorityBadge component (Phase 5) consumes this — do not
// hard-code colours or labels anywhere else.

export type TriagePriority = 'IMMEDIATE' | 'URGENT' | 'LESS_URGENT' | 'NON_URGENT';

// Semantic colour variant — mapped to actual CSS by TriagePriorityBadge.
export type TriageVariant = 'immediate' | 'urgent' | 'less-urgent' | 'non-urgent';

export type TriagePriorityDisplay = {
  label: string;
  shortLabel: string; // P1 – P4 used in space-constrained contexts
  variant: TriageVariant;
  pulse: boolean; // IMMEDIATE requires a CSS pulse animation per clinical standards
  maxWaitMinutes: number; // clinical guideline — 0 means no wait permitted
  description: string;
};

export const TRIAGE_DISPLAY: Readonly<Record<TriagePriority, TriagePriorityDisplay>> = {
  IMMEDIATE: {
    label: 'Immediate',
    shortLabel: 'P1',
    variant: 'immediate',
    pulse: true,
    maxWaitMinutes: 0,
    description: 'Life-threatening — requires immediate resuscitation',
  },
  URGENT: {
    label: 'Urgent',
    shortLabel: 'P2',
    variant: 'urgent',
    pulse: false,
    maxWaitMinutes: 10,
    description: 'Potentially life-threatening — must be seen within 10 minutes',
  },
  LESS_URGENT: {
    label: 'Less Urgent',
    shortLabel: 'P3',
    variant: 'less-urgent',
    pulse: false,
    maxWaitMinutes: 60,
    description: 'Serious but stable — can wait up to 60 minutes',
  },
  NON_URGENT: {
    label: 'Non-Urgent',
    shortLabel: 'P4',
    variant: 'non-urgent',
    pulse: false,
    maxWaitMinutes: 120,
    description: 'Minor condition — can safely wait up to 2 hours',
  },
};

export function getTriageDisplay(priority: TriagePriority): TriagePriorityDisplay {
  return TRIAGE_DISPLAY[priority];
}

/** True for priorities that must never be left waiting without active monitoring. */
export function isHighPriority(priority: TriagePriority): boolean {
  return priority === 'IMMEDIATE' || priority === 'URGENT';
}

/** Returns a sort weight — lower number = higher urgency. Use for queue ordering. */
export function triageSortWeight(priority: TriagePriority): number {
  const weights: Record<TriagePriority, number> = {
    IMMEDIATE: 1,
    URGENT: 2,
    LESS_URGENT: 3,
    NON_URGENT: 4,
  };
  return weights[priority];
}
