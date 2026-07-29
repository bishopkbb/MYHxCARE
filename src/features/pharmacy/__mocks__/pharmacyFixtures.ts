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

const GENERATED_PENDING: PharmacyQueueEntry[] = Array.from({ length: 27 }, (_, i) =>
  buildQueueEntry(
    `dp-${String((i % 60) + 7).padStart(3, '0')}`,
    1 + (i % 8),
    'Pending Verification',
  ),
);

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
const GENERATED_IN_PROGRESS: PharmacyQueueEntry[] = Array.from({ length: 8 }, (_, i) =>
  buildQueueEntry(`dp-${String((i % 60) + 100).padStart(3, '0')}`, 0.5 + i * 0.3, 'In Progress'),
);

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

export type SupplierInfo = {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
};

export const SUPPLIER_DIRECTORY: SupplierInfo[] = [
  {
    name: 'MedPlus Distributors',
    code: 'SUP-00045',
    address: '23 Ire Akari Street, Surulere, Lagos, Nigeria',
    phone: '+234 803 123 4567',
    email: 'info@medplusdistributors.com',
  },
  {
    name: 'PharmaCare Nigeria Ltd',
    code: 'SUP-00046',
    address: '14 Awolowo Road, Ikoyi, Lagos, Nigeria',
    phone: '+234 802 234 5678',
    email: 'sales@pharmacarenigeria.com',
  },
  {
    name: 'Fidson Healthcare',
    code: 'SUP-00047',
    address: 'Km 16, Ikorodu Road, Lagos, Nigeria',
    phone: '+234 801 345 6789',
    email: 'orders@fidson.com',
  },
  {
    name: 'Emzor Pharmaceuticals',
    code: 'SUP-00048',
    address: '3 Adeniyi Jones Avenue, Ikeja, Lagos, Nigeria',
    phone: '+234 809 456 7890',
    email: 'supply@emzorpharma.com',
  },
  {
    name: 'May & Baker Nigeria',
    code: 'SUP-00049',
    address: '3/5 Sapara Street, Industrial Estate, Lagos, Nigeria',
    phone: '+234 807 567 8901',
    email: 'procurement@may-baker.com',
  },
  {
    name: 'Juhel Nigeria Ltd',
    code: 'SUP-00050',
    address: '15 Enugu-Onitsha Expressway, Enugu, Nigeria',
    phone: '+234 806 678 9012',
    email: 'orders@juhelpharma.com',
  },
];

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
