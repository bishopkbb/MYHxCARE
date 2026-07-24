/**
 * Mock fixtures for the Shift Handover page (nurse workspace).
 * Replace with real API data in Phase 6 integration.
 */

export type ShiftType = 'Day' | 'Night';

export type HandoverShiftInfo = {
  shiftDateLabel: string;
  shiftType: ShiftType;
  shiftTimeRange: string;
  handoverTimeLabel: string;
};

export type HandoverNurse = {
  name: string;
  staffId: string;
  email: string;
  phone: string;
  avatarBg: string;
};

export const OUTGOING_NURSE: HandoverNurse = {
  name: 'Nurse Grace E.',
  staffId: 'NUR-0248',
  email: 'grace.e@myhxcare.ng',
  phone: '+234 803 123 4567',
  avatarBg: '#EC4899',
};

export const INCOMING_NURSE: HandoverNurse = {
  name: 'Nurse Aisha Ibrahim',
  staffId: 'NUR-0317',
  email: 'aisha.i@myhxcare.ng',
  phone: '+234 805 987 6543',
  avatarBg: '#8B5CF6',
};

export const SHIFT_INFO: HandoverShiftInfo = {
  shiftDateLabel: 'Mon, Jun 30, 2026',
  shiftType: 'Day',
  shiftTimeRange: '07:00 AM - 07:00 PM',
  handoverTimeLabel: '06:30 PM',
};

export type WardHandoverInfo = {
  name: string;
  wardCode: string;
  totalBeds: number;
  occupiedBeds: number;
  nurseInCharge: string;
};

export const WARD_INFO: WardHandoverInfo = {
  name: 'Female Medical Ward',
  wardCode: 'Ward 12-A',
  totalBeds: 28,
  occupiedBeds: 22,
  nurseInCharge: 'Nurse Grace E.',
};

export type PatientSummaryStats = {
  totalPatients: number;
  newAdmissions: number;
  dischargesToday: number;
  patientsUnderObservation: number;
};

export const PATIENT_SUMMARY_STATS: PatientSummaryStats = {
  totalPatients: 22,
  newAdmissions: 3,
  dischargesToday: 2,
  patientsUnderObservation: 4,
};

export type PatientCondition = 'Stable' | 'Improving' | 'Critical';

export type HandoverPatientRow = {
  bed: string;
  patientName: string;
  diagnosis: string;
  lengthOfStayDays: number;
  condition: PatientCondition;
  notes: string;
};

export const HANDOVER_PATIENTS: HandoverPatientRow[] = [
  {
    bed: '12-A-01',
    patientName: 'Maryam Usman',
    diagnosis: 'Pneumonia',
    lengthOfStayDays: 8,
    condition: 'Stable',
    notes: 'On IV antibiotics',
  },
  {
    bed: '12-A-02',
    patientName: 'Fatima Ahmed',
    diagnosis: 'Post Op - Appendectomy',
    lengthOfStayDays: 2,
    condition: 'Improving',
    notes: 'Mobilizing well',
  },
  {
    bed: '12-A-03',
    patientName: 'Gloria Nwosu',
    diagnosis: 'Hypertension',
    lengthOfStayDays: 5,
    condition: 'Stable',
    notes: 'BP controlled',
  },
  {
    bed: '12-A-04',
    patientName: 'James Daniel',
    diagnosis: 'DM Type 2',
    lengthOfStayDays: 3,
    condition: 'Stable',
    notes: 'Monitoring glucose',
  },
  {
    bed: '12-A-05',
    patientName: 'Aisha Ibrahim',
    diagnosis: 'Asthma Exacerbation',
    lengthOfStayDays: 1,
    condition: 'Improving',
    notes: 'On nebulization',
  },
];

export type HandoverTask = {
  id: string;
  category: string;
  description: string;
  done: boolean;
};

export const OUTSTANDING_TASKS: HandoverTask[] = [
  {
    id: 't1',
    category: 'Nursing Assessments',
    description: 'Complete 4-hourly assessment — Bed 12-A-03',
    done: false,
  },
  {
    id: 't2',
    category: 'Nursing Assessments',
    description: 'Complete 4-hourly assessment — Bed 12-A-07',
    done: false,
  },
  {
    id: 't3',
    category: 'Nursing Assessments',
    description: 'Neuro observations — Bed 12-A-11',
    done: false,
  },
  {
    id: 't4',
    category: 'Nursing Assessments',
    description: 'Post-op assessment — Bed 12-A-02',
    done: false,
  },
  {
    id: 't5',
    category: 'Care Plans to Review',
    description: 'Review diabetic care plan — James Daniel',
    done: false,
  },
  {
    id: 't6',
    category: 'Care Plans to Review',
    description: 'Review cardiac care plan — Comfort Adeyemi',
    done: false,
  },
  {
    id: 't7',
    category: 'Discharge Planning',
    description: 'Confirm discharge medication counselling — Fatima Ahmed',
    done: false,
  },
  {
    id: 't8',
    category: 'Patient Education',
    description: 'Inhaler technique demonstration — Aisha Ibrahim',
    done: false,
  },
  {
    id: 't9',
    category: 'Patient Education',
    description: 'Dietary counselling — James Daniel',
    done: false,
  },
  {
    id: 't10',
    category: 'Patient Education',
    description: 'Wound care instructions — Fatima Ahmed',
    done: false,
  },
  {
    id: 't11',
    category: 'Documentation',
    description: 'Complete intake/output chart — Bed 12-A-11',
    done: false,
  },
  {
    id: 't12',
    category: 'Documentation',
    description: 'Update fall-risk assessment — Bed 12-A-16',
    done: false,
  },
  {
    id: 't13',
    category: 'Documentation',
    description: 'File lab request forms — Bed 12-A-07',
    done: false,
  },
  {
    id: 't14',
    category: 'Documentation',
    description: 'Update wound chart — Bed 12-A-02',
    done: false,
  },
  { id: 't15', category: 'Documentation', description: 'Complete shift vitals log', done: false },
];

export type CriticalPatientStatus = 'Unstable' | 'Watch';

export type CriticalPatientRow = {
  bed: string;
  patientName: string;
  diagnosis: string;
  status: CriticalPatientStatus;
  reason: string;
};

export const CRITICAL_PATIENTS: CriticalPatientRow[] = [
  {
    bed: '12-A-07',
    patientName: 'Blessing John',
    diagnosis: 'Sepsis',
    status: 'Unstable',
    reason: 'On oxygen support',
  },
  {
    bed: '12-A-11',
    patientName: 'Comfort Adeyemi',
    diagnosis: 'Heart Failure',
    status: 'Unstable',
    reason: 'Strict fluid balance',
  },
  {
    bed: '12-A-16',
    patientName: 'Rukayya Musa',
    diagnosis: 'DKA',
    status: 'Watch',
    reason: 'Hourly monitoring',
  },
];

export type MedicationDueRow = {
  time: string;
  patientName: string;
  medication: string;
  dose: string;
  route: string;
};

export const MEDICATION_DUE: MedicationDueRow[] = [
  {
    time: '07:00 PM',
    patientName: 'Maryam Usman',
    medication: 'Ceftriaxone',
    dose: '1g',
    route: 'IV',
  },
  {
    time: '07:30 PM',
    patientName: 'James Daniel',
    medication: 'Metformin',
    dose: '500mg',
    route: 'PO',
  },
  {
    time: '08:00 PM',
    patientName: 'Gloria Nwosu',
    medication: 'Amlodipine',
    dose: '5mg',
    route: 'PO',
  },
  {
    time: '08:30 PM',
    patientName: 'Fatima Ahmed',
    medication: 'Paracetamol',
    dose: '1g',
    route: 'PO',
  },
  {
    time: '09:00 PM',
    patientName: 'Aisha Ibrahim',
    medication: 'Salbutamol',
    dose: '2.5mg',
    route: 'Inh.',
  },
];

export type InvestigationStatus = 'Pending' | 'Ordered' | 'Sample Sent' | 'Completed';

export type PendingInvestigationRow = {
  patientName: string;
  investigation: string;
  orderedBy: string;
  status: InvestigationStatus;
};

export const PENDING_INVESTIGATIONS: PendingInvestigationRow[] = [
  {
    patientName: 'Blessing John',
    investigation: 'Blood Culture',
    orderedBy: 'Dr. Bello Ibrahim',
    status: 'Pending',
  },
  {
    patientName: 'Comfort Adeyemi',
    investigation: 'Echocardiogram',
    orderedBy: 'Dr. Aminu Yusuf',
    status: 'Ordered',
  },
  {
    patientName: 'Rukayya Musa',
    investigation: 'Electrolytes (U&E)',
    orderedBy: 'Dr. Bello Ibrahim',
    status: 'Sample Sent',
  },
  {
    patientName: 'Maryam Usman',
    investigation: 'Chest X-Ray',
    orderedBy: 'Dr. Aminu Yusuf',
    status: 'Pending',
  },
  {
    patientName: 'James Daniel',
    investigation: 'HbA1c',
    orderedBy: 'Dr. Bello Ibrahim',
    status: 'Ordered',
  },
];

export type HandoverHistoryEntry = {
  id: string;
  shiftDateLabel: string;
  shiftType: ShiftType;
  outgoingNurse: string;
  incomingNurse: string;
  ward: string;
  completedAtLabel: string;
};

export const HANDOVER_HISTORY: HandoverHistoryEntry[] = [
  {
    id: 'h1',
    shiftDateLabel: 'Sun, Jun 29, 2026',
    shiftType: 'Night',
    outgoingNurse: 'Nurse Aisha Ibrahim',
    incomingNurse: 'Nurse Grace E.',
    ward: 'Female Medical Ward',
    completedAtLabel: 'Jun 30, 2026 07:02 AM',
  },
  {
    id: 'h2',
    shiftDateLabel: 'Sun, Jun 29, 2026',
    shiftType: 'Day',
    outgoingNurse: 'Nurse Grace E.',
    incomingNurse: 'Nurse Aisha Ibrahim',
    ward: 'Female Medical Ward',
    completedAtLabel: 'Jun 29, 2026 06:35 PM',
  },
  {
    id: 'h3',
    shiftDateLabel: 'Sat, Jun 28, 2026',
    shiftType: 'Night',
    outgoingNurse: 'Nurse Aisha Ibrahim',
    incomingNurse: 'Nurse Grace E.',
    ward: 'Female Medical Ward',
    completedAtLabel: 'Jun 29, 2026 07:08 AM',
  },
  {
    id: 'h4',
    shiftDateLabel: 'Sat, Jun 28, 2026',
    shiftType: 'Day',
    outgoingNurse: 'Nurse Grace E.',
    incomingNurse: 'Nurse Aisha Ibrahim',
    ward: 'Female Medical Ward',
    completedAtLabel: 'Jun 28, 2026 06:31 PM',
  },
];
