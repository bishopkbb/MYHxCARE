/**
 * Mock fixtures for laboratory results (doctor-facing).
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

export type LabResultStatus = 'critical' | 'pending' | 'verified';
export type LabResultPriority = 'stat' | 'urgent' | 'routine';
export type LabFlag = 'H' | 'L' | 'A';
export type LabDepartment = 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Immunology';

export type LabResultRow = {
  parameter: string;
  value: string;
  valueAbnormal?: boolean;
  reference: string;
  flag?: LabFlag;
};

export type ClinicalNote = {
  id: string;
  text: string;
  author: string;
  createdAt: string; // ISO
};

export type LabResult = {
  id: string;
  testName: string;
  department: LabDepartment;
  status: LabResultStatus;
  priority: LabResultPriority;
  resultAt: string; // ISO
  patient: {
    /** Links to `patients/__mocks__/patientFixtures.ts`'s MOCK_PATIENTS when the
     * same person already has a chart there — not every lab patient does. */
    patientId?: string;
    initials: string;
    avatarBg: string;
    name: string;
    mrn: string;
  };
  rows?: LabResultRow[];
  comment?: string;
  doctorReviewedAt?: string;
  doctorReviewedBy?: string;
  notes?: ClinicalNote[];
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const MOCK_LAB_RESULTS: LabResult[] = [
  // ── Critical ──────────────────────────────────────────────────────────────
  {
    id: 'lr-001',
    testName: 'Full Blood Count (FBC)',
    department: 'Hematology',
    status: 'critical',
    priority: 'stat',
    resultAt: atOffset(0, 9, 30),
    patient: {
      patientId: 'p1',
      initials: 'AO',
      avatarBg: '#EF4444',
      name: 'Adaeze Okonkwo',
      mrn: 'MRN-2024-00451',
    },
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
  },
  {
    id: 'lr-007',
    testName: 'Urea, Creatinine & Electrolytes (U&E)',
    department: 'Biochemistry',
    status: 'critical',
    priority: 'stat',
    resultAt: atOffset(0, 8, 5),
    patient: {
      initials: 'EO',
      avatarBg: '#8B5CF6',
      name: 'Emeka Obiora',
      mrn: 'MRN-2024-00629',
    },
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
    doctorReviewedAt: atOffset(0, 8, 40),
    doctorReviewedBy: 'Dr. Adaeze Okonkwo',
  },

  // ── Pending ───────────────────────────────────────────────────────────────
  {
    id: 'lr-002',
    testName: 'Coagulation Profile (PT/APTT)',
    department: 'Hematology',
    status: 'pending',
    priority: 'urgent',
    resultAt: atOffset(0, 10, 42),
    patient: {
      patientId: 'p3',
      initials: 'NA',
      avatarBg: '#22C55E',
      name: 'Ngozi Adeyemi',
      mrn: 'MRN-2024-00512',
    },
  },
  {
    id: 'lr-003',
    testName: 'Urinalysis (Routine)',
    department: 'Biochemistry',
    status: 'pending',
    priority: 'routine',
    resultAt: atOffset(0, 9, 58),
    patient: {
      initials: 'CO',
      avatarBg: '#00B4D8',
      name: 'Chinwe Okafor',
      mrn: 'MRN-2024-00467',
    },
  },
  {
    id: 'lr-004',
    testName: 'CSF Analysis (Lumbar Puncture)',
    department: 'Microbiology',
    status: 'pending',
    priority: 'urgent',
    resultAt: atOffset(0, 8, 55),
    patient: {
      initials: 'DO',
      avatarBg: '#6366F1',
      name: 'David Osei',
      mrn: 'MRN-2024-00398',
    },
  },
  {
    id: 'lr-008',
    testName: 'Liver Function Test (LFT)',
    department: 'Biochemistry',
    status: 'pending',
    priority: 'routine',
    resultAt: atOffset(0, 7, 30),
    patient: {
      patientId: 'p4',
      initials: 'BA',
      avatarBg: '#F59E0B',
      name: 'Babatunde Alade',
      mrn: 'MRN-2024-00356',
    },
  },

  // ── Verified ──────────────────────────────────────────────────────────────
  {
    id: 'lr-005',
    testName: 'Malaria Rapid Diagnostic Test (RDT)',
    department: 'Microbiology',
    status: 'verified',
    priority: 'routine',
    resultAt: atOffset(-2, 14, 15),
    patient: {
      initials: 'BA',
      avatarBg: '#F59E0B',
      name: 'Babatunde Alade',
      mrn: 'MRN-2024-00356',
    },
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
    testName: 'HbA1c',
    department: 'Biochemistry',
    status: 'verified',
    priority: 'routine',
    resultAt: atOffset(-1, 11, 0),
    patient: {
      initials: 'IM',
      avatarBg: '#22C55E',
      name: 'Ibrahim Musa',
      mrn: 'MRN-2024-00301',
    },
    rows: [{ parameter: 'HbA1c', value: '5.4 %', reference: '<5.7' }],
    comment: 'Normal glycated haemoglobin. No evidence of pre-diabetes.',
  },
  {
    id: 'lr-009',
    testName: 'Widal Test',
    department: 'Microbiology',
    status: 'verified',
    priority: 'routine',
    resultAt: atOffset(0, 6, 20),
    patient: {
      patientId: 'p1',
      initials: 'AO',
      avatarBg: '#EF4444',
      name: 'Adaeze Okonkwo',
      mrn: 'MRN-2024-00451',
    },
    rows: [{ parameter: 'S. typhi O agglutinin', value: '1:80', reference: '<1:80' }],
    comment: 'Titre within normal limits. Typhoid unlikely.',
  },
];
