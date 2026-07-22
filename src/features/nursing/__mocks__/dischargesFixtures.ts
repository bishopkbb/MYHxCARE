export type DischargeStatus = 'Planned' | 'Discharged' | 'Cancelled';
export type DischargeType = 'Routine' | 'Transfer' | 'AMA';

export const STATUS_CFG: Record<DischargeStatus, { color: string; border: string; bg: string }> = {
  Planned: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)' },
  Discharged: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.1)' },
  Cancelled: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.1)' },
};

export const DISCHARGE_TYPE_LABELS: Record<DischargeType, string> = {
  Routine: 'Routine (Home)',
  Transfer: 'Transfer to Facility',
  AMA: 'Against Medical Advice',
};

export type DischargeStepInfo = { step: number; label: string; shortLabel: string };

/** A patient's discharge plan clears every step in order before step 7
 * releases the bed — mirrors real ward discharge-planning practice, where
 * a patient can't leave until orders, medication, education, results, and
 * paperwork are all confirmed. */
export const DISCHARGE_STEPS: DischargeStepInfo[] = [
  { step: 1, label: 'Discharge Order Confirmed', shortLabel: 'Order' },
  { step: 2, label: 'Medication Reconciliation', shortLabel: 'Medication' },
  { step: 3, label: 'Patient & Caregiver Education', shortLabel: 'Education' },
  { step: 4, label: 'Pending Results Reviewed', shortLabel: 'Results' },
  { step: 5, label: 'Discharge Summary Completed', shortLabel: 'Summary' },
  { step: 6, label: 'Follow-up & Transport Arranged', shortLabel: 'Follow-up' },
  { step: 7, label: 'Bed Released', shortLabel: 'Bed Released' },
];

export type DischargeRecord = {
  id: string;
  /** Links to NursePatient.id — only set while the patient is still an active
   * ward roster member (Planned/Cancelled). Cleared once Discharged, since a
   * discharged patient has already left the roster and vacated their bed
   * (mirrors Bed Management's own Occupied -> Cleaning Required transition). */
  patientId?: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: 'Male' | 'Female';
  ward: string;
  bed: string;
  diagnosis: string;
  doctorName: string;
  dischargeType: DischargeType;
  plannedDischargeAt: string; // ISO
  currentStep: number; // 1-7
  status: DischargeStatus;
  notes?: string;
  dischargedAt?: string; // ISO, only when status === 'Discharged'
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const DISCHARGES: DischargeRecord[] = [
  // ── Active plans — linked to real, still-admitted roster patients ───────
  {
    id: 'dis-001',
    patientId: 'np-005',
    patientName: 'Grace Adebayo',
    mrn: 'MRN-2026-00421',
    age: 29,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 15',
    diagnosis: 'Migraine',
    doctorName: 'Dr. Onyedika Umeh',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(0, 14, 0),
    currentStep: 6,
    status: 'Planned',
    notes: 'Follow-up booked with neurology outpatient clinic in 2 weeks.',
  },
  {
    id: 'dis-002',
    patientId: 'np-002',
    patientName: 'Maryam Usman',
    mrn: 'MRN-2026-00765',
    age: 45,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 3',
    diagnosis: 'Post-op Appendectomy',
    doctorName: 'Dr. Onyedika Umeh',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(0, 16, 0),
    currentStep: 5,
    status: 'Planned',
  },
  {
    id: 'dis-003',
    patientId: 'np-003',
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    age: 32,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 5',
    diagnosis: 'Typhoid Fever',
    doctorName: 'Dr. Samuel A.',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(1, 10, 0),
    currentStep: 4,
    status: 'Planned',
  },
  {
    id: 'dis-004',
    patientId: 'np-007',
    patientName: 'Tunde Oladipo',
    mrn: 'MRN-2024-00876',
    age: 40,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 2',
    diagnosis: 'Gastritis',
    doctorName: 'Dr. Jane Ezeonu',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(1, 11, 0),
    currentStep: 3,
    status: 'Planned',
  },
  {
    id: 'dis-005',
    patientId: 'np-009',
    patientName: 'Ngozi Nwachukwu',
    mrn: 'MRN-2023-00218',
    age: 38,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 1',
    diagnosis: 'Malaria',
    doctorName: 'Dr. Jane Ezeonu',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(1, 12, 0),
    currentStep: 2,
    status: 'Planned',
  },
  {
    id: 'dis-006',
    patientId: 'np-010',
    patientName: 'Blessing Balogun',
    mrn: 'MRN-2024-00209',
    age: 25,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 4',
    diagnosis: 'Upper Respiratory Infection',
    doctorName: 'Dr. Samuel A.',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(2, 9, 0),
    currentStep: 1,
    status: 'Planned',
  },
  {
    id: 'dis-007',
    patientId: 'np-012',
    patientName: 'Halima Achike',
    mrn: 'MRN-2025-00227',
    age: 46,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 9',
    diagnosis: 'Hypertension',
    doctorName: 'Dr. Onyedika Umeh',
    dischargeType: 'Transfer',
    plannedDischargeAt: atOffset(1, 15, 0),
    currentStep: 1,
    status: 'Planned',
    notes: 'Transfer to UNTH Cardiology for specialist workup.',
  },

  // ── Cancelled — plan called off, patient remains admitted ───────────────
  {
    id: 'dis-008',
    patientId: 'np-017',
    patientName: 'Bimpe Okafor',
    mrn: 'MRN-2023-00272',
    age: 33,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 17',
    diagnosis: 'Cellulitis',
    doctorName: 'Dr. Jane Ezeonu',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(-1, 14, 0),
    currentStep: 2,
    status: 'Cancelled',
    notes: 'Wound review flagged a new infection site — discharge deferred.',
  },

  // ── Discharged — already gone; bed already released back to Bed Management,
  // so intentionally not linked to a roster patientId or occupied bed ───────
  {
    id: 'dis-009',
    patientName: 'Ada Chukwu',
    mrn: 'MRN-2026-00301',
    age: 54,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 6',
    diagnosis: 'Community-Acquired Pneumonia',
    doctorName: 'Dr. Tunde Stephen',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(0, 8, 0),
    currentStep: 7,
    status: 'Discharged',
    dischargedAt: atOffset(0, 8, 40),
  },
  {
    id: 'dis-010',
    patientName: 'Emeka Nnamdi',
    mrn: 'MRN-2025-00114',
    age: 61,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 10',
    diagnosis: 'Diabetic Foot Ulcer',
    doctorName: 'Dr. Samuel A.',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(0, 7, 0),
    currentStep: 7,
    status: 'Discharged',
    dischargedAt: atOffset(0, 7, 35),
  },
  {
    id: 'dis-011',
    patientName: 'Halima Sule',
    mrn: 'MRN-2026-00318',
    age: 27,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 11',
    diagnosis: 'Pre-eclampsia (resolved)',
    doctorName: 'Dr. Onyedika Umeh',
    dischargeType: 'Transfer',
    plannedDischargeAt: atOffset(0, 6, 30),
    currentStep: 7,
    status: 'Discharged',
    dischargedAt: atOffset(0, 7, 5),
    notes: 'Transferred to UNTH Maternity for continued antenatal care.',
  },
  {
    id: 'dis-012',
    patientName: 'Yusuf Bello',
    mrn: 'MRN-2026-00322',
    age: 44,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 14',
    diagnosis: 'Alcohol Withdrawal',
    doctorName: 'Dr. Tunde Stephen',
    dischargeType: 'AMA',
    plannedDischargeAt: atOffset(-1, 20, 0),
    currentStep: 7,
    status: 'Discharged',
    dischargedAt: atOffset(-1, 20, 15),
    notes: 'Left against medical advice; risks explained and documented.',
  },
  {
    id: 'dis-013',
    patientName: 'Chiamaka Eze',
    mrn: 'MRN-2026-00309',
    age: 36,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 18',
    diagnosis: 'Sickle Cell Crisis (resolved)',
    doctorName: 'Dr. Jane Ezeonu',
    dischargeType: 'Routine',
    plannedDischargeAt: atOffset(-2, 13, 0),
    currentStep: 7,
    status: 'Discharged',
    dischargedAt: atOffset(-2, 13, 30),
  },
];
