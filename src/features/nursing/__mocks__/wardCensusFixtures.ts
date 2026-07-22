export type BedStatus = 'Occupied' | 'Available' | 'Reserved' | 'Cleaning';
export type Acuity = 'Critical' | 'High' | 'Medium' | 'Low';

export const BED_STATUS_CFG: Record<BedStatus, { color: string; border: string; bg: string }> = {
  Occupied: { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.1)' },
  Available: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.1)' },
  Reserved: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)' },
  Cleaning: { color: '#8A98A3', border: 'rgba(138,152,163,0.4)', bg: 'rgba(138,152,163,0.1)' },
};

export const ACUITY_CFG: Record<Acuity, { color: string }> = {
  Critical: { color: '#EF4444' },
  High: { color: '#F59E0B' },
  Medium: { color: '#3B82F6' },
  Low: { color: '#22C55E' },
};

export type Ward = {
  id: string;
  name: string;
  totalBeds: number;
  nurseInCharge: string;
  nurseInChargeId: string;
};

export const WARDS: Ward[] = [
  {
    id: 'ward-female',
    name: 'Female Ward',
    totalBeds: 20,
    nurseInCharge: 'Nurse Grace E.',
    nurseInChargeId: 'NUR-0248',
  },
  {
    id: 'ward-male',
    name: 'Male Ward',
    totalBeds: 20,
    nurseInCharge: 'Nurse Clara M.',
    nurseInChargeId: 'NUR-0193',
  },
  {
    id: 'ward-icu',
    name: 'ICU',
    totalBeds: 10,
    nurseInCharge: 'Nurse Ifeoma K.',
    nurseInChargeId: 'NUR-0157',
  },
  {
    id: 'ward-maternity',
    name: 'Maternity Ward',
    totalBeds: 15,
    nurseInCharge: 'Nurse Blessing O.',
    nurseInChargeId: 'NUR-0212',
  },
  {
    id: 'ward-pediatric',
    name: 'Pediatric Ward',
    totalBeds: 15,
    nurseInCharge: 'Nurse Ngozi A.',
    nurseInChargeId: 'NUR-0176',
  },
];

export type WardBed = {
  id: string;
  bedNumber: string;
  status: BedStatus;
  patientName?: string;
  mrn?: string;
  doctorName?: string;
  acuity?: Acuity;
  admittedAt?: string; // ISO — only present when Occupied
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Static bed rosters for wards not yet backed by a real patient-management
 * screen elsewhere in the app (Female/Male Ward beds are instead derived
 * live from the shared nursing roster — see getWardBeds in WardCensusWorkspace). */
export const STATIC_WARD_BEDS: Record<string, WardBed[]> = {
  'ward-icu': [
    {
      id: 'icu-1',
      bedNumber: 'ICU 1',
      status: 'Occupied',
      patientName: 'Emeka Obiora',
      mrn: 'MRN-2026-00812',
      doctorName: 'Dr. Amina Yusuf',
      acuity: 'Critical',
      admittedAt: atOffset(-2, 3, 0),
    },
    {
      id: 'icu-2',
      bedNumber: 'ICU 2',
      status: 'Occupied',
      patientName: 'Halima Bello',
      mrn: 'MRN-2026-00819',
      doctorName: 'Dr. Onyedika Umeh',
      acuity: 'Critical',
      admittedAt: atOffset(-1, 14, 0),
    },
    {
      id: 'icu-3',
      bedNumber: 'ICU 3',
      status: 'Occupied',
      patientName: 'Chukwuemeka Nnadi',
      mrn: 'MRN-2026-00825',
      doctorName: 'Dr. Tunde Stephen',
      acuity: 'High',
      admittedAt: atOffset(-3, 9, 0),
    },
    {
      id: 'icu-4',
      bedNumber: 'ICU 4',
      status: 'Occupied',
      patientName: 'Rebecca Danjuma',
      mrn: 'MRN-2026-00831',
      doctorName: 'Dr. Amina Yusuf',
      acuity: 'Critical',
      admittedAt: atOffset(0, 6, 0),
    },
    { id: 'icu-5', bedNumber: 'ICU 5', status: 'Reserved' },
    { id: 'icu-6', bedNumber: 'ICU 6', status: 'Available' },
    { id: 'icu-7', bedNumber: 'ICU 7', status: 'Available' },
    { id: 'icu-8', bedNumber: 'ICU 8', status: 'Cleaning' },
    {
      id: 'icu-9',
      bedNumber: 'ICU 9',
      status: 'Occupied',
      patientName: 'Godwin Etim',
      mrn: 'MRN-2026-00840',
      doctorName: 'Dr. Onyedika Umeh',
      acuity: 'High',
      admittedAt: atOffset(-1, 20, 0),
    },
    { id: 'icu-10', bedNumber: 'ICU 10', status: 'Available' },
  ],
  'ward-maternity': [
    {
      id: 'mat-1',
      bedNumber: 'Bed 1',
      status: 'Occupied',
      patientName: 'Nkechi Uba',
      mrn: 'MRN-2026-00901',
      doctorName: 'Dr. Jane Ezeonu',
      acuity: 'Medium',
      admittedAt: atOffset(-1, 5, 0),
    },
    {
      id: 'mat-2',
      bedNumber: 'Bed 2',
      status: 'Occupied',
      patientName: 'Fatima Sani',
      mrn: 'MRN-2026-00905',
      doctorName: 'Dr. Jane Ezeonu',
      acuity: 'Low',
      admittedAt: atOffset(-2, 9, 0),
    },
    {
      id: 'mat-3',
      bedNumber: 'Bed 3',
      status: 'Occupied',
      patientName: 'Blessing Okoro',
      mrn: 'MRN-2026-00909',
      doctorName: 'Dr. Amina Yusuf',
      acuity: 'Medium',
      admittedAt: atOffset(0, 2, 0),
    },
    { id: 'mat-4', bedNumber: 'Bed 4', status: 'Available' },
    { id: 'mat-5', bedNumber: 'Bed 5', status: 'Available' },
    { id: 'mat-6', bedNumber: 'Bed 6', status: 'Reserved' },
    {
      id: 'mat-7',
      bedNumber: 'Bed 7',
      status: 'Occupied',
      patientName: 'Comfort Eze',
      mrn: 'MRN-2026-00914',
      doctorName: 'Dr. Jane Ezeonu',
      acuity: 'Low',
      admittedAt: atOffset(-3, 11, 0),
    },
    { id: 'mat-8', bedNumber: 'Bed 8', status: 'Available' },
    { id: 'mat-9', bedNumber: 'Bed 9', status: 'Cleaning' },
    { id: 'mat-10', bedNumber: 'Bed 10', status: 'Available' },
    { id: 'mat-11', bedNumber: 'Bed 11', status: 'Available' },
    { id: 'mat-12', bedNumber: 'Bed 12', status: 'Reserved' },
    { id: 'mat-13', bedNumber: 'Bed 13', status: 'Available' },
    { id: 'mat-14', bedNumber: 'Bed 14', status: 'Available' },
    { id: 'mat-15', bedNumber: 'Bed 15', status: 'Available' },
  ],
  'ward-pediatric': [
    {
      id: 'ped-1',
      bedNumber: 'Bed 1',
      status: 'Occupied',
      patientName: 'Chiamaka Nwosu',
      mrn: 'MRN-2026-00951',
      doctorName: 'Dr. Samuel A.',
      acuity: 'Medium',
      admittedAt: atOffset(-1, 15, 0),
    },
    {
      id: 'ped-2',
      bedNumber: 'Bed 2',
      status: 'Occupied',
      patientName: 'David Okonkwo',
      mrn: 'MRN-2026-00955',
      doctorName: 'Dr. Samuel A.',
      acuity: 'High',
      admittedAt: atOffset(0, 4, 0),
    },
    { id: 'ped-3', bedNumber: 'Bed 3', status: 'Available' },
    {
      id: 'ped-4',
      bedNumber: 'Bed 4',
      status: 'Occupied',
      patientName: 'Amaka Chukwu',
      mrn: 'MRN-2026-00960',
      doctorName: 'Dr. Jane Ezeonu',
      acuity: 'Low',
      admittedAt: atOffset(-2, 10, 0),
    },
    { id: 'ped-5', bedNumber: 'Bed 5', status: 'Available' },
    { id: 'ped-6', bedNumber: 'Bed 6', status: 'Reserved' },
    { id: 'ped-7', bedNumber: 'Bed 7', status: 'Available' },
    { id: 'ped-8', bedNumber: 'Bed 8', status: 'Cleaning' },
    { id: 'ped-9', bedNumber: 'Bed 9', status: 'Available' },
    { id: 'ped-10', bedNumber: 'Bed 10', status: 'Available' },
    {
      id: 'ped-11',
      bedNumber: 'Bed 11',
      status: 'Occupied',
      patientName: 'Ifeoma Balogun',
      mrn: 'MRN-2026-00966',
      doctorName: 'Dr. Samuel A.',
      acuity: 'Medium',
      admittedAt: atOffset(-1, 8, 0),
    },
    { id: 'ped-12', bedNumber: 'Bed 12', status: 'Available' },
    { id: 'ped-13', bedNumber: 'Bed 13', status: 'Available' },
    { id: 'ped-14', bedNumber: 'Bed 14', status: 'Reserved' },
    { id: 'ped-15', bedNumber: 'Bed 15', status: 'Available' },
  ],
};

export type WardAlert = {
  id: string;
  wardId: string;
  title: string;
  body: string;
  time: string; // ISO
};

export const WARD_ALERTS: WardAlert[] = [
  {
    id: 'wa-1',
    wardId: 'ward-icu',
    title: 'ICU nearing capacity',
    body: 'ICU is at 70% occupancy with 2 critical patients admitted in the last 24 hours.',
    time: atOffset(0, 6, 30),
  },
  {
    id: 'wa-2',
    wardId: 'ward-female',
    title: 'Beds pending cleaning',
    body: 'Female Ward has beds awaiting housekeeping turnaround before the next admission.',
    time: atOffset(0, 7, 0),
  },
];
