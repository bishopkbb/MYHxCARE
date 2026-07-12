/**
 * Mock fixtures for laboratory results.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

export type LabResultStatus = 'critical' | 'pending' | 'verified';
export type LabResultPriority = 'stat' | 'urgent' | 'routine';
export type LabFlag = 'H' | 'L' | 'A';

export type LabResultRow = {
  parameter: string;
  value: string;
  valueAbnormal?: boolean;
  reference: string;
  flag?: LabFlag;
};

export type LabResult = {
  id: string;
  testName: string;
  status: LabResultStatus;
  priority: LabResultPriority;
  date: string;
  time: string;
  patient: {
    initials: string;
    avatarBg: string;
    name: string;
    mrn: string;
  };
  rows?: LabResultRow[];
  comment?: string;
};

export const MOCK_LAB_RESULTS: LabResult[] = [
  // ── Critical ──────────────────────────────────────────────────────────────
  {
    id: 'lr-001',
    testName: 'Full Blood Count (FBC)',
    status: 'critical',
    priority: 'stat',
    date: 'Jun 30, 2026',
    time: '09:30 AM',
    patient: {
      initials: 'AO',
      avatarBg: '#6B7280',
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

  // ── Pending ───────────────────────────────────────────────────────────────
  {
    id: 'lr-002',
    testName: 'Chest X-Ray (PA view)',
    status: 'pending',
    priority: 'urgent',
    date: 'Jun 30, 2026',
    time: '10:42 AM',
    patient: {
      initials: 'NA',
      avatarBg: '#00B4D8',
      name: 'Ngozi Adeyemi',
      mrn: 'MRN-2024-00512',
    },
  },
  {
    id: 'lr-003',
    testName: 'Urinalysis (Routine)',
    status: 'pending',
    priority: 'routine',
    date: 'Jun 30, 2026',
    time: '09:58 AM',
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
    status: 'pending',
    priority: 'urgent',
    date: 'Jun 30, 2026',
    time: '08:55 AM',
    patient: {
      initials: 'DO',
      avatarBg: '#6366F1',
      name: 'David Osei',
      mrn: 'MRN-2024-00398',
    },
  },

  // ── Verified ──────────────────────────────────────────────────────────────
  {
    id: 'lr-005',
    testName: 'Malaria Rapid Diagnostic Test (RDT)',
    status: 'verified',
    priority: 'routine',
    date: 'Jun 28, 2026',
    time: '02:15 PM',
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
  },
  {
    id: 'lr-006',
    testName: 'HbA1c',
    status: 'verified',
    priority: 'routine',
    date: 'Jun 29, 2026',
    time: '11:00 AM',
    patient: {
      initials: 'IM',
      avatarBg: '#22C55E',
      name: 'Ibrahim Musa',
      mrn: 'MRN-2024-00301',
    },
    rows: [
      {
        parameter: 'HbA1c',
        value: '5.4 %',
        valueAbnormal: false,
        reference: '<5.7',
      },
    ],
    comment: 'Normal glycated haemoglobin. No evidence of pre-diabetes.',
  },
];
