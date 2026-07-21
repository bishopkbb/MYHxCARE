/**
 * Mock fixtures for the Referral Management screen.
 * Swap out by pointing hooks to a real referrals endpoint in Phase 6.
 */

import { ArrowRightLeft, CheckCircle2, Clock, FileText, Send, type LucideIcon } from 'lucide-react';
import { HOSPITAL_DEPARTMENTS, HOSPITAL_DEPARTMENT_OPTIONS } from '@/constants/departments';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type ReferralDirection = 'Incoming' | 'Outgoing';
export type ReferralStatus = 'Pending' | 'Accepted' | 'Completed' | 'Cancelled';
export type ReferralPriority = 'Normal' | 'Urgent';

export const OUR_DEPARTMENT = 'General Outpatient Clinic';

export const DEPARTMENT_OPTIONS = HOSPITAL_DEPARTMENT_OPTIONS;

const DIRECTORY_CONTACTS = [
  'Dr. Jane Ezeonu',
  'Dr. Samuel A.',
  'Dr. Onyedika Umeh',
  'Dr. Ifeanyi Okafor',
  'Dr. Chidinma Nwosu',
  'Dr. Mary Uche',
  'Dr. Emeka Obinna',
];

export const DEPARTMENT_DIRECTORY: { department: string; contact: string; phone: string }[] =
  HOSPITAL_DEPARTMENTS.map((department, i) => ({
    department,
    contact: DIRECTORY_CONTACTS[i % DIRECTORY_CONTACTS.length] as string,
    phone: `0803 100 ${String(2001 + i).padStart(4, '0')}`,
  }));

export const REFERRED_BY_OPTIONS = [
  'Dr. Jane Ezeonu (GP)',
  'Dr. Samuel A.',
  'Dr. Onyedika Umeh',
  'Dr. Ifeanyi Okafor',
  'Dr. Mary Uche',
  'Dr. Chidinma Nwosu',
  'Dr. Emeka Obinna',
].map((d) => ({ value: d, label: d }));

export const DIRECTION_OPTIONS: { value: ReferralDirection; label: string }[] = [
  { value: 'Incoming', label: 'Incoming' },
  { value: 'Outgoing', label: 'Outgoing' },
];

export const PRIORITY_OPTIONS: { value: ReferralPriority; label: string }[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Urgent', label: 'Urgent' },
];

export const STATUS_OPTIONS: { value: ReferralStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const REFERRAL_TEMPLATES: { id: string; name: string; description: string }[] = [
  {
    id: 'tpl-1',
    name: 'Specialist Consultation Referral',
    description: 'Standard letter for referring a patient to a specialist department.',
  },
  {
    id: 'tpl-2',
    name: 'Diagnostic Test Referral',
    description: 'For referrals requesting imaging, laboratory, or other diagnostic workups.',
  },
  {
    id: 'tpl-3',
    name: 'Emergency Transfer Referral',
    description: 'Urgent referral letter for emergency transfers between departments.',
  },
  {
    id: 'tpl-4',
    name: 'Follow-up Care Referral',
    description: 'For referring a patient back for scheduled follow-up care.',
  },
];

export type Referral = {
  id: string;
  patientName: string;
  mrn: string;
  direction: ReferralDirection;
  fromDepartment: string;
  toDepartment: string;
  referredBy: string;
  date: string; // ISO
  status: ReferralStatus;
  priority: ReferralPriority;
  reason: string;
  /** Foreign key into `shared/__mocks__/doctorDirectory`'s `DOCTORS` — only set
   * on Incoming referrals (who at OUR_DEPARTMENT should act on it). Both
   * doctors currently rostered to OUR_DEPARTMENT ('doc-jane' and 'usr_001',
   * the default demo login) get a share of these so the doctor's /referrals
   * "Incoming Referrals" tab has real per-doctor data to filter. */
  receivingDoctorId?: string | undefined;
};

// ─── Curated rows — match the reference design exactly ─────────────────────
const CURATED_REFERRALS: Referral[] = [
  {
    id: 'REF-2026-0128',
    patientName: 'Chidinma Okafor',
    mrn: 'MRN-2025-00124',
    direction: 'Outgoing',
    fromDepartment: OUR_DEPARTMENT,
    toDepartment: 'Physiotherapy',
    referredBy: 'Dr. Jane Ezeonu (GP)',
    date: atOffset(0, 10, 20),
    status: 'Pending',
    priority: 'Normal',
    reason: 'Post-surgical mobility assessment and physiotherapy plan.',
  },
  {
    id: 'REF-2026-0127',
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    direction: 'Incoming',
    fromDepartment: 'Dental Clinic',
    toDepartment: OUR_DEPARTMENT,
    referredBy: 'Dr. Samuel A.',
    date: atOffset(0, 9, 45),
    status: 'Accepted',
    priority: 'Normal',
    reason: 'Suspected systemic infection requiring general evaluation.',
    receivingDoctorId: 'doc-jane',
  },
  {
    id: 'REF-2026-0126',
    patientName: 'Maryam Usman',
    mrn: 'MRN-2026-00765',
    direction: 'Outgoing',
    fromDepartment: OUR_DEPARTMENT,
    toDepartment: 'Radiology',
    referredBy: 'Dr. Onyedika Umeh',
    date: atOffset(-1, 14, 15),
    status: 'Completed',
    priority: 'Normal',
    reason: 'Chest X-ray to investigate persistent cough.',
  },
  {
    id: 'REF-2026-0125',
    patientName: 'Emeka Obi',
    mrn: 'MRN-2023-00543',
    direction: 'Incoming',
    fromDepartment: 'Emergency Department',
    toDepartment: OUR_DEPARTMENT,
    referredBy: 'Dr. Jane Ezeonu (GP)',
    date: atOffset(-1, 11, 30),
    status: 'Pending',
    priority: 'Urgent',
    reason: 'Stabilized emergency case for outpatient follow-up.',
    receivingDoctorId: 'usr_001',
  },
  {
    id: 'REF-2026-0124',
    patientName: 'Grace Adebayo',
    mrn: 'MRN-2023-00421',
    direction: 'Outgoing',
    fromDepartment: OUR_DEPARTMENT,
    toDepartment: 'Laboratory',
    referredBy: 'Dr. Ifeanyi Okafor',
    date: atOffset(-2, 16, 50),
    status: 'Completed',
    priority: 'Normal',
    reason: 'Full blood count and liver function panel.',
  },
  {
    id: 'REF-2026-0123',
    patientName: 'Seyi Adewale',
    mrn: 'MRN-2023-00311',
    direction: 'Incoming',
    fromDepartment: 'Surgery',
    toDepartment: OUR_DEPARTMENT,
    referredBy: 'Dr. Samuel A.',
    date: atOffset(-2, 15, 20),
    status: 'Accepted',
    priority: 'Normal',
    reason: 'Post-operative wound care and general monitoring.',
    receivingDoctorId: 'doc-jane',
  },
  {
    id: 'REF-2026-0122',
    patientName: 'Favour Bassey',
    mrn: 'MRN-2024-01002',
    direction: 'Outgoing',
    fromDepartment: OUR_DEPARTMENT,
    toDepartment: 'Cardiology',
    referredBy: 'Dr. Jane Ezeonu (GP)',
    date: atOffset(-3, 10, 10),
    status: 'Cancelled',
    priority: 'Normal',
    reason: 'Palpitations investigation — patient withdrew consent.',
  },
  {
    id: 'REF-2026-0121',
    patientName: 'Daniel Eze',
    mrn: 'MRN-2023-00187',
    direction: 'Incoming',
    fromDepartment: 'Laboratory',
    toDepartment: OUR_DEPARTMENT,
    referredBy: 'Dr. Ifeanyi Okafor',
    date: atOffset(-3, 9, 5),
    status: 'Pending',
    priority: 'Normal',
    reason: 'Abnormal result flagged for clinical review.',
    receivingDoctorId: 'usr_001',
  },
];

// ─── Generated rows — fill out to a realistic 128-row dataset ──────────────
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
  'Ahmed',
  'Nkechi',
  'Femi',
  'Comfort',
  'Obinna',
  'Zainab',
  'Folasade',
  'Emmanuel',
  'Yusuf',
  'Sandra',
  'Michael',
  'Esther',
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
  'Chukwu',
  'Danladi',
  'Ojo',
  'Nwosu',
];
const OTHER_DEPARTMENTS = DEPARTMENT_OPTIONS.map((d) => d.value).filter(
  (d) => d !== OUR_DEPARTMENT,
);
const GEN_REFERRERS = REFERRED_BY_OPTIONS.map((d) => d.value);
const GEN_REASONS = [
  'Routine specialist evaluation requested.',
  'Diagnostic workup for ongoing symptoms.',
  'Follow-up care after recent treatment.',
  'Second opinion requested by patient.',
  'Referred for specialized equipment/testing not available on-site.',
];

function statusForIndex(i: number): ReferralStatus {
  if (i % 10 === 0) return 'Cancelled';
  if (i % 4 === 0) return 'Pending';
  if (i % 3 === 0) return 'Completed';
  return 'Accepted';
}

const GENERATED_REFERRALS: Referral[] = Array.from({ length: 120 }, (_, idx) => {
  const i = idx + 1; // REF-2026-0001 .. REF-2026-0120
  const direction: ReferralDirection = i % 2 === 0 ? 'Incoming' : 'Outgoing';
  const otherDept = OTHER_DEPARTMENTS[i % OTHER_DEPARTMENTS.length] as string;
  const dayOffset = -(124 - i); // spreads generated rows further into the past
  const hour = 8 + (i % 9);
  const minute = (i * 11) % 60;

  return {
    id: `REF-2026-${String(i).padStart(4, '0')}`,
    patientName: `${GEN_FIRST_NAMES[i % GEN_FIRST_NAMES.length]} ${GEN_LAST_NAMES[(i * 3) % GEN_LAST_NAMES.length]}`,
    mrn: `MRN-${2020 + (i % 7)}-${String(100 + i * 3).padStart(5, '0')}`,
    direction,
    fromDepartment: direction === 'Outgoing' ? OUR_DEPARTMENT : otherDept,
    toDepartment: direction === 'Outgoing' ? otherDept : OUR_DEPARTMENT,
    referredBy: GEN_REFERRERS[i % GEN_REFERRERS.length] as string,
    date: atOffset(dayOffset, hour, minute),
    status: statusForIndex(i),
    priority: i % 9 === 0 ? 'Urgent' : 'Normal',
    reason: GEN_REASONS[i % GEN_REASONS.length] as string,
    receivingDoctorId:
      direction === 'Incoming' ? (i % 4 === 0 ? 'usr_001' : 'doc-jane') : undefined,
  };
});

export const REFERRALS: Referral[] = [...CURATED_REFERRALS, ...GENERATED_REFERRALS];

// ─── Stat cards ──────────────────────────────────────────────────────────────
export const REFERRAL_STATS: {
  id: string;
  label: string;
  value: number;
  trendPercent: number;
  trendDirection: 'up' | 'down';
  icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
  {
    id: 'total',
    label: 'Total Referrals',
    value: 128,
    trendPercent: 12,
    trendDirection: 'up',
    icon: FileText,
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.12)',
  },
  {
    id: 'incoming',
    label: 'Incoming Referrals',
    value: 68,
    trendPercent: 8,
    trendDirection: 'up',
    icon: ArrowRightLeft,
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.12)',
  },
  {
    id: 'outgoing',
    label: 'Outgoing Referrals',
    value: 60,
    trendPercent: 15,
    trendDirection: 'up',
    icon: Send,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
  },
  {
    id: 'pending',
    label: 'Pending Referrals',
    value: 22,
    trendPercent: 5,
    trendDirection: 'down',
    icon: Clock,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
];

// ─── Referral Overview donut ─────────────────────────────────────────────────
export const REFERRAL_OVERVIEW_BREAKDOWN: {
  label: string;
  value: number;
  percent: number;
  color: string;
}[] = [
  { label: 'Incoming', value: 68, percent: 53, color: '#EC4899' },
  { label: 'Outgoing', value: 60, percent: 47, color: '#8B5CF6' },
  { label: 'Pending', value: 22, percent: 17, color: '#F59E0B' },
  { label: 'Completed', value: 38, percent: 30, color: '#22C55E' },
  { label: 'Cancelled', value: 8, percent: 6, color: '#EF4444' },
];

// ─── Recent activity ─────────────────────────────────────────────────────────
export type ReferralActivityEntry = {
  id: string;
  referralId: string;
  label: string;
  dateTime: string;
  icon: LucideIcon;
  color: string;
  bg: string;
};

export const REFERRAL_RECENT_ACTIVITY: ReferralActivityEntry[] = [
  {
    id: 'ract-1',
    referralId: 'REF-2026-0128',
    label: 'Pending approval',
    dateTime: atOffset(0, 10, 20),
    icon: Clock,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'ract-2',
    referralId: 'REF-2026-0127',
    label: 'Accepted by Dr. Jane Ezeonu (GP)',
    dateTime: atOffset(0, 9, 45),
    icon: CheckCircle2,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 'ract-3',
    referralId: 'REF-2026-0126',
    label: 'Completed',
    dateTime: atOffset(-1, 14, 15),
    icon: CheckCircle2,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 'ract-4',
    referralId: 'REF-2026-0125',
    label: 'Pending approval',
    dateTime: atOffset(-1, 11, 30),
    icon: Clock,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
];
