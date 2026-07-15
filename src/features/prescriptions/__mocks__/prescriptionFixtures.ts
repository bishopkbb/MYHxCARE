/**
 * Mock fixtures for the Create Prescription screen.
 * Replace with real API data (patient context, drug catalogue, active
 * medications) in Phase 6 integration.
 */

import type { Allergy } from '@/types/patient.types';

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
  diagnosis: { condition: string; icd10: string };
  notes: string;
  allergies: Allergy[];
};

export const MOCK_PRESCRIPTION_PATIENT: PrescriptionPatient = {
  initials: 'AO',
  avatarBg: '#00B4D8',
  name: 'Adaeze Okonkwo',
  mrn: 'MRN-2024-00451',
  age: '21y',
  gender: 'Female',
  bloodGroup: 'O+',
  vitals: [
    { label: 'BP', value: '132/86 mmHg', abnormal: false },
    { label: 'Pulse', value: '98 bpm', abnormal: false },
    { label: 'Temp', value: '38.7°C', abnormal: true },
    { label: 'SpO2', value: '97%', abnormal: false },
    { label: 'RR', value: '22/min', abnormal: true },
  ],
  activeMedications: [
    {
      id: 'am1',
      name: 'Paracetamol',
      dose: '1000mg',
      frequencyShort: 'TDS',
      frequencyLabel: 'Three times a day (TDS)',
    },
    {
      id: 'am2',
      name: 'Amoxicillin',
      dose: '500mg',
      form: 'Capsule',
      frequencyShort: 'BD',
      frequencyLabel: 'Twice a day (BD)',
    },
  ],
  diagnosis: { condition: 'Migraine (Tension Type)', icd10: 'G44.209' },
  notes: 'Persistent headache and fever for 3 days',
  allergies: [
    {
      id: 'al-p1-1',
      substance: 'Penicillin',
      reaction: 'Skin rash, itching',
      severity: 'SEVERE',
      recordedAt: '2025-11-20T00:00:00Z',
      recordedBy: 'Dr. A. Nwosu',
    },
    {
      id: 'al-p1-2',
      substance: 'Sulfonamides',
      reaction: 'Nausea, Vomiting',
      severity: 'MODERATE',
      recordedAt: '2025-11-20T00:00:00Z',
      recordedBy: 'Dr. A. Nwosu',
    },
  ],
};

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
