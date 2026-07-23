/**
 * Mock fixtures for the nurse-facing Laboratory screen.
 * Swap out by pointing hooks to a real lab-orders/results endpoint in Phase 6.
 *
 * Deliberately a separate shape from `features/laboratory/__mocks__/labResultFixtures.ts`
 * (the lab-scientist/doctor results module) — that page models result entry and
 * verification; this one models the nurse's own real responsibilities: identify
 * the patient, collect and label the specimen correctly, track it to the lab,
 * and relay a critical value to the ordering doctor immediately. Reuses the
 * same `ResultFlag` semantics as the Patient Record's lab history so a
 * completed test never disagrees about whether it was Normal/Abnormal/Critical.
 */

import type { ResultFlag } from '@/features/nursing/__mocks__/patientRecordFixtures';
import type { LabResultRow } from '@/features/laboratory/__mocks__/labResultFixtures';

export type LabDepartment =
  'Hematology' | 'Biochemistry' | 'Microbiology' | 'Immunology' | 'Coagulation';
export type LabPriority = 'STAT' | 'Urgent' | 'Routine';
export type LabTestStatus =
  'Ordered' | 'Sample Collected' | 'In Process' | 'Rejected' | 'Completed';

export const DEPARTMENT_OPTIONS: { value: LabDepartment; label: string }[] = [
  { value: 'Hematology', label: 'Hematology' },
  { value: 'Biochemistry', label: 'Biochemistry' },
  { value: 'Microbiology', label: 'Microbiology' },
  { value: 'Immunology', label: 'Immunology' },
  { value: 'Coagulation', label: 'Coagulation' },
];

export const PRIORITY_OPTIONS: { value: LabPriority; label: string }[] = [
  { value: 'STAT', label: 'STAT' },
  { value: 'Urgent', label: 'Urgent' },
  { value: 'Routine', label: 'Routine' },
];

/** Upper-bound expected turnaround, in hours from sample collection — used to
 * flag a test as Overdue if the lab hasn't returned a result within it. */
export const TEST_TAT_HOURS: Record<string, number> = {
  'Complete Blood Count (CBC)': 4,
  'Urea, Creatinine & Electrolytes (U&E)': 6,
  'Liver Function Test (LFT)': 8,
  'Lipid Profile': 12,
  'Malaria Parasite (MP)': 2,
  'Blood Culture & Sensitivity': 72,
  'Widal Test': 4,
  HbA1c: 6,
  'Coagulation Profile (PT/APTT)': 4,
  'Urinalysis (Routine)': 2,
  'Group & Save': 2,
  'B-type Natriuretic Peptide (BNP)': 4,
};

/** Tests where the patient must fast beforehand — the nurse must confirm
 * fasting status before collecting, or the sample may be rejected. */
export const FASTING_REQUIRED_TESTS = new Set(['Lipid Profile', 'HbA1c']);

export type LabTestOrder = {
  id: string;
  /** Links to NursePatient.id for still-admitted roster patients. */
  patientId?: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: 'Male' | 'Female';
  ward?: string;
  bed?: string;
  testName: string;
  department: LabDepartment;
  priority: LabPriority;
  orderedBy: string;
  orderedAt: string; // ISO
  status: LabTestStatus;
  sampleCollectedAt?: string;
  sampleCollectedBy?: string;
  rejectionReason?: string;
  resultAt?: string;
  resultFlag?: ResultFlag;
  resultRows?: LabResultRow[];
  resultComment?: string;
  criticalValueLabel?: string; // e.g. "Potassium (K+) 6.2 mmol/L"
  criticalAcknowledgedAt?: string;
  criticalAcknowledgedBy?: string;
  lastFollowUpAt?: string;
  followUpCount?: number;
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const LAB_ORDERS: LabTestOrder[] = [
  // ── Doctor Requests — just ordered, no sample collected yet ──────────────
  {
    id: 'lab-001',
    patientId: 'np-013',
    patientName: 'Ikenna Bassey',
    mrn: 'MRN-2025-00218',
    age: 46,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 6',
    testName: 'Complete Blood Count (CBC)',
    department: 'Hematology',
    priority: 'Routine',
    orderedBy: 'Dr. Amina Yusuf',
    orderedAt: atOffset(0, 7, 45),
    status: 'Ordered',
  },
  {
    id: 'lab-002',
    patientName: 'Gloria Nwosu',
    mrn: 'MRN-2026-00791',
    age: 61,
    gender: 'Female',
    testName: 'Urea, Creatinine & Electrolytes (U&E)',
    department: 'Biochemistry',
    priority: 'Urgent',
    orderedBy: 'Dr. Chinedu Okafor',
    orderedAt: atOffset(0, 6, 30),
    status: 'Ordered',
  },
  {
    id: 'lab-003',
    patientId: 'np-007',
    patientName: 'Tunde Oladipo',
    mrn: 'MRN-2024-00876',
    age: 40,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 2',
    testName: 'Lipid Profile',
    department: 'Biochemistry',
    priority: 'Routine',
    orderedBy: 'Dr. Jane Ezeonu (GP)',
    orderedAt: atOffset(0, 5, 0),
    status: 'Ordered',
  },
  {
    id: 'lab-004',
    patientName: 'Fatima Ahmed',
    mrn: 'MRN-2026-00782',
    age: 32,
    gender: 'Female',
    testName: 'HbA1c',
    department: 'Biochemistry',
    priority: 'Routine',
    orderedBy: 'Dr. Amina Yusuf',
    orderedAt: atOffset(0, 7, 10),
    status: 'Ordered',
  },

  // ── Pending Tests — sample collected, awaiting lab result ────────────────
  {
    id: 'lab-005',
    patientId: 'np-001',
    patientName: 'Daniel Eze',
    mrn: 'MRN-2026-00187',
    age: 68,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 8',
    testName: 'Blood Culture & Sensitivity',
    department: 'Microbiology',
    priority: 'Urgent',
    orderedBy: 'Dr. Tunde Stephen',
    orderedAt: atOffset(0, 6, 0),
    status: 'In Process',
    sampleCollectedAt: atOffset(0, 6, 20),
    sampleCollectedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-006',
    patientId: 'np-003',
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    age: 32,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 5',
    testName: 'Widal Test',
    department: 'Microbiology',
    priority: 'Routine',
    orderedBy: 'Dr. Samuel A.',
    orderedAt: atOffset(0, 5, 30),
    status: 'Sample Collected',
    sampleCollectedAt: atOffset(0, 5, 50),
    sampleCollectedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-007',
    patientName: 'Aisha Ibrahim',
    mrn: 'MRN-2026-00821',
    age: 29,
    gender: 'Female',
    testName: 'Malaria Parasite (MP)',
    department: 'Microbiology',
    priority: 'Routine',
    orderedBy: 'Dr. Bello Ibrahim',
    orderedAt: atOffset(0, 4, 15),
    status: 'In Process',
    sampleCollectedAt: atOffset(0, 4, 30),
    sampleCollectedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-008',
    patientId: 'np-008',
    patientName: 'Chidinma Okafor',
    mrn: 'MRN-2026-0148',
    age: 53,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 12',
    testName: 'Coagulation Profile (PT/APTT)',
    department: 'Coagulation',
    priority: 'Routine',
    orderedBy: 'Dr. Tunde Stephen',
    orderedAt: atOffset(-1, 22, 0),
    status: 'In Process',
    sampleCollectedAt: atOffset(-1, 22, 15),
    sampleCollectedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-009',
    patientName: 'David Osei',
    mrn: 'MRN-2024-00398',
    age: 45,
    gender: 'Male',
    testName: 'Urinalysis (Routine)',
    department: 'Biochemistry',
    priority: 'Routine',
    orderedBy: 'Dr. Jane Ezeonu (GP)',
    orderedAt: atOffset(-1, 9, 0),
    status: 'Rejected',
    sampleCollectedAt: atOffset(-1, 9, 20),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    rejectionReason: 'Insufficient sample volume — please recollect.',
  },

  // ── Completed — Critical ─────────────────────────────────────────────────
  {
    id: 'lab-010',
    patientId: 'np-004',
    patientName: 'Amina Yusuf',
    mrn: 'MRN-2026-01544',
    age: 72,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 16',
    testName: 'Urea, Creatinine & Electrolytes (U&E)',
    department: 'Biochemistry',
    priority: 'STAT',
    orderedBy: 'Dr. Jane Ezeonu',
    orderedAt: atOffset(0, 6, 30),
    status: 'Completed',
    sampleCollectedAt: atOffset(0, 6, 45),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 7, 25),
    resultFlag: 'Critical',
    resultRows: [
      { parameter: 'Potassium (K+)', value: '6.2 mmol/L', reference: '3.5–5.1', flag: 'H' },
      { parameter: 'Sodium (Na+)', value: '138 mmol/L', reference: '135–145' },
      { parameter: 'Creatinine', value: '182 µmol/L', reference: '53–115', flag: 'H' },
    ],
    resultComment: 'CRITICAL: Hyperkalaemia. Urgent physician review required.',
    criticalValueLabel: 'Potassium (K+) 6.2 mmol/L',
  },
  {
    id: 'lab-011',
    patientName: 'Blessing John',
    mrn: 'MRN-2026-00872',
    age: 55,
    gender: 'Male',
    testName: 'Urea, Creatinine & Electrolytes (U&E)',
    department: 'Biochemistry',
    priority: 'STAT',
    orderedBy: 'Dr. Onyedika Umeh',
    orderedAt: atOffset(0, 6, 50),
    status: 'Completed',
    sampleCollectedAt: atOffset(0, 7, 0),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 7, 25),
    resultFlag: 'Critical',
    resultRows: [
      { parameter: 'Potassium (K+)', value: '6.2 mmol/L', reference: '3.5–5.1', flag: 'H' },
    ],
    resultComment: 'CRITICAL: Hyperkalaemia. Urgent physician review required.',
    criticalValueLabel: 'Potassium (K+) 6.2 mmol/L',
    criticalAcknowledgedAt: atOffset(0, 7, 40),
    criticalAcknowledgedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-012',
    patientName: 'Maryam Usman',
    mrn: 'MRN-2026-00765',
    age: 45,
    gender: 'Female',
    testName: 'Complete Blood Count (CBC)',
    department: 'Hematology',
    priority: 'STAT',
    orderedBy: 'Dr. Onyedika Umeh',
    orderedAt: atOffset(0, 6, 10),
    status: 'Completed',
    sampleCollectedAt: atOffset(0, 6, 25),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 6, 50),
    resultFlag: 'Critical',
    resultRows: [
      { parameter: 'Haemoglobin (Hb)', value: '6.8 g/dL', reference: '12–16', flag: 'L' },
    ],
    resultComment: 'CRITICAL: Severe anaemia. Urgent physician review required.',
    criticalValueLabel: 'Hb (Haemoglobin) 6.8 g/dL',
  },
  {
    id: 'lab-013',
    patientName: 'James Daniel',
    mrn: 'MRN-2026-00851',
    age: 47,
    gender: 'Male',
    testName: 'Fasting Blood Sugar (FBS)',
    department: 'Biochemistry',
    priority: 'STAT',
    orderedBy: 'Dr. Amina Yusuf',
    orderedAt: atOffset(0, 5, 20),
    status: 'Completed',
    sampleCollectedAt: atOffset(0, 5, 40),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 5, 45),
    resultFlag: 'Critical',
    resultRows: [
      { parameter: 'Blood Sugar (FBS)', value: '412 mg/dL', reference: '70–100', flag: 'H' },
    ],
    resultComment: 'CRITICAL: Severe hyperglycaemia. Urgent physician review required.',
    criticalValueLabel: 'Blood Sugar (FBS) 412 mg/dL',
  },

  // ── Completed — Normal / Abnormal ────────────────────────────────────────
  {
    id: 'lab-014',
    patientName: 'Hauwa Bello',
    mrn: 'MRN-2026-00801',
    age: 38,
    gender: 'Female',
    testName: 'Complete Blood Count (CBC)',
    department: 'Hematology',
    priority: 'Routine',
    orderedBy: 'Dr. Jane Ezeonu (GP)',
    orderedAt: atOffset(0, 7, 30),
    status: 'Completed',
    sampleCollectedAt: atOffset(0, 7, 45),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 8, 0),
    resultFlag: 'Normal',
    resultRows: [{ parameter: 'Haemoglobin (Hb)', value: '13.2 g/dL', reference: '12–16' }],
  },
  {
    id: 'lab-015',
    patientName: 'Comfort Adeyemi',
    mrn: 'MRN-2026-00830',
    age: 27,
    gender: 'Female',
    testName: 'Urinalysis (Routine)',
    department: 'Biochemistry',
    priority: 'Routine',
    orderedBy: 'Dr. Amina Yusuf',
    orderedAt: atOffset(0, 7, 35),
    status: 'Completed',
    sampleCollectedAt: atOffset(0, 7, 45),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 7, 55),
    resultFlag: 'Normal',
    resultRows: [{ parameter: 'Protein', value: 'Negative', reference: 'Negative' }],
  },
  {
    id: 'lab-016',
    patientName: 'Rukayya Musa',
    mrn: 'MRN-2026-00860',
    age: 26,
    gender: 'Female',
    testName: 'Malaria Parasite (MP)',
    department: 'Microbiology',
    priority: 'Routine',
    orderedBy: 'Dr. Jane Ezeonu (GP)',
    orderedAt: atOffset(0, 7, 20),
    status: 'Completed',
    sampleCollectedAt: atOffset(0, 7, 30),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 7, 40),
    resultFlag: 'Normal',
    resultRows: [{ parameter: 'P. falciparum antigen', value: 'Negative', reference: 'Negative' }],
  },
  {
    id: 'lab-017',
    patientId: 'np-006',
    patientName: 'Peter Obi',
    mrn: 'MRN-2026-00932',
    age: 51,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 13',
    testName: 'HbA1c',
    department: 'Biochemistry',
    priority: 'Routine',
    orderedBy: 'Dr. Samuel A.',
    orderedAt: atOffset(-1, 8, 0),
    status: 'Completed',
    sampleCollectedAt: atOffset(-1, 8, 20),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(-1, 14, 0),
    resultFlag: 'Abnormal',
    resultRows: [{ parameter: 'HbA1c', value: '8.1 %', reference: '<5.7', flag: 'H' }],
    resultComment: 'Poor glycaemic control. Diabetes review recommended.',
  },
];
