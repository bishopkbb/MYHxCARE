/**
 * Mock fixtures for laboratory order requests.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import type { Allergy } from '@/types/patient.types';

export type Priority = 'stat' | 'urgent' | 'routine';

export type LabTest = {
  id: string;
  name: string;
};

export type LabCategory = {
  id: string;
  title: string;
  tests: LabTest[];
};

export const LAB_CATEGORIES: LabCategory[] = [
  {
    id: 'haematology',
    title: 'Haematology',
    tests: [
      { id: 'fbc', name: 'Full Blood Count (FBC)' },
      { id: 'esr', name: 'ESR' },
      { id: 'pbf', name: 'Peripheral Blood Film' },
      { id: 'sickling', name: 'Sickling Test' },
      { id: 'reticulocyte', name: 'Reticulocyte Count' },
    ],
  },
  {
    id: 'clinical-chemistry',
    title: 'Clinical Chemistry',
    tests: [
      { id: 'euc', name: 'Electrolytes, Urea & Creatinine' },
      { id: 'lft', name: 'Liver Function Test' },
      { id: 'rbs', name: 'Random Blood Sugar' },
      { id: 'hba1c', name: 'HbA1c' },
      { id: 'lipid', name: 'Lipid Profile' },
      { id: 'tft', name: 'Thyroid Function Test' },
    ],
  },
  {
    id: 'microbiology',
    title: 'Microbiology',
    tests: [
      { id: 'blood-culture', name: 'Blood Culture & Sensitivity' },
      { id: 'malaria-rdt', name: 'Malaria RDT' },
      { id: 'malaria-micro', name: 'Malaria Microscopy' },
      { id: 'urine-culture', name: 'Urine Culture & Sensitivity' },
      { id: 'widal', name: 'WIDAL Test' },
      { id: 'hiv-rapid', name: 'HIV Rapid Test' },
    ],
  },
  {
    id: 'urinalysis',
    title: 'Urinalysis',
    tests: [
      { id: 'urine-routine', name: 'Urinalysis (Routine)' },
      { id: 'urine-mc', name: 'Urine Microscopy & Culture' },
    ],
  },
  {
    id: 'serology',
    title: 'Serology',
    tests: [
      { id: 'hbsag', name: 'Hepatitis B Surface Antigen' },
      { id: 'anti-hcv', name: 'Anti-HCV' },
      { id: 'vdrl', name: 'VDRL' },
      { id: 'upt', name: 'Pregnancy Test (UPT)' },
    ],
  },
  {
    id: 'imaging',
    title: 'Imaging / Other',
    tests: [
      { id: 'chest-xray', name: 'Chest X-Ray (PA)' },
      { id: 'abdo-us', name: 'Abdominal Ultrasound' },
      { id: 'skull-xray', name: 'Skull X-Ray' },
      { id: 'ecg', name: 'ECG (12-lead)' },
    ],
  },
];

export type LabPatient = {
  initials: string;
  avatarBg: string;
  name: string;
  mrn: string;
  age: string;
  gender: string;
  bloodGroup: string;
  allergies: Allergy[];
  isUrgent: boolean;
};

export const MOCK_LAB_PATIENT: LabPatient = {
  initials: 'AO',
  avatarBg: '#EF4444',
  name: 'Adaeze Okonkwo',
  mrn: 'MRN-2024-00451',
  age: '21y',
  gender: 'Female',
  bloodGroup: 'O+',
  allergies: [
    {
      id: 'allergy-1',
      substance: 'Penicillin',
      reaction: 'Anaphylaxis',
      severity: 'LIFE_THREATENING',
      recordedAt: '2024-03-12T09:00:00Z',
      recordedBy: 'Dr. Chukwuemeka',
    },
    {
      id: 'allergy-2',
      substance: 'Sulfonamides',
      reaction: 'Skin rash, urticaria',
      severity: 'MODERATE',
      recordedAt: '2024-06-20T11:30:00Z',
      recordedBy: 'Dr. Okafor',
    },
  ],
  isUrgent: true,
};
