/**
 * Mock fixtures for the Emergency Registration screen.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

export type TriagePriority = 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Blue';

export const TRIAGE_PRIORITY_OPTIONS: {
  value: TriagePriority;
  label: string;
  sublabel: string;
  color: string;
}[] = [
  { value: 'Red', label: 'Red', sublabel: 'Immediate', color: '#EF4444' },
  { value: 'Orange', label: 'Orange', sublabel: 'Very Urgent', color: '#F97316' },
  { value: 'Yellow', label: 'Yellow', sublabel: 'Urgent', color: '#EAB308' },
  { value: 'Green', label: 'Green', sublabel: 'Less Urgent', color: '#22C55E' },
  { value: 'Blue', label: 'Blue', sublabel: 'Non-Urgent', color: '#3B82F6' },
];

export type ArrivalMode = 'Walk-in' | 'Ambulance' | 'Other';

export const ARRIVAL_MODE_OPTIONS: ArrivalMode[] = ['Walk-in', 'Ambulance', 'Other'];

export const EMERGENCY_MRN_PREFIX = 'EMR-2026-';
export const EMERGENCY_MRN_START = 123;

export const NEXT_STEPS = [
  'Complete registration',
  'Patient routed to Triage',
  'Triage nurse assessment',
  'Doctor assignment',
];

export function formatEmergencyMrn(n: number): string {
  return `${EMERGENCY_MRN_PREFIX}${String(n).padStart(6, '0')}`;
}
