/**
 * Mock fixtures for the Pharmacy Dashboard — prescription dispensing queue,
 * drug inventory, batch/expiry tracking, and stock transfers. Prescription
 * queue entries link to real, resolvable patients (`getPatientDetail()`) and
 * real doctors (`DOCTORS`) rather than inventing disconnected personas — the
 * same lesson this session's own name-collision fixes (SYS-001/005/007)
 * established. Swap out by pointing hooks to real endpoints in Phase 6.
 */

import { DOCTORS } from '@/features/shared/__mocks__/doctorDirectory';
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
];

// ── Recent dispensing activity / dispensing history ─────────────────────────

export type DispensingStatus = 'Completed' | 'Partial' | 'Returned' | 'Cancelled';

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

/** Every dispensing transaction on record — curated recent entries plus 180
 * days of generated history. The store's live `verifyAndDispense()` prepends
 * new real entries to this same list. */
export const DISPENSING_ACTIVITY_SEED: DispensingActivityEntry[] = [
  ...CURATED_DISPENSING_ACTIVITY,
  ...GENERATED_DISPENSING_HISTORY,
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

// ── Stock transfers ───────────────────────────────────────────────────────────

export type StockTransferStatus = 'Pending' | 'Approved' | 'Completed';

export type StockTransfer = {
  id: string;
  from: string;
  to: string;
  itemCount: number;
  status: StockTransferStatus;
  requestedAt: string; // ISO
};

export const STOCK_TRANSFERS: StockTransfer[] = [
  {
    id: 'st-1',
    from: 'Main Store',
    to: 'Pharmacy',
    itemCount: 8,
    status: 'Pending',
    requestedAt: atOffset(2),
  },
  {
    id: 'st-2',
    from: 'Pharmacy',
    to: 'Lab',
    itemCount: 5,
    status: 'Pending',
    requestedAt: atOffset(3),
  },
  {
    id: 'st-3',
    from: 'Main Store',
    to: 'Emergency',
    itemCount: 4,
    status: 'Pending',
    requestedAt: atOffset(4),
  },
  {
    id: 'st-4',
    from: 'Main Store',
    to: 'Ward 2',
    itemCount: 6,
    status: 'Pending',
    requestedAt: atOffset(5),
  },
  {
    id: 'st-5',
    from: 'Main Store',
    to: 'Ward 3',
    itemCount: 3,
    status: 'Pending',
    requestedAt: atOffset(6),
  },
  {
    id: 'st-6',
    from: 'Pharmacy',
    to: 'ICU',
    itemCount: 7,
    status: 'Pending',
    requestedAt: atOffset(7),
  },
  {
    id: 'st-7',
    from: 'Main Store',
    to: 'Maternity Ward',
    itemCount: 5,
    status: 'Pending',
    requestedAt: atOffset(8),
  },
  {
    id: 'st-8',
    from: 'Main Store',
    to: 'Pharmacy',
    itemCount: 10,
    status: 'Approved',
    requestedAt: atOffset(20),
  },
  {
    id: 'st-9',
    from: 'Pharmacy',
    to: 'Ward 1',
    itemCount: 6,
    status: 'Completed',
    requestedAt: atOffset(30),
  },
];

export function getPendingTransferCount(): number {
  return STOCK_TRANSFERS.filter((t) => t.status === 'Pending').length;
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
