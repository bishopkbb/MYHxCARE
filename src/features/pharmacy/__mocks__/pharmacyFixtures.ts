/**
 * Mock fixtures for the Pharmacy Dashboard — prescription dispensing queue,
 * drug inventory, batch/expiry tracking, and stock transfers. Prescription
 * queue entries link to real, resolvable patients (`getPatientDetail()`) and
 * real doctors (`DOCTORS`) rather than inventing disconnected personas — the
 * same lesson this session's own name-collision fixes (SYS-001/005/007)
 * established. Swap out by pointing hooks to real endpoints in Phase 6.
 */

import { DOCTORS } from '@/features/shared/__mocks__/doctorDirectory';
import { PHARMACY_LOCATIONS, type PharmacyLocationId } from '@/constants/pharmacyLocations';
import { DIRECTORY_PATIENTS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import type { SelectOption } from '@/features/registration/__mocks__/registerPatientOptions';

// ── Prescription queue ───────────────────────────────────────────────────────

export type PharmacyQueueStage =
  | 'Pending Verification'
  | 'In Progress'
  | 'Ready for Dispense'
  | 'Ready for Pickup'
  | 'Collected'
  | 'Cancelled';
export type PharmacyPriority = 'High' | 'Medium' | 'Low';
export type PickupType = 'Self Pickup' | 'Will Call' | 'Family Pickup';

/** DEA/NDLEA-style controlled substance schedule — set on the small subset of
 * inventory items and dispensing records that are actually controlled drugs;
 * everything else leaves this field unset. */
export type ControlledSchedule = 'C-II' | 'C-III' | 'C-IV' | 'C-V';

export const CONTROLLED_SCHEDULE_OPTIONS: SelectOption[] = [
  { value: 'C-II', label: 'Schedule II' },
  { value: 'C-III', label: 'Schedule III' },
  { value: 'C-IV', label: 'Schedule IV' },
  { value: 'C-V', label: 'Schedule V' },
];

export type PharmacyQueueEntry = {
  rxNo: string;
  /** Resolvable via getPatientDetail() from patientFixtures.ts — never a
   * disconnected free-text name. */
  patientId: string;
  medicationName: string;
  dose: string;
  frequency: string;
  doctorName: string;
  /** The prescriber's own department, from the shared DOCTORS roster. */
  department: string;
  priority: PharmacyPriority;
  hasAllergyAlert: boolean;
  receivedAt: string; // ISO
  stage: PharmacyQueueStage;
  dispensedAt?: string; // ISO
  collectedAt?: string; // ISO
  cancelledAt?: string; // ISO
  /** Derived once at construction from MEDICATION_INFO, keyed by medicationName
   * — dosage form, route, course length, computed quantity, and standard
   * instructions/prescriber note, for the Prescription Details screen. */
  form: string;
  route: string;
  duration: string;
  /** Numeric course length backing `duration`'s human-readable label — what
   * the Active Prescriptions screen computes an honest End Date/days-left
   * from, rather than parsing the display string. */
  courseDays: number;
  quantity: number;
  instructions: string;
  prescriberNote: string;
  /** Set by a pharmacist on the Prescription Details screen — real, shared
   * state, not page-local. */
  pharmacistNote?: string;
  noteUpdatedAt?: string; // ISO
  /** A temporary safety hold, independent of `stage` — a held prescription
   * stays wherever it is in the pipeline but is flagged for attention. */
  isOnHold?: boolean;
  /** How the patient collects a dispensed prescription — meaningful once a
   * prescription reaches Ready for Pickup, used by the Medication Pickup
   * Queue screen. */
  pickupType: PickupType;
};

function atOffset(hoursAgo: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo, d.getMinutes(), 0, 0);
  return d.toISOString();
}

function todayAt(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function pastDateAt(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const RX_MEDICATIONS: { name: string; dose: string; frequency: string }[] = [
  { name: 'Paracetamol', dose: '1000mg', frequency: 'TDS' },
  { name: 'Amoxicillin', dose: '500mg', frequency: 'TDS' },
  { name: 'Metformin', dose: '500mg', frequency: 'BD' },
  { name: 'Atorvastatin', dose: '20mg', frequency: 'OD' },
  { name: 'Salbutamol Inhaler', dose: '100mcg', frequency: 'PRN' },
  { name: 'Losartan', dose: '50mg', frequency: 'OD' },
  { name: 'Omeprazole', dose: '20mg', frequency: 'OD' },
  { name: 'Ciprofloxacin', dose: '500mg', frequency: 'BD' },
  { name: 'Ibuprofen', dose: '400mg', frequency: 'TDS' },
  { name: 'Amlodipine', dose: '5mg', frequency: 'OD' },
];

const PRIORITIES: PharmacyPriority[] = ['High', 'Medium', 'Low', 'Low', 'Medium'];

// ~71% Self Pickup, ~14% Will Call, ~14% Family Pickup.
const PICKUP_TYPES: PickupType[] = [
  'Self Pickup',
  'Self Pickup',
  'Self Pickup',
  'Self Pickup',
  'Self Pickup',
  'Will Call',
  'Family Pickup',
];

/** Dosage form, route, standard course length, and prescriber guidance per
 * medication — derived once at construction into each queue entry, and
 * reused by the Prescription Details screen for Quantity/Duration/Route and
 * the Clinical Alerts "Notes from Prescriber" panel. Course length and doses
 * per day are what an honest "Total Quantity" is computed from, not a
 * hardcoded number. */
const MEDICATION_INFO: Record<
  string,
  {
    form: string;
    route: string;
    dosesPerDay: number | null; // null = PRN (as-needed), quantity is a unit count
    courseDays: number;
    instructions: string;
    prescriberNote: string;
  }
> = {
  Paracetamol: {
    form: 'Tablet',
    route: 'Oral',
    dosesPerDay: 3,
    courseDays: 5,
    instructions: 'Take with food',
    prescriberNote: 'Monitor for fever response.',
  },
  Amoxicillin: {
    form: 'Capsule',
    route: 'Oral',
    dosesPerDay: 3,
    courseDays: 5,
    instructions: 'Take with food',
    prescriberNote: 'Complete full course even if symptoms improve.',
  },
  Metformin: {
    form: 'Tablet',
    route: 'Oral',
    dosesPerDay: 2,
    courseDays: 30,
    instructions: 'Take after meals',
    prescriberNote: 'Monitor blood glucose regularly.',
  },
  Atorvastatin: {
    form: 'Tablet',
    route: 'Oral',
    dosesPerDay: 1,
    courseDays: 30,
    instructions: 'Take at bedtime',
    prescriberNote: 'Monitor for muscle pain.',
  },
  'Salbutamol Inhaler': {
    form: 'Inhaler',
    route: 'Inhalation',
    dosesPerDay: null,
    courseDays: 30,
    instructions: 'Use as needed for breathlessness',
    prescriberNote: 'Review inhaler technique at next visit.',
  },
  Losartan: {
    form: 'Tablet',
    route: 'Oral',
    dosesPerDay: 1,
    courseDays: 30,
    instructions: 'Take in the morning',
    prescriberNote: 'Monitor blood pressure.',
  },
  Omeprazole: {
    form: 'Capsule',
    route: 'Oral',
    dosesPerDay: 1,
    courseDays: 14,
    instructions: 'Take before breakfast',
    prescriberNote: 'Reassess if symptoms persist beyond 2 weeks.',
  },
  Ciprofloxacin: {
    form: 'Tablet',
    route: 'Oral',
    dosesPerDay: 2,
    courseDays: 7,
    instructions: 'Take with plenty of water',
    prescriberNote: 'Avoid dairy products within 2 hours of dosing.',
  },
  Ibuprofen: {
    form: 'Tablet',
    route: 'Oral',
    dosesPerDay: 3,
    courseDays: 5,
    instructions: 'Take with food',
    prescriberNote: 'Avoid if history of peptic ulcer.',
  },
  Amlodipine: {
    form: 'Tablet',
    route: 'Oral',
    dosesPerDay: 1,
    courseDays: 30,
    instructions: 'Take at the same time daily',
    prescriberNote: 'Monitor for ankle swelling.',
  },
};

const GENERIC_MEDICATION_INFO = {
  form: 'Tablet',
  route: 'Oral',
  dosesPerDay: 2,
  courseDays: 5,
  instructions: 'Take as directed',
  prescriberNote: '',
};

function getMedicationInfo(name: string) {
  return MEDICATION_INFO[name] ?? GENERIC_MEDICATION_INFO;
}

/** The one place quantity/duration are computed from a medication's form and
 * course length — reused by the seed builder and the live prescriptionStore
 * bridge, so a doctor-sent prescription gets the same honest derivation as a
 * seeded one, never a hardcoded placeholder. */
export function deriveMedicationFields(name: string): {
  form: string;
  route: string;
  duration: string;
  courseDays: number;
  quantity: number;
  instructions: string;
  prescriberNote: string;
} {
  const info = getMedicationInfo(name);
  const quantity = info.dosesPerDay === null ? 1 : info.dosesPerDay * info.courseDays;
  const duration = info.dosesPerDay === null ? 'As needed' : `${info.courseDays} Days`;
  return {
    form: info.form,
    route: info.route,
    duration,
    courseDays: info.courseDays,
    quantity,
    instructions: info.instructions,
    prescriberNote: info.prescriberNote,
  };
}

/** Real, clinically-recognized interacting pairs — a small curated knowledge
 * base, not a claim of full drug-interaction coverage. Checked both
 * directions against a patient's active medications. */
const DRUG_INTERACTIONS: { a: string; b: string; description: string }[] = [
  {
    a: 'Losartan',
    b: 'Ibuprofen',
    description:
      'NSAIDs like Ibuprofen may reduce the antihypertensive effect of Losartan and increase the risk of kidney impairment.',
  },
  {
    a: 'Atorvastatin',
    b: 'Ciprofloxacin',
    description:
      'Ciprofloxacin may raise Atorvastatin levels, increasing the risk of muscle toxicity (myopathy).',
  },
  {
    a: 'Amlodipine',
    b: 'Ciprofloxacin',
    description:
      'Rarely, concurrent use may increase the risk of low blood pressure — monitor after the first dose.',
  },
];

/** Checks the medication being dispensed against a patient's own active
 * medication list — real, patient-specific, not a static per-drug flag. */
export function getInteractionWarning(
  medicationName: string,
  activeMedicationNames: string[],
): string | null {
  const active = activeMedicationNames.map((n) => n.toLowerCase());
  for (const pair of DRUG_INTERACTIONS) {
    const [a, b] = [pair.a.toLowerCase(), pair.b.toLowerCase()];
    const matchesA = medicationName.toLowerCase().startsWith(a);
    const matchesB = medicationName.toLowerCase().startsWith(b);
    if (matchesA && active.some((m) => m.startsWith(b))) return pair.description;
    if (matchesB && active.some((m) => m.startsWith(a))) return pair.description;
  }
  return null;
}

let rxSeq = 0;
function nextRxNo(): string {
  rxSeq += 1;
  return `RX-${new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2)}-${String(rxSeq).padStart(3, '0')}`;
}

function buildQueueEntry(
  patientId: string,
  hoursAgo: number,
  stage: PharmacyQueueStage,
  overrides: Partial<PharmacyQueueEntry> = {},
): PharmacyQueueEntry {
  const med = RX_MEDICATIONS[rxSeq % RX_MEDICATIONS.length]!;
  const doctor = DOCTORS[rxSeq % DOCTORS.length]!;
  const name = overrides.medicationName ?? med.name;
  const dose = overrides.dose ?? med.dose;
  const frequency = overrides.frequency ?? med.frequency;
  const derived = deriveMedicationFields(name);
  const entry: PharmacyQueueEntry = {
    rxNo: nextRxNo(),
    patientId,
    medicationName: name,
    dose,
    frequency,
    doctorName: doctor.name,
    department: doctor.department,
    priority: PRIORITIES[rxSeq % PRIORITIES.length]!,
    pickupType: PICKUP_TYPES[rxSeq % PICKUP_TYPES.length]!,
    hasAllergyAlert: rxSeq % 7 === 0,
    receivedAt: atOffset(hoursAgo),
    stage,
    ...derived,
    ...overrides,
  };
  return entry;
}

// 5 curated rows, linked to real, already-established patients elsewhere in
// the app (Registration directory / nursing roster) — same "flagship
// resolvable persona" convention used throughout this session.
const CURATED_PENDING: PharmacyQueueEntry[] = [
  buildQueueEntry('dp-001', 5.25, 'Pending Verification', {
    priority: 'High',
    hasAllergyAlert: true,
  }),
  buildQueueEntry('np-002', 4.5, 'Pending Verification', {
    priority: 'Medium',
    hasAllergyAlert: true,
  }),
  // p1 (Nkechi Obiora) already takes Ibuprofen — a real, checkable
  // interaction with the Losartan being prescribed here, and a populated
  // medication/consultation history for the Prescription Details showcase.
  buildQueueEntry('p1', 5.75, 'Pending Verification', {
    priority: 'Medium',
    medicationName: 'Losartan',
    dose: '50mg',
    frequency: 'OD',
  }),
  buildQueueEntry('dp-004', 6.05, 'Pending Verification', { priority: 'Low' }),
  buildQueueEntry('dp-006', 6.35, 'Pending Verification', { priority: 'High' }),
];

const GENERATED_PENDING: PharmacyQueueEntry[] = Array.from({ length: 27 }, (_, i) => {
  const entry = buildQueueEntry(
    `dp-${String((i % 60) + 7).padStart(3, '0')}`,
    1 + (i % 8),
    'Pending Verification',
  );
  // One held before verification even starts — e.g. an allergy flag the
  // pharmacist wants the prescriber to confirm first. Gives Queue Monitor's
  // On Hold bucket cross-stage variety, not just Ready for Pickup holds.
  if (i === 4) entry.isOnHold = true;
  return entry;
});

const GENERATED_READY_FOR_PICKUP: PharmacyQueueEntry[] = Array.from({ length: 21 }, (_, i) => {
  const entry = buildQueueEntry(
    `dp-${String((i % 60) + 70).padStart(3, '0')}`,
    2 + (i % 6),
    'Ready for Pickup',
  );
  entry.dispensedAt = todayAt(8 + (i % 9), (i * 7) % 60);
  // A couple already flagged on hold — e.g. the pharmacist paused release
  // pending a safety follow-up — for the Pickup Queue's "Will Call / On Hold"
  // bucket to have real, non-zero content.
  if (i === 2 || i === 9) entry.isOnHold = true;
  return entry;
});

// A pharmacist has opened these and started verification but not finished —
// mid-pipeline, ahead of the Pending Verification queue.
const GENERATED_IN_PROGRESS: PharmacyQueueEntry[] = Array.from({ length: 8 }, (_, i) => {
  const entry = buildQueueEntry(
    `dp-${String((i % 60) + 100).padStart(3, '0')}`,
    0.5 + i * 0.3,
    'In Progress',
  );
  if (i === 1) entry.isOnHold = true;
  return entry;
});

// Verified and cleared — waiting on the pharmacist to physically dispense
// (the step before a prescription becomes Ready for Pickup).
const GENERATED_READY_FOR_DISPENSE: PharmacyQueueEntry[] = Array.from({ length: 21 }, (_, i) =>
  buildQueueEntry(
    `dp-${String((i % 60) + 110).padStart(3, '0')}`,
    0.2 + (i % 6) * 0.4,
    'Ready for Dispense',
  ),
);

// Cancelled today — by the prescriber, the patient, or a pharmacist safety hold.
const GENERATED_CANCELLED: PharmacyQueueEntry[] = Array.from({ length: 3 }, (_, i) => {
  const entry = buildQueueEntry(
    `dp-${String((i % 60) + 120).padStart(3, '0')}`,
    3 + i,
    'Cancelled',
  );
  entry.cancelledAt = todayAt(9 + i, (i * 17) % 60);
  return entry;
});

const GENERATED_COLLECTED: PharmacyQueueEntry[] = Array.from({ length: 127 }, (_, i) => {
  const entry = buildQueueEntry(
    `dp-${String((i % 60) + 135).padStart(3, '0')}`,
    3 + (i % 10),
    'Collected',
  );
  // The first 50 were dispensed earlier today (recent activity); the rest
  // spread across the past 1-45 days so course end dates vary — giving
  // Active Prescriptions a real mix of Active/Ending Soon/Overdue instead of
  // every course starting "today".
  const daysAgo = i < 50 ? 0 : ((i - 50) % 45) + 1;
  entry.dispensedAt = pastDateAt(daysAgo, 7 + (i % 10), (i * 11) % 60);
  entry.collectedAt = pastDateAt(daysAgo, 8 + (i % 10), (i * 13) % 60);
  return entry;
});

/** Seed queue — 32 Pending Verification, 8 In Progress, 21 Ready for Dispense,
 * 21 Ready for Pickup, 3 Cancelled (85 active in the pipeline), plus 127
 * already Collected (spread across today and the past 45 days, so dispensing
 * courses land at every stage — see GENERATED_COLLECTED).
 * `pharmacyDispensingStore.ts` owns the live, mutable copy of this seed. */
export const PHARMACY_QUEUE_SEED: PharmacyQueueEntry[] = [
  ...CURATED_PENDING,
  ...GENERATED_PENDING,
  ...GENERATED_IN_PROGRESS,
  ...GENERATED_READY_FOR_DISPENSE,
  ...GENERATED_READY_FOR_PICKUP,
  ...GENERATED_CANCELLED,
  ...GENERATED_COLLECTED,
];

// ── Prescription Queue screen — filter options ──────────────────────────────

export const QUEUE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Pending Verification', label: 'Pending Verification' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Ready for Dispense', label: 'Ready for Dispense' },
  { value: 'Ready for Pickup', label: 'Ready for Pickup' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const QUEUE_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export const QUEUE_PRESCRIBER_OPTIONS: SelectOption[] = DOCTORS.map((d) => ({
  value: d.name,
  label: d.name,
}));

export const QUEUE_DEPARTMENT_OPTIONS: SelectOption[] = Array.from(
  new Set(DOCTORS.map((d) => d.department)),
).map((dept) => ({ value: dept, label: dept }));

export const PICKUP_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Self Pickup', label: 'Self Pickup' },
  { value: 'Will Call', label: 'Will Call' },
  { value: 'Family Pickup', label: 'Family Pickup' },
];

export const DISPENSING_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Completed', label: 'Completed' },
  { value: 'Partial', label: 'Partial' },
  { value: 'Returned', label: 'Returned' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Pending Approval', label: 'Pending Approval' },
];

// ── Recent dispensing activity / dispensing history ─────────────────────────

/** "Pending Approval" only ever appears on controlled-substance records —
 * NDLEA-class dispenses that require a second pharmacist's sign-off before
 * they count as Completed. */
export type DispensingStatus =
  'Completed' | 'Partial' | 'Returned' | 'Cancelled' | 'Pending Approval';

export type DispensingActivityEntry = {
  id: string;
  medicationName: string;
  patientId: string;
  rxNo: string;
  dispensedAt: string; // ISO
  /** Dose/qty/unit/prescriber/department — populated so the Dispensing
   * History screen can show a full transaction record, not just a name and a
   * timestamp. */
  dose: string;
  qty: number;
  unit: string;
  doctorName: string;
  department: string;
  status: DispensingStatus;
  /** Set only on controlled-substance dispenses — powers the Controlled
   * Drugs screen's table/stats/schedule breakdown without a separate log. */
  controlledSchedule?: ControlledSchedule;
  /** The pharmacist who countersigned a Pending Approval record — set once
   * approved, mirroring the second-signature requirement for controlled
   * substances. */
  approvedBy?: string;
  /** Who actually dispensed it — only set on live entries `verifyAndDispense()`
   * creates; the 300+ seeded historical rows predate this field. */
  dispensedBy?: string;
};

const CURATED_DISPENSING_ACTIVITY: DispensingActivityEntry[] = [
  {
    id: 'da-1',
    medicationName: 'Amoxicillin 500mg',
    patientId: 'dp-001',
    rxNo: 'RX-250629-1458',
    dispensedAt: todayAt(10, 25),
    dose: '500mg',
    qty: 15,
    unit: 'Capsule',
    doctorName: DOCTORS[0]!.name,
    department: DOCTORS[0]!.department,
    status: 'Completed',
  },
  {
    id: 'da-2',
    medicationName: 'Metformin 500mg',
    patientId: 'np-002',
    rxNo: 'RX-250629-1457',
    dispensedAt: todayAt(10, 18),
    dose: '500mg',
    qty: 60,
    unit: 'Tablet',
    doctorName: DOCTORS[1]!.name,
    department: DOCTORS[1]!.department,
    status: 'Completed',
  },
  {
    id: 'da-3',
    medicationName: 'Atorvastatin 20mg',
    patientId: 'dp-002',
    rxNo: 'RX-250629-1456',
    dispensedAt: todayAt(10, 12),
    dose: '20mg',
    qty: 30,
    unit: 'Tablet',
    doctorName: DOCTORS[2]!.name,
    department: DOCTORS[2]!.department,
    status: 'Completed',
  },
  {
    id: 'da-4',
    medicationName: 'Salbutamol Inhaler',
    patientId: 'dp-004',
    rxNo: 'RX-250629-1455',
    dispensedAt: todayAt(10, 5),
    dose: '100mcg',
    qty: 1,
    unit: 'Inhaler',
    doctorName: DOCTORS[3]!.name,
    department: DOCTORS[3]!.department,
    status: 'Completed',
  },
  {
    id: 'da-5',
    medicationName: 'Losartan 50mg',
    patientId: 'dp-006',
    rxNo: 'RX-250629-1454',
    dispensedAt: todayAt(9, 58),
    dose: '50mg',
    qty: 30,
    unit: 'Tablet',
    doctorName: DOCTORS[4]!.name,
    department: DOCTORS[4]!.department,
    status: 'Completed',
  },
];

const HISTORY_MEDICATIONS: { name: string; dose: string; unit: string }[] = [
  { name: 'Amoxicillin 500mg', dose: '500mg', unit: 'Capsule' },
  { name: 'Metformin 500mg', dose: '500mg', unit: 'Tablet' },
  { name: 'Atorvastatin 20mg', dose: '20mg', unit: 'Tablet' },
  { name: 'Salbutamol Inhaler', dose: '100mcg', unit: 'Inhaler' },
  { name: 'Losartan 50mg', dose: '50mg', unit: 'Tablet' },
  { name: 'Omeprazole 20mg', dose: '20mg', unit: 'Capsule' },
  { name: 'Ciprofloxacin 500mg', dose: '500mg', unit: 'Tablet' },
  { name: 'Ibuprofen 400mg', dose: '400mg', unit: 'Tablet' },
  { name: 'Amlodipine 5mg', dose: '5mg', unit: 'Tablet' },
  { name: 'Paracetamol 1000mg', dose: '1000mg', unit: 'Tablet' },
];

// ~90 days of past transaction history, feeding the Dispensing History
// screen's stats/table/Top Medications ranking — all real, derived counts,
// not hardcoded totals.
const GENERATED_DISPENSING_HISTORY: DispensingActivityEntry[] = Array.from(
  { length: 180 },
  (_, i) => {
    const med = HISTORY_MEDICATIONS[i % HISTORY_MEDICATIONS.length]!;
    const doctor = DOCTORS[i % DOCTORS.length]!;
    const daysAgo = i % 90;
    const status: DispensingStatus =
      i % 33 === 0
        ? 'Cancelled'
        : i % 25 === 0
          ? 'Returned'
          : i % 12 === 0
            ? 'Partial'
            : 'Completed';
    return {
      id: `dah-${i}`,
      medicationName: med.name,
      patientId: `dp-${String((i % 150) + 1).padStart(3, '0')}`,
      rxNo: `RX-${String(250620 + (89 - daysAgo)).padStart(6, '0')}-${String(2000 + i)}`,
      dispensedAt: pastDateAt(daysAgo, 8 + (i % 9), (i * 7) % 60),
      dose: med.dose,
      qty: [15, 30, 45, 60][i % 4]!,
      unit: med.unit,
      doctorName: doctor.name,
      department: doctor.department,
      status,
    };
  },
);

// ── Controlled drugs ──────────────────────────────────────────────────────────

const CONTROLLED_MEDICATIONS: {
  name: string;
  dose: string;
  unit: string;
  schedule: ControlledSchedule;
}[] = [
  { name: 'Morphine Sulfate 10mg', dose: '10mg', unit: 'Ampoule', schedule: 'C-II' },
  { name: 'Fentanyl 25mcg/hr', dose: '25mcg/hr', unit: 'Patch', schedule: 'C-II' },
  { name: 'Oxycodone 5mg', dose: '5mg', unit: 'Tablet', schedule: 'C-II' },
  { name: 'Codeine Phosphate 30mg', dose: '30mg', unit: 'Tablet', schedule: 'C-III' },
  { name: 'Tramadol 50mg', dose: '50mg', unit: 'Capsule', schedule: 'C-IV' },
  { name: 'Alprazolam 0.5mg', dose: '0.5mg', unit: 'Tablet', schedule: 'C-IV' },
  { name: 'Diazepam 5mg', dose: '5mg', unit: 'Tablet', schedule: 'C-IV' },
  { name: 'Lorazepam 1mg', dose: '1mg', unit: 'Tablet', schedule: 'C-IV' },
];

// A handful dispensed today (curated, matching the CURATED_DISPENSING_ACTIVITY
// convention above) so "Dispensed Today" is never a suspicious zero.
const CURATED_CONTROLLED_ACTIVITY: DispensingActivityEntry[] = [
  {
    id: 'cda-1',
    medicationName: 'Morphine Sulfate 10mg',
    patientId: 'dp-003',
    rxNo: 'RX-CD-250629-9001',
    dispensedAt: todayAt(9, 40),
    dose: '10mg',
    qty: 10,
    unit: 'Ampoule',
    doctorName: DOCTORS[0]!.name,
    department: DOCTORS[0]!.department,
    status: 'Completed',
    controlledSchedule: 'C-II',
    approvedBy: 'Mr. Emeka Obi',
  },
  {
    id: 'cda-2',
    medicationName: 'Tramadol 50mg',
    patientId: 'dp-005',
    rxNo: 'RX-CD-250629-9002',
    dispensedAt: todayAt(9, 15),
    dose: '50mg',
    qty: 20,
    unit: 'Capsule',
    doctorName: DOCTORS[2]!.name,
    department: DOCTORS[2]!.department,
    status: 'Completed',
    controlledSchedule: 'C-IV',
    approvedBy: 'Mr. Emeka Obi',
  },
  {
    id: 'cda-3',
    medicationName: 'Oxycodone 5mg',
    patientId: 'dp-007',
    rxNo: 'RX-CD-250629-9003',
    dispensedAt: todayAt(8, 50),
    dose: '5mg',
    qty: 14,
    unit: 'Tablet',
    doctorName: DOCTORS[1]!.name,
    department: DOCTORS[1]!.department,
    status: 'Pending Approval',
    controlledSchedule: 'C-II',
  },
  {
    id: 'cda-4',
    medicationName: 'Diazepam 5mg',
    patientId: 'dp-009',
    rxNo: 'RX-CD-250629-9004',
    dispensedAt: todayAt(8, 20),
    dose: '5mg',
    qty: 10,
    unit: 'Tablet',
    doctorName: DOCTORS[3]!.name,
    department: DOCTORS[3]!.department,
    status: 'Pending Approval',
    controlledSchedule: 'C-IV',
  },
];

// ~90 days of controlled-substance dispensing records — same generator
// convention as GENERATED_DISPENSING_HISTORY, merged into the one
// dispensing log so a controlled dispense also counts toward the overall
// Dispensing History totals (it genuinely is one).
const GENERATED_CONTROLLED_ACTIVITY: DispensingActivityEntry[] = Array.from(
  { length: 120 },
  (_, i) => {
    const med = CONTROLLED_MEDICATIONS[i % CONTROLLED_MEDICATIONS.length]!;
    const doctor = DOCTORS[(i + 2) % DOCTORS.length]!;
    const daysAgo = 1 + (i % 89);
    const status: DispensingStatus =
      i % 24 === 0 ? 'Pending Approval' : i % 40 === 0 ? 'Cancelled' : 'Completed';
    return {
      id: `cdah-${i}`,
      medicationName: med.name,
      patientId: `dp-${String((i % 150) + 1).padStart(3, '0')}`,
      rxNo: `RX-CD-${String(250620 + (89 - daysAgo)).padStart(6, '0')}-${String(3000 + i)}`,
      dispensedAt: pastDateAt(daysAgo, 8 + (i % 9), (i * 11) % 60),
      dose: med.dose,
      qty: [10, 14, 20, 30][i % 4]!,
      unit: med.unit,
      doctorName: doctor.name,
      department: doctor.department,
      status,
      controlledSchedule: med.schedule,
      ...(status === 'Completed' ? { approvedBy: 'Mr. Emeka Obi' } : {}),
    };
  },
);

/** Every dispensing transaction on record — curated recent entries plus 180
 * days of generated history (including controlled substances). The store's
 * live `verifyAndDispense()` prepends new real entries to this same list. */
export const DISPENSING_ACTIVITY_SEED: DispensingActivityEntry[] = [
  ...CURATED_DISPENSING_ACTIVITY,
  ...CURATED_CONTROLLED_ACTIVITY,
  ...GENERATED_DISPENSING_HISTORY,
  ...GENERATED_CONTROLLED_ACTIVITY,
];

// ── Drug inventory ────────────────────────────────────────────────────────────

export type DrugBatch = {
  batchNo: string;
  expiryDate: string; // ISO date, YYYY-MM-DD
};

export type DrugInventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  batches: DrugBatch[];
  /** Set only for controlled substances — everything else leaves it unset. */
  controlledSchedule?: ControlledSchedule;
};

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const DRUG_INVENTORY: DrugInventoryItem[] = [
  {
    id: 'di-1',
    name: 'Paracetamol 500mg',
    category: 'Analgesic',
    unit: 'Tablet',
    currentStock: 18,
    reorderLevel: 100,
    batches: [{ batchNo: 'PAR-2505', expiryDate: daysFromNow(12) }],
  },
  {
    id: 'di-2',
    name: 'Amoxicillin 500mg',
    category: 'Antibiotic',
    unit: 'Capsule',
    currentStock: 22,
    reorderLevel: 80,
    batches: [{ batchNo: 'AMX-2504', expiryDate: daysFromNow(16) }],
  },
  {
    id: 'di-3',
    name: 'Metformin 500mg',
    category: 'Antidiabetic',
    unit: 'Tablet',
    currentStock: 15,
    reorderLevel: 60,
    batches: [{ batchNo: 'MET-2503', expiryDate: daysFromNow(24) }],
  },
  {
    id: 'di-4',
    name: 'Salbutamol Inhaler',
    category: 'Bronchodilator',
    unit: 'Inhaler',
    currentStock: 10,
    reorderLevel: 40,
    batches: [{ batchNo: 'SAL-2502', expiryDate: daysFromNow(45) }],
  },
  {
    id: 'di-5',
    name: 'Atorvastatin 20mg',
    category: 'Statin',
    unit: 'Tablet',
    currentStock: 12,
    reorderLevel: 50,
    batches: [{ batchNo: 'ATO-2501', expiryDate: daysFromNow(60) }],
  },
  {
    id: 'di-6',
    name: 'Ciprofloxacin 500mg',
    category: 'Antibiotic',
    unit: 'Tablet',
    currentStock: 19,
    reorderLevel: 70,
    batches: [{ batchNo: 'CIP-2506', expiryDate: daysFromNow(21) }],
  },
  {
    id: 'di-7',
    name: 'Metronidazole 400mg',
    category: 'Antibiotic',
    unit: 'Tablet',
    currentStock: 25,
    reorderLevel: 65,
    batches: [{ batchNo: 'MTZ-2507', expiryDate: daysFromNow(24) }],
  },
  {
    id: 'di-8',
    name: 'Diclofenac 50mg',
    category: 'NSAID',
    unit: 'Tablet',
    currentStock: 14,
    reorderLevel: 55,
    batches: [{ batchNo: 'DIC-2502', expiryDate: daysFromNow(28) }],
  },
  {
    id: 'di-9',
    name: 'Losartan 50mg',
    category: 'Antihypertensive',
    unit: 'Tablet',
    currentStock: 16,
    reorderLevel: 60,
    batches: [{ batchNo: 'LOS-2508', expiryDate: daysFromNow(19) }],
  },
  {
    id: 'di-10',
    name: 'Amlodipine 5mg',
    category: 'Antihypertensive',
    unit: 'Tablet',
    currentStock: 20,
    reorderLevel: 60,
    batches: [{ batchNo: 'AML-2509', expiryDate: daysFromNow(27) }],
  },
  {
    id: 'di-11',
    name: 'Omeprazole 20mg',
    category: 'PPI',
    unit: 'Capsule',
    currentStock: 13,
    reorderLevel: 50,
    batches: [{ batchNo: 'OME-2510', expiryDate: daysFromNow(70) }],
  },
  {
    id: 'di-12',
    name: 'Ibuprofen 400mg',
    category: 'NSAID',
    unit: 'Tablet',
    currentStock: 17,
    reorderLevel: 90,
    batches: [{ batchNo: 'IBU-2511', expiryDate: daysFromNow(90) }],
  },
  {
    id: 'di-13',
    name: 'Chlorphenamine 4mg',
    category: 'Antihistamine',
    unit: 'Tablet',
    currentStock: 9,
    reorderLevel: 40,
    batches: [{ batchNo: 'CHL-2512', expiryDate: daysFromNow(120) }],
  },
  {
    id: 'di-14',
    name: 'Hydrochlorothiazide 25mg',
    category: 'Diuretic',
    unit: 'Tablet',
    currentStock: 11,
    reorderLevel: 45,
    batches: [{ batchNo: 'HCT-2513', expiryDate: daysFromNow(150) }],
  },
  // Healthy stock — not low, not expiring soon.
  {
    id: 'di-15',
    name: 'Vitamin C 500mg',
    category: 'Supplement',
    unit: 'Tablet',
    currentStock: 420,
    reorderLevel: 100,
    batches: [{ batchNo: 'VTC-2514', expiryDate: daysFromNow(240) }],
  },
  {
    id: 'di-16',
    name: 'Ferrous Sulfate 200mg',
    category: 'Supplement',
    unit: 'Tablet',
    currentStock: 310,
    reorderLevel: 80,
    batches: [{ batchNo: 'FES-2515', expiryDate: daysFromNow(200) }],
  },
  {
    id: 'di-17',
    name: 'Folic Acid 5mg',
    category: 'Supplement',
    unit: 'Tablet',
    currentStock: 280,
    reorderLevel: 70,
    batches: [{ batchNo: 'FOL-2516', expiryDate: daysFromNow(300) }],
  },
  {
    id: 'di-18',
    name: 'Cetirizine 10mg',
    category: 'Antihistamine',
    unit: 'Tablet',
    currentStock: 190,
    reorderLevel: 60,
    batches: [{ batchNo: 'CET-2517', expiryDate: daysFromNow(180) }],
  },
  {
    id: 'di-19',
    name: 'Ondansetron 4mg',
    category: 'Antiemetic',
    unit: 'Tablet',
    currentStock: 150,
    reorderLevel: 50,
    batches: [{ batchNo: 'OND-2518', expiryDate: daysFromNow(160) }],
  },
  {
    id: 'di-20',
    name: 'Ceftriaxone 1g',
    category: 'Antibiotic',
    unit: 'Vial',
    currentStock: 95,
    reorderLevel: 40,
    batches: [{ batchNo: 'CFT-2519', expiryDate: daysFromNow(100) }],
  },
  {
    id: 'di-21',
    name: 'Normal Saline 0.9%',
    category: 'IV Fluid',
    unit: 'Bag',
    currentStock: 260,
    reorderLevel: 80,
    batches: [{ batchNo: 'NAC-2520', expiryDate: daysFromNow(365) }],
  },
  {
    id: 'di-22',
    name: 'Insulin Glargine',
    category: 'Antidiabetic',
    unit: 'Pen',
    currentStock: 70,
    reorderLevel: 30,
    batches: [{ batchNo: 'INS-2521', expiryDate: daysFromNow(110) }],
  },
  {
    id: 'di-23',
    name: 'Dexamethasone 4mg',
    category: 'Corticosteroid',
    unit: 'Ampoule',
    currentStock: 130,
    reorderLevel: 45,
    batches: [{ batchNo: 'DEX-2522', expiryDate: daysFromNow(140) }],
  },
  {
    id: 'di-24',
    name: 'Artemether/Lumefantrine',
    category: 'Antimalarial',
    unit: 'Tablet',
    currentStock: 210,
    reorderLevel: 70,
    batches: [{ batchNo: 'ART-2523', expiryDate: daysFromNow(220) }],
  },
  // Controlled substances — Schedule II-IV, held to tighter stock/expiry
  // scrutiny by the Controlled Drugs screen.
  {
    id: 'di-25',
    name: 'Morphine Sulfate 10mg',
    category: 'Opioid Analgesic',
    unit: 'Ampoule',
    currentStock: 18,
    reorderLevel: 25,
    batches: [{ batchNo: 'MOR-2601', expiryDate: daysFromNow(20) }],
    controlledSchedule: 'C-II',
  },
  {
    id: 'di-26',
    name: 'Fentanyl 25mcg/hr',
    category: 'Opioid Analgesic',
    unit: 'Patch',
    currentStock: 40,
    reorderLevel: 20,
    batches: [{ batchNo: 'FEN-2602', expiryDate: daysFromNow(200) }],
    controlledSchedule: 'C-II',
  },
  {
    id: 'di-27',
    name: 'Oxycodone 5mg',
    category: 'Opioid Analgesic',
    unit: 'Tablet',
    currentStock: 12,
    reorderLevel: 30,
    batches: [{ batchNo: 'OXY-2603', expiryDate: daysFromNow(25) }],
    controlledSchedule: 'C-II',
  },
  {
    id: 'di-28',
    name: 'Codeine Phosphate 30mg',
    category: 'Opioid Analgesic',
    unit: 'Tablet',
    currentStock: 90,
    reorderLevel: 40,
    batches: [{ batchNo: 'COD-2604', expiryDate: daysFromNow(150) }],
    controlledSchedule: 'C-III',
  },
  {
    id: 'di-29',
    name: 'Tramadol 50mg',
    category: 'Opioid Analgesic',
    unit: 'Capsule',
    currentStock: 60,
    reorderLevel: 50,
    batches: [{ batchNo: 'TRA-2605', expiryDate: daysFromNow(180) }],
    controlledSchedule: 'C-IV',
  },
  {
    id: 'di-30',
    name: 'Alprazolam 0.5mg',
    category: 'Benzodiazepine',
    unit: 'Tablet',
    currentStock: 15,
    reorderLevel: 35,
    batches: [{ batchNo: 'ALP-2606', expiryDate: daysFromNow(300) }],
    controlledSchedule: 'C-IV',
  },
  {
    id: 'di-31',
    name: 'Diazepam 5mg',
    category: 'Benzodiazepine',
    unit: 'Tablet',
    currentStock: 55,
    reorderLevel: 40,
    batches: [{ batchNo: 'DIA-2607', expiryDate: daysFromNow(240) }],
    controlledSchedule: 'C-IV',
  },
  {
    id: 'di-32',
    name: 'Lorazepam 1mg',
    category: 'Benzodiazepine',
    unit: 'Tablet',
    currentStock: 48,
    reorderLevel: 30,
    batches: [{ batchNo: 'LOR-2608', expiryDate: daysFromNow(210) }],
    controlledSchedule: 'C-IV',
  },
];

export function getLowStockItems(): DrugInventoryItem[] {
  return DRUG_INVENTORY.filter((d) => d.currentStock <= d.reorderLevel);
}

/** A tighter floor than "below reorder level" — the subset already so low
 * they risk running out before the next delivery, used to flag prescriptions
 * for a stock alert rather than the broader (and much larger) low-stock list. */
export function getCriticallyLowStockItems(): DrugInventoryItem[] {
  return DRUG_INVENTORY.filter((d) => d.currentStock <= 15);
}

export function getExpiringBatches(
  withinDays: number,
): Array<{ item: DrugInventoryItem; batch: DrugBatch; daysLeft: number }> {
  const now = Date.now();
  const rows: Array<{ item: DrugInventoryItem; batch: DrugBatch; daysLeft: number }> = [];
  for (const item of DRUG_INVENTORY) {
    for (const batch of item.batches) {
      const daysLeft = Math.round((new Date(batch.expiryDate).getTime() - now) / 86_400_000);
      if (daysLeft >= 0 && daysLeft <= withinDays) rows.push({ item, batch, daysLeft });
    }
  }
  return rows.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function getInventorySnapshot() {
  const totalMedicines = DRUG_INVENTORY.length;
  const availableStock = DRUG_INVENTORY.reduce((sum, d) => sum + d.currentStock, 0);
  const lowStockItems = getLowStockItems().length;
  const expiringSoon = getExpiringBatches(30).length;
  const outOfStock = DRUG_INVENTORY.filter((d) => d.currentStock === 0).length;
  // Representative unit price band per category — a real system prices this
  // per batch; this mock derives a plausible aggregate for the snapshot tile.
  const totalStockValue = DRUG_INVENTORY.reduce((sum, d) => sum + d.currentStock * 850, 0);
  return {
    totalMedicines,
    totalStockValue,
    availableStock,
    lowStockItems,
    expiringSoon,
    outOfStock,
  };
}

// ── Drug Inventory (batch/location level) ───────────────────────────────────
// A richer, per-batch-per-location view than DRUG_INVENTORY above (which
// stays as the coarse item-level stock the dispensing wizard/search modal
// check against). This is its own live store (inventoryStore.ts) — Add
// Stock/Adjust Stock are real, reactive mutations that this screen's own
// stats and table reflect immediately, not page-local state.

export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Expiring Soon';

export type SupplierCategory =
  'Pharmaceuticals' | 'Medical Supplies' | 'Medical Equipment' | 'Laboratory Supplies' | 'Others';

export type SupplierStatus = 'Active' | 'Pending Approval' | 'Inactive';

export type SupplierInfo = {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  category: SupplierCategory;
  contactPerson: string;
  location: string;
  status: SupplierStatus;
  /** Only meaningful when status === 'Active' — a preferred supplier is
   * still active, just displayed/tagged as a higher-priority partner. */
  isPreferred: boolean;
  performanceRating: number; // 0–5 in 0.5 increments; 0 = not yet rated
  lastOrderDate: string; // ISO date, '' if never ordered
  totalSpendYTD: number; // ₦, 0 for Pending Approval / never-ordered suppliers
};

/** The label the Suppliers table/status filter actually shows — "Preferred"
 * takes over the "Active" label for display, since it's a rendering choice,
 * not a separate exclusive state (§ isPreferred docs above). */
export function getSupplierDisplayStatus(
  s: Pick<SupplierInfo, 'status' | 'isPreferred'>,
): 'Active' | 'Preferred' | 'Pending Approval' | 'Inactive' {
  return s.status === 'Active' && s.isPreferred ? 'Preferred' : s.status;
}

const REAL_SUPPLIERS: SupplierInfo[] = [
  {
    name: 'MedPlus Distributors',
    code: 'SUP-00045',
    address: '23 Ire Akari Street, Surulere, Lagos, Nigeria',
    phone: '+234 803 123 4567',
    email: 'info@medplusdistributors.com',
    category: 'Pharmaceuticals',
    contactPerson: 'Mr. Chinedu Okafor',
    location: 'Lagos, Nigeria',
    status: 'Active',
    isPreferred: true,
    performanceRating: 5,
    lastOrderDate: pastDateAt(5, 9, 15).slice(0, 10),
    totalSpendYTD: 45230000,
  },
  {
    name: 'PharmaCare Nigeria Ltd',
    code: 'SUP-00046',
    address: '14 Awolowo Road, Ikoyi, Lagos, Nigeria',
    phone: '+234 802 234 5678',
    email: 'sales@pharmacarenigeria.com',
    category: 'Pharmaceuticals',
    contactPerson: 'Mrs. Folake Adeyemi',
    location: 'Lagos, Nigeria',
    status: 'Active',
    isPreferred: false,
    performanceRating: 4,
    lastOrderDate: pastDateAt(2, 8, 45).slice(0, 10),
    totalSpendYTD: 32450000,
  },
  {
    name: 'Fidson Healthcare',
    code: 'SUP-00047',
    address: 'Km 16, Ikorodu Road, Lagos, Nigeria',
    phone: '+234 801 345 6789',
    email: 'orders@fidson.com',
    category: 'Pharmaceuticals',
    contactPerson: 'Mr. Steve Eze',
    location: 'Port Harcourt, Nigeria',
    status: 'Active',
    isPreferred: true,
    performanceRating: 5,
    lastOrderDate: pastDateAt(6, 10, 20).slice(0, 10),
    totalSpendYTD: 28760000,
  },
  {
    name: 'Emzor Pharmaceuticals',
    code: 'SUP-00048',
    address: '3 Adeniyi Jones Avenue, Ikeja, Lagos, Nigeria',
    phone: '+234 809 456 7890',
    email: 'supply@emzorpharma.com',
    category: 'Pharmaceuticals',
    contactPerson: 'Mr. Samuel Isaac',
    location: 'Ibadan, Nigeria',
    status: 'Active',
    isPreferred: false,
    performanceRating: 4,
    lastOrderDate: pastDateAt(10, 9, 0).slice(0, 10),
    totalSpendYTD: 21300000,
  },
  {
    name: 'May & Baker Nigeria',
    code: 'SUP-00049',
    address: '3/5 Sapara Street, Industrial Estate, Lagos, Nigeria',
    phone: '+234 807 567 8901',
    email: 'procurement@may-baker.com',
    category: 'Pharmaceuticals',
    contactPerson: 'Mrs. Aisha Bello',
    location: 'Kano, Nigeria',
    status: 'Active',
    isPreferred: false,
    performanceRating: 3.5,
    lastOrderDate: pastDateAt(12, 11, 30).slice(0, 10),
    totalSpendYTD: 18980000,
  },
  {
    name: 'Juhel Nigeria Ltd',
    code: 'SUP-00050',
    address: '15 Enugu-Onitsha Expressway, Enugu, Nigeria',
    phone: '+234 806 678 9012',
    email: 'orders@juhelpharma.com',
    category: 'Pharmaceuticals',
    contactPerson: 'Mr. Kola Johnson',
    location: 'Enugu, Nigeria',
    status: 'Active',
    isPreferred: true,
    performanceRating: 4.5,
    lastOrderDate: pastDateAt(1, 9, 20).slice(0, 10),
    totalSpendYTD: 15670000,
  },
];

const PREFIX_POOL = [
  'Apex',
  'Delta',
  'Zenith',
  'Crown',
  'Unity',
  'Trust',
  'Metro',
  'National',
  'Continental',
  'Golden',
  'Heritage',
  'Summit',
  'Horizon',
  'Falcon',
  'Pinnacle',
  'Cardinal',
  'Sterling',
  'Vantage',
  'Meridian',
  'Bright',
  'Grand',
  'Royal',
  'Premier',
  'Elite',
  'Capital',
  'Regal',
  'Superior',
  'Union',
  'Standard',
  'First',
  'Central',
  'Coastal',
  'Northern',
  'Eastern',
  'Atlantic',
  'Westgate',
];

const SUFFIX_BY_CATEGORY: Record<SupplierCategory, string[]> = {
  Pharmaceuticals: [
    'Pharmaceuticals',
    'Pharma Nigeria',
    'Drug Company',
    'Pharmaceuticals Ltd',
    'Pharma Distributors',
  ],
  'Medical Supplies': [
    'Medical Supplies',
    'Healthcare Supplies',
    'Medicals Ltd',
    'Health Supplies Ltd',
    'Medical Trading',
  ],
  'Medical Equipment': [
    'Medical Equipment',
    'Biomedical Systems',
    'Medical Devices Ltd',
    'Equipment Nigeria',
  ],
  'Laboratory Supplies': ['Lab Supplies', 'Diagnostics Ltd', 'Laboratory Systems'],
  Others: ['Logistics Ltd', 'General Supplies', 'Trading Company'],
};

const NIGERIAN_CITIES = [
  'Lagos',
  'Abuja',
  'Port Harcourt',
  'Ibadan',
  'Kano',
  'Enugu',
  'Kaduna',
  'Benin City',
  'Onitsha',
  'Aba',
  'Jos',
  'Owerri',
  'Uyo',
  'Calabar',
  'Warri',
];

const STREET_POOL = [
  'Adeola Odeku',
  'Marina Road',
  'Aba Road',
  'Ring Road',
  'Ahmadu Bello Way',
  'Zik Avenue',
];

const CONTACT_FIRST_NAMES = [
  'Chidi',
  'Ngozi',
  'Tunde',
  'Amaka',
  'Bola',
  'Emeka',
  'Yemi',
  'Chioma',
  'Ifeanyi',
  'Kemi',
  'Uche',
  'Funke',
  'Segun',
  'Adaeze',
  'Musa',
  'Blessing',
];
const CONTACT_LAST_NAMES = [
  'Okoro',
  'Adebayo',
  'Nwachukwu',
  'Balogun',
  'Eze',
  'Ogunleye',
  'Chukwu',
  'Ibrahim',
  'Okonkwo',
  'Bello',
  'Ude',
  'Afolabi',
  'Nnamdi',
  'Yusuf',
];
const HONORIFICS = ['Mr.', 'Mrs.', 'Dr.', 'Engr.', 'Alhaji', 'Chief'];
const PHONE_PREFIXES = [
  '803',
  '806',
  '807',
  '808',
  '809',
  '810',
  '811',
  '812',
  '813',
  '814',
  '815',
  '816',
  '817',
  '818',
  '909',
  '901',
  '902',
];

/** Deterministic mixing hash (not a simple linear step) — picking pool
 * indices via `(i * k) % n` for small k/n repeatedly produced correlated
 * collisions (e.g. every supplier whose generated prefix happened to repeat
 * on a ~12-item cycle also landed on the exact same contact-person name,
 * because the linear steps shared common factors). Hashing each field with
 * its own salt before reducing mod pool-length breaks that correlation. */
function mixHash(n: number): number {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function pickByHash<T>(pool: T[], seed: number, salt: number): T {
  return pool[mixHash(seed + salt) % pool.length]!;
}

/** Prefix × category-suffix combos are a small pool (e.g. 36 × 5 = 180 for
 * Pharmaceuticals) — hashing `i` alone hits birthday-paradox collisions well
 * before 36 draws, which is exactly how two generated suppliers ended up
 * with the identical name `Vantage Pharma Distributors` (duplicate React
 * keys wherever supplier name is used as the key/value, e.g. the Add Stock
 * supplier picker). Probing forward with a bumped salt on collision keeps
 * the selection deterministic while guaranteeing every name in
 * `SUPPLIER_DIRECTORY` is unique. */
function generateSupplierName(
  category: SupplierCategory,
  i: number,
  usedNames: Set<string>,
): string {
  const suffixes = SUFFIX_BY_CATEGORY[category];
  const maxAttempts = PREFIX_POOL.length * suffixes.length;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prefix = pickByHash(PREFIX_POOL, i, 1_000 + attempt * 97);
    const suffix = pickByHash(suffixes, i, 2_000 + attempt * 131);
    const name = `${prefix} ${suffix}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  const name = `${PREFIX_POOL[i % PREFIX_POOL.length]} ${suffixes[i % suffixes.length]} ${i}`;
  usedNames.add(name);
  return name;
}

function generateContactPerson(i: number): string {
  const honorific = pickByHash(HONORIFICS, i, 3_000);
  const first = pickByHash(CONTACT_FIRST_NAMES, i, 4_000);
  const last = pickByHash(CONTACT_LAST_NAMES, i, 5_000);
  return `${honorific} ${first} ${last}`;
}

function generatePhone(i: number): string {
  const prefix = PHONE_PREFIXES[i % PHONE_PREFIXES.length]!;
  const mid = String(100 + ((i * 13) % 900));
  const last = String(1000 + ((i * 37) % 9000));
  return `+234 ${prefix} ${mid} ${last}`;
}

function slugifyForEmail(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function generateEmail(name: string, i: number): string {
  const domain = ['com', 'com.ng', 'ng'][i % 3];
  return `info@${slugifyForEmail(name)}.${domain}`;
}

function statusForGeneratedIndex(i: number): { status: SupplierStatus; isPreferred: boolean } {
  if (i < 35) return { status: 'Active', isPreferred: false };
  if (i < 35 + 31) return { status: 'Active', isPreferred: true };
  if (i < 35 + 31 + 6) return { status: 'Pending Approval', isPreferred: false };
  return { status: 'Inactive', isPreferred: false };
}

/** 80 generated suppliers on top of the 6 real ones — 42 Pharmaceuticals,
 * 25 Medical Supplies, 10 Medical Equipment, 6 Laboratory Supplies, 3
 * Others (86 total), and 72 Active-or-Preferred / 6 Pending Approval / 8
 * Inactive (86 total) — both breakdowns sum exactly, so the category donut
 * and the stat cards never disagree with the real row count. */
const GENERATED_SUPPLIERS: SupplierInfo[] = (() => {
  const categoryCounts: { category: SupplierCategory; count: number }[] = [
    { category: 'Pharmaceuticals', count: 36 },
    { category: 'Medical Supplies', count: 25 },
    { category: 'Medical Equipment', count: 10 },
    { category: 'Laboratory Supplies', count: 6 },
    { category: 'Others', count: 3 },
  ];
  const rows: SupplierInfo[] = [];
  const usedNames = new Set<string>(REAL_SUPPLIERS.map((s) => s.name));
  let i = 0;
  for (const spec of categoryCounts) {
    for (let k = 0; k < spec.count; k++) {
      const name = generateSupplierName(spec.category, i, usedNames);
      const city = NIGERIAN_CITIES[i % NIGERIAN_CITIES.length]!;
      const street = STREET_POOL[i % STREET_POOL.length]!;
      const { status, isPreferred } = statusForGeneratedIndex(i);
      const rating =
        status === 'Inactive'
          ? [1.5, 2, 2.5, 3][i % 4]!
          : status === 'Pending Approval'
            ? 0
            : isPreferred
              ? [4.5, 5][i % 2]!
              : [3, 3.5, 4][i % 3]!;
      rows.push({
        name,
        code: `SUP-${String(51 + i).padStart(5, '0')}`,
        address: `${10 + (i % 80)} ${street} Street, ${city}, Nigeria`,
        phone: generatePhone(i),
        email: generateEmail(name, i),
        category: spec.category,
        contactPerson: generateContactPerson(i),
        location: `${city}, Nigeria`,
        status,
        isPreferred,
        performanceRating: rating,
        lastOrderDate:
          status === 'Pending Approval'
            ? ''
            : pastDateAt(i % 45, 8 + (i % 9), (i * 11) % 60).slice(0, 10),
        totalSpendYTD:
          status === 'Active'
            ? [500000, 1200000, 2400000, 3800000, 5600000, 8200000, 11500000][i % 7]!
            : 0,
      });
      i++;
    }
  }
  return rows;
})();

export const SUPPLIER_DIRECTORY: SupplierInfo[] = [...REAL_SUPPLIERS, ...GENERATED_SUPPLIERS];

export const SUPPLIER_CATEGORY_OPTIONS: SelectOption[] = [
  'Pharmaceuticals',
  'Medical Supplies',
  'Medical Equipment',
  'Laboratory Supplies',
  'Others',
].map((c) => ({ value: c, label: c }));

export const SUPPLIER_STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Preferred', label: 'Preferred' },
  { value: 'Pending Approval', label: 'Pending Approval' },
  { value: 'Inactive', label: 'Inactive' },
];

export const SUPPLIER_RATING_OPTIONS: SelectOption[] = [
  { value: '4', label: '4+ Stars' },
  { value: '3', label: '3+ Stars' },
  { value: '2', label: '2+ Stars' },
];

export const SUPPLIER_LOCATION_OPTIONS: SelectOption[] = Array.from(
  new Set(SUPPLIER_DIRECTORY.map((s) => s.location)),
)
  .sort()
  .map((loc) => ({ value: loc, label: loc }));

/** The canonical city list — used by Add Supplier so a new supplier's
 * location always matches the same set the filter dropdown draws from,
 * rather than free text drifting out of sync with it. */
export const SUPPLIER_CITY_OPTIONS: SelectOption[] = NIGERIAN_CITIES.map((city) => ({
  value: `${city}, Nigeria`,
  label: `${city}, Nigeria`,
}));

export const SUPPLIERS: string[] = SUPPLIER_DIRECTORY.map((s) => s.name);

export const SUPPLIER_OPTIONS: SelectOption[] = SUPPLIER_DIRECTORY.map((s) => ({
  value: s.name,
  label: s.name,
}));

export function getSupplierInfo(name: string): SupplierInfo | null {
  return SUPPLIER_DIRECTORY.find((s) => s.name === name) ?? null;
}

export const INVENTORY_LOCATION_OPTIONS: SelectOption[] = PHARMACY_LOCATIONS.map((l) => ({
  value: l.id,
  label: l.name,
}));

export const INVENTORY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'In Stock', label: 'In Stock' },
  { value: 'Low Stock', label: 'Low Stock' },
  { value: 'Out of Stock', label: 'Out of Stock' },
  { value: 'Expiring Soon', label: 'Expiring Soon' },
];

export type InventoryBatchRow = {
  id: string;
  medicationName: string;
  strength: string;
  form: string;
  unit: string;
  category: string;
  locationId: PharmacyLocationId;
  supplier: string;
  batchNo: string;
  expiryDate: string; // ISO date
  stockQty: number;
  reorderLevel: number;
  /** ₦ per unit — backs Total Stock Value and Top Categories by Value. */
  unitPrice: number;
  controlledSchedule?: ControlledSchedule;
  /** The pharmaceutical manufacturer — distinct from `supplier` (who
   * delivered it). Not every intake flow captures it, so it's optional. */
  manufacturer?: string;
  mfgDate?: string; // ISO date
  /** A temporary quarantine hold — independent of stock level, flagged by
   * Batch Management pending a QA/safety check. */
  isOnHold?: boolean;
};

export type InventoryCatalogEntry = {
  name: string;
  strength: string;
  form: string;
  unit: string;
  category: string;
  reorderLevel: number;
  unitPrice: number;
  controlledSchedule?: ControlledSchedule;
};

export const INVENTORY_CATALOG: InventoryCatalogEntry[] = [
  {
    name: 'Amoxicillin',
    strength: '500mg',
    form: 'Capsule',
    unit: 'Capsule',
    category: 'Antibiotics',
    reorderLevel: 200,
    unitPrice: 45,
  },
  {
    name: 'Paracetamol',
    strength: '500mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Analgesics',
    reorderLevel: 300,
    unitPrice: 12,
  },
  {
    name: 'Azithromycin',
    strength: '250mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Antibiotics',
    reorderLevel: 100,
    unitPrice: 180,
  },
  {
    name: 'Salbutamol',
    strength: '100mcg/dose',
    form: 'Inhaler',
    unit: 'Inhaler',
    category: 'Respiratory',
    reorderLevel: 40,
    unitPrice: 2400,
  },
  {
    name: 'Omeprazole',
    strength: '20mg',
    form: 'Capsule',
    unit: 'Capsule',
    category: 'Gastrointestinal',
    reorderLevel: 150,
    unitPrice: 60,
  },
  {
    name: 'Metformin',
    strength: '500mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Antidiabetic',
    reorderLevel: 250,
    unitPrice: 25,
  },
  {
    name: 'Ciprofloxacin',
    strength: '500mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Antibiotics',
    reorderLevel: 150,
    unitPrice: 90,
  },
  {
    name: 'Losartan',
    strength: '50mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Cardiovascular',
    reorderLevel: 150,
    unitPrice: 55,
  },
  {
    name: 'Atorvastatin',
    strength: '20mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Cardiovascular',
    reorderLevel: 120,
    unitPrice: 130,
  },
  {
    name: 'Amlodipine',
    strength: '5mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Cardiovascular',
    reorderLevel: 150,
    unitPrice: 40,
  },
  {
    name: 'Ibuprofen',
    strength: '400mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Analgesics',
    reorderLevel: 250,
    unitPrice: 18,
  },
  {
    name: 'Diclofenac',
    strength: '50mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Analgesics',
    reorderLevel: 150,
    unitPrice: 22,
  },
  {
    name: 'Metronidazole',
    strength: '400mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Antibiotics',
    reorderLevel: 150,
    unitPrice: 30,
  },
  {
    name: 'Chlorphenamine',
    strength: '4mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Antihistamine',
    reorderLevel: 100,
    unitPrice: 15,
  },
  {
    name: 'Hydrochlorothiazide',
    strength: '25mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Cardiovascular',
    reorderLevel: 100,
    unitPrice: 28,
  },
  {
    name: 'Cetirizine',
    strength: '10mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Antihistamine',
    reorderLevel: 150,
    unitPrice: 20,
  },
  {
    name: 'Ondansetron',
    strength: '4mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Antiemetic',
    reorderLevel: 100,
    unitPrice: 75,
  },
  {
    name: 'Ceftriaxone',
    strength: '1g',
    form: 'Vial',
    unit: 'Vial',
    category: 'Antibiotics',
    reorderLevel: 80,
    unitPrice: 850,
  },
  {
    name: 'Normal Saline',
    strength: '0.9%',
    form: 'Bag',
    unit: 'Bag',
    category: 'IV Fluids',
    reorderLevel: 150,
    unitPrice: 320,
  },
  {
    name: 'Insulin Glargine',
    strength: '100IU/mL',
    form: 'Pen',
    unit: 'Pen',
    category: 'Antidiabetic',
    reorderLevel: 40,
    unitPrice: 4200,
  },
  {
    name: 'Dexamethasone',
    strength: '4mg',
    form: 'Ampoule',
    unit: 'Ampoule',
    category: 'Corticosteroid',
    reorderLevel: 60,
    unitPrice: 110,
  },
  {
    name: 'Artemether/Lumefantrine',
    strength: '20/120mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Antimalarial',
    reorderLevel: 120,
    unitPrice: 650,
  },
  {
    name: 'Vitamin C',
    strength: '500mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Supplement',
    reorderLevel: 150,
    unitPrice: 10,
  },
  {
    name: 'Ferrous Sulfate',
    strength: '200mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Supplement',
    reorderLevel: 120,
    unitPrice: 14,
  },
  {
    name: 'Folic Acid',
    strength: '5mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Supplement',
    reorderLevel: 100,
    unitPrice: 8,
  },
  {
    name: 'Ranitidine',
    strength: '150mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Gastrointestinal',
    reorderLevel: 100,
    unitPrice: 32,
  },
  {
    name: 'Furosemide',
    strength: '40mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Cardiovascular',
    reorderLevel: 100,
    unitPrice: 26,
  },
  {
    name: 'Doxycycline',
    strength: '100mg',
    form: 'Capsule',
    unit: 'Capsule',
    category: 'Antibiotics',
    reorderLevel: 100,
    unitPrice: 55,
  },
  {
    name: 'Prednisolone',
    strength: '5mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Corticosteroid',
    reorderLevel: 80,
    unitPrice: 38,
  },
  {
    name: 'Loperamide',
    strength: '2mg',
    form: 'Capsule',
    unit: 'Capsule',
    category: 'Gastrointestinal',
    reorderLevel: 80,
    unitPrice: 16,
  },
  {
    name: 'Amoxicillin/Clavulanate',
    strength: '625mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Antibiotics',
    reorderLevel: 100,
    unitPrice: 320,
  },
  {
    name: 'Salbutamol Nebules',
    strength: '2.5mg/2.5mL',
    form: 'Nebule',
    unit: 'Nebule',
    category: 'Respiratory',
    reorderLevel: 60,
    unitPrice: 95,
  },
  {
    name: 'Aspirin',
    strength: '75mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Cardiovascular',
    reorderLevel: 200,
    unitPrice: 9,
  },
  {
    name: 'Clopidogrel',
    strength: '75mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Cardiovascular',
    reorderLevel: 100,
    unitPrice: 140,
  },
  {
    name: 'Multivitamin',
    strength: 'Standard',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Supplement',
    reorderLevel: 150,
    unitPrice: 12,
  },
  {
    name: 'Morphine Sulfate',
    strength: '10mg',
    form: 'Ampoule',
    unit: 'Ampoule',
    category: 'Opioid Analgesic',
    reorderLevel: 25,
    unitPrice: 480,
    controlledSchedule: 'C-II',
  },
  {
    name: 'Fentanyl',
    strength: '25mcg/hr',
    form: 'Patch',
    unit: 'Patch',
    category: 'Opioid Analgesic',
    reorderLevel: 20,
    unitPrice: 3800,
    controlledSchedule: 'C-II',
  },
  {
    name: 'Oxycodone',
    strength: '5mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Opioid Analgesic',
    reorderLevel: 30,
    unitPrice: 260,
    controlledSchedule: 'C-II',
  },
  {
    name: 'Codeine Phosphate',
    strength: '30mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Opioid Analgesic',
    reorderLevel: 40,
    unitPrice: 95,
    controlledSchedule: 'C-III',
  },
  {
    name: 'Tramadol',
    strength: '50mg',
    form: 'Capsule',
    unit: 'Capsule',
    category: 'Opioid Analgesic',
    reorderLevel: 50,
    unitPrice: 60,
    controlledSchedule: 'C-IV',
  },
  {
    name: 'Diazepam',
    strength: '5mg',
    form: 'Tablet',
    unit: 'Tablet',
    category: 'Benzodiazepine',
    reorderLevel: 40,
    unitPrice: 22,
    controlledSchedule: 'C-IV',
  },
];

/** The pharmaceutical manufacturer — distinct from SUPPLIER_DIRECTORY (which
 * is who delivered the batch to us). Real Nigerian/multinational
 * manufacturers, cycled deterministically per generated batch. */
const MANUFACTURER_POOL = [
  'Fidson Healthcare',
  'Emzor Pharmaceuticals',
  'May & Baker Nigeria',
  'Juhel Nigeria Ltd',
  'GlaxoSmithKline Nigeria',
  'Swiss Pharma Nigeria',
];

export const MANUFACTURER_OPTIONS: SelectOption[] = MANUFACTURER_POOL.map((m) => ({
  value: m,
  label: m,
}));

/** 280 batch/location rows generated deterministically across the catalog and
 * every real pharmacy campus location (`PHARMACY_LOCATIONS`) — enough to be a
 * plausible teaching-hospital formulary without literally inventing 1,500+
 * distinct drug names. Roughly 1 in 19 rows is Out of Stock and 1 in 7 is
 * pushed below reorder level, so the stat cards below are always non-zero. */
export const INVENTORY_BATCHES_SEED: InventoryBatchRow[] = Array.from({ length: 280 }, (_, i) => {
  const med = INVENTORY_CATALOG[i % INVENTORY_CATALOG.length]!;
  const location = PHARMACY_LOCATIONS[i % PHARMACY_LOCATIONS.length]!;
  const supplier = SUPPLIERS[i % SUPPLIERS.length]!;
  const expiryDays = ((i * 53) % 460) - 20;
  const isOutOfStock = i % 19 === 0;
  const isLow = !isOutOfStock && i % 7 === 0;
  const healthyQty = 40 + ((i * 31) % 1200);
  const stockQty = isOutOfStock
    ? 0
    : isLow
      ? Math.max(1, Math.round(med.reorderLevel * 0.4))
      : healthyQty;
  return {
    id: `inv-${i}`,
    medicationName: med.name,
    strength: med.strength,
    form: med.form,
    unit: med.unit,
    category: med.category,
    locationId: location.id,
    supplier,
    batchNo: `${med.name
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase()}${2500 + (i % 90)}`,
    expiryDate: daysFromNow(expiryDays),
    stockQty,
    reorderLevel: med.reorderLevel,
    unitPrice: med.unitPrice,
    ...(med.controlledSchedule ? { controlledSchedule: med.controlledSchedule } : {}),
    manufacturer: MANUFACTURER_POOL[i % MANUFACTURER_POOL.length]!,
    // A typical 18-24 month shelf life, counted back from this batch's expiry.
    mfgDate: daysFromNow(expiryDays - (540 + (i % 180))),
    ...(i % 46 === 3 ? { isOnHold: true } : {}),
  };
});

export const INVENTORY_CATEGORY_OPTIONS: SelectOption[] = Array.from(
  new Set(INVENTORY_CATALOG.map((m) => m.category)),
).map((c) => ({ value: c, label: c }));

export function getCatalogEntry(name: string): InventoryCatalogEntry | null {
  return INVENTORY_CATALOG.find((m) => m.name === name) ?? null;
}

/** Out of Stock takes precedence over Expiring Soon over Low Stock, so every
 * row lands in exactly one bucket — the Inventory Overview donut always sums
 * to the total row count. */
export function getInventoryRowStatus(row: InventoryBatchRow): InventoryStatus {
  if (row.stockQty === 0) return 'Out of Stock';
  const daysLeft = Math.round((new Date(row.expiryDate).getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 60) return 'Expiring Soon';
  if (row.stockQty <= row.reorderLevel) return 'Low Stock';
  return 'In Stock';
}

// ── Batch Management ─────────────────────────────────────────────────────────
// A batch-lifecycle view of the same live inventoryStore.ts batches Drug
// Inventory shows — same data, different lens (manufacturing/expiry
// tracking and quarantine holds, rather than stock-level alerts).

export type BatchStatus =
  'Active' | 'Expiring Soon' | 'Expired' | 'On Hold / Quarantine' | 'Out of Stock';

export const BATCH_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Expiring Soon', label: 'Expiring Soon' },
  { value: 'Expired', label: 'Expired' },
  { value: 'On Hold / Quarantine', label: 'On Hold / Quarantine' },
  { value: 'Out of Stock', label: 'Out of Stock' },
];

export function getBatchDaysLeft(row: InventoryBatchRow): number {
  return Math.round((new Date(row.expiryDate).getTime() - Date.now()) / 86_400_000);
}

/** On Hold takes precedence (a pharmacist's explicit safety flag), then
 * Expired, then Out of Stock, then Expiring Soon — every batch lands in
 * exactly one bucket, so the Batch Status Overview donut always sums to the
 * total batch count. Items are marked Expired automatically once the date
 * passes — there's no separate manual "mark expired" action. */
export function getBatchStatus(row: InventoryBatchRow): BatchStatus {
  if (row.isOnHold) return 'On Hold / Quarantine';
  const daysLeft = getBatchDaysLeft(row);
  if (daysLeft < 0) return 'Expired';
  if (row.stockQty === 0) return 'Out of Stock';
  if (daysLeft <= 60) return 'Expiring Soon';
  return 'Active';
}

// ── Expiry Management ────────────────────────────────────────────────────────
// A pure date-lens over the same live inventoryStore.ts batches — unlike
// getBatchStatus() (which also cares about hold/out-of-stock), this only
// buckets by how much shelf life is left.

export type ExpiryBucket = 'Expired' | '≤ 30 Days' | '31 – 60 Days' | '61 – 90 Days' | '> 90 Days';

export const EXPIRY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Expired', label: 'Expired' },
  { value: '≤ 30 Days', label: 'Expiring within 30 Days' },
  { value: '31 – 60 Days', label: 'Expiring in 31–60 Days' },
  { value: '61 – 90 Days', label: 'Expiring in 61–90 Days' },
];

export function getExpiryBucket(row: InventoryBatchRow): ExpiryBucket {
  const daysLeft = getBatchDaysLeft(row);
  if (daysLeft < 0) return 'Expired';
  if (daysLeft <= 30) return '≤ 30 Days';
  if (daysLeft <= 60) return '31 – 60 Days';
  if (daysLeft <= 90) return '61 – 90 Days';
  return '> 90 Days';
}

// ── Low Stock Alerts ─────────────────────────────────────────────────────────
// A stock-runway lens over the same live inventoryStore.ts batches.

export type StockAlertLevel = 'Critical' | 'Low Stock' | 'Reorder Recommended' | 'All Good';

export const ALERT_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'Critical', label: 'Critical (Out Soon)' },
  { value: 'Low Stock', label: 'Low Stock' },
  { value: 'Reorder Recommended', label: 'Reorder Recommended' },
];

/** A reorder level is conventionally sized to cover ~30 days of typical
 * usage — back-deriving a daily usage rate from it (rather than inventing a
 * separate, disconnected field) keeps "days of stock" honest and consistent
 * with the reorder level actually configured for this batch. */
export function getBatchDaysOfStock(row: InventoryBatchRow): number {
  const avgDailyUsage = Math.max(1, Math.round(row.reorderLevel / 30));
  return Math.floor(row.stockQty / avgDailyUsage);
}

/** Critical takes precedence over Low Stock over Reorder Recommended, so
 * every batch lands in exactly one alert level — the Alerts by Level donut
 * always sums to the total batch count. Thresholds are configurable via
 * Alert Settings, defaulting to 3/7 days. */
export function getStockAlertLevel(
  row: InventoryBatchRow,
  criticalDays = 3,
  lowStockDays = 7,
): StockAlertLevel {
  const daysOfStock = getBatchDaysOfStock(row);
  if (daysOfStock <= criticalDays) return 'Critical';
  if (daysOfStock <= lowStockDays) return 'Low Stock';
  if (row.stockQty <= row.reorderLevel) return 'Reorder Recommended';
  return 'All Good';
}

// ── Stock Receiving ───────────────────────────────────────────────────────────
// Purchase orders a supplier is still to deliver against, and the receipts a
// pharmacist has already confirmed. Confirming a receipt (stockReceivingStore.ts)
// does two real things: marks the PO Received/Partial, and calls
// inventoryStore.ts's addStockBatch() for every line — a goods-received event
// genuinely becomes new Drug Inventory stock, not a form that vanishes on submit.

export type PurchaseOrderStatus = 'Pending' | 'Partial' | 'Received';

export type PurchaseOrderItem = {
  /** Resolvable via getCatalogEntry() for strength/form/unit/category/price. */
  medicationName: string;
  /** The supplier's own batch reference, prefilled into the receiving form —
   * the pharmacist can correct it if the physical batch label differs. */
  batchNo: string;
  expiryDate: string; // ISO date
  orderedQty: number;
};

export type PurchaseOrder = {
  poNumber: string;
  supplier: string; // resolvable via getSupplierInfo()
  createdAt: string; // ISO
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
};

function poNumber(monthsAgo: number, seq: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `PO-${yyyy}-${mm}-${String(700 + seq).padStart(4, '0')}`;
}

const PO_ITEM_POOL: { name: string; batchPrefix: string }[] = [
  { name: 'Amoxicillin', batchPrefix: 'AMX' },
  { name: 'Paracetamol', batchPrefix: 'PAR' },
  { name: 'Ciprofloxacin', batchPrefix: 'CIP' },
  { name: 'Losartan', batchPrefix: 'LOS' },
  { name: 'Salbutamol', batchPrefix: 'SAL' },
  { name: 'Omeprazole', batchPrefix: 'OME' },
  { name: 'Metformin', batchPrefix: 'MET' },
  { name: 'Atorvastatin', batchPrefix: 'ATO' },
  { name: 'Amlodipine', batchPrefix: 'AML' },
  { name: 'Ibuprofen', batchPrefix: 'IBU' },
  { name: 'Diclofenac', batchPrefix: 'DIC' },
  { name: 'Metronidazole', batchPrefix: 'MTZ' },
  { name: 'Ceftriaxone', batchPrefix: 'CFT' },
  { name: 'Normal Saline', batchPrefix: 'NAC' },
];

function buildPoItems(startIdx: number, count: number, monthsAgo: number): PurchaseOrderItem[] {
  return Array.from({ length: count }, (_, i) => {
    const pick = PO_ITEM_POOL[(startIdx + i) % PO_ITEM_POOL.length]!;
    const orderedQty = [50, 300, 400, 500, 800, 1000][(startIdx + i) % 6]!;
    return {
      medicationName: pick.name,
      batchNo: `${pick.batchPrefix}${2500 + ((startIdx + i * 3) % 30)}`,
      expiryDate: daysFromNow(180 - monthsAgo * 30 + ((startIdx + i) % 200)),
      orderedQty,
    };
  });
}

/** 10 purchase orders — 8 still Pending (matching a real "awaiting receipt"
 * queue), 2 already Received (their linked receipts are in
 * STOCK_RECEIPTS_SEED below, so Recent Receipts is a genuine derived view). */
export const PURCHASE_ORDERS_SEED: PurchaseOrder[] = [
  {
    poNumber: poNumber(0, 24),
    supplier: 'MedPlus Distributors',
    createdAt: pastDateAt(2, 9, 0),
    status: 'Pending',
    items: buildPoItems(0, 12, 0),
  },
  {
    poNumber: poNumber(0, 23),
    supplier: 'PharmaCare Nigeria Ltd',
    createdAt: pastDateAt(3, 10, 30),
    status: 'Pending',
    items: buildPoItems(3, 6, 0),
  },
  {
    poNumber: poNumber(0, 22),
    supplier: 'Fidson Healthcare',
    createdAt: pastDateAt(4, 11, 15),
    status: 'Pending',
    items: buildPoItems(6, 5, 0),
  },
  {
    poNumber: poNumber(0, 21),
    supplier: 'Emzor Pharmaceuticals',
    createdAt: pastDateAt(5, 8, 45),
    status: 'Pending',
    items: buildPoItems(9, 4, 0),
  },
  {
    poNumber: poNumber(0, 20),
    supplier: 'May & Baker Nigeria',
    createdAt: pastDateAt(6, 9, 20),
    status: 'Pending',
    items: buildPoItems(1, 7, 0),
  },
  {
    poNumber: poNumber(0, 19),
    supplier: 'Juhel Nigeria Ltd',
    createdAt: pastDateAt(7, 10, 0),
    status: 'Pending',
    items: buildPoItems(4, 5, 0),
  },
  {
    poNumber: poNumber(0, 18),
    supplier: 'MedPlus Distributors',
    createdAt: pastDateAt(8, 9, 40),
    status: 'Pending',
    items: buildPoItems(7, 6, 0),
  },
  {
    poNumber: poNumber(0, 17),
    supplier: 'Fidson Healthcare',
    createdAt: pastDateAt(9, 11, 0),
    status: 'Pending',
    items: buildPoItems(2, 8, 0),
  },
  {
    poNumber: poNumber(0, 16),
    supplier: 'MedPlus Distributors',
    createdAt: pastDateAt(1, 9, 0),
    status: 'Received',
    items: buildPoItems(0, 6, 0),
  },
  {
    poNumber: poNumber(0, 15),
    supplier: 'PharmaCare Nigeria Ltd',
    createdAt: pastDateAt(2, 14, 0),
    status: 'Received',
    items: buildPoItems(3, 3, 0),
  },
];

export const PO_OPTIONS: SelectOption[] = PURCHASE_ORDERS_SEED.filter(
  (po) => po.status === 'Pending',
).map((po) => ({ value: po.poNumber, label: po.poNumber }));

export type StockReceiptItem = {
  medicationName: string;
  strength: string;
  form: string;
  unit: string;
  category: string;
  batchNo: string;
  expiryDate: string; // ISO date
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  reorderLevel: number;
  controlledSchedule?: ControlledSchedule;
};

export type StockReceipt = {
  id: string;
  poNumber: string;
  supplier: string;
  warehouseLocationId: PharmacyLocationId;
  deliveryNote: string;
  referenceNo: string;
  receivedBy: string;
  receivedAt: string; // ISO
  notes: string;
  items: StockReceiptItem[];
  totalValueExclTax: number;
  tax: number;
  totalValueInclTax: number;
  status: 'Completed' | 'Partial';
};

const RECEIPT_VAT_RATE = 0.075; // Nigeria's standard VAT rate

function buildReceiptItems(
  picks: { name: string; batchNo: string; expiryDate: string; qty: number }[],
): StockReceiptItem[] {
  return picks.map((p) => {
    const entry = getCatalogEntry(p.name)!;
    return {
      medicationName: entry.name,
      strength: entry.strength,
      form: entry.form,
      unit: entry.unit,
      category: entry.category,
      batchNo: p.batchNo,
      expiryDate: p.expiryDate,
      orderedQty: p.qty,
      receivedQty: p.qty,
      unitPrice: entry.unitPrice,
      reorderLevel: entry.reorderLevel,
      ...(entry.controlledSchedule ? { controlledSchedule: entry.controlledSchedule } : {}),
    };
  });
}

function receiptTotals(items: StockReceiptItem[]): {
  totalValueExclTax: number;
  tax: number;
  totalValueInclTax: number;
} {
  const totalValueExclTax = items.reduce((sum, i) => sum + i.receivedQty * i.unitPrice, 0);
  const tax = Math.round(totalValueExclTax * RECEIPT_VAT_RATE);
  return { totalValueExclTax, tax, totalValueInclTax: totalValueExclTax + tax };
}

const CURATED_RECEIPT_DEFS: {
  id: string;
  poNumber: string;
  supplier: string;
  warehouseLocationId: PharmacyLocationId;
  receivedAt: string;
  picks: { name: string; batchNo: string; expiryDate: string; qty: number }[];
}[] = [
  {
    id: 'RCV-2026-0630-002',
    poNumber: poNumber(0, 16),
    supplier: 'MedPlus Distributors',
    warehouseLocationId: 'loc_awka',
    receivedAt: pastDateAt(0, 10, 15),
    picks: [
      { name: 'Amoxicillin', batchNo: 'AMX2506', expiryDate: daysFromNow(400), qty: 1000 },
      { name: 'Paracetamol', batchNo: 'PAR2505', expiryDate: daysFromNow(350), qty: 800 },
      { name: 'Ciprofloxacin', batchNo: 'CIP2502', expiryDate: daysFromNow(300), qty: 500 },
    ],
  },
  {
    id: 'RCV-2026-0629-001',
    poNumber: poNumber(0, 15),
    supplier: 'PharmaCare Nigeria Ltd',
    warehouseLocationId: 'loc_nnewi',
    receivedAt: pastDateAt(1, 9, 30),
    picks: [
      { name: 'Losartan', batchNo: 'LOS2501', expiryDate: daysFromNow(560), qty: 300 },
      { name: 'Salbutamol', batchNo: 'SAL2505', expiryDate: daysFromNow(280), qty: 50 },
    ],
  },
  {
    id: 'RCV-2026-0628-003',
    poNumber: poNumber(0, 18),
    supplier: 'Fidson Healthcare',
    warehouseLocationId: 'loc_mbaukwu',
    receivedAt: pastDateAt(2, 8, 50),
    picks: [
      { name: 'Omeprazole', batchNo: 'OME2503', expiryDate: daysFromNow(600), qty: 400 },
      { name: 'Metformin', batchNo: 'MET2502', expiryDate: daysFromNow(320), qty: 600 },
      { name: 'Atorvastatin', batchNo: 'ATO2504', expiryDate: daysFromNow(310), qty: 250 },
    ],
  },
];

const GENERATED_RECEIPT_DEFS = Array.from({ length: 14 }, (_, i) => {
  const daysAgo = i < 4 ? 0 : i % 27; // several land "today" too, rest spread across ~this month
  const supplier = SUPPLIER_DIRECTORY[i % SUPPLIER_DIRECTORY.length]!.name;
  const location = PHARMACY_LOCATIONS[i % PHARMACY_LOCATIONS.length]!.id;
  const itemCount = 2 + (i % 3);
  const picks = Array.from({ length: itemCount }, (_, j) => {
    const pool = PO_ITEM_POOL[(i + j) % PO_ITEM_POOL.length]!;
    return {
      name: pool.name,
      batchNo: `${pool.batchPrefix}${2600 + ((i + j) % 40)}`,
      expiryDate: daysFromNow(200 + ((i + j) % 300)),
      qty: [50, 150, 300, 500, 700][(i + j) % 5]!,
    };
  });
  return {
    id: `RCV-${new Date().getFullYear()}-GEN-${String(i + 1).padStart(3, '0')}`,
    poNumber: poNumber(0, 24 - (i % 9)),
    supplier,
    warehouseLocationId: location,
    receivedAt: pastDateAt(daysAgo, 8 + (i % 9), (i * 13) % 60),
    picks,
  };
});

/** Curated recent receipts (for the Recent Receipts panel) plus generated
 * history spread across this month (feeding the "Items Received"/"Value
 * Received This Month" stats with real, derived totals). The store's live
 * submitReceipt() prepends new real receipts to this same list. */
export const STOCK_RECEIPTS_SEED: StockReceipt[] = [
  ...CURATED_RECEIPT_DEFS,
  ...GENERATED_RECEIPT_DEFS,
].map((def) => {
  const items = buildReceiptItems(def.picks);
  const totals = receiptTotals(items);
  return {
    id: def.id,
    poNumber: def.poNumber,
    supplier: def.supplier,
    warehouseLocationId: def.warehouseLocationId,
    deliveryNote: `INV-${def.supplier.slice(0, 3).toUpperCase()}-${def.id.slice(-8)}`,
    referenceNo: `REF-${def.id.slice(4)}`,
    receivedBy: 'Mr. Emeka Obi',
    receivedAt: def.receivedAt,
    notes: 'Delivery made in good condition.',
    items,
    ...totals,
    status: 'Completed' as const,
  };
});

export function getPendingPurchaseOrders(): PurchaseOrder[] {
  return PURCHASE_ORDERS_SEED.filter((po) => po.status === 'Pending');
}

// ── Stock transfers ───────────────────────────────────────────────────────────
// Real inter-location movements between the 6 UNIZIK/NAUTH pharmacy outlets
// (pharmacyLocations.ts). Completing a transfer (stockTransferStore.ts) is a
// genuine stock movement — it calls inventoryStore.ts's
// transferStockBetweenLocations(), decrementing the source batch and
// crediting the destination, not just flipping a status label.

export type StockTransferStatus =
  'Draft' | 'Pending Approval' | 'In Transit' | 'Completed' | 'Cancelled' | 'Rejected';

export type StockTransferItem = {
  medicationName: string;
  strength: string;
  form: string;
  unit: string;
  batchNo: string;
  qty: number;
};

export type StockTransfer = {
  id: string; // TRF-2026-00034
  fromLocationId: PharmacyLocationId;
  toLocationId: PharmacyLocationId;
  status: StockTransferStatus;
  requestedAt: string; // ISO
  requestedBy: string;
  items: StockTransferItem[];
  dispatchedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  notes?: string;
};

function transferId(n: number): string {
  return `TRF-${new Date().getFullYear()}-${String(n).padStart(5, '0')}`;
}

const TRANSFER_REQUESTERS = [
  'Mr. Emeka Obi',
  'Pharmacist Adaeze',
  'John Okafor',
  'Maryam Usman',
  'Dr. Emeka Nwosu',
  'Dr. Victoria O.',
];

const TRANSFER_ITEM_POOL: { name: string; batchPrefix: string }[] = [
  { name: 'Amoxicillin', batchPrefix: 'AMX' },
  { name: 'Paracetamol', batchPrefix: 'PAR' },
  { name: 'Ciprofloxacin', batchPrefix: 'CIP' },
  { name: 'Losartan', batchPrefix: 'LOS' },
  { name: 'Salbutamol', batchPrefix: 'SAL' },
  { name: 'Omeprazole', batchPrefix: 'OME' },
  { name: 'Metformin', batchPrefix: 'MET' },
  { name: 'Atorvastatin', batchPrefix: 'ATO' },
  { name: 'Ibuprofen', batchPrefix: 'IBU' },
  { name: 'Diclofenac', batchPrefix: 'DIC' },
];

function buildTransferItems(startIdx: number, count: number): StockTransferItem[] {
  return Array.from({ length: count }, (_, i) => {
    const pick = TRANSFER_ITEM_POOL[(startIdx + i) % TRANSFER_ITEM_POOL.length]!;
    const entry = getCatalogEntry(pick.name)!;
    return {
      medicationName: entry.name,
      strength: entry.strength,
      form: entry.form,
      unit: entry.unit,
      batchNo: `${pick.batchPrefix}${2500 + ((startIdx + i * 3) % 30)}`,
      qty: [10, 20, 30, 40, 50, 60][(startIdx + i) % 6]!,
    };
  });
}

/** 34 transfers across this month, deliberately mirroring a real distribution
 * (18 Completed, 3 In Transit, 5 Pending Approval, 2 Cancelled/Rejected,
 * 6 Draft) so the sidebar donut sums to the same total as the table. */
export const STOCK_TRANSFERS_SEED: StockTransfer[] = (() => {
  const rows: StockTransfer[] = [];
  let seq = 34;

  function push(
    status: StockTransferStatus,
    fromLocationId: PharmacyLocationId,
    toLocationId: PharmacyLocationId,
    daysAgo: number,
    itemCount: number,
  ) {
    const requestedBy = TRANSFER_REQUESTERS[seq % TRANSFER_REQUESTERS.length]!;
    const requestedAt = pastDateAt(daysAgo, 8 + (seq % 10), (seq * 7) % 60);
    const items = buildTransferItems(seq, itemCount);
    const base: StockTransfer = {
      id: transferId(seq),
      fromLocationId,
      toLocationId,
      status,
      requestedAt,
      requestedBy,
      items,
    };
    if (status === 'In Transit' || status === 'Completed') {
      base.dispatchedAt = pastDateAt(Math.max(0, daysAgo - 1), 9, 0);
    }
    if (status === 'Completed') {
      base.completedAt = pastDateAt(Math.max(0, daysAgo - 2), 15, 0);
    }
    if (status === 'Cancelled' || status === 'Rejected') {
      base.cancelledAt = pastDateAt(Math.max(0, daysAgo - 1), 12, 0);
    }
    rows.push(base);
    seq -= 1;
  }

  // 18 Completed
  for (let i = 0; i < 18; i++) {
    push(
      'Completed',
      PHARMACY_LOCATIONS[i % PHARMACY_LOCATIONS.length]!.id,
      PHARMACY_LOCATIONS[(i + 1 + (i % 4)) % PHARMACY_LOCATIONS.length]!.id,
      3 + i,
      2 + (i % 4),
    );
  }
  // 3 In Transit
  for (let i = 0; i < 3; i++) {
    push(
      'In Transit',
      PHARMACY_LOCATIONS[(i + 2) % PHARMACY_LOCATIONS.length]!.id,
      PHARMACY_LOCATIONS[(i + 4) % PHARMACY_LOCATIONS.length]!.id,
      1,
      3 + i,
    );
  }
  // 5 Pending Approval
  for (let i = 0; i < 5; i++) {
    push(
      'Pending Approval',
      PHARMACY_LOCATIONS[(i + 1) % PHARMACY_LOCATIONS.length]!.id,
      PHARMACY_LOCATIONS[(i + 3) % PHARMACY_LOCATIONS.length]!.id,
      0,
      2 + (i % 3),
    );
  }
  // 1 Cancelled + 1 Rejected
  push('Cancelled', 'loc_awka', 'loc_nnewi', 6, 4);
  push('Rejected', 'loc_mbaukwu', 'loc_awka', 7, 3);
  // 6 Draft
  for (let i = 0; i < 6; i++) {
    push(
      'Draft',
      PHARMACY_LOCATIONS[i % PHARMACY_LOCATIONS.length]!.id,
      PHARMACY_LOCATIONS[(i + 2) % PHARMACY_LOCATIONS.length]!.id,
      0,
      2,
    );
  }

  return rows.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
})();

export function getPendingTransferCount(): number {
  return STOCK_TRANSFERS_SEED.filter((t) => t.status === 'Pending Approval').length;
}

export function getTransferItemCount(t: StockTransfer): number {
  return t.items.reduce((sum, i) => sum + i.qty, 0);
}

// ── Stock Adjustments ─────────────────────────────────────────────────────────
// Corrections to on-hand quantity for reasons other than a receipt or
// transfer — a physical count, an expiry write-off, damage, a patient
// return, or fixing a data-entry mistake. Confirming an adjustment
// (stockAdjustmentStore.ts) calls inventoryStore.ts's adjustStockQty() on the
// real batch — the number here becomes the number Drug Inventory shows, not
// a parallel ledger.

export type AdjustmentType = 'Increase' | 'Decrease';

export type AdjustmentReason =
  | 'Expired Items'
  | 'Stock Count Adjustment'
  | 'Damaged Items'
  | 'Received (Unrecorded)'
  | 'Patient Return'
  | 'Correction of Entry Error'
  | 'Spillage'
  | 'Others';

export const ADJUSTMENT_REASON_OPTIONS: SelectOption[] = [
  { value: 'Expired Items', label: 'Expired Items' },
  { value: 'Stock Count Adjustment', label: 'Stock Count Adjustment' },
  { value: 'Damaged Items', label: 'Damaged Items' },
  { value: 'Received (Unrecorded)', label: 'Received (Unrecorded)' },
  { value: 'Patient Return', label: 'Patient Return' },
  { value: 'Correction of Entry Error', label: 'Correction of Entry Error' },
  { value: 'Spillage', label: 'Spillage' },
  { value: 'Others', label: 'Others' },
];

export const ADJUSTMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Increase', label: 'Increase' },
  { value: 'Decrease', label: 'Decrease' },
];

export type StockAdjustmentItem = {
  medicationName: string;
  strength: string;
  form: string;
  unit: string;
  batchNo: string;
  /** Always positive — direction comes from the adjustment's own type. */
  qty: number;
  unitPrice: number;
};

export type StockAdjustment = {
  id: string; // ADJ-2026-00042
  locationId: PharmacyLocationId;
  adjustmentType: AdjustmentType;
  reason: AdjustmentReason;
  items: StockAdjustmentItem[];
  adjustedBy: string;
  adjustedAt: string; // ISO
  referenceNo?: string;
  notes?: string;
};

function adjustmentId(n: number): string {
  return `ADJ-${new Date().getFullYear()}-${String(n).padStart(5, '0')}`;
}

const REASON_PREFIX: Record<AdjustmentReason, string> = {
  'Expired Items': 'EXP',
  'Stock Count Adjustment': 'SCA',
  'Damaged Items': 'DAM',
  'Received (Unrecorded)': 'RCV',
  'Patient Return': 'RET',
  'Correction of Entry Error': 'COR',
  Spillage: 'SPG',
  Others: 'OTH',
};

function buildAdjustmentItems(
  startIdx: number,
  count: number,
  maxQty: number,
): StockAdjustmentItem[] {
  return Array.from({ length: count }, (_, i) => {
    const pick = TRANSFER_ITEM_POOL[(startIdx + i) % TRANSFER_ITEM_POOL.length]!;
    const entry = getCatalogEntry(pick.name)!;
    return {
      medicationName: entry.name,
      strength: entry.strength,
      form: entry.form,
      unit: entry.unit,
      batchNo: `${pick.batchPrefix}${2500 + ((startIdx + i * 3) % 30)}`,
      qty: 1 + ((startIdx + i * 7) % maxQty),
      unitPrice: entry.unitPrice,
    };
  });
}

/** 42 adjustments — 12 Expired, 10 Stock Count, 6 Damaged, 4 Patient Return,
 * 3 Spillage, and 7 more (Received Unrecorded/Correction/Others) that the
 * Adjustment Reasons donut folds into "Others". */
export const STOCK_ADJUSTMENTS_SEED: StockAdjustment[] = (() => {
  const rows: StockAdjustment[] = [];
  let seq = 42;

  function push(
    reason: AdjustmentReason,
    adjustmentType: AdjustmentType,
    daysAgo: number,
    itemCount: number,
  ) {
    const locationId = PHARMACY_LOCATIONS[seq % PHARMACY_LOCATIONS.length]!.id;
    const adjustedBy = TRANSFER_REQUESTERS[seq % TRANSFER_REQUESTERS.length]!;
    const adjustedAt = pastDateAt(daysAgo, 8 + (seq % 10), (seq * 11) % 60);
    const items = buildAdjustmentItems(seq, itemCount, 40);
    const prefix = REASON_PREFIX[reason];
    rows.push({
      id: adjustmentId(seq),
      locationId,
      adjustmentType,
      reason,
      items,
      adjustedBy,
      adjustedAt,
      referenceNo: `${prefix}-${String(6 + (seq % 24)).padStart(2, '0')}${String(1 + (seq % 28)).padStart(2, '0')}-${String(seq).padStart(3, '0')}`,
    });
    seq -= 1;
  }

  for (let i = 0; i < 12; i++) push('Expired Items', 'Decrease', i % 60, 2 + (i % 6));
  for (let i = 0; i < 10; i++) {
    push('Stock Count Adjustment', i % 2 === 0 ? 'Increase' : 'Decrease', i % 45, 3 + (i % 8));
  }
  for (let i = 0; i < 6; i++) push('Damaged Items', 'Decrease', i % 50, 2 + (i % 5));
  for (let i = 0; i < 4; i++) push('Patient Return', 'Increase', i % 40, 1 + (i % 4));
  for (let i = 0; i < 3; i++) push('Spillage', 'Decrease', i % 35, 1 + (i % 3));
  for (let i = 0; i < 3; i++) push('Received (Unrecorded)', 'Increase', i % 30, 2 + (i % 6));
  for (let i = 0; i < 2; i++) {
    push('Correction of Entry Error', i % 2 === 0 ? 'Increase' : 'Decrease', i % 20, 1 + (i % 3));
  }
  for (let i = 0; i < 2; i++)
    push('Others', i % 2 === 0 ? 'Increase' : 'Decrease', i % 15, 1 + (i % 3));

  return rows.sort((a, b) => new Date(b.adjustedAt).getTime() - new Date(a.adjustedAt).getTime());
})();

export function getAdjustmentQty(a: StockAdjustment): number {
  return a.items.reduce((sum, i) => sum + i.qty, 0);
}

/** Positive for an Increase, negative for a Decrease — so summing this
 * across a set of adjustments gives an honest net value impact. */
export function getAdjustmentValueImpact(a: StockAdjustment): number {
  const raw = a.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  return a.adjustmentType === 'Increase' ? raw : -raw;
}

// ── Safety alerts ─────────────────────────────────────────────────────────────

export const SAFETY_ALERT_COUNTS = {
  drugInteractions: 3,
  allergyConflicts: 2,
  duplicateTherapy: 1,
  highRiskMedications: 2,
  expiredAttempts: 1,
};

// ── Pharmacy-specific notifications (merged with real announcements on the
// dashboard) ──────────────────────────────────────────────────────────────────

export type PharmacyNotificationType = 'prescription' | 'stock' | 'batch' | 'transfer' | 'system';

export type PharmacyNotification = {
  id: string;
  type: PharmacyNotificationType;
  title: string;
  body: string;
  timestamp: string; // ISO
};

export const PHARMACY_NOTIFICATIONS: PharmacyNotification[] = [
  {
    id: 'pn-1',
    type: 'prescription',
    title: 'New prescription received',
    body: 'RX-250630-006 from Dr. Jane Ezeonu (GP)',
    timestamp: atOffset(0.03),
  },
  {
    id: 'pn-2',
    type: 'stock',
    title: 'Stock for Paracetamol 500mg is low',
    body: 'Current stock: 18 units',
    timestamp: atOffset(0.17),
  },
  {
    id: 'pn-3',
    type: 'batch',
    title: 'Batch PAR-2505 expiring in 12 days',
    body: 'Paracetamol 500mg',
    timestamp: atOffset(0.42),
  },
  {
    id: 'pn-4',
    type: 'transfer',
    title: 'Stock transfer request pending',
    body: 'From Main Store to Pharmacy',
    timestamp: atOffset(0.58),
  },
  {
    id: 'pn-5',
    type: 'system',
    title: 'System Maintenance Notice',
    body: 'On the 5th, 12:00 AM – 2:00 AM',
    timestamp: atOffset(1),
  },
];

// ── Prescription Details screen ─────────────────────────────────────────────

export type PrescriptionAttachment = {
  id: string;
  filename: string;
  sizeLabel: string;
  uploadedAt: string; // ISO
};

/** Same illustrative attachment set on every prescription — there's no real
 * upload flow behind prescriptions yet, so these stand in for whatever a
 * consultation actually attached. Their download button generates a real
 * placeholder file rather than doing nothing (checklist rule 10). */
export const PRESCRIPTION_ATTACHMENTS_SEED: PrescriptionAttachment[] = [
  { id: 'att-1', filename: 'Lab Result - CBC.pdf', sizeLabel: '128 KB', uploadedAt: atOffset(2) },
  { id: 'att-2', filename: 'ECG Report.pdf', sizeLabel: '256 KB', uploadedAt: atOffset(2) },
];

/** Available stock for a prescribed medication, matched by name against the
 * inventory — used by the Prescription Details "Stock Availability" table. */
export function getStockForMedication(medicationName: string): DrugInventoryItem | null {
  return (
    DRUG_INVENTORY.find((d) => d.name.toLowerCase().startsWith(medicationName.toLowerCase())) ??
    null
  );
}

// ── Medication Refill Requests ───────────────────────────────────────────────

export type RefillRequestStatus = 'Pending Review' | 'Approved' | 'Dispensed' | 'Denied';
export type RefillRequestSource = 'Patient Portal' | 'Mobile App' | 'Doctor' | 'Walk-in' | 'Phone';

export type RefillRequest = {
  id: string; // REF-2026-0056
  patientId: string;
  medicationName: string;
  dose: string;
  qty: number;
  form: string;
  department: string;
  lastFilledDate: string; // ISO date
  requestedAt: string; // ISO
  status: RefillRequestStatus;
  source: RefillRequestSource;
  requestedByDoctorName?: string; // only when source === 'Doctor'
  reviewedAt?: string; // ISO
  reviewNote?: string;
  /** Set once approved — the real PharmacyQueueEntry.rxNo this request became,
   * so it can be tracked through to actually being dispensed rather than the
   * refill request staying "Approved" forever with nothing behind it. */
  linkedRxNo?: string;
};

export const REFILL_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Pending Review', label: 'Pending Review' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Dispensed', label: 'Dispensed' },
  { value: 'Denied', label: 'Denied' },
];

const REFILL_SOURCES: RefillRequestSource[] = [
  'Patient Portal',
  'Patient Portal',
  'Mobile App',
  'Mobile App',
  'Doctor',
  'Walk-in',
  'Phone',
];

function refillId(n: number): string {
  return `REF-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
}

const REFILL_MEDICATIONS: { name: string; dose: string; form: string; qty: number }[] = [
  { name: 'Amlodipine 5mg', dose: '5mg', form: 'Tablet', qty: 30 },
  { name: 'Metformin 500mg', dose: '500mg', form: 'Tablet', qty: 60 },
  { name: 'Atorvastatin 20mg', dose: '20mg', form: 'Tablet', qty: 30 },
  { name: 'Salbutamol Inhaler', dose: '100mcg', form: 'Inhaler', qty: 1 },
  { name: 'Losartan 50mg', dose: '50mg', form: 'Tablet', qty: 30 },
  { name: 'Omeprazole 20mg', dose: '20mg', form: 'Capsule', qty: 30 },
  { name: 'Cetirizine 10mg', dose: '10mg', form: 'Tablet', qty: 30 },
  { name: 'Amoxicillin 500mg', dose: '500mg', form: 'Capsule', qty: 21 },
];

/** 56 refill requests spread over the past ~10 days, in a realistic mix of
 * statuses and request sources. `refillRequestStore.ts` owns the live,
 * mutable copy. */
export const REFILL_REQUESTS_SEED: RefillRequest[] = Array.from({ length: 56 }, (_, i) => {
  const med = REFILL_MEDICATIONS[i % REFILL_MEDICATIONS.length]!;
  const doctor = DOCTORS[i % DOCTORS.length]!;
  const source = REFILL_SOURCES[i % REFILL_SOURCES.length]!;
  const daysAgo = i % 10;
  const requestedAt = pastDateAt(daysAgo, 8 + (i % 10), (i * 9) % 60);
  const lastFilledDate = pastDateAt(daysAgo + 28 + (i % 14), 10, 0).slice(0, 10);
  // Roughly: ~32% Pending Review, ~46% Approved, ~15% Dispensed (already
  // fulfilled), ~7% Denied — close to a real pharmacy's refill mix.
  const status: RefillRequestStatus =
    i % 14 === 0
      ? 'Denied'
      : i % 7 === 0
        ? 'Dispensed'
        : i % 2 === 0
          ? 'Approved'
          : 'Pending Review';
  return {
    id: refillId(56 - i),
    patientId: `dp-${String((i % 150) + 1).padStart(3, '0')}`,
    medicationName: med.name,
    dose: med.dose,
    qty: med.qty,
    form: med.form,
    department: doctor.department,
    lastFilledDate,
    requestedAt,
    status,
    source,
    ...(source === 'Doctor' ? { requestedByDoctorName: doctor.name } : {}),
    ...(status !== 'Pending Review'
      ? { reviewedAt: pastDateAt(Math.max(0, daysAgo - 1), 9, 0) }
      : {}),
  };
});

// ── Procurement requests ─────────────────────────────────────────────────────
// The internal request stage that comes *before* a real purchase order: a
// department asks for medication/supplies/equipment, a pharmacist approves
// or rejects it, and — the one genuine cross-store write on this screen —
// marking an Approved request "Ordered" calls stockReceivingStore.ts's
// addPurchaseOrder(), which creates a real PurchaseOrder that immediately
// shows up in Stock Receiving's own Pending list. Historical seed rows carry
// a plausible poNumber/supplier for display but aren't cross-linked to a
// specific seeded PurchaseOrder — only the live write path is.

export type ProcurementRequestType = 'Medication' | 'Medical Supplies' | 'Equipment';
export type ProcurementPriority = 'High' | 'Medium' | 'Low';
export type ProcurementRequestStatus =
  'Pending Approval' | 'Approved' | 'Rejected' | 'Ordered' | 'Partially Received' | 'Completed';

export type ProcurementRequestItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type ProcurementRequest = {
  id: string;
  requestType: ProcurementRequestType;
  department: string;
  requestedBy: string;
  priority: ProcurementPriority;
  createdAt: string; // ISO
  items: ProcurementRequestItem[];
  status: ProcurementRequestStatus;
  notes?: string;
  approvedBy?: string;
  rejectedReason?: string;
  supplier?: string;
  poNumber?: string;
};

export const REQUEST_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Medication', label: 'Medication' },
  { value: 'Medical Supplies', label: 'Medical Supplies' },
  { value: 'Equipment', label: 'Equipment' },
];

export const PROCUREMENT_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export const PROCUREMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Pending Approval', label: 'Pending Approval' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Ordered', label: 'Ordered' },
  { value: 'Partially Received', label: 'Partially Received' },
  { value: 'Completed', label: 'Completed' },
];

const PROCUREMENT_DEPARTMENTS = ['Pharmacy', 'Nursing', 'Laboratory', 'Emergency'] as const;

export const PROCUREMENT_DEPARTMENT_OPTIONS: SelectOption[] = PROCUREMENT_DEPARTMENTS.map((d) => ({
  value: d,
  label: d,
}));

const REQUESTERS_BY_DEPARTMENT: Record<(typeof PROCUREMENT_DEPARTMENTS)[number], string[]> = {
  Pharmacy: ['Pharmacist Adaeze', 'Pharmacist John', 'Mr. Emeka Obi'],
  Nursing: ['Nurse Victoria', 'Nurse Chidinma Eze'],
  Laboratory: ['Lab Scientist Mary', 'Lab Scientist Adaora'],
  Emergency: ['Dr. Emeka Nwosu', 'Dr. Chukwuemeka Nwosu'],
};

const SUPPLY_ITEM_POOL: { name: string; unitPrice: number }[] = [
  { name: 'Disposable Syringes (5ml)', unitPrice: 25 },
  { name: 'Surgical Gloves (Box of 100)', unitPrice: 3500 },
  { name: 'IV Cannulas (18G)', unitPrice: 120 },
  { name: 'Gauze Rolls', unitPrice: 350 },
  { name: 'Alcohol Swabs (Box)', unitPrice: 800 },
  { name: 'Face Masks (Box of 50)', unitPrice: 2500 },
  { name: 'Blood Collection Tubes', unitPrice: 45 },
  { name: 'Wound Dressing Kits', unitPrice: 1200 },
];

const EQUIPMENT_ITEM_POOL: { name: string; unitPrice: number }[] = [
  { name: 'Digital Blood Pressure Monitor', unitPrice: 45000 },
  { name: 'Infusion Pump', unitPrice: 385000 },
  { name: 'Pulse Oximeter', unitPrice: 28000 },
  { name: 'Nebulizer Machine', unitPrice: 65000 },
  { name: 'Vaccine Storage Refrigerator', unitPrice: 420000 },
];

function buildRequestItems(
  requestType: ProcurementRequestType,
  startIdx: number,
  count: number,
): ProcurementRequestItem[] {
  if (requestType === 'Medication') {
    return Array.from({ length: count }, (_, i) => {
      const entry = INVENTORY_CATALOG[(startIdx + i) % INVENTORY_CATALOG.length]!;
      return {
        name: `${entry.name} ${entry.strength}`,
        quantity: [50, 100, 150, 200, 300, 500][(startIdx + i) % 6]!,
        unitPrice: entry.unitPrice,
      };
    });
  }
  const pool = requestType === 'Equipment' ? EQUIPMENT_ITEM_POOL : SUPPLY_ITEM_POOL;
  return Array.from({ length: count }, (_, i) => {
    const pick = pool[(startIdx + i) % pool.length]!;
    return {
      name: pick.name,
      quantity:
        requestType === 'Equipment'
          ? [1, 2, 3][(startIdx + i) % 3]!
          : [50, 100, 200, 300][(startIdx + i) % 4]!,
      unitPrice: pick.unitPrice,
    };
  });
}

/** Catalog a New Procurement Request's item picker searches, keyed by the
 * chosen request type — medications draw from the real Drug Inventory
 * catalog (name + strength combined), supplies/equipment from their own
 * pools. Never a location's *current* stock — a request is for something to
 * be procured, not something already tracked. */
export function getProcurementCatalog(
  requestType: ProcurementRequestType,
): { name: string; unitPrice: number }[] {
  if (requestType === 'Medication') {
    return INVENTORY_CATALOG.map((entry) => ({
      name: `${entry.name} ${entry.strength}`,
      unitPrice: entry.unitPrice,
    }));
  }
  return requestType === 'Equipment' ? EQUIPMENT_ITEM_POOL : SUPPLY_ITEM_POOL;
}

export function getRequestItemCount(request: ProcurementRequest): number {
  return request.items.length;
}

export function getRequestEstAmount(request: ProcurementRequest): number {
  return request.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

function requestId(n: number): string {
  return `PR-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
}

/** 56 requests: 18 Pending Approval, 12 Approved, 10 Ordered, 4 Partially
 * Received, 12 Completed (0 Rejected — a real status, just not seeded, so
 * the donut and stat cards sum exactly to 56 without an invented bucket).
 * Newer statuses skew more recent (Pending Approval 0–4 days ago) down to
 * older ones (Completed up to ~3 weeks ago), like a real request pipeline. */
export const PROCUREMENT_REQUESTS_SEED: ProcurementRequest[] = (() => {
  const rows: ProcurementRequest[] = [];
  let seq = 56;

  const TYPES: ProcurementRequestType[] = ['Medication', 'Medical Supplies', 'Equipment'];
  const PRIORITIES: ProcurementPriority[] = ['High', 'Medium', 'Low'];

  function push(
    status: ProcurementRequestStatus,
    requestType: ProcurementRequestType,
    department: (typeof PROCUREMENT_DEPARTMENTS)[number],
    priority: ProcurementPriority,
    daysAgo: number,
    itemCount: number,
  ) {
    const pool = REQUESTERS_BY_DEPARTMENT[department];
    const requestedBy = pool[seq % pool.length]!;
    const createdAt = pastDateAt(daysAgo, 8 + (seq % 10), (seq * 7) % 60);
    const items = buildRequestItems(requestType, seq, itemCount);
    const base: ProcurementRequest = {
      id: requestId(seq),
      requestType,
      department,
      requestedBy,
      priority,
      createdAt,
      items,
      status,
    };
    if (status !== 'Pending Approval' && status !== 'Rejected') {
      base.approvedBy = 'Mr. Emeka Obi';
    }
    if (status === 'Ordered' || status === 'Partially Received' || status === 'Completed') {
      base.supplier = SUPPLIER_DIRECTORY[seq % SUPPLIER_DIRECTORY.length]!.name;
      base.poNumber = `PO-${new Date().getFullYear()}-${String(1 + (seq % 12)).padStart(2, '0')}-${String(700 + seq).padStart(4, '0')}`;
    }
    rows.push(base);
    seq -= 1;
  }

  // 18 Pending Approval — freshest
  for (let i = 0; i < 18; i++) {
    push(
      'Pending Approval',
      TYPES[i % TYPES.length]!,
      PROCUREMENT_DEPARTMENTS[i % PROCUREMENT_DEPARTMENTS.length]!,
      PRIORITIES[i % PRIORITIES.length]!,
      i % 5,
      4 + (i % 12),
    );
  }
  // 12 Approved
  for (let i = 0; i < 12; i++) {
    push(
      'Approved',
      TYPES[(i + 1) % TYPES.length]!,
      PROCUREMENT_DEPARTMENTS[(i + 1) % PROCUREMENT_DEPARTMENTS.length]!,
      PRIORITIES[(i + 2) % PRIORITIES.length]!,
      1 + (i % 6),
      3 + (i % 10),
    );
  }
  // 10 Ordered
  for (let i = 0; i < 10; i++) {
    push(
      'Ordered',
      TYPES[(i + 2) % TYPES.length]!,
      PROCUREMENT_DEPARTMENTS[(i + 2) % PROCUREMENT_DEPARTMENTS.length]!,
      PRIORITIES[i % PRIORITIES.length]!,
      2 + (i % 7),
      5 + (i % 8),
    );
  }
  // 4 Partially Received
  for (let i = 0; i < 4; i++) {
    push(
      'Partially Received',
      TYPES[i % TYPES.length]!,
      PROCUREMENT_DEPARTMENTS[(i + 3) % PROCUREMENT_DEPARTMENTS.length]!,
      PRIORITIES[(i + 1) % PRIORITIES.length]!,
      5 + i,
      6 + i,
    );
  }
  // 12 Completed — oldest
  for (let i = 0; i < 12; i++) {
    push(
      'Completed',
      TYPES[(i + 1) % TYPES.length]!,
      PROCUREMENT_DEPARTMENTS[i % PROCUREMENT_DEPARTMENTS.length]!,
      PRIORITIES[(i + 2) % PRIORITIES.length]!,
      6 + i,
      4 + (i % 10),
    );
  }

  return rows;
})();

// ── Adverse Drug Reactions (ADR) ────────────────────────────────────────────

export type ADRSeverity = 'Mild' | 'Moderate' | 'Severe' | 'Unknown';
export type ADRCausality = 'Definite' | 'Probable' | 'Possible' | 'Unlikely';
export type ADRStatus = 'Under Assessment' | 'Resolved' | 'Reported to NPC';
export type ADRDrugClass =
  'Antibiotics' | 'Analgesics' | 'Cardiovascular' | 'Anticonvulsants' | 'Others';

export type ADRReport = {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  suspectedDrugs: string[];
  drugClass: ADRDrugClass;
  reaction: string;
  severity: ADRSeverity;
  causality: ADRCausality;
  status: ADRStatus;
  onsetDate: string; // ISO date
  reportedAt: string; // ISO datetime
  reportedBy: string;
  actionTaken?: string;
  notes?: string;
};

export const ADR_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Under Assessment', label: 'Under Assessment' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Reported to NPC', label: 'Reported to NPC' },
];

export const ADR_SEVERITY_OPTIONS: SelectOption[] = [
  { value: 'Mild', label: 'Mild' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Severe', label: 'Severe' },
  { value: 'Unknown', label: 'Unknown' },
];

export const ADR_CAUSALITY_OPTIONS: SelectOption[] = [
  { value: 'Definite', label: 'Definite' },
  { value: 'Probable', label: 'Probable' },
  { value: 'Possible', label: 'Possible' },
  { value: 'Unlikely', label: 'Unlikely' },
];

export const ADR_SEVERITY_COLOR: Record<
  ADRSeverity,
  { color: string; border: string; bg: string }
> = {
  Mild: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Moderate: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Severe: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Unknown: { color: '#6B7280', border: 'rgba(107,114,128,0.35)', bg: 'rgba(107,114,128,0.08)' },
};

export const ADR_CAUSALITY_COLOR: Record<
  ADRCausality,
  { color: string; border: string; bg: string }
> = {
  Definite: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Probable: { color: '#7C3AED', border: 'rgba(124,58,237,0.35)', bg: 'rgba(124,58,237,0.08)' },
  Possible: { color: '#2563EB', border: 'rgba(37,99,235,0.35)', bg: 'rgba(37,99,235,0.08)' },
  Unlikely: { color: '#6B7280', border: 'rgba(107,114,128,0.35)', bg: 'rgba(107,114,128,0.08)' },
};

export const ADR_STATUS_COLOR: Record<ADRStatus, { color: string; border: string; bg: string }> = {
  'Under Assessment': {
    color: '#D97706',
    border: 'rgba(217,119,6,0.35)',
    bg: 'rgba(217,119,6,0.08)',
  },
  Resolved: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  'Reported to NPC': {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.35)',
    bg: 'rgba(124,58,237,0.08)',
  },
};

/** Fixed display order for the "Top Suspected Drug Classes" panel — matches
 * the order these classes are seeded in, so the panel never needs a sort. */
export const ADR_DRUG_CLASSES: ADRDrugClass[] = [
  'Antibiotics',
  'Analgesics',
  'Cardiovascular',
  'Anticonvulsants',
  'Others',
];

type ADRDrugPoolEntry = { drug: string; reactions: string[] };

const ADR_DRUG_POOL: Record<ADRDrugClass, ADRDrugPoolEntry[]> = {
  Antibiotics: [
    { drug: 'Amoxicillin 500mg', reactions: ['Skin rash, itching', 'Urticaria, pruritus'] },
    { drug: 'Ciprofloxacin 500mg', reactions: ['Dizziness, headache', 'Tendon pain'] },
    { drug: 'Vancomycin 1g', reactions: ['Red man syndrome', 'Fever, chills'] },
    { drug: 'Metronidazole 400mg', reactions: ['Nausea, metallic taste'] },
    { drug: 'Ceftriaxone 1g', reactions: ['Urticaria, pruritus'] },
    { drug: 'Doxycycline 100mg', reactions: ['Photosensitivity rash'] },
    { drug: 'Azithromycin 250mg', reactions: ['GI upset, diarrhea'] },
  ],
  Analgesics: [
    { drug: 'Diclofenac 50mg', reactions: ['Gastric pain, heartburn'] },
    { drug: 'Ibuprofen 400mg', reactions: ['GI bleeding', 'Epigastric pain'] },
    { drug: 'Tramadol 50mg', reactions: ['Dizziness, nausea'] },
    { drug: 'Morphine Sulfate 10mg', reactions: ['Drowsiness, constipation'] },
    { drug: 'Aspirin 300mg', reactions: ['Tinnitus, GI upset'] },
  ],
  Cardiovascular: [
    { drug: 'Warfarin 5mg', reactions: ['Bleeding gums, bruising'] },
    { drug: 'Lisinopril 10mg', reactions: ['Dry cough'] },
    { drug: 'Amlodipine 5mg', reactions: ['Ankle swelling'] },
    { drug: 'Atorvastatin 20mg', reactions: ['Muscle pain'] },
    { drug: 'Clopidogrel 75mg', reactions: ['Easy bruising'] },
  ],
  Anticonvulsants: [
    { drug: 'Carbamazepine 200mg', reactions: ['SJS (Skin peeling, fever)'] },
    { drug: 'Phenytoin 100mg', reactions: ['Gum hyperplasia'] },
    { drug: 'Sodium Valproate 500mg', reactions: ['Tremor, weight gain'] },
    { drug: 'Lamotrigine 100mg', reactions: ['Skin rash'] },
  ],
  Others: [
    { drug: 'Metformin 500mg', reactions: ['Nausea, diarrhea'] },
    { drug: 'Insulin Glargine', reactions: ['Hypoglycemia'] },
    { drug: 'Chlorphenamine 4mg', reactions: ['Drowsiness'] },
    { drug: 'Omeprazole 20mg', reactions: ['Headache'] },
    { drug: 'Prednisolone 5mg', reactions: ['Mood changes, insomnia'] },
  ],
};

/** Autocomplete suggestions for the Report New ADR form — not a hard
 * constraint, since ADR reporting must allow any suspected substance, in or
 * out of the hospital's own formulary. */
export const ADR_SUSPECTED_DRUG_SUGGESTIONS: string[] = Object.values(ADR_DRUG_POOL)
  .flat()
  .map((entry) => entry.drug);

export const ADR_DRUG_CLASS_OPTIONS: SelectOption[] = ADR_DRUG_CLASSES.map((c) => ({
  value: c,
  label: c,
}));

const ADR_DRUG_CLASS_COUNTS: { drugClass: ADRDrugClass; count: number }[] = [
  { drugClass: 'Antibiotics', count: 46 },
  { drugClass: 'Analgesics', count: 28 },
  { drugClass: 'Cardiovascular', count: 20 },
  { drugClass: 'Anticonvulsants', count: 12 },
  { drugClass: 'Others', count: 22 },
];

const ADR_REPORTERS = [
  'Pharm. Adaeze',
  'Pharm. Victoria',
  'Pharm. John',
  'Pharm. Grace',
  'Pharm. Ngozi',
  'Pharm. Chidi',
];

/** severity (46/42/24/16), status (88/16/24), and causality (55/43/20/10)
 * each hit an exact target distribution but are assigned via independently
 * salted rotations of the same generation index — so no two of these
 * attributes are correlated with each other or with drug class, matching
 * how the real sample rows mix them freely (e.g. Severe + Under Assessment
 * appears alongside Severe + Reported to NPC). */
function adrSeverityForIndex(i: number): ADRSeverity {
  if (i < 46) return 'Mild';
  if (i < 46 + 42) return 'Moderate';
  if (i < 46 + 42 + 24) return 'Severe';
  return 'Unknown';
}

function adrStatusForIndex(i: number): ADRStatus {
  const j = (i * 37 + 5) % 128;
  if (j < 88) return 'Resolved';
  if (j < 88 + 16) return 'Under Assessment';
  return 'Reported to NPC';
}

function adrCausalityForIndex(i: number): ADRCausality {
  const j = (i * 53 + 11) % 128;
  if (j < 55) return 'Possible';
  if (j < 55 + 43) return 'Probable';
  if (j < 55 + 43 + 20) return 'Definite';
  return 'Unlikely';
}

function adrReportId(n: number): string {
  return `ADR-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
}

/** 128 seeded reports — Report ID and dates are assigned by recency rank
 * (a decorrelated permutation of the generation index via `*41+7 mod 128`,
 * 41 being coprime with 128) so the newest report always gets the highest
 * ID number, independent of the drug-class-grouped generation order. */
export const ADR_REPORTS: ADRReport[] = (() => {
  const total = ADR_DRUG_CLASS_COUNTS.reduce((sum, s) => sum + s.count, 0);
  const rows: (ADRReport & { recencyRank: number })[] = [];
  let idx = 0;
  for (const spec of ADR_DRUG_CLASS_COUNTS) {
    const pool = ADR_DRUG_POOL[spec.drugClass];
    for (let k = 0; k < spec.count; k++) {
      const patient = DIRECTORY_PATIENTS[mixHash(idx + 9_000) % DIRECTORY_PATIENTS.length]!;
      const pick = pool[mixHash(idx + 8_000) % pool.length]!;
      const reaction = pick.reactions[mixHash(idx + 7_000) % pick.reactions.length]!;
      const recencyRank = (idx * 41 + 7) % total;

      rows.push({
        id: adrReportId(total - recencyRank),
        patientId: patient.id,
        patientName: patient.name,
        mrn: patient.mrn,
        suspectedDrugs: [pick.drug],
        drugClass: spec.drugClass,
        reaction,
        severity: adrSeverityForIndex(idx),
        causality: adrCausalityForIndex(idx),
        status: adrStatusForIndex(idx),
        onsetDate: pastDateAt(recencyRank + 2 + (idx % 3), 0, 0).slice(0, 10),
        reportedAt: pastDateAt(recencyRank, 8 + (idx % 10), (idx * 17) % 60),
        reportedBy: ADR_REPORTERS[mixHash(idx + 6_000) % ADR_REPORTERS.length]!,
        recencyRank,
      });
      idx++;
    }
  }

  return rows
    .sort((a, b) => a.recencyRank - b.recencyRank)
    .map(({ recencyRank: _recencyRank, ...report }) => report);
})();

// ── Dispensing Audit Trail ──────────────────────────────────────────────────

export type AuditAction = 'Dispense' | 'Modify' | 'Void' | 'Access' | 'Delete';
export type AuditOutcome = 'Success' | 'Voided' | 'Deleted';
export type AuditModule = 'Dispensing' | 'Inventory' | 'Prescriptions' | 'Procurement';

export type AuditTrailEvent = {
  id: string;
  timestamp: string; // ISO
  userName: string;
  userRole: string;
  ipAddress: string;
  action: AuditAction;
  outcome: AuditOutcome;
  /** Unset when the action has no associated patient (e.g. Delete) — used for
   * the detail modal's "View Profile" link. */
  patientId?: string;
  /** '—' when the action has no associated patient (e.g. Delete). */
  patientName: string;
  mrn: string;
  /** '—' when the action has no associated medication (e.g. Access, Delete). */
  medicationName: string;
  details: string;
  module: AuditModule;
};

export const AUDIT_ACTION_OPTIONS: SelectOption[] = [
  { value: 'Dispense', label: 'Dispense' },
  { value: 'Modify', label: 'Modify' },
  { value: 'Void', label: 'Void' },
  { value: 'Access', label: 'Access' },
  { value: 'Delete', label: 'Delete' },
];

export const AUDIT_OUTCOME_OPTIONS: SelectOption[] = [
  { value: 'Success', label: 'Success' },
  { value: 'Voided', label: 'Voided' },
  { value: 'Deleted', label: 'Deleted' },
];

export const AUDIT_MODULE_OPTIONS: SelectOption[] = [
  { value: 'Dispensing', label: 'Dispensing' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'Prescriptions', label: 'Prescriptions' },
  { value: 'Procurement', label: 'Procurement' },
];

export const AUDIT_ACTION_COLOR: Record<
  AuditAction,
  { color: string; border: string; bg: string }
> = {
  Dispense: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Modify: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Void: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Access: { color: '#2563EB', border: 'rgba(37,99,235,0.35)', bg: 'rgba(37,99,235,0.08)' },
  Delete: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
};

export const AUDIT_OUTCOME_COLOR: Record<
  AuditOutcome,
  { color: string; border: string; bg: string }
> = {
  Success: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Voided: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Deleted: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
};

type AuditUser = { name: string; role: string; ip: string };

/** The 4 named users the "Actions by User" panel breaks out individually —
 * everyone else rolls up into "Others". Weighted 5x in the picker pool below
 * so they dominate the log the way four regular staff pharmacists would. */
const AUDIT_NAMED_USERS: AuditUser[] = [
  { name: 'Pharm. Adaeze', role: 'Pharmacist', ip: '192.168.1.45' },
  { name: 'Pharm. Victoria', role: 'Pharmacist', ip: '192.168.1.32' },
  { name: 'Pharm. John', role: 'Pharmacist', ip: '192.168.1.45' },
  { name: 'Pharm. Grace', role: 'Pharmacist', ip: '192.168.1.22' },
];

const AUDIT_OTHER_USERS: AuditUser[] = [
  { name: 'Pharm. Ngozi', role: 'Pharmacist', ip: '192.168.1.51' },
  { name: 'Pharm. Chidi', role: 'Pharmacy Technician', ip: '192.168.1.38' },
  { name: 'Mr. Emeka Obi', role: 'Chief Pharmacist', ip: '192.168.1.10' },
];

export const AUDIT_USER_OPTIONS: SelectOption[] = [...AUDIT_NAMED_USERS, ...AUDIT_OTHER_USERS].map(
  (u) => ({ value: u.name, label: u.name }),
);

/** The users the "Actions by User" panel breaks out individually — anyone
 * else in an event's `userName` rolls up into "Others". */
export const AUDIT_NAMED_USER_NAMES: string[] = AUDIT_NAMED_USERS.map((u) => u.name);

const AUDIT_USER_POOL: AuditUser[] = [
  ...AUDIT_NAMED_USERS,
  ...AUDIT_NAMED_USERS,
  ...AUDIT_NAMED_USERS,
  ...AUDIT_NAMED_USERS,
  ...AUDIT_NAMED_USERS,
  ...AUDIT_OTHER_USERS,
];

const AUDIT_MODULE_POOL: AuditModule[] = [
  ...Array<AuditModule>(18).fill('Dispensing'),
  'Inventory',
  'Prescriptions',
  'Procurement',
];

const FORM_TO_UNIT_LABEL: Record<string, string> = {
  Capsule: 'caps',
  Tablet: 'tabs',
  Inhaler: 'inhalers',
  Nebules: 'nebules',
  Injection: 'vials',
};

const AUDIT_VOID_REASONS = [
  'Patient not available',
  'Prescription cancelled by doctor',
  'Insurance authorization failed',
  'Duplicate entry',
  'Stock discrepancy found',
];

const AUDIT_MODIFY_TEMPLATES = [
  (a: number, b: number) => `Quantity changed from ${a} to ${b}`,
  () => 'Instructions updated from OD to BD',
  () => 'Dosage adjusted per prescriber note',
  () => 'Patient allergy note updated',
];

const AUDIT_ACCESS_DETAILS = [
  'Viewed patient prescription and dispense history',
  'Viewed medication history',
  'Viewed patient allergy record',
  'Searched patient dispensing records',
];

const AUDIT_DELETE_DETAILS = [
  'Deleted draft dispense record',
  'Deleted duplicate audit entry',
  'Removed erroneous test record',
];

const AUDIT_ACTION_COUNTS: { action: AuditAction; count: number }[] = [
  { action: 'Dispense', count: 686 },
  { action: 'Access', count: 512 },
  { action: 'Modify', count: 32 },
  { action: 'Void', count: 12 },
  { action: 'Delete', count: 6 },
];

/** Today gets exactly 86 events (matching a realistic "today so far" spike);
 * the remaining events spread across the past 89 days via a decorrelated
 * hash so no two attributes (action, user, day) are positionally linked. */
function auditDayForGlobalIndex(globalIdx: number): number {
  if (globalIdx < 86) return 0;
  const rest = globalIdx - 86;
  return 1 + (mixHash(rest + 20_000) % 89);
}

function auditEventId(n: number): string {
  return `evt-${String(n).padStart(6, '0')}`;
}

export const AUDIT_TRAIL_EVENTS: AuditTrailEvent[] = (() => {
  const rows: AuditTrailEvent[] = [];
  let globalIdx = 0;

  for (const spec of AUDIT_ACTION_COUNTS) {
    for (let k = 0; k < spec.count; k++) {
      const user = AUDIT_USER_POOL[mixHash(globalIdx + 10_000) % AUDIT_USER_POOL.length]!;
      const patient = DIRECTORY_PATIENTS[mixHash(globalIdx + 11_000) % DIRECTORY_PATIENTS.length]!;
      const medication = INVENTORY_CATALOG[mixHash(globalIdx + 12_000) % INVENTORY_CATALOG.length]!;
      const auditModule =
        AUDIT_MODULE_POOL[mixHash(globalIdx + 13_000) % AUDIT_MODULE_POOL.length]!;
      const day = auditDayForGlobalIndex(globalIdx);
      const hour = 8 + (mixHash(globalIdx + 14_000) % 10);
      const minute = mixHash(globalIdx + 15_000) % 60;
      const timestamp = pastDateAt(day, hour, minute);
      const unitLabel = FORM_TO_UNIT_LABEL[medication.form] ?? 'units';
      const qty = 10 + (mixHash(globalIdx + 16_000) % 40);
      const batchNo = `${medication.name.slice(0, 3).toUpperCase()}${2500 + (mixHash(globalIdx + 17_000) % 99)}`;

      let outcome: AuditOutcome = 'Success';
      let patientId: string | undefined = patient.id;
      let patientName = patient.name;
      let mrn = patient.mrn;
      let medicationName = `${medication.name} ${medication.strength}`;
      let details = '';

      switch (spec.action) {
        case 'Dispense':
          details = `Dispensed ${qty} ${unitLabel} | Batch ${batchNo} | Qty: ${qty}`;
          break;
        case 'Modify': {
          const template =
            AUDIT_MODIFY_TEMPLATES[mixHash(globalIdx + 18_000) % AUDIT_MODIFY_TEMPLATES.length]!;
          const a = 10 + (mixHash(globalIdx + 19_000) % 40);
          const b = 10 + (mixHash(globalIdx + 21_000) % 40);
          details = template(a, b);
          break;
        }
        case 'Void':
          outcome = 'Voided';
          details = `Dispense voided | Reason: ${AUDIT_VOID_REASONS[mixHash(globalIdx + 22_000) % AUDIT_VOID_REASONS.length]}`;
          break;
        case 'Access':
          medicationName = '—';
          details =
            AUDIT_ACCESS_DETAILS[mixHash(globalIdx + 23_000) % AUDIT_ACCESS_DETAILS.length]!;
          break;
        case 'Delete':
          outcome = 'Deleted';
          patientId = undefined;
          patientName = '—';
          mrn = '—';
          medicationName = '—';
          details =
            AUDIT_DELETE_DETAILS[mixHash(globalIdx + 24_000) % AUDIT_DELETE_DETAILS.length]!;
          break;
      }

      rows.push({
        id: auditEventId(globalIdx),
        timestamp,
        userName: user.name,
        userRole: user.role,
        ipAddress: user.ip,
        action: spec.action,
        outcome,
        ...(patientId ? { patientId } : {}),
        patientName,
        mrn,
        medicationName,
        details,
        module: auditModule,
      });
      globalIdx++;
    }
  }

  return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
})();

// ── Medication Returns ───────────────────────────────────────────────────────

export type ReturnStatus = 'Pending' | 'Completed' | 'Rejected';
export type ReturnType =
  'Patient Return' | 'Ward Return' | 'Pharmacy Correction' | 'Expired/Damaged';
export type ReturnReasonCategory =
  'Therapy changed' | 'Duplicate dispense' | 'Adverse reaction' | 'Order cancelled' | 'Others';
export type RefundType = 'Refund' | 'Credit Note' | 'None';

export type MedicationReturn = {
  id: string;
  returnDate: string; // ISO
  patientId: string;
  patientName: string;
  mrn: string;
  medicationName: string;
  strength: string;
  form: string;
  category: string;
  /** ₦ per unit — carried so `completeReturn()` can restock at a real price,
   * not just flip a status. */
  unitPrice: number;
  qtyReturned: number;
  returnType: ReturnType;
  reason: string;
  reasonCategory: ReturnReasonCategory;
  status: ReturnStatus;
  returnedBy: string;
  refundType: RefundType;
  refundAmount: number;
  rejectedReason?: string;
};

export const RETURN_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Rejected', label: 'Rejected' },
];

export const RETURN_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Patient Return', label: 'Patient Return' },
  { value: 'Ward Return', label: 'Ward Return' },
  { value: 'Pharmacy Correction', label: 'Pharmacy Correction' },
  { value: 'Expired/Damaged', label: 'Expired/Damaged' },
];

export const RETURN_STATUS_COLOR: Record<
  ReturnStatus,
  { color: string; border: string; bg: string }
> = {
  Pending: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Completed: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Rejected: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
};

type ReturnUser = { name: string; ip: string };

const RETURN_USERS: ReturnUser[] = [
  { name: 'Pharm. Adaeze', ip: '192.168.1.45' },
  { name: 'Pharm. Victoria', ip: '192.168.1.32' },
  { name: 'Pharm. John', ip: '192.168.1.45' },
  { name: 'Pharm. Grace', ip: '192.168.1.22' },
  { name: 'Pharm. Ngozi', ip: '192.168.1.51' },
];

export const RETURN_PROCESSED_BY_OPTIONS: SelectOption[] = RETURN_USERS.map((u) => ({
  value: u.name,
  label: u.name,
}));

type ReturnReasonEntry = { reason: string; category: ReturnReasonCategory };

const RETURN_REASON_POOL: ReturnReasonEntry[] = [
  { reason: 'Therapy changed', category: 'Therapy changed' },
  { reason: 'Duplicate dispense', category: 'Duplicate dispense' },
  { reason: 'Adverse reaction', category: 'Adverse reaction' },
  { reason: 'Order cancelled', category: 'Order cancelled' },
];

const RETURN_OTHER_REASONS: string[] = [
  'Patient not available',
  'Patient deceased',
  'Prescribing error',
  'Incorrect medication dispensed',
  'Patient refused medication',
];

export const RETURN_REASON_OPTIONS: SelectOption[] = [
  ...RETURN_REASON_POOL.map((r) => r.reason),
  ...RETURN_OTHER_REASONS,
].map((r) => ({ value: r, label: r }));

/** Fixed display order for the "Returns by Reason" donut. */
export const RETURN_REASON_CATEGORIES: ReturnReasonCategory[] = [
  'Therapy changed',
  'Duplicate dispense',
  'Adverse reaction',
  'Order cancelled',
  'Others',
];

const RETURN_REASON_CATEGORY_COUNTS: { category: ReturnReasonCategory; count: number }[] = [
  { category: 'Therapy changed', count: 48 },
  { category: 'Duplicate dispense', count: 42 },
  { category: 'Adverse reaction', count: 26 },
  { category: 'Order cancelled', count: 18 },
  { category: 'Others', count: 22 },
];

const RETURN_TOTAL = RETURN_REASON_CATEGORY_COUNTS.reduce((sum, s) => sum + s.count, 0);

/** Completed/Pending/Rejected counts, decorrelated from reason category via
 * a rotated hash — a rejected return can have any reason, same as a
 * completed one. Chosen so Completed (120) and Rejected (12) exactly match
 * the two reference numbers that already check out against the 156 total;
 * Pending absorbs the remainder (24) rather than the reference's own
 * internally-inconsistent 18 (which didn't sum against the other two). */
function returnStatusForIndex(i: number): ReturnStatus {
  const j = (i * 41 + 13) % RETURN_TOTAL;
  if (j < 120) return 'Completed';
  if (j < 120 + 24) return 'Pending';
  return 'Rejected';
}

function returnTypeForIndex(i: number): ReturnType {
  const pool: ReturnType[] = [
    'Patient Return',
    'Patient Return',
    'Patient Return',
    'Ward Return',
    'Pharmacy Correction',
    'Expired/Damaged',
  ];
  return pool[mixHash(i + 30_000) % pool.length]!;
}

function returnId(n: number): string {
  return `RTN-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
}

export const MEDICATION_RETURNS: MedicationReturn[] = (() => {
  const rows: (MedicationReturn & { recencyRank: number })[] = [];
  let globalIdx = 0;

  for (const spec of RETURN_REASON_CATEGORY_COUNTS) {
    const reasonChoices =
      spec.category === 'Others'
        ? RETURN_OTHER_REASONS
        : [RETURN_REASON_POOL.find((r) => r.category === spec.category)!.reason];

    for (let k = 0; k < spec.count; k++) {
      const patient = DIRECTORY_PATIENTS[mixHash(globalIdx + 31_000) % DIRECTORY_PATIENTS.length]!;
      const medication = INVENTORY_CATALOG[mixHash(globalIdx + 32_000) % INVENTORY_CATALOG.length]!;
      const user = RETURN_USERS[mixHash(globalIdx + 33_000) % RETURN_USERS.length]!;
      const reason = reasonChoices[mixHash(globalIdx + 34_000) % reasonChoices.length]!;
      const status = returnStatusForIndex(globalIdx);
      const qtyReturned = 1 + (mixHash(globalIdx + 35_000) % 30);
      const recencyRank = (globalIdx * 37 + 5) % RETURN_TOTAL;

      const rawAmount = qtyReturned * medication.unitPrice;
      const refundAmount = status === 'Rejected' ? 0 : Math.round(rawAmount / 50) * 50;
      const refundType: RefundType =
        status === 'Rejected'
          ? 'None'
          : mixHash(globalIdx + 36_000) % 2 === 0
            ? 'Credit Note'
            : 'Refund';

      rows.push({
        id: returnId(RETURN_TOTAL - recencyRank),
        returnDate: pastDateAt(recencyRank, 8 + (globalIdx % 10), (globalIdx * 13) % 60),
        patientId: patient.id,
        patientName: patient.name,
        mrn: patient.mrn,
        medicationName: medication.name,
        strength: medication.strength,
        form: medication.form,
        category: medication.category,
        unitPrice: medication.unitPrice,
        qtyReturned,
        returnType: returnTypeForIndex(globalIdx),
        reason,
        reasonCategory: spec.category,
        status,
        returnedBy: user.name,
        refundType,
        refundAmount,
        ...(status === 'Rejected'
          ? {
              rejectedReason:
                RETURN_OTHER_REASONS[mixHash(globalIdx + 37_000) % RETURN_OTHER_REASONS.length]!,
            }
          : {}),
        recencyRank,
      });
      globalIdx++;
    }
  }

  return rows
    .sort((a, b) => a.recencyRank - b.recencyRank)
    .map(({ recencyRank: _recencyRank, ...ret }) => ret);
})();
