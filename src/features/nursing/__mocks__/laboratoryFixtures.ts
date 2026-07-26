/**
 * Types and config for the nurse-facing Laboratory screen's own display
 * vocabulary. As of SYS-004's unification, this is no longer an independent
 * data population — `LaboratoryWorkspace.tsx` derives `LabTestOrder[]` from
 * the canonical, shared `LabResult` entity
 * (`@/features/laboratory/store/labResultStore.ts`) via `toNurseView()`, so a
 * lab order the doctor places is visible here immediately, and a critical
 * value acknowledged here is visible on the doctor's own `/lab/results`
 * immediately. This file now only holds the display shape and reference
 * config (`TEST_TAT_HOURS`, `FASTING_REQUIRED_TESTS`, etc.) — the seed data
 * itself lives in `labResultFixtures.ts`'s `CANONICAL_LAB_RESULTS`. See
 * MYHXCARE_SYSTEM_CONSISTENCY_REGISTER.md SYS-004.
 */

import type { ResultFlag } from '@/features/nursing/__mocks__/patientRecordFixtures';
import type { LabResultRow } from '@/features/laboratory/__mocks__/labResultFixtures';
import type { Gender } from '@/types/patient.types';

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
  /** Undefined for lab orders originating from a screen that doesn't capture
   * age/gender at order time — shown as "—" rather than fabricated. */
  age?: number;
  gender?: Gender;
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
