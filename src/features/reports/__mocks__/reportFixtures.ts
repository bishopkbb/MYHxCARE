/**
 * Mock fixtures for the Clinical Reports screen.
 * Swap out by pointing hooks to real analytics endpoints in Phase 6.
 */

export type ReportPeriod = 'this-week' | 'this-month' | 'this-quarter';

export const REPORT_PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'this-quarter', label: 'This Quarter' },
];

// ── Stat cards ────────────────────────────────────────────────────────────────

export type TrendDirection = 'up' | 'down';

export type ReportStat = {
  label: string;
  value: string;
  delta: string;
  direction: TrendDirection;
};

export const REPORT_STATS: Record<ReportPeriod, ReportStat[]> = {
  'this-week': [
    { label: 'Total Consultations', value: '98', delta: '+12%', direction: 'up' },
    { label: 'Lab Tests Ordered', value: '143', delta: '+8%', direction: 'up' },
    { label: 'Prescriptions Written', value: '87', delta: '+5%', direction: 'up' },
    { label: 'Referrals Made', value: '14', delta: '-2%', direction: 'down' },
  ],
  'this-month': [
    { label: 'Total Consultations', value: '412', delta: '+9%', direction: 'up' },
    { label: 'Lab Tests Ordered', value: '588', delta: '+6%', direction: 'up' },
    { label: 'Prescriptions Written', value: '361', delta: '+3%', direction: 'up' },
    { label: 'Referrals Made', value: '52', delta: '-4%', direction: 'down' },
  ],
  'this-quarter': [
    { label: 'Total Consultations', value: '1,204', delta: '+14%', direction: 'up' },
    { label: 'Lab Tests Ordered', value: '1,690', delta: '+11%', direction: 'up' },
    { label: 'Prescriptions Written', value: '1,045', delta: '+7%', direction: 'up' },
    { label: 'Referrals Made', value: '167', delta: '+2%', direction: 'up' },
  ],
};

// ── Daily Consultations bar chart ────────────────────────────────────────────

export type ConsultationBucket = { label: string; count: number };

export const DAILY_CONSULTATIONS: Record<ReportPeriod, ConsultationBucket[]> = {
  'this-week': [
    { label: 'Mon', count: 11 },
    { label: 'Tue', count: 18 },
    { label: 'Wed', count: 14 },
    { label: 'Thu', count: 22 },
    { label: 'Fri', count: 19 },
    { label: 'Sat', count: 7 },
    { label: 'Sun', count: 4 },
  ],
  'this-month': [
    { label: 'Wk 1', count: 92 },
    { label: 'Wk 2', count: 108 },
    { label: 'Wk 3', count: 97 },
    { label: 'Wk 4', count: 115 },
  ],
  'this-quarter': [
    { label: 'Apr', count: 380 },
    { label: 'May', count: 402 },
    { label: 'Jun', count: 422 },
  ],
};

export const CONSULTATION_CHART_TITLE: Record<ReportPeriod, string> = {
  'this-week': 'Daily Consultations (This Week)',
  'this-month': 'Weekly Consultations (This Month)',
  'this-quarter': 'Monthly Consultations (This Quarter)',
};

// ── Diagnosis Distribution donut chart ───────────────────────────────────────

export type DiagnosisSlice = { label: string; value: number; color: string };

export const DIAGNOSIS_DISTRIBUTION: Record<ReportPeriod, DiagnosisSlice[]> = {
  'this-week': [
    { label: 'Malaria', value: 35, color: '#00B4D8' },
    { label: 'URTI', value: 20, color: '#1D4ED8' },
    { label: 'Gastroenteritis', value: 20, color: '#D97706' },
    { label: 'Hypertension', value: 10, color: '#DC2626' },
    { label: 'Anaemia', value: 8, color: '#7C3AED' },
    { label: 'Others', value: 7, color: '#64748B' },
  ],
  'this-month': [
    { label: 'Malaria', value: 31, color: '#00B4D8' },
    { label: 'URTI', value: 23, color: '#1D4ED8' },
    { label: 'Gastroenteritis', value: 18, color: '#D97706' },
    { label: 'Hypertension', value: 13, color: '#DC2626' },
    { label: 'Anaemia', value: 9, color: '#7C3AED' },
    { label: 'Others', value: 6, color: '#64748B' },
  ],
  'this-quarter': [
    { label: 'Malaria', value: 28, color: '#00B4D8' },
    { label: 'URTI', value: 24, color: '#1D4ED8' },
    { label: 'Gastroenteritis', value: 19, color: '#D97706' },
    { label: 'Hypertension', value: 15, color: '#DC2626' },
    { label: 'Anaemia', value: 8, color: '#7C3AED' },
    { label: 'Others', value: 6, color: '#64748B' },
  ],
};

// ── Referral report table ────────────────────────────────────────────────────

export type ReferralReportStatus = 'accepted' | 'pending' | 'declined';

export type ReferralReportRow = {
  id: string;
  patient: string;
  department: string;
  referredTo: string;
  date: string; // ISO
  status: ReferralReportStatus;
};

export const REFERRAL_REPORT_ROWS: ReferralReportRow[] = [
  {
    id: 'rr-1',
    patient: 'Ibrahim Musa',
    department: 'Cardiology',
    referredTo: 'Dr. Chidi Anyanwu',
    date: '2026-06-28',
    status: 'accepted',
  },
  {
    id: 'rr-2',
    patient: 'David Osei',
    department: 'Neurology',
    referredTo: 'Dr. Nkiru Eze',
    date: '2026-06-30',
    status: 'pending',
  },
  {
    id: 'rr-3',
    patient: 'Amaka Nwosu',
    department: 'Obs & Gynaecology',
    referredTo: 'Dr. Blessing Obi',
    date: '2026-06-30',
    status: 'pending',
  },
  {
    id: 'rr-4',
    patient: 'Segun Adeleke',
    department: 'Orthopaedics',
    referredTo: 'Dr. Uche Eze',
    date: '2026-06-25',
    status: 'declined',
  },
  {
    id: 'rr-5',
    patient: 'Zainab Bello',
    department: 'Microbiology',
    referredTo: 'Dr. Ijeoma Nwachukwu',
    date: '2026-06-22',
    status: 'accepted',
  },
];
