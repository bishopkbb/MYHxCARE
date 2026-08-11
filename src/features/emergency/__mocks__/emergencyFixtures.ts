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

// ─── Observation Unit — bays, slots, and seed patients ──────────────────
// Real bay/slot capacity (11 total across 4 bays). observationStore.ts owns
// the LIVE occupancy (admit/discharge/vitals/notes) seeded from this list —
// Dashboard's Observation Patients panel and Tracking Board's Under
// Observation rows both read the store, not this static list directly, so
// admitting or discharging a patient on the real Observation Unit screen
// shows up on both immediately.

export type ObservationBay = { bay: string; slots: string[] };

export const OBSERVATION_BAYS: ObservationBay[] = [
  { bay: 'OBS-1', slots: ['Bed 1', 'Bed 2'] },
  { bay: 'OBS-2', slots: ['Bed 1', 'Bed 2', 'Bed 3'] },
  { bay: 'OBS-3', slots: ['Bed 1', 'Bed 2', 'Bed 3'] },
  { bay: 'OBS-4', slots: ['Seat 1', 'Seat 2', 'Seat 3'] },
];
export const OBSERVATION_TOTAL_SLOTS = OBSERVATION_BAYS.reduce((sum, b) => sum + b.slots.length, 0);

export type ObservationVitals = { bp: string; hr: number; rr: number; spo2: number };

export type ObservationSeedPatient = {
  id: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female';
  bay: string;
  slotLabel: string;
  reason: string;
  physician: string;
  admittedMinutesAgo: number;
  reviewIntervalMinutes: number;
  vitals: ObservationVitals;
};

/** One slot (OBS-4 / Seat 3) is deliberately left empty so "Add Patient to
 * Observation" has somewhere real to admit into on first load, instead of
 * opening onto an immediately-full unit. */
export const OBSERVATION_SEED_PATIENTS: ObservationSeedPatient[] = [
  {
    id: 'obs-victoria-obi',
    patientName: 'Victoria Obi',
    age: 60,
    gender: 'Female',
    bay: 'OBS-1',
    slotLabel: 'Bed 1',
    reason: 'Chest pain, R/O ACS',
    physician: 'Dr. Adeyemi',
    admittedMinutesAgo: 135,
    reviewIntervalMinutes: 150,
    vitals: { bp: '128/84', hr: 92, rr: 20, spo2: 98 },
  },
  {
    id: 'obs-chukwudi-n',
    patientName: 'Chukwudi N.',
    age: 41,
    gender: 'Male',
    bay: 'OBS-1',
    slotLabel: 'Bed 2',
    reason: 'Severe headache',
    physician: 'Dr. Okafor',
    admittedMinutesAgo: 78,
    reviewIntervalMinutes: 90,
    vitals: { bp: '134/88', hr: 84, rr: 18, spo2: 99 },
  },
  {
    id: 'obs-ahmed-bello',
    patientName: 'Ahmed Bello',
    age: 52,
    gender: 'Male',
    bay: 'OBS-2',
    slotLabel: 'Bed 1',
    reason: 'Abdominal pain',
    physician: 'Dr. Bello',
    admittedMinutesAgo: 62,
    reviewIntervalMinutes: 60,
    vitals: { bp: '122/80', hr: 88, rr: 17, spo2: 97 },
  },
  {
    id: 'obs-maryam-ali',
    patientName: 'Maryam Ali',
    age: 29,
    gender: 'Female',
    bay: 'OBS-2',
    slotLabel: 'Bed 2',
    reason: 'Fever, body pain',
    physician: 'Dr. Okafor',
    admittedMinutesAgo: 45,
    reviewIntervalMinutes: 60,
    vitals: { bp: '110/72', hr: 96, rr: 19, spo2: 98 },
  },
  {
    id: 'obs-ngozi-eze',
    patientName: 'Ngozi Eze',
    age: 37,
    gender: 'Female',
    bay: 'OBS-2',
    slotLabel: 'Bed 3',
    reason: 'Cough, flu',
    physician: 'Dr. Adeyemi',
    admittedMinutesAgo: 20,
    reviewIntervalMinutes: 45,
    vitals: { bp: '118/76', hr: 80, rr: 16, spo2: 99 },
  },
  {
    id: 'obs-tobi-adeyemi',
    patientName: 'Tobi Adeyemi',
    age: 45,
    gender: 'Male',
    bay: 'OBS-3',
    slotLabel: 'Bed 1',
    reason: 'Dizziness, R/O stroke',
    physician: 'Dr. Okafor',
    admittedMinutesAgo: 35,
    reviewIntervalMinutes: 60,
    vitals: { bp: '142/90', hr: 78, rr: 18, spo2: 97 },
  },
  {
    id: 'obs-funmi-okafor',
    patientName: 'Funmi Okafor',
    age: 52,
    gender: 'Female',
    bay: 'OBS-3',
    slotLabel: 'Bed 2',
    reason: 'Hypertension',
    physician: 'Dr. Bello',
    admittedMinutesAgo: 27,
    reviewIntervalMinutes: 60,
    vitals: { bp: '150/95', hr: 82, rr: 17, spo2: 98 },
  },
  {
    id: 'obs-uche-obiora',
    patientName: 'Uche Obiora',
    age: 29,
    gender: 'Female',
    bay: 'OBS-3',
    slotLabel: 'Bed 3',
    reason: 'Vomiting, weakness',
    physician: 'Dr. Okafor',
    admittedMinutesAgo: 20,
    reviewIntervalMinutes: 45,
    vitals: { bp: '108/68', hr: 90, rr: 18, spo2: 98 },
  },
  {
    id: 'obs-halima-yusuf',
    patientName: 'Halima Yusuf',
    age: 37,
    gender: 'Female',
    bay: 'OBS-4',
    slotLabel: 'Seat 1',
    reason: 'Back pain',
    physician: 'Dr. Adeyemi',
    admittedMinutesAgo: 15,
    reviewIntervalMinutes: 45,
    vitals: { bp: '116/74', hr: 76, rr: 16, spo2: 99 },
  },
  {
    id: 'obs-emeka-nnamdi',
    patientName: 'Emeka Nnamdi',
    age: 33,
    gender: 'Male',
    bay: 'OBS-4',
    slotLabel: 'Seat 2',
    reason: 'Sore throat',
    physician: 'Dr. Bello',
    admittedMinutesAgo: 10,
    reviewIntervalMinutes: 45,
    vitals: { bp: '120/78', hr: 74, rr: 16, spo2: 99 },
  },
];

export type RecentObservationDisposition = {
  id: string;
  patientName: string;
  minutesAgo: number;
  outcome: 'Discharged' | 'Admitted' | 'Transferred';
};

export const RECENT_OBSERVATION_DISPOSITIONS: RecentObservationDisposition[] = [
  { id: 'od-1', patientName: 'Grace Nwosu', minutesAgo: 20, outcome: 'Discharged' },
  { id: 'od-2', patientName: 'Peter Aliyu', minutesAgo: 35, outcome: 'Discharged' },
  { id: 'od-3', patientName: 'Ngozi Chukwu', minutesAgo: 65, outcome: 'Admitted' },
  { id: 'od-4', patientName: 'Tunde Okoro', minutesAgo: 80, outcome: 'Transferred' },
  { id: 'od-5', patientName: 'Rita Bassey', minutesAgo: 110, outcome: 'Discharged' },
  { id: 'od-6', patientName: 'Femi Adekunle', minutesAgo: 150, outcome: 'Discharged' },
  { id: 'od-7', patientName: 'Ada Obi', minutesAgo: 190, outcome: 'Admitted' },
];

// ─── Pending Orders ──────────────────────────────────────────────────────

export const PENDING_ORDERS = {
  laboratory: 8,
  radiology: 6,
  medications: 12,
  procedures: 4,
};

// ─── Emergency Tracking Board ────────────────────────────────────────────
// The board's population is built entirely from data this file (and the
// live triage/bed stores) already own — every occupied bed in
// EMERGENCY_BEDS becomes an "In Treatment" row, OBSERVATION_PATIENTS
// becomes "Under Observation" rows, RECENT_ADMISSIONS becomes "Ready for
// Disposition"/"Discharged" rows, and any real queue entry without a bed
// yet becomes an "In Triage" row. No separate, disconnected patient list —
// see BedAssignmentWorkspace.tsx / TriageAssessmentWorkspace.tsx for how
// the live pieces are merged in at render time.

export type TrackingStatus =
  'In Triage' | 'In Treatment' | 'Under Observation' | 'Ready for Disposition' | 'Discharged';
export const TRACKING_STATUSES: TrackingStatus[] = [
  'In Triage',
  'In Treatment',
  'Under Observation',
  'Ready for Disposition',
  'Discharged',
];

export const TRACKING_ZONES = [...ZONES, 'Observation Unit', 'Discharge Area'] as const;

export type OrdersCount = { lab: number; imaging: number; rx: number; procedures: number };

const ILLUSTRATIVE_FIRST_NAMES = [
  'Chioma',
  'Emeka',
  'Ngozi',
  'Tunde',
  'Aisha',
  'Bayo',
  'Funke',
  'Chidi',
  'Amara',
  'Yusuf',
  'Kemi',
  'Segun',
];
const ILLUSTRATIVE_LAST_NAMES = [
  'Adeyemi',
  'Nwachukwu',
  'Bello',
  'Okonkwo',
  'Ibe',
  'Suleiman',
  'Eze',
  'Balogun',
  'Nnamdi',
  'Umeh',
];

/** Stable illustrative patient name for a bed/row that has no real occupant
 * on record — e.g. an occupied bed nobody has been assigned to yet this
 * session. Never used for a bed that already has a real occupant. */
export function deriveIllustrativeName(key: string): string {
  const first =
    ILLUSTRATIVE_FIRST_NAMES[
      Math.floor(mulberry32(hashSeed(`${key}-fn`))() * ILLUSTRATIVE_FIRST_NAMES.length)
    ]!;
  const last =
    ILLUSTRATIVE_LAST_NAMES[
      Math.floor(mulberry32(hashSeed(`${key}-ln`))() * ILLUSTRATIVE_LAST_NAMES.length)
    ]!;
  return `${first} ${last}`;
}

export function deriveIllustrativeMrn(key: string): string {
  const n = 10000 + Math.floor(mulberry32(hashSeed(`${key}-mrn`))() * 89999);
  return `MRN-2026-${n}`;
}

export function deriveIllustrativeAge(key: string): number {
  return 5 + Math.floor(mulberry32(hashSeed(`${key}-age`))() * 75);
}

export function deriveIllustrativeGender(key: string): 'Male' | 'Female' {
  return mulberry32(hashSeed(`${key}-gender`))() < 0.5 ? 'Male' : 'Female';
}

export function deriveIllustrativeArrivalMinutesAgo(key: string): number {
  return 10 + Math.floor(mulberry32(hashSeed(`${key}-arrival`))() * 180);
}

export function deriveIllustrativeOrders(key: string): OrdersCount {
  const r = mulberry32(hashSeed(`${key}-orders`));
  return {
    lab: Math.floor(r() * 3),
    imaging: Math.floor(r() * 2),
    rx: Math.floor(r() * 2),
    procedures: Math.floor(r() * 2),
  };
}

export function deriveIllustrativeAlert(key: string): boolean {
  return mulberry32(hashSeed(`${key}-alert`))() < 0.12;
}

export function deriveIllustrativePhysician(key: string): string {
  const names = ['Dr. Adeyemi', 'Dr. Okafor', 'Dr. Bello', 'Dr. Samuel Ade', 'Dr. Femi Balogun'];
  return names[Math.floor(mulberry32(hashSeed(`${key}-doc`))() * names.length)]!;
}

/** `RecentAdmission.arrival` ("HH:MM") / `ObservationPatient.observationTime`
 * ("HH:MM" elapsed) are display strings, not timestamps — this builds a
 * real ISO instant for today at that clock time, so Tracking Board can
 * compute "Time in ED" the same live way for every row. */
export function todayAtClockTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}

export function minutesAgoFromDuration(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

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

// ─── Emergency Medication Orders ─────────────────────────────────────────
// medicationOrderStore.ts owns the live orders (seeded from below); this
// file only holds the static catalog/reference data every patient shares.

export type MedicationRoute = 'IV' | 'IM' | 'Oral' | 'Subcutaneous' | 'Topical' | 'Rectal';
export type MedicationFrequency =
  'Once' | '4 hourly' | '6 hourly' | '8 hourly' | '12 hourly' | '24 hourly' | 'Continuous' | 'PRN';
export type MedicationOrderPriority = 'STAT' | 'High' | 'Routine' | 'Low';
export type MedicationOrderType = 'Injection' | 'IV Fluid' | 'Tablet' | 'Inhalation';

export type MedicationCatalogEntry = {
  name: string;
  type: MedicationOrderType;
  defaultDose: string;
  defaultRoute: MedicationRoute;
};

export const MEDICATION_CATALOG: MedicationCatalogEntry[] = [
  { name: 'Morphine Sulfate', type: 'Injection', defaultDose: '4 mg', defaultRoute: 'IV' },
  { name: 'Ondansetron', type: 'Injection', defaultDose: '4 mg', defaultRoute: 'IV' },
  { name: 'Paracetamol', type: 'Injection', defaultDose: '1,000 mg', defaultRoute: 'IV' },
  { name: 'Ceftriaxone', type: 'Injection', defaultDose: '1 g', defaultRoute: 'IV' },
  { name: 'Normal Saline 0.9%', type: 'IV Fluid', defaultDose: '500 ml', defaultRoute: 'IV' },
  { name: "Ringer's Lactate", type: 'IV Fluid', defaultDose: '1,000 ml', defaultRoute: 'IV' },
  { name: 'Diazepam', type: 'Injection', defaultDose: '5 mg', defaultRoute: 'IV' },
  {
    name: 'Adrenaline (Epinephrine)',
    type: 'Injection',
    defaultDose: '0.5 mg',
    defaultRoute: 'IM',
  },
  { name: 'Metronidazole', type: 'Injection', defaultDose: '500 mg', defaultRoute: 'IV' },
  { name: 'Tranexamic Acid', type: 'Injection', defaultDose: '1 g', defaultRoute: 'IV' },
  { name: 'Hydrocortisone', type: 'Injection', defaultDose: '100 mg', defaultRoute: 'IV' },
  { name: 'Salbutamol Nebule', type: 'Inhalation', defaultDose: '2.5 mg', defaultRoute: 'Oral' },
  { name: 'Aspirin', type: 'Tablet', defaultDose: '300 mg', defaultRoute: 'Oral' },
  { name: 'Warfarin', type: 'Tablet', defaultDose: '5 mg', defaultRoute: 'Oral' },
];

/** Small illustrative interaction table — checked live against whichever
 * medications are currently Active for the selected patient, so "no
 * interactions found" is a real (if limited) computation, not a hardcoded
 * always-true message. */
export const DRUG_INTERACTION_PAIRS: [string, string, string][] = [
  ['Warfarin', 'Aspirin', 'Increased bleeding risk — avoid combination or monitor INR closely.'],
  [
    'Morphine Sulfate',
    'Diazepam',
    'Additive CNS/respiratory depression — monitor respiratory rate closely.',
  ],
];

/** No per-patient lab-order store exists yet (Diagnostic Requests is a
 * still-unbuilt follow-up screen) — a generic illustrative set of the labs
 * that most commonly affect ED medication dosing. */
export const PENDING_LABS_AFFECTING_MEDICATIONS = [
  'Creatinine',
  'Liver Function Test',
  'Potassium',
];

export function deriveWeightKg(entryId: string): number {
  return 50 + Math.floor(mulberry32(hashSeed(`${entryId}-weight`))() * 45);
}

export function deriveConsultationId(entryId: string): string {
  const n = 1000000 + Math.floor(mulberry32(hashSeed(`${entryId}-cons`))() * 8999999);
  return `CONS-${n}`;
}

export type LatestVitals = { bp: string; hr: number; rr: number; spo2: number };

export function deriveLatestVitals(entryId: string): LatestVitals {
  const r = mulberry32(hashSeed(`${entryId}-vitals`));
  const systolic = 100 + Math.floor(r() * 45);
  const diastolic = 60 + Math.floor(r() * 25);
  const hr = 65 + Math.floor(r() * 45);
  const rr = 14 + Math.floor(r() * 12);
  const spo2 = 94 + Math.floor(r() * 6);
  return { bp: `${systolic}/${diastolic}`, hr, rr, spo2 };
}

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export function deriveBloodGroup(entryId: string): string {
  const r = mulberry32(hashSeed(`${entryId}-blood`))();
  return BLOOD_GROUPS[Math.floor(r * BLOOD_GROUPS.length)]!;
}

/** Illustrative pool — falls back to a deterministic pick when no clinical
 * note has recorded a real Working Diagnosis yet for this patient
 * (`clinicalNotesStore.ts`'s `useLatestWorkingDiagnoses` is the real source,
 * checked first — safe-merge-at-read-time, same pattern as triage). */
export const DIAGNOSIS_SUGGESTIONS = [
  'Acute Respiratory Distress',
  'Hypertensive Emergency',
  'Suspected Pneumonia',
  'Acute Coronary Syndrome (ACS)',
  'Sepsis',
  'Acute Abdomen',
  'Closed Head Injury',
  'Multiple Trauma',
  'Diabetic Ketoacidosis',
  'Status Epilepticus',
  'Hypertension',
];

export function deriveActiveDiagnoses(entryId: string): string[] {
  const r = mulberry32(hashSeed(`${entryId}-diagnoses`));
  const count = 2 + Math.floor(r() * 2);
  const pool = [...DIAGNOSIS_SUGGESTIONS];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(r() * pool.length);
    picked.push(pool.splice(idx, 1)[0]!);
  }
  return picked;
}

export type EmergencyContact = { name: string; relation: string; phone: string };

const CONTACT_RELATIONS = [
  'Sister',
  'Brother',
  'Mother',
  'Father',
  'Spouse',
  'Son',
  'Daughter',
  'Friend',
];
const CONTACT_FIRST_NAMES = ['Ada', 'Ngozi', 'Chidi', 'Emeka', 'Amara', 'Tunde', 'Bisi', 'Yemi'];
const CONTACT_LAST_NAMES = ['Onu', 'Eze', 'Okafor', 'Adeyemi', 'Balogun', 'Nwosu', 'Ibrahim'];

export function deriveEmergencyContact(
  entryId: string,
  patientLastName?: string,
): EmergencyContact {
  const r = mulberry32(hashSeed(`${entryId}-contact`));
  const relation = CONTACT_RELATIONS[Math.floor(r() * CONTACT_RELATIONS.length)]!;
  const first = CONTACT_FIRST_NAMES[Math.floor(r() * CONTACT_FIRST_NAMES.length)]!;
  const last = patientLastName || CONTACT_LAST_NAMES[Math.floor(r() * CONTACT_LAST_NAMES.length)]!;
  const prefixes = ['0803', '0805', '0806', '0810', '0813', '0816', '0703', '0706'];
  const prefix = prefixes[Math.floor(r() * prefixes.length)]!;
  const rest = String(Math.floor(r() * 1_000_000)).padStart(6, '0');
  return {
    name: `${first} ${last}`,
    relation,
    phone: `${prefix} ${rest.slice(0, 3)} ${rest.slice(3)}`,
  };
}

// ─── Clinical Notes ─────────────────────────────────────────────────────
// clinicalNotesStore.ts owns the live per-patient notes; this file only
// holds the static template/snippet catalog every author shares.

export type ClinicalNoteTemplate = {
  name: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export const CLINICAL_NOTE_TEMPLATES: ClinicalNoteTemplate[] = [
  {
    name: 'Cardiac Chief Complaint',
    subjective:
      '<p><b>Chief complaint:</b> Chest pain and shortness of breath.</p><p><b>History of present illness:</b> Onset, character, radiation, associated symptoms.</p>',
    objective:
      '<p>Vitals reviewed. Cardiovascular exam: heart sounds, rhythm, peripheral pulses. Respiratory exam.</p>',
    assessment:
      '<p>Differential includes ACS, unstable angina, and non-cardiac causes pending workup.</p>',
    plan: '<p>ECG, troponin, aspirin per protocol, continuous cardiac monitoring.</p>',
  },
  {
    name: 'Trauma Assessment',
    subjective: '<p><b>Mechanism of injury:</b> </p><p><b>Chief complaint:</b> </p>',
    objective: '<p>Primary survey (ABCDE) completed. Secondary survey findings: </p>',
    assessment: '<p>Injuries identified: </p>',
    plan: '<p>Imaging, analgesia, and disposition per trauma protocol.</p>',
  },
  {
    name: 'Respiratory Complaint',
    subjective:
      '<p><b>Chief complaint:</b> Shortness of breath / cough.</p><p><b>History of present illness:</b> </p>',
    objective: '<p>Respiratory rate, SpO2, auscultation findings: </p>',
    assessment: '<p>Differential includes asthma exacerbation, pneumonia, COPD exacerbation.</p>',
    plan: '<p>Oxygen therapy, nebulized bronchodilator, chest X-ray.</p>',
  },
];

export const SMART_TEXT_SNIPPETS: { label: string; text: string }[] = [
  { label: 'No acute distress', text: 'Patient is alert, oriented, and in no acute distress. ' },
  {
    label: 'Normal cardiovascular exam',
    text: 'Cardiovascular: S1/S2 normal, no murmurs, regular rhythm, pulses intact bilaterally. ',
  },
  {
    label: 'Normal respiratory exam',
    text: 'Respiratory: Chest clear to auscultation bilaterally, no wheeze or crackles. ',
  },
  {
    label: 'Normal abdominal exam',
    text: 'Abdomen: Soft, non-tender, non-distended, bowel sounds present. ',
  },
  {
    label: 'Discussed plan with patient',
    text: 'Plan discussed with patient/family; questions answered; patient agrees with plan of care. ',
  },
  { label: 'Will reassess', text: 'Will continue to monitor and reassess response to treatment. ' },
];

// ─── Emergency Procedures ─────────────────────────────────────────────────
// procedureStore.ts owns the live per-patient procedure log (seeded from
// below); this file only holds the static catalog/reference data every
// patient shares.

export type ProcedureType =
  | 'Airway'
  | 'Cardiac'
  | 'Thoracic'
  | 'Vascular Access'
  | 'Minor Procedure'
  | 'Neurological'
  | 'Orthopedic'
  | 'Genitourinary';

export type ProcedureCatalogEntry = {
  name: string;
  type: ProcedureType;
};

export const COMMON_PROCEDURES: ProcedureCatalogEntry[] = [
  { name: 'Endotracheal Intubation', type: 'Airway' },
  { name: 'CPR', type: 'Cardiac' },
  { name: 'Defibrillation', type: 'Cardiac' },
  { name: 'Chest Tube Insertion', type: 'Thoracic' },
  { name: 'Central Line Insertion', type: 'Vascular Access' },
  { name: 'Lumbar Puncture', type: 'Neurological' },
  { name: 'Wound Suturing', type: 'Minor Procedure' },
  { name: 'Incision & Drainage', type: 'Minor Procedure' },
  { name: 'Reduction of Dislocation', type: 'Orthopedic' },
  { name: 'Urinary Catheterization', type: 'Genitourinary' },
];

export type ProcedureReference = {
  indications: string;
  equipment: string[];
  steps: string[];
  risks: string;
};

/** Reference detail for the 10 common procedures, shown on the Procedure
 * Details tab. Procedures logged with a custom name (not in this catalog)
 * fall back to a generic message rather than a fabricated protocol. */
export const PROCEDURE_REFERENCE: Record<string, ProcedureReference> = {
  'Endotracheal Intubation': {
    indications: 'Airway protection, respiratory failure, or inability to maintain oxygenation.',
    equipment: ['Laryngoscope', 'ET tube', 'Bag-valve mask', 'Suction', 'End-tidal CO2 detector'],
    steps: [
      'Pre-oxygenate the patient',
      'Position airway (sniffing position)',
      'Insert laryngoscope and visualize cords',
      'Pass ET tube and inflate cuff',
      'Confirm placement (auscultation + capnography)',
      'Secure tube and connect to ventilator',
    ],
    risks: 'Esophageal intubation, dental trauma, hypoxia during attempt, aspiration.',
  },
  CPR: {
    indications: 'Cardiac arrest — absence of pulse or normal breathing.',
    equipment: ['Defibrillator/AED', 'Bag-valve mask', 'Backboard'],
    steps: [
      'Confirm unresponsiveness and absent pulse',
      'Begin chest compressions at 100–120/min',
      'Attach defibrillator and assess rhythm',
      'Deliver shock if indicated, resume compressions',
      'Establish airway and give rescue breaths per protocol',
    ],
    risks: 'Rib fracture, pneumothorax, incomplete recovery.',
  },
  Defibrillation: {
    indications:
      'Shockable rhythm — ventricular fibrillation or pulseless ventricular tachycardia.',
    equipment: ['Defibrillator', 'Conductive gel pads', 'ECG monitor'],
    steps: [
      'Confirm shockable rhythm on monitor',
      'Charge defibrillator to protocol energy level',
      'Ensure all personnel clear of patient',
      'Deliver shock',
      'Resume CPR immediately, reassess rhythm in 2 minutes',
    ],
    risks: 'Skin burns, arrhythmia, injury to staff if contact during shock.',
  },
  'Chest Tube Insertion': {
    indications: 'Pneumothorax, hemothorax, or pleural effusion requiring drainage.',
    equipment: ['Chest tube kit', 'Local anesthetic', 'Underwater seal drain', 'Sutures'],
    steps: [
      'Identify insertion site (5th intercostal space, mid-axillary line)',
      'Administer local anesthetic',
      'Make incision and blunt-dissect to pleura',
      'Insert tube and connect to drainage system',
      'Suture in place and confirm with chest X-ray',
    ],
    risks: 'Bleeding, organ injury, infection, tube malposition.',
  },
  'Central Line Insertion': {
    indications: 'Vascular access for fluids/medications when peripheral access is inadequate.',
    equipment: ['Central line kit', 'Ultrasound', 'Sterile drapes', 'Local anesthetic'],
    steps: [
      'Position patient and identify landmarks (ultrasound-guided)',
      'Sterile prep and drape the site',
      'Cannulate vein using Seldinger technique',
      'Advance catheter and secure',
      'Confirm placement with chest X-ray',
    ],
    risks: 'Pneumothorax, arterial puncture, infection, catheter malposition.',
  },
  'Lumbar Puncture': {
    indications: 'Suspected meningitis, subarachnoid hemorrhage, or CSF analysis.',
    equipment: ['LP kit', 'Local anesthetic', 'Manometer', 'Specimen tubes'],
    steps: [
      'Position patient in lateral decubitus or sitting',
      'Identify L3–L4 or L4–L5 interspace',
      'Administer local anesthetic',
      'Advance spinal needle, collect CSF',
      'Measure opening pressure and label specimens',
    ],
    risks: 'Post-LP headache, bleeding, infection, herniation in raised ICP.',
  },
  'Wound Suturing': {
    indications: 'Laceration requiring primary closure.',
    equipment: ['Suture kit', 'Local anesthetic', 'Sterile saline', 'Dressing'],
    steps: [
      'Irrigate and clean the wound',
      'Administer local anesthetic',
      'Explore for foreign bodies/tendon involvement',
      'Approximate wound edges and suture',
      'Apply dressing and advise on wound care',
    ],
    risks: 'Infection, scarring, wound dehiscence.',
  },
  'Incision & Drainage': {
    indications: 'Abscess requiring drainage.',
    equipment: ['Scalpel', 'Local anesthetic', 'Packing gauze', 'Sterile dressing'],
    steps: [
      'Administer local anesthetic',
      'Make incision over the point of maximal fluctuance',
      'Express purulent material and break loculations',
      'Irrigate cavity and pack if needed',
      'Apply dressing and arrange follow-up',
    ],
    risks: 'Bleeding, incomplete drainage, recurrence, scarring.',
  },
  'Reduction of Dislocation': {
    indications: 'Joint dislocation with neurovascular compromise or significant pain.',
    equipment: ['Analgesia/procedural sedation', 'Sling or splint', 'Monitoring equipment'],
    steps: [
      'Assess and document neurovascular status',
      'Administer analgesia or procedural sedation',
      'Apply reduction maneuver appropriate to joint',
      'Reassess neurovascular status post-reduction',
      'Immobilize and obtain post-reduction imaging',
    ],
    risks: 'Neurovascular injury, fracture, failed reduction.',
  },
  'Urinary Catheterization': {
    indications: 'Urinary retention, accurate output monitoring, or pre-operative need.',
    equipment: ['Foley catheter kit', 'Sterile gloves', 'Lubricant', 'Drainage bag'],
    steps: [
      'Position patient and prep with antiseptic',
      'Insert catheter using sterile technique',
      'Inflate balloon once urine return confirmed',
      'Connect to drainage bag and secure',
      'Document residual volume',
    ],
    risks: 'Urethral trauma, infection, false passage.',
  },
};
