/**
 * Mock fixtures for the Daily Attendance screen.
 * Swap out by pointing hooks to a real attendance/queue endpoint in
 * Phase 6.
 */

import { Clock, ClipboardCheck, Siren, Timer, UserX, Users, type LucideIcon } from 'lucide-react';
import { HOSPITAL_DEPARTMENT_OPTIONS } from '@/constants/departments';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type TrendDirection = 'up' | 'down';

export type AttendanceStat = {
  id: string;
  label: string;
  value: string;
  deltaLabel: string;
  direction: TrendDirection;
  goodDirection: TrendDirection; // which direction counts as an improvement, for color
  icon: LucideIcon;
  color: string;
  iconBg: string;
};

export const ATTENDANCE_STATS: AttendanceStat[] = [
  {
    id: 'checked-in',
    label: 'Patients Checked-In',
    value: '162',
    deltaLabel: '18.4% vs yesterday',
    direction: 'up',
    goodDirection: 'up',
    icon: Users,
    color: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'completed',
    label: 'Completed Visits',
    value: '118',
    deltaLabel: '15.7% vs yesterday',
    direction: 'up',
    goodDirection: 'up',
    icon: ClipboardCheck,
    color: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 'waiting',
    label: 'Waiting',
    value: '27',
    deltaLabel: '8.2% vs yesterday',
    direction: 'down',
    goodDirection: 'down',
    icon: Clock,
    color: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'no-shows',
    label: 'No Shows',
    value: '8',
    deltaLabel: '5.9% vs yesterday',
    direction: 'down',
    goodDirection: 'down',
    icon: UserX,
    color: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
  },
  {
    id: 'emergencies',
    label: 'Emergencies',
    value: '11',
    deltaLabel: '37.5% vs yesterday',
    direction: 'up',
    goodDirection: 'down',
    icon: Siren,
    color: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
  },
  {
    id: 'avg-wait',
    label: 'Average Waiting Time',
    value: '28 min',
    deltaLabel: '6 min vs yesterday',
    direction: 'down',
    goodDirection: 'down',
    icon: Timer,
    color: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
  },
];

export const ATTENDANCE_DEPARTMENT_OPTIONS = HOSPITAL_DEPARTMENT_OPTIONS;

export const ATTENDANCE_DOCTOR_OPTIONS = [
  'Dr. Jane Ezeonu (GP)',
  'Dr. Mary Uche',
  'Dr. Onyedika Umeh',
  'Dr. Ifeanyi Okafor',
  'Dr. Samuel A.',
  'Dr. Chidinma Nwosu',
].map((d) => ({ value: d, label: d }));

export const CLINIC_OPTIONS = [
  'Awka Campus Clinic',
  'Ifite Campus Clinic',
  'Teaching Hospital Annex',
].map((c) => ({ value: c, label: c }));

export type VisitStatus = 'Completed' | 'Waiting' | 'In Progress' | 'Emergency';

export const VISIT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: 'Completed', label: 'Completed' },
  { value: 'Waiting', label: 'Waiting' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Emergency', label: 'Emergency' },
];

// ─── Charts ───────────────────────────────────────────────────────────────

export type LabeledPoint = { label: string; value: number };

export const HOURLY_ATTENDANCE: LabeledPoint[] = [
  { label: '6AM', value: 5 },
  { label: '8AM', value: 12 },
  { label: '10AM', value: 28 },
  { label: '12PM', value: 42 },
  { label: '2PM', value: 48 },
  { label: '4PM', value: 35 },
  { label: '6PM', value: 20 },
  { label: '8PM', value: 7 },
];

export type DistributionSlice = { label: string; value: number; percent: number; color: string };

export const DEPARTMENT_ATTENDANCE: DistributionSlice[] = [
  { label: 'General Outpatient', value: 56, percent: 34.6, color: '#3B82F6' },
  { label: 'Laboratory', value: 32, percent: 19.8, color: '#22C55E' },
  { label: 'Radiology', value: 28, percent: 17.3, color: '#8B5CF6' },
  { label: 'Surgery', value: 19, percent: 11.7, color: '#F59E0B' },
  { label: 'Dental Clinic', value: 15, percent: 9.3, color: '#00B4D8' },
  { label: 'Emergency', value: 12, percent: 7.4, color: '#EF4444' },
];

export const AVG_WAIT_BY_DEPARTMENT: LabeledPoint[] = [
  { label: 'Emergency', value: 15 },
  { label: 'General Outpatient', value: 28 },
  { label: 'Laboratory', value: 22 },
  { label: 'Radiology', value: 35 },
  { label: 'Surgery', value: 45 },
  { label: 'Dental Clinic', value: 25 },
];

// ─── Attendance queue table ─────────────────────────────────────────────────

export type AttendanceEntry = {
  id: string; // Q-0001
  patientName: string;
  mrn: string;
  gender: 'Male' | 'Female';
  age: number;
  department: string;
  doctor: string;
  checkInTime: string; // ISO
  checkOutTime: string | null; // ISO or null
  status: VisitStatus;
};

const CURATED_ATTENDANCE: AttendanceEntry[] = [
  {
    id: 'Q-0001',
    patientName: 'Chidinma Okafor',
    mrn: 'MRN-2025-00124',
    gender: 'Female',
    age: 21,
    department: 'General Outpatient Clinic',
    doctor: 'Dr. Jane Ezeonu (GP)',
    checkInTime: atOffset(0, 8, 15),
    checkOutTime: atOffset(0, 9, 2),
    status: 'Completed',
  },
  {
    id: 'Q-0002',
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    gender: 'Male',
    age: 24,
    department: 'Dental Clinic',
    doctor: 'Dr. Mary Uche',
    checkInTime: atOffset(0, 8, 22),
    checkOutTime: null,
    status: 'Waiting',
  },
  {
    id: 'Q-0003',
    patientName: 'Maryam Usman',
    mrn: 'MRN-2024-00765',
    gender: 'Female',
    age: 22,
    department: 'Radiology',
    doctor: 'Dr. Onyedika Umeh',
    checkInTime: atOffset(0, 8, 40),
    checkOutTime: null,
    status: 'In Progress',
  },
  {
    id: 'Q-0004',
    patientName: 'Emeka Obi',
    mrn: 'MRN-2023-00543',
    gender: 'Male',
    age: 20,
    department: 'Laboratory',
    doctor: 'Dr. Ifeanyi Okafor',
    checkInTime: atOffset(0, 8, 45),
    checkOutTime: atOffset(0, 9, 25),
    status: 'Completed',
  },
  {
    id: 'Q-0005',
    patientName: 'Grace Adebayo',
    mrn: 'MRN-2023-00421',
    gender: 'Female',
    age: 19,
    department: 'Surgery',
    doctor: 'Dr. Samuel A.',
    checkInTime: atOffset(0, 9, 5),
    checkOutTime: null,
    status: 'Waiting',
  },
  {
    id: 'Q-0006',
    patientName: 'Seyi Adewale',
    mrn: 'MRN-2023-00311',
    gender: 'Male',
    age: 23,
    department: 'General Outpatient Clinic',
    doctor: 'Dr. Jane Ezeonu (GP)',
    checkInTime: atOffset(0, 9, 10),
    checkOutTime: atOffset(0, 9, 48),
    status: 'Completed',
  },
  {
    id: 'Q-0007',
    patientName: 'Favour Bassey',
    mrn: 'MRN-2024-01002',
    gender: 'Female',
    age: 21,
    department: 'Cardiology',
    doctor: 'Dr. Chidinma Nwosu',
    checkInTime: atOffset(0, 9, 20),
    checkOutTime: null,
    status: 'In Progress',
  },
  {
    id: 'Q-0008',
    patientName: 'Daniel Eze',
    mrn: 'MRN-2023-00187',
    gender: 'Male',
    age: 25,
    department: 'Emergency Department',
    doctor: 'Dr. Samuel A.',
    checkInTime: atOffset(0, 9, 35),
    checkOutTime: null,
    status: 'Emergency',
  },
];

const GEN_FIRST_NAMES = [
  'Ngozi',
  'Tunde',
  'Aisha',
  'Peter',
  'Victoria',
  'Chukwuemeka',
  'Musa',
  'Blessing',
  'Kelechi',
  'Halima',
  'Chinedu',
  'Grace',
  'Ikenna',
  'Ronke',
  'Segun',
  'Patience',
];
const GEN_LAST_NAMES = [
  'Nwachukwu',
  'Balogun',
  'Suleiman',
  'Achike',
  'Bassey',
  'Etim',
  'Idika',
  'Aliyu',
  'Okoro',
  'Ibe',
  'Effiong',
  'Nwankwo',
  'Umeh',
  'Adewale',
  'Bello',
  'Okoye',
];
const GEN_DEPARTMENTS = ATTENDANCE_DEPARTMENT_OPTIONS.map((d) => d.value);
const GEN_DOCTORS = ATTENDANCE_DOCTOR_OPTIONS.map((d) => d.value);

function statusForIndex(i: number): VisitStatus {
  if (i % 13 === 0) return 'Emergency';
  if (i % 5 === 0) return 'In Progress';
  if (i % 4 === 0) return 'Waiting';
  return 'Completed';
}

const GENERATED_ATTENDANCE: AttendanceEntry[] = Array.from({ length: 40 }, (_, idx) => {
  const i = idx + 9; // Q-0009 onward
  const status = statusForIndex(i);
  const checkInHour = 7 + (i % 10);
  const checkInMinute = (i * 17) % 60;
  const checkOut =
    status === 'Completed' ? atOffset(0, checkInHour + 1, (checkInMinute + 20) % 60) : null;
  return {
    id: `Q-${String(i).padStart(4, '0')}`,
    patientName: `${GEN_FIRST_NAMES[i % GEN_FIRST_NAMES.length]} ${GEN_LAST_NAMES[(i * 3) % GEN_LAST_NAMES.length]}`,
    mrn: `MRN-${2020 + (i % 7)}-${String(100 + i * 3).padStart(5, '0')}`,
    gender: i % 2 === 0 ? 'Female' : ('Male' as const),
    age: 18 + (i % 45),
    department: GEN_DEPARTMENTS[i % GEN_DEPARTMENTS.length] as string,
    doctor: GEN_DOCTORS[i % GEN_DOCTORS.length] as string,
    checkInTime: atOffset(0, checkInHour, checkInMinute),
    checkOutTime: checkOut,
    status,
  };
});

export const ATTENDANCE_ENTRIES: AttendanceEntry[] = [
  ...CURATED_ATTENDANCE,
  ...GENERATED_ATTENDANCE,
];

// Aggregate KPI shown on the stat card and donut center -- independent of
// ATTENDANCE_ENTRIES.length, which only holds a working sample for the
// table below (same convention as DIRECTORY_STATS vs. DIRECTORY_PATIENTS).
export const TOTAL_CHECKED_IN_DISPLAY = '162';
