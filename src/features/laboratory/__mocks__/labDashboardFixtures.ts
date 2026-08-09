/**
 * Mock fixtures for daily quality-control runs on the Laboratory Dashboard.
 * Equipment status now reads live from `equipmentStore.ts` (backed by
 * `equipmentFixtures.ts`) instead of a separate static population here.
 * Every other panel on the Dashboard reads live from `labResultStore.ts`'s
 * canonical `LabResult` store; QC notifications are a genuinely new,
 * Phase-6-flagged mock population, matching the same precedent
 * `pharmacyFixtures.ts`'s own `SAFETY_ALERT_COUNTS` set for a domain nothing
 * else modeled yet. Swap out by pointing this at a real QC endpoint once
 * that domain is built.
 */

// ── Quality Control (QC) ─────────────────────────────────────────────────────

export type QcTodaySummary = {
  passed: number;
  failed: number;
  pending: number;
};

// The Dashboard's QC Today panel derives its own percentages from these three
// counts at render time — never a fourth, independently hand-typed percent.
export const QC_TODAY: QcTodaySummary = {
  passed: 18,
  failed: 2,
  pending: 0,
};

// ── Lab-specific notification entries (merged with real announcements on the
// Dashboard, matching pharmacyFixtures.ts's own PharmacyNotification pattern) ──

export type LabNotificationType = 'reagent' | 'equipment' | 'qc' | 'sample' | 'system';

export type LabNotification = {
  id: string;
  type: LabNotificationType;
  message: string;
  minutesAgo: number;
};

export const LAB_NOTIFICATIONS: LabNotification[] = [
  {
    id: 'ln-1',
    type: 'reagent',
    message: 'New reagent lot BLD-0726 is now available. Please update inventory.',
    minutesAgo: 120,
  },
  {
    id: 'ln-2',
    type: 'equipment',
    message: 'Microbiology Reader is due for scheduled maintenance this week.',
    minutesAgo: 240,
  },
  {
    id: 'ln-3',
    type: 'qc',
    message: 'Morning QC run completed — 2 controls failed on the Chemistry Analyzer.',
    minutesAgo: 300,
  },
];
