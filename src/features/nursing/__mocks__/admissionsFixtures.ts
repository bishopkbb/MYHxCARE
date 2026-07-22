export type AdmissionStatus = 'Pending' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
export type AdmissionType = 'Medical' | 'Surgical';

export const STATUS_CFG: Record<AdmissionStatus, { color: string; border: string; bg: string }> = {
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)' },
  Scheduled: { color: '#8B5CF6', border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.1)' },
  'In Progress': { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.1)' },
  Completed: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.1)' },
  Cancelled: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.1)' },
};

export type AdmissionStepInfo = { step: number; label: string; shortLabel: string };

/** Step 0 is a sentinel for "not yet started" (a Scheduled admission whose
 * patient hasn't arrived). Real steps run 1-7. */
export const ADMISSION_STEPS: AdmissionStepInfo[] = [
  { step: 1, label: 'Registration Complete', shortLabel: 'Registration' },
  { step: 2, label: 'Doctor Assessment', shortLabel: 'Doctor' },
  { step: 3, label: 'Nursing Assessment', shortLabel: 'Nursing' },
  { step: 4, label: 'Assign Bed', shortLabel: 'Assign Bed' },
  { step: 5, label: 'Vital Signs', shortLabel: 'Vitals' },
  { step: 6, label: 'Care Plan', shortLabel: 'Care Plan' },
  { step: 7, label: 'Medication', shortLabel: 'Medication' },
];

export type AdmissionRecord = {
  id: string;
  /** Links to NursePatient.id once the patient has a real bed (step >= 4). */
  patientId?: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: 'Male' | 'Female';
  admittedAt: string; // ISO — a future date for Scheduled admissions
  ward: string;
  bed?: string;
  admissionType: AdmissionType;
  currentStep: number; // 0 = not started, 1-7 otherwise
  status: AdmissionStatus;
  assignedDoctor: string;
  completedAt?: string; // ISO, only when status === 'Completed'
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const ADMISSIONS: AdmissionRecord[] = [
  // ── Bed-assigned patients — linked to the real nursing roster ──────────
  {
    id: 'adm-001',
    patientId: 'np-002',
    patientName: 'Maryam Usman',
    mrn: 'MRN-2026-00765',
    age: 45,
    gender: 'Female',
    admittedAt: atOffset(-1, 8, 15),
    ward: 'Female Medical Ward',
    bed: 'A-01',
    admissionType: 'Surgical',
    currentStep: 7,
    status: 'Completed',
    assignedDoctor: 'Dr. Onyedika Umeh',
    completedAt: atOffset(0, 8, 10),
  },
  {
    id: 'adm-002',
    patientId: 'np-005',
    patientName: 'Grace Adebayo',
    mrn: 'MRN-2026-00421',
    age: 29,
    gender: 'Female',
    admittedAt: atOffset(-1, 9, 0),
    ward: 'Female Medical Ward',
    bed: 'A-05',
    admissionType: 'Medical',
    currentStep: 7,
    status: 'Completed',
    assignedDoctor: 'Dr. Onyedika Umeh',
    completedAt: atOffset(0, 7, 45),
  },
  {
    id: 'adm-003',
    patientId: 'np-009',
    patientName: 'Ngozi Nwachukwu',
    mrn: 'MRN-2023-00218',
    age: 38,
    gender: 'Female',
    admittedAt: atOffset(-1, 10, 30),
    ward: 'Female Medical Ward',
    bed: 'B-02',
    admissionType: 'Medical',
    currentStep: 7,
    status: 'Completed',
    assignedDoctor: 'Dr. Jane Ezeonu',
    completedAt: atOffset(0, 7, 20),
  },
  {
    id: 'adm-004',
    patientId: 'np-013',
    patientName: 'Ikenna Bassey',
    mrn: 'MRN-2025-00218',
    age: 46,
    gender: 'Female',
    admittedAt: atOffset(-1, 11, 0),
    ward: 'Female Medical Ward',
    bed: 'C-01',
    admissionType: 'Medical',
    currentStep: 7,
    status: 'Completed',
    assignedDoctor: 'Dr. Onyedika Umeh',
    completedAt: atOffset(0, 6, 50),
  },
  {
    id: 'adm-005',
    patientId: 'np-017',
    patientName: 'Bimpe Okafor',
    mrn: 'MRN-2023-00272',
    age: 33,
    gender: 'Female',
    admittedAt: atOffset(-1, 12, 15),
    ward: 'Female Medical Ward',
    bed: 'C-05',
    admissionType: 'Surgical',
    currentStep: 7,
    status: 'Completed',
    assignedDoctor: 'Dr. Jane Ezeonu',
    completedAt: atOffset(0, 6, 15),
  },
  {
    id: 'adm-006',
    patientId: 'np-004',
    patientName: 'Amina Yusuf',
    mrn: 'MRN-2026-01544',
    age: 52,
    gender: 'Female',
    admittedAt: atOffset(0, 6, 30),
    ward: 'Female Medical Ward',
    bed: 'Bed 16',
    admissionType: 'Medical',
    currentStep: 6,
    status: 'In Progress',
    assignedDoctor: 'Dr. Jane Ezeonu',
  },
  {
    id: 'adm-007',
    patientId: 'np-011',
    patientName: 'Kelechi Suleiman',
    mrn: 'MRN-2025-00218',
    age: 27,
    gender: 'Female',
    admittedAt: atOffset(0, 7, 0),
    ward: 'Female Medical Ward',
    bed: 'Bed 11',
    admissionType: 'Medical',
    currentStep: 6,
    status: 'In Progress',
    assignedDoctor: 'Dr. Onyedika Umeh',
  },
  {
    id: 'adm-008',
    patientId: 'np-001',
    patientName: 'Daniel Eze',
    mrn: 'MRN-2026-00187',
    age: 41,
    gender: 'Male',
    admittedAt: atOffset(0, 7, 20),
    ward: 'Male Medical Ward',
    bed: 'Bed 8',
    admissionType: 'Medical',
    currentStep: 6,
    status: 'In Progress',
    assignedDoctor: 'Dr. Tunde Stephen',
  },
  {
    id: 'adm-009',
    patientId: 'np-008',
    patientName: 'Chidinma Okafor',
    mrn: 'MRN-2026-0148',
    age: 24,
    gender: 'Female',
    admittedAt: atOffset(0, 7, 45),
    ward: 'Female Medical Ward',
    bed: 'B-01',
    admissionType: 'Medical',
    currentStep: 5,
    status: 'In Progress',
    assignedDoctor: 'Dr. Tunde Stephen',
  },
  {
    id: 'adm-010',
    patientId: 'np-003',
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    age: 35,
    gender: 'Male',
    admittedAt: atOffset(0, 8, 0),
    ward: 'Male Medical Ward',
    bed: 'Bed 5',
    admissionType: 'Medical',
    currentStep: 5,
    status: 'In Progress',
    assignedDoctor: 'Dr. Samuel A.',
  },
  {
    id: 'adm-011',
    patientId: 'np-015',
    patientName: 'Patience Umeh',
    mrn: 'MRN-2026-00791',
    age: 61,
    gender: 'Female',
    admittedAt: atOffset(0, 8, 30),
    ward: 'Female Medical Ward',
    bed: 'A-06',
    admissionType: 'Medical',
    currentStep: 4,
    status: 'In Progress',
    assignedDoctor: 'Dr. Onyedika Umeh',
  },
  {
    id: 'adm-012',
    patientId: 'np-006',
    patientName: 'Peter Obi',
    mrn: 'MRN-2026-00932',
    age: 39,
    gender: 'Male',
    admittedAt: atOffset(0, 9, 5),
    ward: 'Male Medical Ward',
    bed: 'Bed 13',
    admissionType: 'Medical',
    currentStep: 4,
    status: 'In Progress',
    assignedDoctor: 'Dr. Samuel A.',
  },

  // ── Not yet bed-assigned — fresh arrivals still moving through
  // Registration → Doctor → Nursing Assessment ────────────────────────────
  {
    id: 'adm-013',
    patientName: 'Fatima Ahmed',
    mrn: 'MRN-2026-00782',
    age: 32,
    gender: 'Female',
    admittedAt: atOffset(0, 7, 45),
    ward: 'Female Medical Ward',
    admissionType: 'Surgical',
    currentStep: 2,
    status: 'Pending',
    assignedDoctor: 'Dr. Amina Yusuf',
  },
  {
    id: 'adm-014',
    patientName: 'Gloria Nwosu',
    mrn: 'MRN-2026-00791',
    age: 61,
    gender: 'Female',
    admittedAt: atOffset(0, 6, 30),
    ward: 'Female Medical Ward',
    admissionType: 'Medical',
    currentStep: 3,
    status: 'Pending',
    assignedDoctor: 'Dr. Amina Yusuf',
  },
  {
    id: 'adm-015',
    patientName: 'Rukayya Musa',
    mrn: 'MRN-2026-00860',
    age: 26,
    gender: 'Female',
    admittedAt: atOffset(0, 1, 55),
    ward: 'Female Medical Ward',
    admissionType: 'Medical',
    currentStep: 1,
    status: 'Pending',
    assignedDoctor: 'Dr. Jane Ezeonu',
  },

  // ── Scheduled — booked ahead, patient hasn't arrived yet ────────────────
  {
    id: 'adm-016',
    patientName: 'Hauwa Yakubu',
    mrn: 'MRN-2026-00902',
    age: 44,
    gender: 'Female',
    admittedAt: atOffset(1, 9, 0),
    ward: 'Female Surgical Ward',
    admissionType: 'Surgical',
    currentStep: 0,
    status: 'Scheduled',
    assignedDoctor: 'Dr. Amina Yusuf',
  },
  {
    id: 'adm-017',
    patientName: 'Ndidi Okonjo',
    mrn: 'MRN-2026-00908',
    age: 30,
    gender: 'Female',
    admittedAt: atOffset(2, 10, 30),
    ward: 'Female Surgical Ward',
    admissionType: 'Surgical',
    currentStep: 0,
    status: 'Scheduled',
    assignedDoctor: 'Dr. Onyedika Umeh',
  },

  // ── Cancelled — stopped partway through ─────────────────────────────────
  {
    id: 'adm-018',
    patientName: 'Chinedu Okafor',
    mrn: 'MRN-2026-00815',
    age: 54,
    gender: 'Male',
    admittedAt: atOffset(0, 5, 20),
    ward: 'Male Medical Ward',
    admissionType: 'Medical',
    currentStep: 2,
    status: 'Cancelled',
    assignedDoctor: 'Dr. Tunde Stephen',
  },
];
