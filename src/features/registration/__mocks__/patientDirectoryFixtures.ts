/**
 * Mock fixtures for the Patient Directory screen.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import {
  CalendarCheck,
  ShieldCheck,
  Siren,
  UserPlus,
  Users,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

import type { SelectOption } from '@/features/registration/__mocks__/registerPatientOptions';

export type DirectoryPatientStatus = 'Active' | 'Checked-In' | 'Waiting' | 'Inactive' | 'Emergency';

export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Separated';

export type DirectoryPatient = {
  id: string;
  initials: string;
  avatarBg: string;
  photoUrl?: string;
  name: string;
  phone: string;
  email: string;
  mrn: string;
  patientId: string;
  studentId: string;
  age: number;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  faculty: string;
  maritalStatus: MaritalStatus;
  nationality: string;
  lastVisit: string;
  status: DirectoryPatientStatus;
  category: string;
  insuranceProvider: string;
  bloodGroup: string;
  address: string;
  dateRegistered: string;
};

export type DirectoryStat = {
  id: string;
  label: string;
  value: number;
  trendPercent: number;
  trendLabel?: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  sparkline: number[];
};

export const DIRECTORY_STATS: DirectoryStat[] = [
  {
    id: 'total',
    label: 'Total Registered Patients',
    value: 12458,
    trendPercent: 8.4,
    trendLabel: 'vs last month',
    icon: Users,
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
    sparkline: [40, 44, 42, 50, 55, 60, 68],
  },
  {
    id: 'new-today',
    label: 'New Registrations Today',
    value: 68,
    trendPercent: 12,
    icon: UserPlus,
    accent: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
    sparkline: [12, 14, 15, 18, 20, 21, 24],
  },
  {
    id: 'returning-today',
    label: 'Returning Patients Today',
    value: 44,
    trendPercent: 5,
    icon: UserCheck,
    accent: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    sparkline: [30, 33, 35, 34, 38, 40, 44],
  },
  {
    id: 'active',
    label: 'Active Patients',
    value: 11982,
    trendPercent: 96,
    trendLabel: 'of total',
    icon: ShieldCheck,
    accent: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    sparkline: [80, 82, 85, 88, 90, 94, 96],
  },
  {
    id: 'appointments-today',
    label: 'Appointments Today',
    value: 52,
    trendPercent: 10,
    icon: CalendarCheck,
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
    sparkline: [38, 41, 45, 43, 47, 49, 52],
  },
  {
    id: 'emergency',
    label: 'Emergency Registrations',
    value: 5,
    trendPercent: 25,
    icon: Siren,
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
    sparkline: [2, 3, 2, 4, 3, 4, 5],
  },
];

export const FACULTY_OPTIONS: SelectOption[] = [
  { value: 'medicine', label: 'Medicine' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'law', label: 'Law' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'business', label: 'Business' },
  { value: 'education', label: 'Education' },
  { value: 'natural-sciences', label: 'Natural Sciences' },
  { value: 'social-sciences', label: 'Social Sciences' },
  { value: 'staff', label: 'Staff (Non-Academic)' },
];

export const DIRECTORY_GENDER_OPTIONS: SelectOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const APPOINTMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'checked-in', label: 'Checked-in' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'none', label: 'No Appointment' },
];

export const DIRECTORY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Checked-In', label: 'Checked-In' },
  { value: 'Waiting', label: 'Waiting' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Emergency', label: 'Emergency' },
];

export const REGISTRATION_DATE_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'this-year', label: 'This Year' },
];

// 42 first names × 47 last names (coprime counts — LCM is 1,974, far past
// our 250-row target) so the combinatorial pairing below never repeats the
// same full name twice, without having to hand-write 250 rows.
const FIRST_NAMES = [
  'Adaeze',
  'Uchenna',
  'Fatima',
  'David',
  'Amaka',
  'Ibrahim',
  'Babatunde',
  'Esther',
  'Michael',
  'Sandra',
  'Chidinma',
  'Emeka',
  'Ngozi',
  'Tunde',
  'Chiamaka',
  'Yusuf',
  'Blessing',
  'Kelechi',
  'Halima',
  'Chinedu',
  'Oluwaseun',
  'Grace',
  'Ikenna',
  'Aisha',
  'Peter',
  'Victoria',
  'Chukwuemeka',
  'Ronke',
  'Musa',
  'Ijeoma',
  'Segun',
  'Patience',
  'Chukwudi',
  'Rita',
  'Ahmed',
  'Nkechi',
  'Femi',
  'Comfort',
  'Obinna',
  'Zainab',
  'Folasade',
  'Emmanuel',
];

const LAST_NAMES = [
  'Okonkwo',
  'Collins',
  'Kabir',
  'Osei',
  'Nwosu',
  'Kalu',
  'Cole',
  'Chinedu',
  'Ofori',
  'Okafor',
  'Eze',
  'Obiora',
  'Adeyemi',
  'Bakare',
  'Nnamdi',
  'Aliyu',
  'Effiong',
  'Nnaji',
  'Suleiman',
  'Anyanwu',
  'Adeleke',
  'Umeh',
  'Onwuka',
  'Bello',
  'Nwachukwu',
  'Obi',
  'Adebayo',
  'Danladi',
  'Okoro',
  'Alabi',
  'Udo',
  'Eneh',
  'Nwankwo',
  'Musa',
  'Igwe',
  'Ogunleye',
  'James',
  'Chukwu',
  'Yusuf',
  'Balogun',
  'Ibekwe',
  'Ekwueme',
  'Oyelaran',
  'Nnoli',
  'Ahmadu',
  'Ogundipe',
  'Uzoma',
];

const PATIENT_COUNT = 250;
const NAMES: [string, string][] = Array.from({ length: PATIENT_COUNT }, (_, i) => [
  FIRST_NAMES[i % FIRST_NAMES.length] as string,
  LAST_NAMES[i % LAST_NAMES.length] as string,
]);

const AVATAR_COLORS = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#00B4D8', '#EF4444'];
const FACULTIES = [
  'Medicine',
  'Engineering',
  'Law',
  'Pharmacy',
  'Nursing',
  'Business',
  'Education',
  'Natural Sciences',
];
const STATUSES: DirectoryPatientStatus[] = [
  'Active',
  'Active',
  'Active',
  'Checked-In',
  'Waiting',
  'Inactive',
  'Emergency',
];
const LAST_VISITS = [
  'Today',
  'Yesterday',
  '2 days ago',
  '3 days ago',
  '4 days ago',
  '1 week ago',
  '—',
];
const CATEGORIES = ['Student', 'Staff', 'Staff Dependent', 'Regular / Private', 'NHIS / Insurance'];
const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'AB+'];
const INSURANCE_PROVIDERS = ['NHIS', 'Hygeia HMO', 'UNIZIK Staff Health Scheme', 'None'];
const MARITAL_STATUSES: MaritalStatus[] = [
  'Single',
  'Single',
  'Single',
  'Married',
  'Married',
  'Divorced',
  'Widowed',
];
const NATIONALITIES = [
  'Nigerian',
  'Nigerian',
  'Nigerian',
  'Nigerian',
  'Nigerian',
  'Ghanaian',
  'Cameroonian',
];

function getInitialsFor(first: string, last: string): string {
  return `${first[0]}${last[0]}`.toUpperCase();
}

export const DIRECTORY_PATIENTS: DirectoryPatient[] = NAMES.map(([first, last], i) => {
  const age = 18 + (i % 40);
  const gender: 'Male' | 'Female' = i % 2 === 0 ? 'Female' : 'Male';
  const dobYear = 2026 - age;
  return {
    id: `dp-${String(i + 1).padStart(3, '0')}`,
    initials: getInitialsFor(first, last),
    avatarBg: AVATAR_COLORS[i % AVATAR_COLORS.length] as string,
    name: `${first} ${last}`,
    phone: `080${3 + (i % 6)} ${String(100 + i * 7).padStart(3, '0')} ${String(1000 + i * 13).padStart(4, '0')}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@email.com`,
    mrn: `MRN-2026-${String(500 - i).padStart(5, '0')}`,
    patientId: `PT-${String(500 - i).padStart(6, '0')}`,
    studentId: `2024${String(1000 + i * 17).padStart(5, '0')}`,
    age,
    gender,
    dateOfBirth: `${dobYear}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`,
    faculty: FACULTIES[i % FACULTIES.length] as string,
    maritalStatus: MARITAL_STATUSES[i % MARITAL_STATUSES.length] as MaritalStatus,
    nationality: NATIONALITIES[i % NATIONALITIES.length] as string,
    lastVisit: LAST_VISITS[i % LAST_VISITS.length] as string,
    status: STATUSES[i % STATUSES.length] as DirectoryPatientStatus,
    category: CATEGORIES[i % CATEGORIES.length] as string,
    insuranceProvider: INSURANCE_PROVIDERS[i % INSURANCE_PROVIDERS.length] as string,
    bloodGroup: BLOOD_GROUPS[i % BLOOD_GROUPS.length] as string,
    address: `No. ${12 + i} Nnamdi Azikiwe Street, Awka, Anambra State.`,
    dateRegistered: `2026-${String(1 + (i % 7)).padStart(2, '0')}-${String(3 + (i % 25)).padStart(2, '0')}`,
  };
});
