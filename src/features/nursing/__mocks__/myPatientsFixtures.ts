/**
 * Mock fixtures for the My Patients screen (nurse workspace).
 * Swap out by pointing hooks to a real ward-roster endpoint in Phase 6.
 */

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const WARD_OPTIONS = ['Female Ward', 'Male Ward'].map((w) => ({ value: w, label: w }));

export type RiskLevel = 'High' | 'Medium' | 'Low';
export const RISK_LEVEL_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export type CareStatus = 'In Progress' | 'Stable';
export const CARE_STATUS_OPTIONS: { value: CareStatus; label: string }[] = [
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Stable', label: 'Stable' },
];

export type Vitals = { bp: string; hr: number; temp: number; recordedAt: string };

export type NursePatient = {
  id: string;
  patientName: string;
  initials: string;
  avatarBg: string;
  mrn: string;
  age: number;
  gender: 'Male' | 'Female';
  ward: string;
  bed: string;
  diagnosis: string;
  doctorName: string;
  vitals: Vitals;
  nextMedication: string;
  nextMedicationTime: string;
  riskLevel: RiskLevel;
  careStatus: CareStatus;
};

const CURATED_PATIENTS: NursePatient[] = [
  {
    id: 'np-001',
    patientName: 'Daniel Eze',
    initials: 'DE',
    avatarBg: '#EF4444',
    mrn: 'MRN-2026-00187',
    age: 68,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 8',
    diagnosis: 'Pneumonia',
    doctorName: 'Dr. Tunde Stephen',
    vitals: { bp: '150/90', hr: 102, temp: 38.2, recordedAt: atOffset(0, 8, 15) },
    nextMedication: 'Paracetamol 1g (PO)',
    nextMedicationTime: atOffset(0, 9, 0),
    riskLevel: 'High',
    careStatus: 'In Progress',
  },
  {
    id: 'np-002',
    patientName: 'Maryam Usman',
    initials: 'MU',
    avatarBg: '#22C55E',
    mrn: 'MRN-2026-00765',
    age: 45,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 3',
    diagnosis: 'Post-op Appendectomy',
    doctorName: 'Dr. Onyedika Umeh',
    vitals: { bp: '120/80', hr: 86, temp: 36.7, recordedAt: atOffset(0, 7, 45) },
    nextMedication: 'Ceftriaxone 1g (IV)',
    nextMedicationTime: atOffset(0, 10, 0),
    riskLevel: 'Medium',
    careStatus: 'Stable',
  },
  {
    id: 'np-003',
    patientName: 'Ifeanyi Nwosu',
    initials: 'IN',
    avatarBg: '#F59E0B',
    mrn: 'MRN-2024-00987',
    age: 32,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 5',
    diagnosis: 'Typhoid Fever',
    doctorName: 'Dr. Samuel A.',
    vitals: { bp: '110/70', hr: 78, temp: 36.8, recordedAt: atOffset(0, 8, 0) },
    nextMedication: 'Metronidazole 400mg (IV)',
    nextMedicationTime: atOffset(0, 11, 0),
    riskLevel: 'Low',
    careStatus: 'Stable',
  },
  {
    id: 'np-004',
    patientName: 'Amina Yusuf',
    initials: 'AY',
    avatarBg: '#8B5CF6',
    mrn: 'MRN-2026-01544',
    age: 72,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 16',
    diagnosis: 'Congestive Heart Failure',
    doctorName: 'Dr. Jane Ezeonu',
    vitals: { bp: '160/95', hr: 104, temp: 36.8, recordedAt: atOffset(0, 8, 20) },
    nextMedication: 'Furosemide 40mg (IV)',
    nextMedicationTime: atOffset(0, 9, 30),
    riskLevel: 'High',
    careStatus: 'In Progress',
  },
  {
    id: 'np-005',
    patientName: 'Grace Adebayo',
    initials: 'GA',
    avatarBg: '#00B4D8',
    mrn: 'MRN-2026-00421',
    age: 29,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 15',
    diagnosis: 'Migraine',
    doctorName: 'Dr. Onyedika Umeh',
    vitals: { bp: '112/72', hr: 76, temp: 36.7, recordedAt: atOffset(0, 7, 30) },
    nextMedication: 'Paracetamol 1g (PO)',
    nextMedicationTime: atOffset(0, 14, 0),
    riskLevel: 'Low',
    careStatus: 'Stable',
  },
  {
    id: 'np-006',
    patientName: 'Peter Obi',
    initials: 'PO',
    avatarBg: '#3B82F6',
    mrn: 'MRN-2026-00932',
    age: 51,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 13',
    diagnosis: 'Diabetes Mellitus',
    doctorName: 'Dr. Samuel A.',
    vitals: { bp: '130/85', hr: 88, temp: 37.3, recordedAt: atOffset(0, 7, 50) },
    nextMedication: 'Insulin Regular',
    nextMedicationTime: atOffset(0, 14, 0),
    riskLevel: 'Medium',
    careStatus: 'In Progress',
  },
  {
    id: 'np-007',
    patientName: 'Tunde Oladipo',
    initials: 'TO',
    avatarBg: '#EC4899',
    mrn: 'MRN-2024-00876',
    age: 40,
    gender: 'Male',
    ward: 'Male Ward',
    bed: 'Bed 2',
    diagnosis: 'Gastritis',
    doctorName: 'Dr. Jane Ezeonu',
    vitals: { bp: '118/76', hr: 74, temp: 36.6, recordedAt: atOffset(0, 8, 10) },
    nextMedication: 'Omeprazole 40mg (PO)',
    nextMedicationTime: atOffset(0, 10, 30),
    riskLevel: 'Low',
    careStatus: 'Stable',
  },
  {
    id: 'np-008',
    patientName: 'Chidinma Okafor',
    initials: 'CO',
    avatarBg: '#3B82F6',
    mrn: 'MRN-2026-0148',
    age: 53,
    gender: 'Female',
    ward: 'Female Ward',
    bed: 'Bed 12',
    diagnosis: 'Asthma Exacerbation',
    doctorName: 'Dr. Tunde Stephen',
    vitals: { bp: '125/82', hr: 92, temp: 37.3, recordedAt: atOffset(0, 8, 5) },
    nextMedication: 'Salbutamol Neb',
    nextMedicationTime: atOffset(0, 12, 0),
    riskLevel: 'Medium',
    careStatus: 'In Progress',
  },
];

const GEN_FIRST_NAMES = [
  'Ngozi',
  'Blessing',
  'Kelechi',
  'Halima',
  'Ikenna',
  'Segun',
  'Patience',
  'Uchenna',
  'Bimpe',
  'Emeka',
];
const GEN_LAST_NAMES = [
  'Nwachukwu',
  'Balogun',
  'Suleiman',
  'Achike',
  'Bassey',
  'Etim',
  'Umeh',
  'Bello',
  'Okafor',
  'Adeyemi',
];
const GEN_DIAGNOSES = [
  'Malaria',
  'Upper Respiratory Infection',
  'Gastroenteritis',
  'Hypertension',
  'Skin Infection',
  'Sickle Cell Crisis',
  'Chronic Kidney Disease',
  'Urinary Tract Infection',
  'Cellulitis',
  'Anaemia',
];
const GEN_MEDS = [
  'Amoxicillin 500mg (PO)',
  'Amlodipine 5mg (PO)',
  'Metformin 500mg (PO)',
  'Salbutamol 2.5mg (Neb)',
  'Artesunate 60mg (IV)',
  'Hydroxyurea 500mg (PO)',
  'Erythropoietin (SC)',
  'Ciprofloxacin 500mg (PO)',
];
const GEN_DOCTORS = ['Dr. Jane Ezeonu', 'Dr. Samuel A.', 'Dr. Onyedika Umeh', 'Dr. Tunde Stephen'];
const GEN_WARDS = ['Female Ward', 'Male Ward'];
const GEN_BEDS = [
  'Bed 1',
  'Bed 4',
  'Bed 6',
  'Bed 7',
  'Bed 9',
  'Bed 10',
  'Bed 11',
  'Bed 14',
  'Bed 17',
  'Bed 18',
];
const GEN_AVATAR_BG = ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#00B4D8', '#EC4899'];
const GEN_RISK: RiskLevel[] = [
  'High',
  'Medium',
  'Low',
  'Low',
  'Medium',
  'Low',
  'Low',
  'High',
  'Low',
  'Medium',
];
const GEN_STATUS: CareStatus[] = [
  'Stable',
  'Stable',
  'In Progress',
  'Stable',
  'Stable',
  'In Progress',
  'Stable',
  'In Progress',
  'Stable',
  'Stable',
];

const GENERATED_PATIENTS: NursePatient[] = Array.from({ length: 10 }, (_, idx) => {
  const i = idx + 9; // np-009 onward
  const firstName = GEN_FIRST_NAMES[idx] as string;
  const lastName = GEN_LAST_NAMES[idx] as string;
  const gender: 'Male' | 'Female' = idx % 2 === 0 ? 'Female' : 'Male';
  return {
    id: `np-${String(i).padStart(3, '0')}`,
    patientName: `${firstName} ${lastName}`,
    initials: `${firstName[0]}${lastName[0]}`,
    avatarBg: GEN_AVATAR_BG[idx % GEN_AVATAR_BG.length] as string,
    mrn: `MRN-${2023 + (idx % 4)}-${String(200 + idx * 9).padStart(5, '0')}`,
    age: 18 + ((idx * 7) % 60),
    gender,
    ward: GEN_WARDS[idx % GEN_WARDS.length] as string,
    bed: GEN_BEDS[idx % GEN_BEDS.length] as string,
    diagnosis: GEN_DIAGNOSES[idx % GEN_DIAGNOSES.length] as string,
    doctorName: GEN_DOCTORS[idx % GEN_DOCTORS.length] as string,
    vitals: {
      bp: `${110 + (idx % 5) * 8}/${70 + (idx % 4) * 5}`,
      hr: 70 + (idx % 6) * 5,
      temp: Number((36.5 + (idx % 4) * 0.3).toFixed(1)),
      recordedAt: atOffset(0, 7 + (idx % 4), (idx * 13) % 60),
    },
    nextMedication: GEN_MEDS[idx % GEN_MEDS.length] as string,
    nextMedicationTime: atOffset(0, 12 + (idx % 6), (idx * 17) % 60),
    riskLevel: GEN_RISK[idx] as RiskLevel,
    careStatus: GEN_STATUS[idx] as CareStatus,
  };
});

export const MY_PATIENTS_ROSTER: NursePatient[] = [...CURATED_PATIENTS, ...GENERATED_PATIENTS];
