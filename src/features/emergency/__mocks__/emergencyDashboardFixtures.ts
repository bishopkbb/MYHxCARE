/**
 * Emergency Dashboard fixtures — everything the Dashboard shows that isn't
 * backed by a real store yet. "Patients Waiting" / the Live Emergency Queue
 * table / the Triage Distribution donut are NOT here — those read live off
 * `registrationQueueStore.ts`'s `useQueueEntries()` (the same store the
 * already-built Emergency Registration screen writes into), enriched with
 * the deterministic per-entry priority/complaint helpers below since
 * `QueueEntry` has no triage-priority or chief-complaint field yet (that's
 * what the future Triage Assessment screen will add).
 *
 * Everything below IS a placeholder: Occupied Beds, Critical Patients, Under
 * Observation, Pending Results, Discharged Today, the bed-status breakdown,
 * critical alerts, observation patients, pending orders, and recent
 * admissions have no backing store yet (Bed Assignment, Observation Unit,
 * Diagnostic Requests, and Critical Alerts are all still-unbuilt follow-up
 * screens). Replace with real API/store reads in Phase 6, one panel at a
 * time, as each of those screens gets built for real.
 */

import type { TriagePriority } from '@/utils/triage';

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Real-queue enrichment (deterministic, per real entry id) ──────────────
// QueueEntry has no priority/complaint field yet — these derive a stable
// placeholder value per real entry (never random on re-render) rather than
// fabricating a second, independently-typed "emergency queue entry" shape.

export const PRIORITY_TIERS: TriagePriority[] = [
  'IMMEDIATE',
  'URGENT',
  'LESS_URGENT',
  'NON_URGENT',
];

/** Roughly realistic ED mix — few Immediate, most Urgent/Less Urgent, some Non-Urgent. */
export function derivePriorityForEntry(entryId: string): TriagePriority {
  const rand = mulberry32(hashSeed(entryId))();
  if (rand < 0.12) return 'IMMEDIATE';
  if (rand < 0.45) return 'URGENT';
  if (rand < 0.8) return 'LESS_URGENT';
  return 'NON_URGENT';
}

const CHIEF_COMPLAINTS = [
  'Chest pain, shortness of breath',
  'Severe headache',
  'Abdominal pain',
  'Fever, body pain',
  'Cough, difficulty breathing',
  'Laceration, bleeding',
  'Fall injury',
  'Vomiting, dehydration',
  'Road traffic accident',
  'Severe allergic reaction',
];

export function deriveComplaintForEntry(entryId: string): string {
  const rand = mulberry32(hashSeed(`${entryId}-complaint`))();
  return CHIEF_COMPLAINTS[Math.floor(rand * CHIEF_COMPLAINTS.length)]!;
}

// ─── Bed status ──────────────────────────────────────────────────────────

export type BedStatusRow = { label: string; count: number; color: string };

export const TOTAL_BEDS = 25;
export const BED_STATUS: BedStatusRow[] = [
  { label: 'Available', count: 7, color: '#16A34A' },
  { label: 'Occupied', count: 18, color: '#00B4D8' },
  { label: 'Cleaning', count: 1, color: '#8A98A3' },
  { label: 'Isolation', count: 2, color: '#7C3AED' },
  { label: 'Reserved', count: 1, color: '#94A3B8' },
];
export const OCCUPIED_BEDS = 18;
export const BED_OCCUPANCY_PERCENT = Math.round((OCCUPIED_BEDS / TOTAL_BEDS) * 100);
export const BEDS_AVAILABLE = TOTAL_BEDS - OCCUPIED_BEDS;

// ─── Top-row stat placeholders ──────────────────────────────────────────

export const CRITICAL_PATIENTS_COUNT = 6;
export const UNDER_OBSERVATION_COUNT = 11;
export const PENDING_RESULTS_COUNT = 14;
export const DISCHARGED_TODAY_COUNT = 38;

// ─── Critical Alerts ─────────────────────────────────────────────────────

export type CriticalAlert = {
  id: string;
  title: string;
  detail: string;
  minutesAgo: number;
};

export const CRITICAL_ALERTS: CriticalAlert[] = [
  { id: 'ca-1', title: 'Cardiac Arrest', detail: 'ED Bay 3', minutesAgo: 2 },
  { id: 'ca-2', title: 'Stroke Alert', detail: 'CT Scan Recommended', minutesAgo: 5 },
  { id: 'ca-3', title: 'Sepsis Alert', detail: 'Patient in ED Bed 7', minutesAgo: 7 },
  { id: 'ca-4', title: 'Critical Lab Result', detail: 'Potassium: 6.2 mmol/L', minutesAgo: 10 },
  { id: 'ca-5', title: 'Trauma Alert', detail: 'Patient in ED Bay 1', minutesAgo: 12 },
  { id: 'ca-6', title: 'Blood Request', detail: 'O Negative — 2 Units', minutesAgo: 15 },
];

// ─── Observation Patients ────────────────────────────────────────────────

export type ObservationPatient = {
  id: string;
  patientName: string;
  bed: string;
  observationTime: string; // "HH:MM" elapsed
  nextReview: string; // "HH:MM"
  assignedTo: string;
};

export const OBSERVATION_PATIENTS: ObservationPatient[] = [
  {
    id: 'obs-1',
    patientName: 'Victoria Obi',
    bed: 'OBS-1',
    observationTime: '02:15',
    nextReview: '12:45 PM',
    assignedTo: 'Dr. Adeyemi',
  },
  {
    id: 'obs-2',
    patientName: 'Ahmed Bello',
    bed: 'OBS-2',
    observationTime: '01:40',
    nextReview: '12:10 PM',
    assignedTo: 'Dr. Okafor',
  },
  {
    id: 'obs-3',
    patientName: 'Maryam Ali',
    bed: 'OBS-3',
    observationTime: '01:05',
    nextReview: '11:45 AM',
    assignedTo: 'Dr. Bello',
  },
  {
    id: 'obs-4',
    patientName: 'Chukwudi N.',
    bed: 'OBS-4',
    observationTime: '00:50',
    nextReview: '11:30 AM',
    assignedTo: 'Dr. Adeyemi',
  },
];

// ─── Pending Orders ──────────────────────────────────────────────────────

export const PENDING_ORDERS = {
  laboratory: 8,
  radiology: 6,
  medications: 12,
  procedures: 4,
};

// ─── Recent Emergency Admissions ────────────────────────────────────────

export type RecentAdmission = {
  id: string;
  patientName: string;
  diagnosis: string;
  arrival: string; // "HH:MM"
  disposition: 'Admitted' | 'Discharged';
};

export const RECENT_ADMISSIONS: RecentAdmission[] = [
  {
    id: 'ra-1',
    patientName: 'John Chuka',
    diagnosis: 'Acute Asthma',
    arrival: '09:35',
    disposition: 'Admitted',
  },
  {
    id: 'ra-2',
    patientName: 'Blessing Udo',
    diagnosis: 'Typhoid Fever',
    arrival: '09:10',
    disposition: 'Admitted',
  },
  {
    id: 'ra-3',
    patientName: 'Tolu Adebayo',
    diagnosis: 'Food Poisoning',
    arrival: '08:45',
    disposition: 'Discharged',
  },
  {
    id: 'ra-4',
    patientName: 'Kunle Sanni',
    diagnosis: 'Hypertensive Urgency',
    arrival: '08:20',
    disposition: 'Admitted',
  },
  {
    id: 'ra-5',
    patientName: 'Esther Daniel',
    diagnosis: 'Migraine',
    arrival: '07:55',
    disposition: 'Discharged',
  },
];
