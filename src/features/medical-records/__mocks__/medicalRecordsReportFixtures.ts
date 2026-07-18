/**
 * Mock fixtures for the Medical Records Reports screen.
 * Swap out by pointing hooks to real analytics endpoints in Phase 6.
 */

import {
  Archive,
  ClipboardList,
  Clock,
  FilePlus2,
  FileText,
  PencilLine,
  type LucideIcon,
} from 'lucide-react';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ── Stat cards ───────────────────────────────────────────────────────────────

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
};

export const REPORT_STATS: ReportStat[] = [
  {
    id: 'retrieved',
    label: 'Records Retrieved',
    value: '3,248',
    deltaPercent: 18.2,
    direction: 'up',
    icon: FileText,
    color: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'updated',
    label: 'Records Updated',
    value: '1,487',
    deltaPercent: 12.6,
    direction: 'up',
    icon: PencilLine,
    color: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 'new-files',
    label: 'New Medical Files',
    value: '956',
    deltaPercent: 9.8,
    direction: 'up',
    icon: FilePlus2,
    color: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
  },
  {
    id: 'archived',
    label: 'Archived Records',
    value: '672',
    deltaPercent: 7.4,
    direction: 'up',
    icon: Archive,
    color: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'requests',
    label: 'Record Requests',
    value: '210',
    deltaPercent: 5.3,
    direction: 'down',
    icon: ClipboardList,
    color: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
  },
  {
    id: 'avg-retrieval',
    label: 'Avg. Retrieval Time',
    value: '04:32',
    deltaPercent: 8.7,
    direction: 'down',
    icon: Clock,
    color: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
  },
];

// ── Trend line charts ─────────────────────────────────────────────────────────

export type TrendPoint = { label: string; value: number };

function buildTrend(seed: number, base: number, spread: number): TrendPoint[] {
  return Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const wobble =
      Math.sin((day + seed) * 0.7) * spread + Math.cos(day * 0.3 + seed) * (spread / 2);
    return { label: `Jun ${day}`, value: Math.max(20, Math.round(base + wobble)) };
  });
}

export const RETRIEVAL_TREND: TrendPoint[] = buildTrend(2, 300, 160);
export const ARCHIVE_TREND: TrendPoint[] = buildTrend(5, 280, 150);

// ── Record Requests donut ─────────────────────────────────────────────────────

export type RequestStatusSlice = { label: string; value: number; percent: number; color: string };

export const RECORD_REQUESTS_BREAKDOWN: RequestStatusSlice[] = [
  { label: 'Pending', value: 52, percent: 24.8, color: '#F59E0B' },
  { label: 'In Progress', value: 63, percent: 30.0, color: '#3B82F6' },
  { label: 'Completed', value: 78, percent: 37.1, color: '#22C55E' },
  { label: 'Rejected', value: 17, percent: 8.1, color: '#EF4444' },
];
export const RECORD_REQUESTS_TOTAL = RECORD_REQUESTS_BREAKDOWN.reduce((s, d) => s + d.value, 0);

// ── Department usage bar chart ────────────────────────────────────────────────

export type DepartmentUsage = { department: string; count: number };

export const DEPARTMENT_USAGE: DepartmentUsage[] = [
  { department: 'General Outpatient', count: 842 },
  { department: 'Laboratory', count: 618 },
  { department: 'Radiology', count: 512 },
  { department: 'Emergency', count: 421 },
  { department: 'Surgery', count: 386 },
  { department: 'Physiotherapy', count: 265 },
  { department: 'Dental Clinic', count: 184 },
];

// ── Medical Records Activity table ────────────────────────────────────────────

export type RecordActivityStatus = 'Retrieved' | 'Updated' | 'Archived';

export type MedicalRecordActivity = {
  id: string;
  mrn: string;
  patientName: string;
  initials: string;
  avatarBg: string;
  recordType: string;
  retrievedBy: string;
  department: string;
  date: string;
  status: RecordActivityStatus;
  retrievalTime: string;
};

export const OFFICER_OPTIONS = ['Adeeze Okonkwo', 'Mary Uche', 'Samuel A.', 'Jane Ezeonu'].map(
  (o) => ({ value: o, label: o }),
);

export const REPORT_DEPARTMENT_OPTIONS = [
  'General Outpatient Clinic',
  'Laboratory',
  'Radiology',
  'Emergency Department',
  'Surgery',
  'Physiotherapy',
  'Dental Clinic',
].map((d) => ({ value: d, label: d }));

export const RECORD_STATUS_OPTIONS: { value: RecordActivityStatus; label: string }[] = [
  { value: 'Retrieved', label: 'Retrieved' },
  { value: 'Updated', label: 'Updated' },
  { value: 'Archived', label: 'Archived' },
];

const ROWS: Omit<MedicalRecordActivity, 'id'>[] = [
  {
    mrn: 'MRN-2025-00124',
    patientName: 'Chidinma Okafor',
    initials: 'CO',
    avatarBg: '#3B82F6',
    recordType: 'General Outpatient Record',
    retrievedBy: 'Adeeze Okonkwo',
    department: 'General Outpatient Clinic',
    date: atOffset(0, 10, 15),
    status: 'Retrieved',
    retrievalTime: '02:18',
  },
  {
    mrn: 'MRN-2024-00987',
    patientName: 'Ifeanyi Nwosu',
    initials: 'IN',
    avatarBg: '#F59E0B',
    recordType: 'Laboratory Record',
    retrievedBy: 'Mary Uche',
    department: 'Laboratory',
    date: atOffset(0, 9, 42),
    status: 'Updated',
    retrievalTime: '01:45',
  },
  {
    mrn: 'MRN-2024-00765',
    patientName: 'Maryam Usman',
    initials: 'MU',
    avatarBg: '#8B5CF6',
    recordType: 'Radiology Record',
    retrievedBy: 'Adeeze Okonkwo',
    department: 'Radiology',
    date: atOffset(0, 8, 55),
    status: 'Retrieved',
    retrievalTime: '03:21',
  },
  {
    mrn: 'MRN-2023-00543',
    patientName: 'Emeka Obi',
    initials: 'EO',
    avatarBg: '#22C55E',
    recordType: 'Emergency Record',
    retrievedBy: 'Samuel A.',
    department: 'Emergency Department',
    date: atOffset(-1, 10, 30),
    status: 'Retrieved',
    retrievalTime: '01:12',
  },
  {
    mrn: 'MRN-2023-00421',
    patientName: 'Grace Adebayo',
    initials: 'GA',
    avatarBg: '#EC4899',
    recordType: 'Surgery Record',
    retrievedBy: 'Mary Uche',
    department: 'Surgery',
    date: atOffset(-1, 6, 12),
    status: 'Updated',
    retrievalTime: '02:47',
  },
  {
    mrn: 'MRN-2023-00311',
    patientName: 'Seyi Adewale',
    initials: 'SA',
    avatarBg: '#00B4D8',
    recordType: 'Physiotherapy Record',
    retrievedBy: 'Jane Ezeonu',
    department: 'Physiotherapy',
    date: atOffset(-1, 4, 50),
    status: 'Retrieved',
    retrievalTime: '01:30',
  },
  {
    mrn: 'MRN-2024-01002',
    patientName: 'Favour Bassey',
    initials: 'FB',
    avatarBg: '#3B82F6',
    recordType: 'Dental Record',
    retrievedBy: 'Adeeze Okonkwo',
    department: 'Dental Clinic',
    date: atOffset(-1, 3, 20),
    status: 'Updated',
    retrievalTime: '02:05',
  },
  {
    mrn: 'MRN-2023-00187',
    patientName: 'Daniel Eze',
    initials: 'DE',
    avatarBg: '#F59E0B',
    recordType: 'General Outpatient Record',
    retrievedBy: 'Samuel A.',
    department: 'General Outpatient Clinic',
    date: atOffset(-1, 11, 8),
    status: 'Archived',
    retrievalTime: '04:02',
  },
  {
    mrn: 'MRN-2025-00512',
    patientName: 'Ngozi Ibe',
    initials: 'NI',
    avatarBg: '#00B4D8',
    recordType: 'Radiology Record',
    retrievedBy: 'Mary Uche',
    department: 'Radiology',
    date: atOffset(-2, 9, 0),
    status: 'Retrieved',
    retrievalTime: '02:52',
  },
  {
    mrn: 'MRN-2021-00276',
    patientName: 'Peter Achike',
    initials: 'PA',
    avatarBg: '#EC4899',
    recordType: 'General Outpatient Record',
    retrievedBy: 'Jane Ezeonu',
    department: 'General Outpatient Clinic',
    date: atOffset(-2, 14, 40),
    status: 'Retrieved',
    retrievalTime: '01:58',
  },
  {
    mrn: 'MRN-2026-00201',
    patientName: 'Yusuf Aliyu',
    initials: 'YA',
    avatarBg: '#F59E0B',
    recordType: 'Laboratory Record',
    retrievedBy: 'Adeeze Okonkwo',
    department: 'Laboratory',
    date: atOffset(-2, 8, 20),
    status: 'Updated',
    retrievalTime: '02:11',
  },
  {
    mrn: 'MRN-2026-00088',
    patientName: 'Halima Suleiman',
    initials: 'HS',
    avatarBg: '#22C55E',
    recordType: 'Emergency Record',
    retrievedBy: 'Samuel A.',
    department: 'Emergency Department',
    date: atOffset(-3, 9, 30),
    status: 'Retrieved',
    retrievalTime: '01:05',
  },
  {
    mrn: 'MRN-2022-00119',
    patientName: 'Margaret Okoro',
    initials: 'MO',
    avatarBg: '#8B5CF6',
    recordType: 'General Outpatient Record',
    retrievedBy: 'Jane Ezeonu',
    department: 'General Outpatient Clinic',
    date: atOffset(-3, 15, 10),
    status: 'Archived',
    retrievalTime: '03:44',
  },
  {
    mrn: 'MRN-2024-00812',
    patientName: 'Chidi Nwankwo',
    initials: 'CN',
    avatarBg: '#00B4D8',
    recordType: 'Surgery Record',
    retrievedBy: 'Mary Uche',
    department: 'Surgery',
    date: atOffset(-3, 10, 0),
    status: 'Updated',
    retrievalTime: '02:36',
  },
  {
    mrn: 'MRN-2023-00344',
    patientName: 'Patience Effiong',
    initials: 'PE',
    avatarBg: '#3B82F6',
    recordType: 'General Outpatient Record',
    retrievedBy: 'Adeeze Okonkwo',
    department: 'General Outpatient Clinic',
    date: atOffset(-4, 13, 20),
    status: 'Retrieved',
    retrievalTime: '02:03',
  },
  {
    mrn: 'MRN-2020-00056',
    patientName: 'Rita Nwachukwu',
    initials: 'RN',
    avatarBg: '#F59E0B',
    recordType: 'Dental Record',
    retrievedBy: 'Samuel A.',
    department: 'Dental Clinic',
    date: atOffset(-4, 9, 15),
    status: 'Archived',
    retrievalTime: '04:20',
  },
  {
    mrn: 'MRN-2024-00677',
    patientName: 'Godwin Etim',
    initials: 'GE',
    avatarBg: '#22C55E',
    recordType: 'Physiotherapy Record',
    retrievedBy: 'Jane Ezeonu',
    department: 'Physiotherapy',
    date: atOffset(-5, 10, 45),
    status: 'Retrieved',
    retrievalTime: '01:41',
  },
  {
    mrn: 'MRN-2026-00088',
    patientName: 'Comfort Idika',
    initials: 'CI',
    avatarBg: '#EC4899',
    recordType: 'Laboratory Record',
    retrievedBy: 'Mary Uche',
    department: 'Laboratory',
    date: atOffset(-5, 8, 30),
    status: 'Updated',
    retrievalTime: '02:29',
  },
  {
    mrn: 'MRN-2021-00276',
    patientName: 'Blessing Chukwu',
    initials: 'BC',
    avatarBg: '#00B4D8',
    recordType: 'General Outpatient Record',
    retrievedBy: 'Adeeze Okonkwo',
    department: 'General Outpatient Clinic',
    date: atOffset(-6, 9, 55),
    status: 'Retrieved',
    retrievalTime: '01:22',
  },
  {
    mrn: 'MRN-2025-00447',
    patientName: 'Kelechi Eze',
    initials: 'KE',
    avatarBg: '#3B82F6',
    recordType: 'Radiology Record',
    retrievedBy: 'Samuel A.',
    department: 'Radiology',
    date: atOffset(-6, 14, 5),
    status: 'Updated',
    retrievalTime: '03:08',
  },
];

export const MEDICAL_RECORDS_ACTIVITY: MedicalRecordActivity[] = ROWS.map((r, i) => ({
  id: `mra-${i + 1}`,
  ...r,
}));
