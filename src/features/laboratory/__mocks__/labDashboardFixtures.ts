/**
 * Mock fixtures for the two domains the Laboratory Dashboard needs that have
 * zero prior art anywhere in the codebase — equipment/instrument status and
 * daily quality-control runs. Every other panel on the Dashboard reads live
 * from `labResultStore.ts`'s canonical `LabResult` store; these two are
 * genuinely new, Phase-6-flagged mock populations, matching the same
 * precedent `pharmacyFixtures.ts`'s own `SAFETY_ALERT_COUNTS` set for a
 * domain nothing else modeled yet. Swap out by pointing these at real
 * equipment/QC endpoints once that domain is built.
 */

export type EquipmentStatus = 'Online' | 'Maintenance Due' | 'Offline';

export type EquipmentStatusEntry = {
  name: string;
  status: EquipmentStatus;
};

// Counts on the Dashboard's "Active Equipment" stat card are derived from
// this array's own length/filter — never a second, independently-typed number.
export const EQUIPMENT_STATUS: EquipmentStatusEntry[] = [
  { name: 'Hematology Analyzer', status: 'Online' },
  { name: 'Chemistry Analyzer', status: 'Online' },
  { name: 'Microscope', status: 'Online' },
  { name: 'Centrifuge', status: 'Online' },
  { name: 'Incubator', status: 'Offline' },
  { name: 'Coagulation Analyzer', status: 'Online' },
  { name: 'Blood Gas Analyzer', status: 'Online' },
  { name: 'Microbiology Reader', status: 'Maintenance Due' },
  { name: 'ELISA Reader', status: 'Online' },
  { name: 'Autoclave', status: 'Online' },
  { name: 'Water Bath', status: 'Online' },
  { name: 'Refrigerated Centrifuge', status: 'Online' },
  { name: 'PCR Machine', status: 'Online' },
  { name: 'Electrolyte Analyzer', status: 'Online' },
  { name: 'Urinalysis Analyzer', status: 'Online' },
  { name: 'Flow Cytometer', status: 'Online' },
  { name: 'Spectrophotometer', status: 'Online' },
  { name: 'Blood Bank Refrigerator', status: 'Online' },
  { name: 'Slide Stainer', status: 'Online' },
  { name: 'Backup Freezer', status: 'Online' },
];

export function getEquipmentOnlineSummary(): { online: number; total: number } {
  return {
    online: EQUIPMENT_STATUS.filter((e) => e.status === 'Online').length,
    total: EQUIPMENT_STATUS.length,
  };
}

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
