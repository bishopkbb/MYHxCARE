/**
 * Mock fixtures for the Create Prescription screen.
 * Replace with real API data (patient context, drug catalogue, active
 * medications) in Phase 6 integration.
 */

import type { Allergy } from '@/types/patient.types';
import type { PatientDetailMock } from '@/features/patients/__mocks__/patientFixtures';

// ── Patient in context ───────────────────────────────────────────────────────

export type PrescriptionVital = {
  label: string;
  value: string;
  abnormal: boolean;
};

export type ActiveMedication = {
  id: string;
  name: string;
  dose: string;
  frequencyShort: string; // for the compact warning-banner chip, e.g. "TDS"
  frequencyLabel: string; // for the Patient Summary list, e.g. "Twice a day (BD)"
  form?: string;
};

export type PrescriptionPatient = {
  initials: string;
  avatarBg: string;
  name: string;
  mrn: string;
  age: string;
  gender: string;
  bloodGroup: string;
  vitals: PrescriptionVital[];
  activeMedications: ActiveMedication[];
  diagnosis: { condition: string; icd10?: string };
  notes: string;
  allergies: Allergy[];
};

const VITAL_KEY_LABEL: Record<string, string> = {
  'blood-pressure': 'BP',
  'pulse-rate': 'Pulse',
  temperature: 'Temp',
  spo2: 'SpO2',
  'resp-rate': 'RR',
};

/** Converts a real patient (getPatientDetail()'s canonical shape) into this
 * screen's own PrescriptionPatient display shape — same file-local-converter
 * convention used throughout this session (SYS-004/005/006/007/011).
 * Replaces the standalone MOCK_PRESCRIPTION_PATIENT, which was itself an
 * independently-curated duplicate of PatientRecord p1 (same mrn, same name,
 * identical activeMedications) rather than a genuinely separate demo patient. */
export function patientDetailToPrescriptionPatient(detail: PatientDetailMock): PrescriptionPatient {
  return {
    initials: detail.initials,
    // PatientDetailMock has no avatarBg — same known, documented gap already
    // flagged for the referral/lab-order/prescription pages (SYS-011 register entry).
    avatarBg: '#00B4D8',
    name: detail.name,
    mrn: detail.mrn,
    age: detail.age,
    gender: detail.gender,
    bloodGroup: detail.bloodGroup,
    vitals: detail.vitalSigns.readings.map((r) => ({
      label: VITAL_KEY_LABEL[r.key] ?? r.key,
      value: r.value,
      abnormal: r.status === 'abnormal',
    })),
    activeMedications: detail.medications
      .filter((m) => m.status === 'active')
      .map((m) => ({
        id: m.id,
        name: m.name,
        dose: m.dose,
        frequencyShort: m.frequency,
        frequencyLabel: frequencyLabel(m.frequency),
      })),
    diagnosis: {
      condition: detail.consultations[0]?.diagnosis || 'No diagnosis on record',
    },
    notes: detail.queueStatus,
    allergies: detail.allergies,
  };
}

export const PRESCRIBING_DOCTOR = { name: 'Dr. Jane Ezeonu', credentials: 'MBBS, FMCP' };

// ── Drug catalogue (for the search / browse / add flow) ─────────────────────

export type DrugCatalogueEntry = {
  id: string;
  name: string;
  category: string;
  defaultStrength: string;
  strengthOptions: string[];
  defaultForm: string;
  formOptions: string[];
};

export const DRUG_CATALOGUE: DrugCatalogueEntry[] = [
  {
    id: 'dc-paracetamol',
    name: 'Paracetamol',
    category: 'Analgesic/Antipyretic',
    defaultStrength: '1000mg',
    strengthOptions: ['500mg', '650mg', '1000mg'],
    defaultForm: 'Tablet',
    formOptions: ['Tablet', 'Syrup', 'Suppository'],
  },
  {
    id: 'dc-ibuprofen',
    name: 'Ibuprofen',
    category: 'NSAID',
    defaultStrength: '400mg',
    strengthOptions: ['200mg', '400mg', '600mg'],
    defaultForm: 'Tablet',
    formOptions: ['Tablet', 'Syrup'],
  },
  {
    id: 'dc-omeprazole',
    name: 'Omeprazole',
    category: 'Proton Pump Inhibitor',
    defaultStrength: '20mg',
    strengthOptions: ['10mg', '20mg', '40mg'],
    defaultForm: 'Capsule',
    formOptions: ['Capsule', 'Tablet'],
  },
  {
    id: 'dc-amoxicillin',
    name: 'Amoxicillin',
    category: 'Penicillin Antibiotic',
    defaultStrength: '500mg',
    strengthOptions: ['250mg', '500mg'],
    defaultForm: 'Capsule',
    formOptions: ['Capsule', 'Syrup'],
  },
  {
    id: 'dc-ciprofloxacin',
    name: 'Ciprofloxacin',
    category: 'Fluoroquinolone Antibiotic',
    defaultStrength: '500mg',
    strengthOptions: ['250mg', '500mg', '750mg'],
    defaultForm: 'Tablet',
    formOptions: ['Tablet', 'IV Infusion'],
  },
  {
    id: 'dc-metronidazole',
    name: 'Metronidazole',
    category: 'Antibiotic/Antiprotozoal',
    defaultStrength: '400mg',
    strengthOptions: ['200mg', '400mg'],
    defaultForm: 'Tablet',
    formOptions: ['Tablet', 'IV Infusion'],
  },
  {
    id: 'dc-chlorphenamine',
    name: 'Chlorphenamine',
    category: 'Antihistamine',
    defaultStrength: '4mg',
    strengthOptions: ['4mg'],
    defaultForm: 'Tablet',
    formOptions: ['Tablet', 'Syrup'],
  },
];

// ── Dosage & directions options ──────────────────────────────────────────────

export const DOSAGE_UNITS = ['mg', 'ml', 'g', 'mcg'] as const;
export const ROUTE_OPTIONS = ['Oral', 'IV', 'IM', 'Topical', 'Sublingual', 'Rectal'] as const;
export const DURATION_UNITS = ['Days', 'Weeks', 'Months'] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'OD', label: 'Once a day (OD)' },
  { value: 'BD', label: 'Twice a day (BD)' },
  { value: 'TDS', label: 'Three times a day (TDS)' },
  { value: 'QDS', label: 'Four times a day (QDS)' },
  { value: 'PRN', label: 'As needed (PRN)' },
  { value: 'STAT', label: 'Immediately (STAT)' },
] as const;

export function frequencyLabel(value: string): string {
  return FREQUENCY_OPTIONS.find((f) => f.value === value)?.label ?? value;
}

// ── Prescription line item (one row in the medication table) ────────────────

export type PrescriptionLine = {
  id: string;
  drugId: string;
  name: string;
  category: string;
  strength: string;
  form: string;
  dosagePerDose: string;
  dosageUnit: string;
  route: string;
  frequency: string;
  duration: string;
  durationUnit: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isOngoing: boolean;
  specialInstructions: string;
};

let lineSeq = 0;
function nextLineId(): string {
  lineSeq += 1;
  return `rx-line-${lineSeq}`;
}

export function createLineFromDrug(
  drug: DrugCatalogueEntry,
  overrides: Partial<PrescriptionLine> = {},
): PrescriptionLine {
  const numericStrength = drug.defaultStrength.replace(/[^\d.]/g, '') || '1';
  return {
    id: nextLineId(),
    drugId: drug.id,
    name: drug.name,
    category: drug.category,
    strength: drug.defaultStrength,
    form: drug.defaultForm,
    dosagePerDose: numericStrength,
    dosageUnit: 'mg',
    route: 'Oral',
    frequency: 'TDS',
    duration: '5',
    durationUnit: 'Days',
    startDate: '2026-06-20',
    endDate: '2026-06-30',
    isOngoing: false,
    specialInstructions: '',
    ...overrides,
  };
}

export function createDefaultPrescriptionLines(): PrescriptionLine[] {
  const paracetamol = DRUG_CATALOGUE.find((d) => d.id === 'dc-paracetamol')!;
  const ibuprofen = DRUG_CATALOGUE.find((d) => d.id === 'dc-ibuprofen')!;
  const omeprazole = DRUG_CATALOGUE.find((d) => d.id === 'dc-omeprazole')!;
  return [
    createLineFromDrug(paracetamol, { dosagePerDose: '1000' }),
    createLineFromDrug(ibuprofen, { strength: '400mg', dosagePerDose: '400' }),
    createLineFromDrug(omeprazole, { strength: '20mg', dosagePerDose: '20' }),
  ];
}

export const ADDITIONAL_OPTION_DEFS = [
  { key: 'prn', label: 'PRN (as needed)', tooltip: 'Take only when the symptom occurs.' },
  {
    key: 'noSubstitution',
    label: 'No Substitution',
    tooltip: 'Pharmacist must dispense this exact brand — no generic substitution.',
  },
  {
    key: 'dispenseAsWritten',
    label: 'Dispense as written',
    tooltip: 'Dispense exactly as prescribed without alteration.',
  },
  {
    key: 'alertDrugInteraction',
    label: 'Alert if drug interaction',
    tooltip: 'Notify the pharmacist to re-check interactions before dispensing.',
  },
  {
    key: 'patientCounselingProvided',
    label: 'Patient counseling provided',
    tooltip: 'Confirms the patient was counselled on how to take this medication.',
  },
] as const;

export type AdditionalOptionsState = Record<
  (typeof ADDITIONAL_OPTION_DEFS)[number]['key'],
  boolean
>;

export const DEFAULT_ADDITIONAL_OPTIONS: AdditionalOptionsState = {
  prn: false,
  noSubstitution: false,
  dispenseAsWritten: true,
  alertDrugInteraction: false,
  patientCounselingProvided: false,
};
