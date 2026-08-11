/**
 * Emergency module fixtures — shared across the Dashboard and Patient Queue
 * (and any future Emergency screen that needs the same real-entry
 * enrichment). "Patients Waiting" / the Live Emergency Queue / Patient
 * Queue's own list / the Triage Distribution donut are NOT fixture data —
 * those read live off `registrationQueueStore.ts`'s `useQueueEntries()`
 * (the same store the already-built Emergency Registration screen writes
 * into), enriched with the deterministic per-entry helpers below since
 * `QueueEntry` has no triage-priority, chief-complaint, arrival-source, or
 * queue-stage field yet (that's what the future Triage Assessment/Bed
 * Assignment screens will add). Every helper is seeded off the real
 * `entry.id`, so a given real patient always gets the same priority/
 * complaint/source/stage on every screen that shows them — never
 * independently re-rolled per screen.
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

export type ArrivalSource = 'Walk-in' | 'Ambulance' | 'Referral';
export const ARRIVAL_SOURCES: ArrivalSource[] = ['Walk-in', 'Ambulance', 'Referral'];

/** Walk-in dominates real ED arrivals; ambulance/referral are the minority. */
export function deriveSourceForEntry(entryId: string): ArrivalSource {
  const rand = mulberry32(hashSeed(`${entryId}-source`))();
  if (rand < 0.65) return 'Walk-in';
  if (rand < 0.88) return 'Ambulance';
  return 'Referral';
}

export type QueueStage =
  'Awaiting Triage' | 'Triage Completed' | 'In Treatment' | 'Admitted' | 'Discharged';
export const QUEUE_STAGES: QueueStage[] = [
  'Awaiting Triage',
  'Triage Completed',
  'In Treatment',
  'Admitted',
  'Discharged',
];

/** `QueueEntry.status` never advances past creation (SYS-level finding —
 * stays 'Emergency' forever) so real progression through triage/treatment/
 * disposition isn't modelled yet. This derives a stable illustrative stage
 * per entry so Patient Queue's tabs/filters have something real to filter
 * against, weighted toward the front of the pipeline (most ED arrivals are
 * still waiting or in progress, few are already discharged). */
export function deriveQueueStageForEntry(entryId: string): QueueStage {
  const rand = mulberry32(hashSeed(`${entryId}-stage`))();
  if (rand < 0.3) return 'Awaiting Triage';
  if (rand < 0.5) return 'Triage Completed';
  if (rand < 0.7) return 'In Treatment';
  if (rand < 0.85) return 'Admitted';
  return 'Discharged';
}

/** QueueEntry carries no phone field — Triage Assessment's Patient
 * Identification step needs one to fill an editable form, not to display as
 * if it were real API data. Stable per entry, Nigerian mobile format. */
export function derivePhoneForEntry(entryId: string): string {
  const rand = mulberry32(hashSeed(`${entryId}-phone`))();
  const prefixes = ['0803', '0805', '0806', '0810', '0813', '0816', '0703', '0706'];
  const prefix = prefixes[Math.floor(rand * prefixes.length)]!;
  const rest = String(
    Math.floor(mulberry32(hashSeed(`${entryId}-phone-rest`))() * 1_000_000),
  ).padStart(6, '0');
  return `${prefix} ${rest.slice(0, 3)} ${rest.slice(3)}`;
}

export const ONSET_OPTIONS = [
  'Less than 1 hour',
  '1–6 hours',
  '6–24 hours',
  'More than 24 hours',
] as const;

export const PRIMARY_CONCERN_OPTIONS = [
  'Breathing Problem',
  'Chest Pain',
  'Bleeding',
  'Trauma / Injury',
  'Neurological',
  'Fever / Infection',
  'Gastrointestinal',
  'Other',
] as const;

/** No dedicated Emergency nursing-staff directory exists yet — an on-duty
 * triage nurse roster, same honest-placeholder treatment as everything else
 * in this file without a backing store. */
export const EMERGENCY_TRIAGE_NURSES = [
  'Mary Adamu',
  'Grace Effiong',
  'Blessing Nkem',
  'Fatima Suleiman',
] as const;

// ─── Beds ────────────────────────────────────────────────────────────────
// A real individual-bed inventory (id/type/zone/equipment/base status) — the
// single source of truth Bed Assignment and the Dashboard's bed-status donut
// both derive from, so the two screens can never disagree on how many beds
// exist or what "Occupied" adds up to. Live status changes made on the Bed
// Assignment screen are tracked separately, in `bedAssignmentStore.ts`, and
// merged over this base list at read time (safe-merge-at-read-time) — this
// is only the starting snapshot.

export type BedType =
  'Resus Bed' | 'Treatment Bed' | 'Pediatric Bed' | 'Isolation Bed' | 'Observation Bed';
export type BedBaseStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Reserved';
export type BedEquipment =
  'Cardiac Monitor' | 'Oxygen Outlet' | 'Defibrillator' | 'Suction' | 'Power Outlet' | 'IV Stand';

export type EmergencyBedRow = {
  id: string;
  type: BedType;
  zone: string;
  baseStatus: BedBaseStatus;
  equipment: BedEquipment[];
  /** Only set when baseStatus is 'Occupied' in the starting snapshot — ties
   * an already-occupied bed to the same named patient Dashboard's
   * Observation Patients panel shows, so the two screens agree. */
  occupantName?: string;
};

export const ZONES = [
  'Resuscitation Bay',
  'Main Treatment Area',
  'Pediatric Area',
  'Isolation Ward',
] as const;

const RESUS_EQUIPMENT: BedEquipment[] = ['Cardiac Monitor', 'Oxygen Outlet', 'Defibrillator'];
const TREATMENT_EQUIPMENT: BedEquipment[] = ['Oxygen Outlet', 'Power Outlet'];
const PEDIATRIC_EQUIPMENT: BedEquipment[] = ['Oxygen Outlet', 'IV Stand'];
const ISOLATION_EQUIPMENT: BedEquipment[] = ['Oxygen Outlet', 'Suction'];

export const EMERGENCY_BEDS: EmergencyBedRow[] = [
  // Resuscitation Bay — 7 beds, 3 available
  {
    id: 'ER-01',
    type: 'Resus Bed',
    zone: 'Resuscitation Bay',
    baseStatus: 'Available',
    equipment: RESUS_EQUIPMENT,
  },
  {
    id: 'ER-02',
    type: 'Resus Bed',
    zone: 'Resuscitation Bay',
    baseStatus: 'Occupied',
    equipment: RESUS_EQUIPMENT,
  },
  {
    id: 'ER-03',
    type: 'Resus Bed',
    zone: 'Resuscitation Bay',
    baseStatus: 'Occupied',
    equipment: RESUS_EQUIPMENT,
    occupantName: 'Ibrahim Musa',
  },
  {
    id: 'ER-04',
    type: 'Resus Bed',
    zone: 'Resuscitation Bay',
    baseStatus: 'Available',
    equipment: RESUS_EQUIPMENT,
  },
  {
    id: 'ER-05',
    type: 'Resus Bed',
    zone: 'Resuscitation Bay',
    baseStatus: 'Occupied',
    equipment: RESUS_EQUIPMENT,
  },
  {
    id: 'ER-06',
    type: 'Resus Bed',
    zone: 'Resuscitation Bay',
    baseStatus: 'Occupied',
    equipment: RESUS_EQUIPMENT,
  },
  {
    id: 'ER-07',
    type: 'Resus Bed',
    zone: 'Resuscitation Bay',
    baseStatus: 'Available',
    equipment: RESUS_EQUIPMENT,
  },
  // Main Treatment Area — 9 beds, 1 available, 1 cleaning
  {
    id: 'ED-01',
    type: 'Treatment Bed',
    zone: 'Main Treatment Area',
    baseStatus: 'Occupied',
    equipment: TREATMENT_EQUIPMENT,
  },
  {
    id: 'ED-02',
    type: 'Treatment Bed',
    zone: 'Main Treatment Area',
    baseStatus: 'Occupied',
    equipment: TREATMENT_EQUIPMENT,
  },
  {
    id: 'ED-03',
    type: 'Treatment Bed',
    zone: 'Main Treatment Area',
    baseStatus: 'Available',
    equipment: TREATMENT_EQUIPMENT,
  },
  {
    id: 'ED-04',
    type: 'Treatment Bed',
    zone: 'Main Treatment Area',
    baseStatus: 'Occupied',
    equipment: TREATMENT_EQUIPMENT,
  },
  {
    id: 'ED-05',
    type: 'Treatment Bed',
    zone: 'Main Treatment Area',
    baseStatus: 'Occupied',
    equipment: TREATMENT_EQUIPMENT,
    occupantName: 'Chidinma Eze',
  },
  {
    id: 'ED-06',
    type: 'Treatment Bed',
    zone: 'Main Treatment Area',
    baseStatus: 'Occupied',
    equipment: TREATMENT_EQUIPMENT,
  },
  {
    id: 'ED-07',
    type: 'Treatment Bed',
    zone: 'Main Treatment Area',
    baseStatus: 'Cleaning',
    equipment: TREATMENT_EQUIPMENT,
  },
  {
    id: 'ED-08',
    type: 'Treatment Bed',
    zone: 'Main Treatment Area',
    baseStatus: 'Occupied',
    equipment: TREATMENT_EQUIPMENT,
    occupantName: 'Samuel Dike',
  },
  {
    id: 'ED-09',
    type: 'Treatment Bed',
    zone: 'Main Treatment Area',
    baseStatus: 'Occupied',
    equipment: TREATMENT_EQUIPMENT,
  },
  // Pediatric Area — 2 beds, 1 available
  {
    id: 'PED-01',
    type: 'Pediatric Bed',
    zone: 'Pediatric Area',
    baseStatus: 'Occupied',
    equipment: PEDIATRIC_EQUIPMENT,
  },
  {
    id: 'PED-02',
    type: 'Pediatric Bed',
    zone: 'Pediatric Area',
    baseStatus: 'Available',
    equipment: PEDIATRIC_EQUIPMENT,
  },
  // Isolation Ward — 3 beds, 2 available (matches the mockup's "3 (2 Available · 1 Occupied)")
  {
    id: 'ISO-01',
    type: 'Isolation Bed',
    zone: 'Isolation Ward',
    baseStatus: 'Available',
    equipment: ISOLATION_EQUIPMENT,
  },
  {
    id: 'ISO-02',
    type: 'Isolation Bed',
    zone: 'Isolation Ward',
    baseStatus: 'Available',
    equipment: ISOLATION_EQUIPMENT,
  },
  {
    id: 'ISO-03',
    type: 'Isolation Bed',
    zone: 'Isolation Ward',
    baseStatus: 'Occupied',
    equipment: ISOLATION_EQUIPMENT,
  },
  // Observation Unit — 4 beds, same occupants as the Dashboard's Observation
  // Patients panel; not assignable from Bed Assignment (that screen only
  // targets the 4 primary ED bed types), but still counted here so the
  // department-wide totals reconcile with the Dashboard's stat cards.
  {
    id: 'OBS-1',
    type: 'Observation Bed',
    zone: 'Observation Unit',
    baseStatus: 'Occupied',
    equipment: ['Power Outlet'],
    occupantName: 'Victoria Obi',
  },
  {
    id: 'OBS-2',
    type: 'Observation Bed',
    zone: 'Observation Unit',
    baseStatus: 'Occupied',
    equipment: ['Power Outlet'],
    occupantName: 'Ahmed Bello',
  },
  {
    id: 'OBS-3',
    type: 'Observation Bed',
    zone: 'Observation Unit',
    baseStatus: 'Occupied',
    equipment: ['Power Outlet'],
    occupantName: 'Maryam Ali',
  },
  {
    id: 'OBS-4',
    type: 'Observation Bed',
    zone: 'Observation Unit',
    baseStatus: 'Occupied',
    equipment: ['Power Outlet'],
    occupantName: 'Chukwudi N.',
  },
];

export type BedStatusRow = { label: string; count: number; color: string };

export const TOTAL_BEDS = EMERGENCY_BEDS.length;
export const OCCUPIED_BEDS = EMERGENCY_BEDS.filter((b) => b.baseStatus === 'Occupied').length;
export const BED_OCCUPANCY_PERCENT = Math.round((OCCUPIED_BEDS / TOTAL_BEDS) * 100);
export const BEDS_AVAILABLE = EMERGENCY_BEDS.filter((b) => b.baseStatus === 'Available').length;
export const BED_STATUS: BedStatusRow[] = [
  { label: 'Available', count: BEDS_AVAILABLE, color: '#16A34A' },
  { label: 'Occupied', count: OCCUPIED_BEDS, color: '#00B4D8' },
  {
    label: 'Cleaning',
    count: EMERGENCY_BEDS.filter((b) => b.baseStatus === 'Cleaning').length,
    color: '#8A98A3',
  },
  {
    label: 'Reserved',
    count: EMERGENCY_BEDS.filter((b) => b.baseStatus === 'Reserved').length,
    color: '#94A3B8',
  },
];
export const ISOLATION_BEDS_TOTAL = EMERGENCY_BEDS.filter((b) => b.type === 'Isolation Bed').length;
export const ISOLATION_BEDS_AVAILABLE = EMERGENCY_BEDS.filter(
  (b) => b.type === 'Isolation Bed' && b.baseStatus === 'Available',
).length;

/** Est. minutes to physically move a patient into a bed in this zone. */
export const ZONE_TRANSFER_MINUTES: Record<string, number> = {
  'Resuscitation Bay': 2,
  'Main Treatment Area': 4,
  'Pediatric Area': 5,
  'Isolation Ward': 6,
  'Observation Unit': 3,
};

/** Manchester-recommended bed type per assigned priority — a starting
 * suggestion Bed Requirements pre-selects; staff can always override it. */
export function recommendedBedType(priority: TriagePriority): BedType {
  return priority === 'IMMEDIATE' ? 'Resus Bed' : 'Treatment Bed';
}

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
