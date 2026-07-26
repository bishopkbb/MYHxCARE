/**
 * Canonical LabResult entity — the one shared shape for a lab test and its
 * result, used by both the nurse-facing Laboratory workspace (collection,
 * rejection, critical-value acknowledgment) and the doctor-facing Laboratory
 * Results workspace (review, verification). Previously these were two
 * completely independent populations (`LabTestOrder` here, a thinner
 * `LabResult` in the doctor's own fixtures) with no shared row and no shared
 * store — a critical value the lab produced had no path from the nurse who
 * collected the sample to the doctor who needed to act on it. See
 * MYHXCARE_SYSTEM_CONSISTENCY_REGISTER.md SYS-004.
 *
 * `status` (workflow stage) and `flag` (clinical urgency) are deliberately
 * two separate fields, never conflated — the doctor-facing screen used to use
 * a single `status: 'critical'|'pending'|'verified'` that mixed both axes;
 * this is the fix.
 *
 * Swap out by pointing hooks to real `/lab/orders`, `/lab/samples/{id}/collect`,
 * `/lab/results`, `/lab/results/{id}/verify` endpoints in Phase 6.
 */

import type { Gender } from '@/types/patient.types';

export type LabResultStatus =
  | 'ORDERED' // doctor has requested the test, sample not yet collected
  | 'SAMPLE_COLLECTED' // nurse has collected and labelled the specimen
  | 'IN_PROCESS' // at the lab, being processed
  | 'REJECTED' // lab rejected the sample (insufficient volume, etc.) — awaits recollection
  | 'RESULTED' // lab has produced result values; doctor has not yet reviewed/verified
  | 'VERIFIED'; // a doctor has reviewed and signed off on the result

// Discovery made while unifying this entity: the register's originally
// proposed canonical flag was NORMAL|HIGH|LOW|CRITICAL, but the value
// actually shared across two of the four pre-unification populations
// (Nurse Station's `LabTestOrder.resultFlag` and the Patient Record chart's
// `ResultFlag`) was already the coarser NORMAL|ABNORMAL|CRITICAL — adopting
// the convention already shared by real code, rather than the finer-grained
// one nothing actually used, since inventing a HIGH/LOW split here would
// require guessing which specific parameter drove an "abnormal" verdict.
export type LabResultFlag = 'NORMAL' | 'ABNORMAL' | 'CRITICAL';

export type LabResultPriority = 'STAT' | 'URGENT' | 'ROUTINE';

export type LabDepartment =
  'Hematology' | 'Biochemistry' | 'Microbiology' | 'Immunology' | 'Coagulation';

/** Per-parameter row within a panel — a finer-grained flag than the overall
 * result's `flag` (e.g. a CBC panel's overall flag might be CRITICAL because
 * one parameter is badly out of range, while most of its individual rows are
 * H/L/A or unflagged). Kept as its own axis, matching how the richest of the
 * four pre-unification shapes (`LabTestOrder`) already modelled it. */
export type LabResultRow = {
  parameter: string;
  value: string;
  valueAbnormal?: boolean;
  reference: string;
  flag?: 'H' | 'L' | 'A';
};

// Named LabResultNote (not ClinicalNote) — this is a comment thread on a lab
// result, unrelated to the clinical-notes feature's ClinicalNote chart entry.
// Two unrelated concepts previously shared the same type name in different
// files; see MYHXCARE_SYSTEM_CONSISTENCY_REGISTER.md SYS-013.
export type LabResultNote = {
  id: string;
  text: string;
  author: string;
  createdAt: string; // ISO
};

export type LabResult = {
  id: string;
  /** Links to `patients/__mocks__/patientFixtures.ts`'s MOCK_PATIENTS when the
   * same person already has a chart there — not every lab patient does. */
  patientId?: string;
  mrn: string;
  patientName: string;
  initials: string;
  avatarBg: string;
  age?: number;
  gender?: Gender;
  /** Ward-admitted patients only — undefined for OPD/walk-in tests. */
  ward?: string;
  bed?: string;
  testName: string;
  department: LabDepartment;
  priority: LabResultPriority;
  status: LabResultStatus;
  /** Only meaningful once `status` reaches `RESULTED`/`VERIFIED`. */
  flag?: LabResultFlag;
  orderedBy: string;
  orderedAt: string; // ISO
  sampleCollectedAt?: string;
  sampleCollectedBy?: string;
  rejectionReason?: string;
  resultAt?: string; // ISO
  rows?: LabResultRow[];
  comment?: string;
  /** Set only when `flag === 'CRITICAL'` — the nurse-side relay-to-doctor
   * workflow. */
  criticalValueLabel?: string;
  criticalAcknowledgedAt?: string;
  criticalAcknowledgedBy?: string;
  /** Set once a doctor has reviewed/verified — distinct from
   * `criticalAcknowledgedAt`, which is the nurse's own "I notified the
   * doctor" step. */
  doctorReviewedAt?: string;
  doctorReviewedBy?: string;
  notes?: LabResultNote[];
  lastFollowUpAt?: string;
  followUpCount?: number;
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Merged seed data — 17 rows originating from the old nurse-facing
// `LAB_ORDERS` (`lab-NNN` ids) + 9 from the old doctor-facing
// `MOCK_LAB_RESULTS` (`lr-NNN` ids), converted into the canonical shape. Not
// a 1:1 replay of either old population's exact status labels — converted
// using the mapping documented above (status = workflow stage, flag =
// urgency), preserving every row's real data rather than dropping any.
export const CANONICAL_LAB_RESULTS: LabResult[] = [
  // ── Doctor Requests — just ordered, no sample collected yet ──────────────
  {
    id: 'lab-001',
    patientId: 'np-013',
    mrn: 'MRN-2025-00218',
    patientName: 'Ikenna Bassey',
    initials: 'IB',
    avatarBg: '#00B4D8',
    age: 46,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 6',
    testName: 'Complete Blood Count (CBC)',
    department: 'Hematology',
    priority: 'ROUTINE',
    status: 'ORDERED',
    orderedBy: 'Dr. Amina Yusuf',
    orderedAt: atOffset(0, 7, 45),
  },
  {
    id: 'lab-002',
    mrn: 'MRN-2026-00791',
    patientName: 'Gloria Nwosu',
    initials: 'GN',
    avatarBg: '#8B5CF6',
    age: 61,
    gender: 'Female',
    testName: 'Urea, Creatinine & Electrolytes (U&E)',
    department: 'Biochemistry',
    priority: 'URGENT',
    status: 'ORDERED',
    orderedBy: 'Dr. Chinedu Okafor',
    orderedAt: atOffset(0, 6, 30),
  },
  {
    id: 'lab-003',
    patientId: 'np-007',
    mrn: 'MRN-2024-00876',
    patientName: 'Tunde Oladipo',
    initials: 'TO',
    avatarBg: '#22C55E',
    age: 40,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 2',
    testName: 'Lipid Profile',
    department: 'Biochemistry',
    priority: 'ROUTINE',
    status: 'ORDERED',
    orderedBy: 'Dr. Jane Ezeonu (GP)',
    orderedAt: atOffset(0, 5, 0),
  },
  {
    id: 'lab-004',
    mrn: 'MRN-2026-00782',
    patientName: 'Fatima Ahmed',
    initials: 'FA',
    avatarBg: '#F59E0B',
    age: 32,
    gender: 'Female',
    testName: 'HbA1c',
    department: 'Biochemistry',
    priority: 'ROUTINE',
    status: 'ORDERED',
    orderedBy: 'Dr. Amina Yusuf',
    orderedAt: atOffset(0, 7, 10),
  },

  // ── Pending Tests — sample collected, awaiting lab result ────────────────
  {
    id: 'lab-005',
    patientId: 'np-001',
    mrn: 'MRN-2026-00187',
    patientName: 'Daniel Eze',
    initials: 'DE',
    avatarBg: '#6366F1',
    age: 68,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 8',
    testName: 'Blood Culture & Sensitivity',
    department: 'Microbiology',
    priority: 'URGENT',
    status: 'IN_PROCESS',
    orderedBy: 'Dr. Tunde Stephen',
    orderedAt: atOffset(0, 6, 0),
    sampleCollectedAt: atOffset(0, 6, 20),
    sampleCollectedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-006',
    patientId: 'np-003',
    mrn: 'MRN-2024-00987',
    patientName: 'Ifeanyi Nwosu',
    initials: 'IN',
    avatarBg: '#EF4444',
    age: 32,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 5',
    testName: 'Widal Test',
    department: 'Microbiology',
    priority: 'ROUTINE',
    status: 'SAMPLE_COLLECTED',
    orderedBy: 'Dr. Samuel A.',
    orderedAt: atOffset(0, 5, 30),
    sampleCollectedAt: atOffset(0, 5, 50),
    sampleCollectedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-007',
    mrn: 'MRN-2026-00821',
    patientName: 'Aisha Ibrahim',
    initials: 'AI',
    avatarBg: '#00B4D8',
    age: 29,
    gender: 'Female',
    testName: 'Malaria Parasite (MP)',
    department: 'Microbiology',
    priority: 'ROUTINE',
    status: 'IN_PROCESS',
    orderedBy: 'Dr. Bello Ibrahim',
    orderedAt: atOffset(0, 4, 15),
    sampleCollectedAt: atOffset(0, 4, 30),
    sampleCollectedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-008',
    patientId: 'np-008',
    mrn: 'MRN-2026-0148',
    patientName: 'Chidinma Okafor',
    initials: 'CO',
    avatarBg: '#8B5CF6',
    age: 53,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 12',
    testName: 'Coagulation Profile (PT/APTT)',
    department: 'Coagulation',
    priority: 'ROUTINE',
    status: 'IN_PROCESS',
    orderedBy: 'Dr. Tunde Stephen',
    orderedAt: atOffset(-1, 22, 0),
    sampleCollectedAt: atOffset(-1, 22, 15),
    sampleCollectedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-009',
    mrn: 'MRN-2024-00398',
    patientName: 'David Osei',
    initials: 'DO',
    avatarBg: '#F59E0B',
    age: 45,
    gender: 'Male',
    testName: 'Urinalysis (Routine)',
    department: 'Biochemistry',
    priority: 'ROUTINE',
    status: 'REJECTED',
    orderedBy: 'Dr. Jane Ezeonu (GP)',
    orderedAt: atOffset(-1, 9, 0),
    sampleCollectedAt: atOffset(-1, 9, 20),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    rejectionReason: 'Insufficient sample volume — please recollect.',
  },

  // ── Completed — Critical (lab has resulted; doctor review varies) ───────
  {
    id: 'lab-010',
    patientId: 'np-004',
    mrn: 'MRN-2026-01544',
    patientName: 'Amina Yusuf',
    initials: 'AY',
    avatarBg: '#EF4444',
    age: 72,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 16',
    testName: 'Urea, Creatinine & Electrolytes (U&E)',
    department: 'Biochemistry',
    priority: 'STAT',
    status: 'RESULTED',
    flag: 'CRITICAL',
    orderedBy: 'Dr. Jane Ezeonu',
    orderedAt: atOffset(0, 6, 30),
    sampleCollectedAt: atOffset(0, 6, 45),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 7, 25),
    rows: [
      { parameter: 'Potassium (K+)', value: '6.2 mmol/L', reference: '3.5–5.1', flag: 'H' },
      { parameter: 'Sodium (Na+)', value: '138 mmol/L', reference: '135–145' },
      { parameter: 'Creatinine', value: '182 µmol/L', reference: '53–115', flag: 'H' },
    ],
    comment: 'CRITICAL: Hyperkalaemia. Urgent physician review required.',
    criticalValueLabel: 'Potassium (K+) 6.2 mmol/L',
  },
  {
    id: 'lab-011',
    mrn: 'MRN-2026-00872',
    patientName: 'Blessing John',
    initials: 'BJ',
    avatarBg: '#22C55E',
    age: 55,
    gender: 'Male',
    testName: 'Urea, Creatinine & Electrolytes (U&E)',
    department: 'Biochemistry',
    priority: 'STAT',
    status: 'RESULTED',
    flag: 'CRITICAL',
    orderedBy: 'Dr. Onyedika Umeh',
    orderedAt: atOffset(0, 6, 50),
    sampleCollectedAt: atOffset(0, 7, 0),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 7, 25),
    rows: [{ parameter: 'Potassium (K+)', value: '6.2 mmol/L', reference: '3.5–5.1', flag: 'H' }],
    comment: 'CRITICAL: Hyperkalaemia. Urgent physician review required.',
    criticalValueLabel: 'Potassium (K+) 6.2 mmol/L',
    criticalAcknowledgedAt: atOffset(0, 7, 40),
    criticalAcknowledgedBy: 'Nurse Chidinma Eze',
  },
  {
    id: 'lab-012',
    mrn: 'MRN-2026-00765',
    patientName: 'Maryam Usman',
    initials: 'MU',
    avatarBg: '#6366F1',
    age: 45,
    gender: 'Female',
    testName: 'Complete Blood Count (CBC)',
    department: 'Hematology',
    priority: 'STAT',
    status: 'RESULTED',
    flag: 'CRITICAL',
    orderedBy: 'Dr. Onyedika Umeh',
    orderedAt: atOffset(0, 6, 10),
    sampleCollectedAt: atOffset(0, 6, 25),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 6, 50),
    rows: [{ parameter: 'Haemoglobin (Hb)', value: '6.8 g/dL', reference: '12–16', flag: 'L' }],
    comment: 'CRITICAL: Severe anaemia. Urgent physician review required.',
    criticalValueLabel: 'Hb (Haemoglobin) 6.8 g/dL',
  },
  {
    id: 'lab-013',
    mrn: 'MRN-2026-00851',
    patientName: 'James Daniel',
    initials: 'JD',
    avatarBg: '#F59E0B',
    age: 47,
    gender: 'Male',
    testName: 'Fasting Blood Sugar (FBS)',
    department: 'Biochemistry',
    priority: 'STAT',
    status: 'RESULTED',
    flag: 'CRITICAL',
    orderedBy: 'Dr. Amina Yusuf',
    orderedAt: atOffset(0, 5, 20),
    sampleCollectedAt: atOffset(0, 5, 40),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 5, 45),
    rows: [{ parameter: 'Blood Sugar (FBS)', value: '412 mg/dL', reference: '70–100', flag: 'H' }],
    comment: 'CRITICAL: Severe hyperglycaemia. Urgent physician review required.',
    criticalValueLabel: 'Blood Sugar (FBS) 412 mg/dL',
  },
  {
    id: 'lr-007',
    mrn: 'MRN-2024-00629',
    patientName: 'Emeka Obiora',
    initials: 'EO',
    avatarBg: '#8B5CF6',
    testName: 'Urea, Creatinine & Electrolytes (U&E)',
    department: 'Biochemistry',
    priority: 'STAT',
    status: 'VERIFIED',
    flag: 'CRITICAL',
    orderedBy: 'Dr. Adaeze Okonkwo',
    orderedAt: atOffset(0, 7, 30),
    resultAt: atOffset(0, 8, 5),
    rows: [
      {
        parameter: 'Potassium (K+)',
        value: '6.4 mmol/L',
        valueAbnormal: true,
        reference: '3.5–5.1',
        flag: 'H',
      },
      {
        parameter: 'Creatinine',
        value: '210 µmol/L',
        valueAbnormal: true,
        reference: '53–115',
        flag: 'H',
      },
    ],
    comment: 'CRITICAL: Severe hyperkalaemia with renal impairment. Urgent review required.',
    criticalValueLabel: 'Potassium (K+) 6.4 mmol/L',
    doctorReviewedAt: atOffset(0, 8, 40),
    doctorReviewedBy: 'Dr. Adaeze Okonkwo',
  },
  {
    id: 'lr-001',
    patientId: 'p1',
    mrn: 'MRN-2024-00451',
    patientName: 'Adaeze Okonkwo',
    initials: 'AO',
    avatarBg: '#EF4444',
    testName: 'Full Blood Count (FBC)',
    department: 'Hematology',
    priority: 'STAT',
    status: 'RESULTED',
    flag: 'CRITICAL',
    orderedBy: 'Dr. Adaeze Okonkwo',
    orderedAt: atOffset(0, 9, 0),
    resultAt: atOffset(0, 9, 30),
    rows: [
      {
        parameter: 'WBC',
        value: '18.4 ×10³/µL',
        valueAbnormal: true,
        reference: '4.5–11.0',
        flag: 'H',
      },
      {
        parameter: 'Neutrophils',
        value: '85 %',
        valueAbnormal: true,
        reference: '40–70',
        flag: 'H',
      },
      {
        parameter: 'Lymphocytes',
        value: '10 %',
        valueAbnormal: true,
        reference: '20–40',
        flag: 'L',
      },
      {
        parameter: 'Haemoglobin',
        value: '9.8 g/dL',
        valueAbnormal: true,
        reference: '12–16',
        flag: 'L',
      },
      {
        parameter: 'Platelets',
        value: '428 ×10³/µL',
        valueAbnormal: true,
        reference: '150–400',
        flag: 'H',
      },
    ],
    comment: 'CRITICAL: Elevated WBC with neutrophilia. Anaemia present. Urgent review required.',
    criticalValueLabel: 'WBC 18.4 ×10³/µL',
  },

  // ── Completed — Normal / Abnormal, doctor-verified ───────────────────────
  {
    id: 'lab-014',
    mrn: 'MRN-2026-00801',
    patientName: 'Hauwa Bello',
    initials: 'HB',
    avatarBg: '#00B4D8',
    age: 38,
    gender: 'Female',
    testName: 'Complete Blood Count (CBC)',
    department: 'Hematology',
    priority: 'ROUTINE',
    status: 'RESULTED',
    flag: 'NORMAL',
    orderedBy: 'Dr. Jane Ezeonu (GP)',
    orderedAt: atOffset(0, 7, 30),
    sampleCollectedAt: atOffset(0, 7, 45),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 8, 0),
    rows: [{ parameter: 'Haemoglobin (Hb)', value: '13.2 g/dL', reference: '12–16' }],
  },
  {
    id: 'lab-015',
    mrn: 'MRN-2026-00830',
    patientName: 'Comfort Adeyemi',
    initials: 'CA',
    avatarBg: '#22C55E',
    age: 27,
    gender: 'Female',
    testName: 'Urinalysis (Routine)',
    department: 'Biochemistry',
    priority: 'ROUTINE',
    status: 'RESULTED',
    flag: 'NORMAL',
    orderedBy: 'Dr. Amina Yusuf',
    orderedAt: atOffset(0, 7, 35),
    sampleCollectedAt: atOffset(0, 7, 45),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 7, 55),
    rows: [{ parameter: 'Protein', value: 'Negative', reference: 'Negative' }],
  },
  {
    id: 'lab-016',
    mrn: 'MRN-2026-00860',
    patientName: 'Rukayya Musa',
    initials: 'RM',
    avatarBg: '#F59E0B',
    age: 26,
    gender: 'Female',
    testName: 'Malaria Parasite (MP)',
    department: 'Microbiology',
    priority: 'ROUTINE',
    status: 'RESULTED',
    flag: 'NORMAL',
    orderedBy: 'Dr. Jane Ezeonu (GP)',
    orderedAt: atOffset(0, 7, 20),
    sampleCollectedAt: atOffset(0, 7, 30),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(0, 7, 40),
    rows: [{ parameter: 'P. falciparum antigen', value: 'Negative', reference: 'Negative' }],
  },
  {
    id: 'lab-017',
    patientId: 'np-006',
    mrn: 'MRN-2026-00932',
    patientName: 'Peter Obi',
    initials: 'PO',
    avatarBg: '#6366F1',
    age: 51,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 13',
    testName: 'HbA1c',
    department: 'Biochemistry',
    priority: 'ROUTINE',
    status: 'RESULTED',
    flag: 'ABNORMAL',
    orderedBy: 'Dr. Samuel A.',
    orderedAt: atOffset(-1, 8, 0),
    sampleCollectedAt: atOffset(-1, 8, 20),
    sampleCollectedBy: 'Nurse Chidinma Eze',
    resultAt: atOffset(-1, 14, 0),
    rows: [{ parameter: 'HbA1c', value: '8.1 %', reference: '<5.7', flag: 'H' }],
    comment: 'Poor glycaemic control. Diabetes review recommended.',
  },
  {
    id: 'lr-005',
    patientId: 'p4',
    mrn: 'MRN-2024-00356',
    patientName: 'Babatunde Alade',
    initials: 'BA',
    avatarBg: '#F59E0B',
    testName: 'Malaria Rapid Diagnostic Test (RDT)',
    department: 'Microbiology',
    priority: 'ROUTINE',
    status: 'VERIFIED',
    flag: 'ABNORMAL',
    orderedBy: 'Dr. Adaeze Okonkwo',
    orderedAt: atOffset(-2, 13, 30),
    resultAt: atOffset(-2, 14, 15),
    rows: [
      {
        parameter: 'P. falciparum antigen',
        value: 'Positive',
        valueAbnormal: true,
        reference: 'Negative',
        flag: 'A',
      },
    ],
    comment: 'Positive result. Treatment completed.',
    doctorReviewedAt: atOffset(-2, 15, 0),
    doctorReviewedBy: 'Dr. Adaeze Okonkwo',
  },
  {
    id: 'lr-006',
    mrn: 'MRN-2024-00301',
    patientName: 'Ibrahim Musa',
    initials: 'IM',
    avatarBg: '#22C55E',
    testName: 'HbA1c',
    department: 'Biochemistry',
    priority: 'ROUTINE',
    status: 'VERIFIED',
    flag: 'NORMAL',
    orderedBy: 'Dr. Jane Ezeonu (GP)',
    orderedAt: atOffset(-1, 10, 15),
    resultAt: atOffset(-1, 11, 0),
    rows: [{ parameter: 'HbA1c', value: '5.4 %', reference: '<5.7' }],
    comment: 'Normal glycated haemoglobin. No evidence of pre-diabetes.',
  },
  {
    id: 'lr-002',
    patientId: 'p3',
    mrn: 'MRN-2024-00512',
    patientName: 'Ngozi Adeyemi',
    initials: 'NA',
    avatarBg: '#22C55E',
    testName: 'Coagulation Profile (PT/APTT)',
    department: 'Hematology',
    priority: 'URGENT',
    status: 'IN_PROCESS',
    orderedBy: 'Dr. Adaeze Okonkwo',
    orderedAt: atOffset(0, 10, 20),
  },
  {
    id: 'lr-003',
    mrn: 'MRN-2024-00467',
    patientName: 'Chinwe Okafor',
    initials: 'CO',
    avatarBg: '#00B4D8',
    testName: 'Urinalysis (Routine)',
    department: 'Biochemistry',
    priority: 'ROUTINE',
    status: 'IN_PROCESS',
    orderedBy: 'Dr. Adaeze Okonkwo',
    orderedAt: atOffset(0, 9, 40),
  },
  {
    id: 'lr-004',
    mrn: 'MRN-2024-00398',
    patientName: 'David Osei',
    initials: 'DO',
    avatarBg: '#6366F1',
    testName: 'CSF Analysis (Lumbar Puncture)',
    department: 'Microbiology',
    priority: 'URGENT',
    status: 'IN_PROCESS',
    orderedBy: 'Dr. Adaeze Okonkwo',
    orderedAt: atOffset(0, 8, 35),
  },
  {
    id: 'lr-008',
    patientId: 'p4',
    mrn: 'MRN-2024-00356',
    patientName: 'Babatunde Alade',
    initials: 'BA',
    avatarBg: '#F59E0B',
    testName: 'Liver Function Test (LFT)',
    department: 'Biochemistry',
    priority: 'ROUTINE',
    status: 'ORDERED',
    orderedBy: 'Dr. Adaeze Okonkwo',
    orderedAt: atOffset(0, 7, 30),
  },
  {
    id: 'lr-009',
    patientId: 'p1',
    mrn: 'MRN-2024-00451',
    patientName: 'Adaeze Okonkwo',
    initials: 'AO',
    avatarBg: '#EF4444',
    testName: 'Widal Test',
    department: 'Microbiology',
    priority: 'ROUTINE',
    status: 'VERIFIED',
    flag: 'NORMAL',
    orderedBy: 'Dr. Adaeze Okonkwo',
    orderedAt: atOffset(0, 5, 45),
    resultAt: atOffset(0, 6, 20),
    rows: [{ parameter: 'S. typhi O agglutinin', value: '1:80', reference: '<1:80' }],
    comment: 'Titre within normal limits. Typhoid unlikely.',
  },
];
