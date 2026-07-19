/**
 * Mock fixtures for the Registration Reports screen.
 * Swap out by pointing hooks to a real reporting endpoint in Phase 6.
 */

import {
  AlertTriangle,
  Calendar,
  Footprints,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { HOSPITAL_DEPARTMENT_OPTIONS } from '@/constants/departments';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type TrendDirection = 'up' | 'down';

export type ReportStat = {
  id: string;
  label: string;
  value: string;
  deltaPercent: number;
  direction: TrendDirection;
  icon: LucideIcon;
  color: string;
  iconBg: string;
  sparkline: number[];
};

export const REPORT_STATS: ReportStat[] = [
  {
    id: 'total',
    label: 'Total Registrations',
    value: '2,458',
    deltaPercent: 18.6,
    direction: 'up',
    icon: Users,
    color: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
    sparkline: [40, 44, 42, 50, 48, 55, 60, 58, 65, 70, 66, 74],
  },
  {
    id: 'new-patients',
    label: 'New Patients',
    value: '1,326',
    deltaPercent: 20.3,
    direction: 'up',
    icon: UserPlus,
    color: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
    sparkline: [20, 24, 22, 28, 30, 29, 34, 36, 33, 40, 42, 45],
  },
  {
    id: 'returning-patients',
    label: 'Returning Patients',
    value: '1,132',
    deltaPercent: 16.2,
    direction: 'up',
    icon: Users,
    color: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    sparkline: [30, 28, 32, 31, 35, 34, 38, 37, 40, 39, 43, 45],
  },
  {
    id: 'walk-ins',
    label: 'Walk-ins',
    value: '654',
    deltaPercent: 12.7,
    direction: 'up',
    icon: Footprints,
    color: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
    sparkline: [15, 18, 16, 20, 19, 22, 21, 24, 23, 26, 25, 28],
  },
  {
    id: 'emergency',
    label: 'Emergency Registrations',
    value: '146',
    deltaPercent: 8.4,
    direction: 'down',
    icon: AlertTriangle,
    color: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
    sparkline: [12, 14, 13, 11, 10, 9, 11, 10, 8, 9, 7, 8],
  },
  {
    id: 'appointments',
    label: 'Appointments',
    value: '1,804',
    deltaPercent: 21.5,
    direction: 'up',
    icon: Calendar,
    color: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    sparkline: [50, 55, 53, 60, 62, 65, 63, 70, 72, 75, 78, 82],
  },
];

export const REPORT_DEPARTMENT_OPTIONS = HOSPITAL_DEPARTMENT_OPTIONS;

export type RegistrationType = 'Appointment' | 'Walk-in' | 'Emergency';

export const REGISTRATION_TYPE_OPTIONS: { value: RegistrationType; label: string }[] = [
  { value: 'Appointment', label: 'Appointment' },
  { value: 'Walk-in', label: 'Walk-in' },
  { value: 'Emergency', label: 'Emergency' },
];

export const STUDENT_CATEGORY_OPTIONS = [
  'Undergraduate',
  'Postgraduate',
  'Staff',
  'Staff Dependent',
].map((c) => ({ value: c, label: c }));

export const FACULTY_OPTIONS = [
  'Medicine',
  'Engineering',
  'Management Sci.',
  'Law',
  'Basic Medical Sci.',
  'Education',
  'Other',
].map((f) => ({ value: f, label: f }));

export const GENDER_OPTIONS = ['Male', 'Female', 'Other'].map((g) => ({ value: g, label: g }));

export const AGE_GROUP_OPTIONS = ['Under 18', '18-25', '26-35', '36-45', '46-60', 'Over 60'].map(
  (a) => ({ value: a, label: a }),
);

export type RegistrationStatus = 'Completed' | 'Pending' | 'Cancelled';

export const REGISTRATION_STATUS_OPTIONS: { value: RegistrationStatus; label: string }[] = [
  { value: 'Completed', label: 'Completed' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Cancelled', label: 'Cancelled' },
];

// ─── Charts ───────────────────────────────────────────────────────────────

export type TrendPoint = { label: string; value: number };

export const REGISTRATIONS_BY_DAY: TrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const wave = Math.sin(day / 2.3) * 35 + Math.cos(day / 1.7) * 20;
  return { label: `Jun ${day}`, value: Math.max(15, Math.round(80 + wave)) };
});

export const REGISTRATIONS_BY_MONTH: TrendPoint[] = [
  { label: 'Jan', value: 1650 },
  { label: 'Feb', value: 1820 },
  { label: 'Mar', value: 1540 },
  { label: 'Apr', value: 2350 },
  { label: 'May', value: 2100 },
  { label: 'Jun', value: 1780 },
];

export const PEAK_REGISTRATION_HOURS: TrendPoint[] = [
  { label: '6AM', value: 40 },
  { label: '7AM', value: 90 },
  { label: '8AM', value: 210 },
  { label: '9AM', value: 340 },
  { label: '10AM', value: 400 },
  { label: '11AM', value: 380 },
  { label: '12PM', value: 300 },
  { label: '1PM', value: 250 },
  { label: '2PM', value: 320 },
  { label: '3PM', value: 460 },
  { label: '4PM', value: 410 },
  { label: '5PM', value: 300 },
  { label: '6PM', value: 180 },
  { label: '7PM', value: 110 },
  { label: '8PM', value: 60 },
  { label: '9PM', value: 25 },
];

export type DistributionSlice = { label: string; value: number; percent: number; color: string };

export const FACULTY_DISTRIBUTION: DistributionSlice[] = [
  { label: 'Medicine', value: Math.round(2458 * 0.28), percent: 28, color: '#00B4D8' },
  { label: 'Engineering', value: Math.round(2458 * 0.2), percent: 20, color: '#3B82F6' },
  { label: 'Management Sci.', value: Math.round(2458 * 0.16), percent: 16, color: '#8B5CF6' },
  { label: 'Law', value: Math.round(2458 * 0.1), percent: 10, color: '#F59E0B' },
  { label: 'Basic Medical Sci.', value: Math.round(2458 * 0.08), percent: 8, color: '#22C55E' },
  { label: 'Education', value: Math.round(2458 * 0.07), percent: 7, color: '#EC4899' },
  { label: 'Other', value: Math.round(2458 * 0.11), percent: 11, color: '#8A98A3' },
];

export const GENDER_DISTRIBUTION: DistributionSlice[] = [
  { label: 'Male', value: Math.round(2458 * 0.55), percent: 55, color: '#8B5CF6' },
  { label: 'Female', value: Math.round(2458 * 0.44), percent: 44, color: '#00B4D8' },
  { label: 'Other', value: Math.round(2458 * 0.01), percent: 1, color: '#F59E0B' },
];

// ─── Registrations Details table ───────────────────────────────────────────

export type RegistrationRecord = {
  id: string;
  patientName: string;
  mrn: string;
  date: string; // ISO
  registrationType: RegistrationType;
  department: string;
  officer: string;
  gender: 'Male' | 'Female';
  age: number;
  status: RegistrationStatus;
};

const CURATED_REGISTRATIONS: RegistrationRecord[] = [
  {
    id: 'REG-2026-02458',
    patientName: 'Chidinma Okafor',
    mrn: 'MRN-2025-00124',
    date: atOffset(0, 9, 45),
    registrationType: 'Appointment',
    department: 'General Outpatient Clinic',
    officer: 'Adaobi Nwankwo',
    gender: 'Female',
    age: 21,
    status: 'Completed',
  },
  {
    id: 'REG-2026-02457',
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    date: atOffset(0, 9, 20),
    registrationType: 'Walk-in',
    department: 'Dental Clinic',
    officer: 'Mary Uche',
    gender: 'Male',
    age: 24,
    status: 'Completed',
  },
  {
    id: 'REG-2026-02456',
    patientName: 'Maryam Usman',
    mrn: 'MRN-2024-00765',
    date: atOffset(0, 8, 55),
    registrationType: 'Appointment',
    department: 'Radiology',
    officer: 'Adaobi Nwankwo',
    gender: 'Female',
    age: 22,
    status: 'Completed',
  },
  {
    id: 'REG-2026-02455',
    patientName: 'Emeka Obi',
    mrn: 'MRN-2023-00543',
    date: atOffset(0, 8, 40),
    registrationType: 'Walk-in',
    department: 'Laboratory',
    officer: 'Jane Ezeonu',
    gender: 'Male',
    age: 20,
    status: 'Completed',
  },
  {
    id: 'REG-2026-02454',
    patientName: 'Grace Adebayo',
    mrn: 'MRN-2023-00421',
    date: atOffset(0, 8, 10),
    registrationType: 'Emergency',
    department: 'Emergency Department',
    officer: 'Samuel A.',
    gender: 'Female',
    age: 19,
    status: 'Completed',
  },
  {
    id: 'REG-2026-02453',
    patientName: 'Seyi Adewale',
    mrn: 'MRN-2023-00311',
    date: atOffset(0, 7, 52),
    registrationType: 'Walk-in',
    department: 'General Outpatient Clinic',
    officer: 'Mary Uche',
    gender: 'Male',
    age: 23,
    status: 'Completed',
  },
  {
    id: 'REG-2026-02452',
    patientName: 'Favour Bassey',
    mrn: 'MRN-2024-01002',
    date: atOffset(0, 7, 35),
    registrationType: 'Appointment',
    department: 'Cardiology',
    officer: 'Adaobi Nwankwo',
    gender: 'Female',
    age: 21,
    status: 'Completed',
  },
  {
    id: 'REG-2026-02451',
    patientName: 'Daniel Eze',
    mrn: 'MRN-2023-00187',
    date: atOffset(0, 7, 18),
    registrationType: 'Walk-in',
    department: 'Physiotherapy',
    officer: 'Jane Ezeonu',
    gender: 'Male',
    age: 25,
    status: 'Completed',
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
const GEN_OFFICERS = ['Adaobi Nwankwo', 'Mary Uche', 'Jane Ezeonu', 'Samuel A.'];
const GEN_DEPARTMENTS = REPORT_DEPARTMENT_OPTIONS.map((d) => d.value);
const GEN_TYPES: RegistrationType[] = ['Appointment', 'Walk-in', 'Emergency'];

function statusForIndex(i: number): RegistrationStatus {
  if (i % 11 === 0) return 'Cancelled';
  if (i % 6 === 0) return 'Pending';
  return 'Completed';
}

const GENERATED_REGISTRATIONS: RegistrationRecord[] = Array.from({ length: 48 }, (_, idx) => {
  const i = idx + 1;
  const dayOffset = -(1 + (48 - i) / 2);
  return {
    id: `REG-2026-${String(2450 - i).padStart(5, '0')}`,
    patientName: `${GEN_FIRST_NAMES[i % GEN_FIRST_NAMES.length]} ${GEN_LAST_NAMES[(i * 3) % GEN_LAST_NAMES.length]}`,
    mrn: `MRN-${2020 + (i % 7)}-${String(100 + i * 3).padStart(5, '0')}`,
    date: atOffset(Math.floor(dayOffset), 7 + (i % 10), (i * 13) % 60),
    registrationType: GEN_TYPES[i % GEN_TYPES.length] as RegistrationType,
    department: GEN_DEPARTMENTS[i % GEN_DEPARTMENTS.length] as string,
    officer: GEN_OFFICERS[i % GEN_OFFICERS.length] as string,
    gender: i % 2 === 0 ? 'Female' : 'Male',
    age: 18 + (i % 45),
    status: statusForIndex(i),
  };
});

export const REGISTRATION_RECORDS: RegistrationRecord[] = [
  ...CURATED_REGISTRATIONS,
  ...GENERATED_REGISTRATIONS,
];

// Aggregate KPI shown in the stat card and mirrored in the Faculty/Gender
// donut centers — intentionally independent of REGISTRATION_RECORDS.length,
// which only holds a working sample for the table below (same convention
// as DIRECTORY_STATS vs. DIRECTORY_PATIENTS in the Patient Directory).
export const TOTAL_REGISTRATIONS_DISPLAY = '2,458';
