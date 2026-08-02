/**
 * Mock fixtures for the Prescription Report screen.
 * Swap out by pointing hooks to a real reporting endpoint in Phase 6.
 *
 * Report-total numbers (stat cards, donut, summary panel) intentionally
 * represent the full month's dataset and are NOT derived from
 * PRESCRIPTION_RECORDS, which only holds a working sample for the details
 * table below — same decoupling convention as
 * registrationReportFixtures.ts's TOTAL_REGISTRATIONS_DISPLAY. Numbers
 * that share a total (department slices, New+Repeat, E-Rx+Paper, top
 * medications' percent-of-items) are computed from that one total so they
 * stay internally consistent by construction.
 */

import { Ban, Clock, FileCheck2, FileText, Tags, Wallet, type LucideIcon } from 'lucide-react';

import { HOSPITAL_DEPARTMENT_OPTIONS } from '@/constants/departments';
import { PHARMACY_LOCATIONS } from '@/constants/pharmacyLocations';
import { DOCTORS } from '@/features/shared/__mocks__/doctorDirectory';
import { DRUG_CATALOGUE } from '@/features/prescriptions/__mocks__/prescriptionFixtures';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type SelectOption = { value: string; label: string };

// ─── Stat cards ─────────────────────────────────────────────────────────────

export type ReportStatInfo =
  | { kind: 'delta'; percent: number; direction: 'up' | 'down'; comparedTo: string }
  | { kind: 'ratio'; percent: number };

export type ReportStat = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  info: ReportStatInfo;
};

const TOTAL_PRESCRIPTIONS_DISPLAY = 1248;

export const PRESCRIPTION_REPORT_STATS: ReportStat[] = [
  {
    id: 'total',
    label: 'Total Prescriptions',
    value: '1,248',
    icon: FileText,
    accent: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    info: { kind: 'delta', percent: 15.4, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'dispensed',
    label: 'Dispensed Prescriptions',
    value: '1,102',
    icon: FileCheck2,
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
    info: { kind: 'ratio', percent: 88.3 },
  },
  {
    id: 'pending',
    label: 'Pending Prescriptions',
    value: '78',
    icon: Clock,
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
    info: { kind: 'ratio', percent: 6.3 },
  },
  {
    id: 'cancelled',
    label: 'Cancelled Prescriptions',
    value: '68',
    icon: Ban,
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
    info: { kind: 'ratio', percent: 5.4 },
  },
  {
    id: 'avg-items',
    label: 'Avg. Items per Prescription',
    value: '2.8',
    icon: Tags,
    accent: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    info: { kind: 'delta', percent: 0.2, direction: 'down', comparedTo: 'May 2026' },
  },
  {
    id: 'total-value',
    label: 'Total Value (₦)',
    value: '₦8,325,450.00',
    icon: Wallet,
    accent: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
    info: { kind: 'delta', percent: 18.7, direction: 'up', comparedTo: 'May 2026' },
  },
];

// ─── Filters ────────────────────────────────────────────────────────────────

export const LOCATION_OPTIONS: SelectOption[] = PHARMACY_LOCATIONS.map((l) => ({
  value: l.id,
  label: l.shortName,
}));

export const PRESCRIBER_OPTIONS: SelectOption[] = DOCTORS.map((d) => ({
  value: d.id,
  label: d.name,
}));

export const REPORT_DEPARTMENT_OPTIONS = HOSPITAL_DEPARTMENT_OPTIONS;

export type PrescriptionReportType = 'New' | 'Repeat';

export const PRESCRIPTION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'New', label: 'New' },
  { value: 'Repeat', label: 'Repeat' },
];

export type PrescriptionReportStatus = 'Dispensed' | 'Pending' | 'Cancelled';

export const PRESCRIPTION_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Dispensed', label: 'Dispensed' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Cancelled', label: 'Cancelled' },
];

// ─── Charts ───────────────────────────────────────────────────────────────

export type TrendPoint = { label: string; total: number; dispensed: number };

export const PRESCRIPTIONS_TREND_DAILY: TrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const wave = Math.sin(day / 2.3) * 12 + Math.cos(day / 1.7) * 8;
  const total = Math.max(20, Math.round(42 + wave));
  const dispensed = Math.max(15, Math.round(total * (0.82 + Math.sin(day / 3) * 0.06)));
  return { label: `Jun ${day}`, total, dispensed };
});

/** Weekly view is a real aggregation of the same daily series, so it can
 * never drift out of sync with it. */
export const PRESCRIPTIONS_TREND_WEEKLY: TrendPoint[] = Array.from({ length: 5 }, (_, w) => {
  const bucket = PRESCRIPTIONS_TREND_DAILY.slice(w * 7, w * 7 + 7);
  return {
    label: `Week ${w + 1}`,
    total: bucket.reduce((sum, p) => sum + p.total, 0),
    dispensed: bucket.reduce((sum, p) => sum + p.dispensed, 0),
  };
}).filter((w) => w.total > 0);

/** Monthly view is a separate historical series (six months back) — same
 * decoupled-from-the-daily-sample convention as
 * registrationReportFixtures.ts's REGISTRATIONS_BY_MONTH. */
export const PRESCRIPTIONS_TREND_MONTHLY: TrendPoint[] = [
  { label: 'Jan', total: 980, dispensed: 862 },
  { label: 'Feb', total: 1046, dispensed: 921 },
  { label: 'Mar', total: 892, dispensed: 790 },
  { label: 'Apr', total: 1310, dispensed: 1158 },
  { label: 'May', total: 1082, dispensed: 953 },
  { label: 'Jun', total: 1248, dispensed: 1102 },
];

export type DistributionSlice = { label: string; value: number; percent: number; color: string };

export const PRESCRIPTIONS_BY_DEPARTMENT: DistributionSlice[] = [
  {
    label: 'Family Medicine',
    value: Math.round(TOTAL_PRESCRIPTIONS_DISPLAY * 0.33),
    percent: 33.0,
    color: '#00B4D8',
  },
  {
    label: 'Internal Medicine',
    value: Math.round(TOTAL_PRESCRIPTIONS_DISPLAY * 0.285),
    percent: 28.5,
    color: '#3B82F6',
  },
  {
    label: 'Surgery',
    value: Math.round(TOTAL_PRESCRIPTIONS_DISPLAY * 0.159),
    percent: 15.9,
    color: '#F59E0B',
  },
  {
    label: 'Pediatrics',
    value: Math.round(TOTAL_PRESCRIPTIONS_DISPLAY * 0.114),
    percent: 11.4,
    color: '#8B5CF6',
  },
  {
    label: 'Obstetrics & Gynaecology',
    value: Math.round(TOTAL_PRESCRIPTIONS_DISPLAY * 0.071),
    percent: 7.1,
    color: '#EC4899',
  },
  {
    label: 'Others',
    value: Math.round(TOTAL_PRESCRIPTIONS_DISPLAY * 0.041),
    percent: 4.1,
    color: '#8A98A3',
  },
];

// ─── Prescription Summary panel ────────────────────────────────────────────
// New+Repeat and E-Rx+Paper each sum to TOTAL_PRESCRIPTIONS_DISPLAY by
// construction, not independently hardcoded.

const NEW_RX = 1182;
const MEDICATION_ITEMS_PRESCRIBED = 3492;

export const PRESCRIPTION_SUMMARY: { label: string; value: string }[] = [
  {
    label: 'New Prescriptions',
    value: `${NEW_RX.toLocaleString()} (${((NEW_RX / TOTAL_PRESCRIPTIONS_DISPLAY) * 100).toFixed(1)}%)`,
  },
  {
    label: 'Repeat Prescriptions',
    value: `${(TOTAL_PRESCRIPTIONS_DISPLAY - NEW_RX).toLocaleString()} (${(((TOTAL_PRESCRIPTIONS_DISPLAY - NEW_RX) / TOTAL_PRESCRIPTIONS_DISPLAY) * 100).toFixed(1)}%)`,
  },
  { label: 'E-Prescriptions', value: '876 (70.2%)' },
  { label: 'Paper Prescriptions', value: '372 (29.8%)' },
  { label: 'Avg. Turnaround Time', value: '18 mins' },
  { label: 'Medication Items Prescribed', value: MEDICATION_ITEMS_PRESCRIBED.toLocaleString() },
  { label: 'Unique Medications Prescribed', value: '487' },
];

// ─── Top Prescribers / Top Medications ─────────────────────────────────────

export type LeaderboardEntry = { label: string; count: number; percent: number };

const familyMedDoctor = DOCTORS.find((d) => d.id === 'doc-jane')!;
const surgeryDoctor = DOCTORS.find((d) => d.id === 'doc-chinedu')!;
const paedsDoctor = DOCTORS.find((d) => d.id === 'doc-michael')!;
const internalMedDoctor = DOCTORS.find((d) => d.id === 'usr_001')!;
const radiologyDoctor = DOCTORS.find((d) => d.id === 'doc-chika')!;

export const TOP_PRESCRIBERS: LeaderboardEntry[] = [
  { label: familyMedDoctor.name, count: 312, percent: 25.0 },
  { label: internalMedDoctor.name, count: 256, percent: 20.5 },
  { label: surgeryDoctor.name, count: 198, percent: 15.9 },
  { label: paedsDoctor.name, count: 146, percent: 11.7 },
  { label: radiologyDoctor.name, count: 124, percent: 9.9 },
];

function drugName(id: string): string {
  return DRUG_CATALOGUE.find((d) => d.id === id)?.name ?? id;
}

// Each count's percent is computed against the same MEDICATION_ITEMS_PRESCRIBED
// total shown in the summary panel, so the two numbers can't drift apart.
const TOP_MED_COUNTS: { drugId: string; strength: string; count: number }[] = [
  { drugId: 'dc-amoxicillin', strength: '500mg', count: 186 },
  { drugId: 'dc-paracetamol', strength: '1000mg', count: 162 },
  { drugId: 'dc-ibuprofen', strength: '400mg', count: 148 },
  { drugId: 'dc-ciprofloxacin', strength: '500mg', count: 124 },
  { drugId: 'dc-omeprazole', strength: '20mg', count: 112 },
];

export const TOP_PRESCRIBED_MEDICATIONS: LeaderboardEntry[] = TOP_MED_COUNTS.map((m) => ({
  label: `${drugName(m.drugId)} ${m.strength}`,
  count: m.count,
  percent: Math.round((m.count / MEDICATION_ITEMS_PRESCRIBED) * 1000) / 10,
}));

// ─── Prescriptions Details table ───────────────────────────────────────────

export type PrescriptionReportRecord = {
  id: string;
  date: string; // ISO
  patientName: string;
  mrn: string;
  prescriberName: string;
  department: string;
  type: PrescriptionReportType;
  items: number;
  status: PrescriptionReportStatus;
  totalValue: number; // naira
};

const CURATED_RECORDS: PrescriptionReportRecord[] = [
  {
    id: 'RX-2026-0789',
    date: atOffset(0, 10, 15),
    patientName: 'Chinedu Okafor',
    mrn: 'MRN-2026-00667',
    prescriberName: familyMedDoctor.name,
    department: 'Family Medicine',
    type: 'New',
    items: 3,
    status: 'Dispensed',
    totalValue: 4250,
  },
  {
    id: 'RX-2026-0788',
    date: atOffset(0, 9, 45),
    patientName: 'Maryam Usman',
    mrn: 'MRN-2024-00512',
    prescriberName: internalMedDoctor.name,
    department: 'Internal Medicine',
    type: 'Repeat',
    items: 4,
    status: 'Pending',
    totalValue: 6750,
  },
  {
    id: 'RX-2026-0787',
    date: atOffset(0, 9, 20),
    patientName: 'Ngozi Adeyemi',
    mrn: 'MRN-2024-00498',
    prescriberName: surgeryDoctor.name,
    department: 'Surgery',
    type: 'New',
    items: 2,
    status: 'Dispensed',
    totalValue: 2800,
  },
  {
    id: 'RX-2026-0786',
    date: atOffset(0, 8, 55),
    patientName: 'Aisha Bello',
    mrn: 'MRN-2024-00475',
    prescriberName: paedsDoctor.name,
    department: 'Pediatrics',
    type: 'Repeat',
    items: 1,
    status: 'Cancelled',
    totalValue: 1200,
  },
  {
    id: 'RX-2026-0785',
    date: atOffset(0, 8, 30),
    patientName: 'Emeka Nwosu',
    mrn: 'MRN-2024-00450',
    prescriberName: radiologyDoctor.name,
    department: 'Obstetrics & Gynaecology',
    type: 'New',
    items: 3,
    status: 'Dispensed',
    totalValue: 5600,
  },
  {
    id: 'RX-2026-0784',
    date: atOffset(0, 8, 5),
    patientName: 'Fatima Yusuf',
    mrn: 'MRN-2024-00431',
    prescriberName: familyMedDoctor.name,
    department: 'Family Medicine',
    type: 'New',
    items: 2,
    status: 'Dispensed',
    totalValue: 3450,
  },
  {
    id: 'RX-2026-0783',
    date: atOffset(-1, 17, 15),
    patientName: 'James Wilson',
    mrn: 'MRN-2024-00420',
    prescriberName: surgeryDoctor.name,
    department: 'Internal Medicine',
    type: 'Repeat',
    items: 4,
    status: 'Dispensed',
    totalValue: 7200,
  },
  {
    id: 'RX-2026-0782',
    date: atOffset(-1, 16, 40),
    patientName: 'Blessing Udo',
    mrn: 'MRN-2024-00401',
    prescriberName: internalMedDoctor.name,
    department: 'Pediatrics',
    type: 'New',
    items: 3,
    status: 'Pending',
    totalValue: 4125,
  },
];

const GEN_FIRST_NAMES = [
  'Tunde',
  'Adaeze',
  'Peter',
  'Victoria',
  'Chukwuemeka',
  'Musa',
  'Kelechi',
  'Halima',
  'Ronke',
  'Segun',
  'Patience',
  'Ikenna',
];
const GEN_LAST_NAMES = [
  'Nwachukwu',
  'Balogun',
  'Suleiman',
  'Achike',
  'Etim',
  'Idika',
  'Aliyu',
  'Okoro',
  'Effiong',
  'Umeh',
  'Bello',
  'Okoye',
];
const GEN_PRESCRIBERS = [
  familyMedDoctor.name,
  internalMedDoctor.name,
  surgeryDoctor.name,
  paedsDoctor.name,
  radiologyDoctor.name,
];
const GEN_DEPARTMENTS = [
  'Family Medicine',
  'Internal Medicine',
  'Surgery',
  'Pediatrics',
  'Obstetrics & Gynaecology',
];
const GEN_TYPES: PrescriptionReportType[] = ['New', 'Repeat'];

function statusForIndex(i: number): PrescriptionReportStatus {
  if (i % 13 === 0) return 'Cancelled';
  if (i % 7 === 0) return 'Pending';
  return 'Dispensed';
}

const GENERATED_RECORDS: PrescriptionReportRecord[] = Array.from({ length: 48 }, (_, idx) => {
  const i = idx + 1;
  const dayOffset = -(1 + (48 - i) / 2);
  const items = 1 + (i % 5);
  return {
    id: `RX-2026-${String(781 - i).padStart(4, '0')}`,
    date: atOffset(Math.floor(dayOffset), 7 + (i % 11), (i * 17) % 60),
    patientName: `${GEN_FIRST_NAMES[i % GEN_FIRST_NAMES.length]} ${GEN_LAST_NAMES[(i * 3) % GEN_LAST_NAMES.length]}`,
    mrn: `MRN-${2020 + (i % 7)}-${String(100 + i * 3).padStart(5, '0')}`,
    prescriberName: GEN_PRESCRIBERS[i % GEN_PRESCRIBERS.length] as string,
    department: GEN_DEPARTMENTS[i % GEN_DEPARTMENTS.length] as string,
    type: GEN_TYPES[i % GEN_TYPES.length] as PrescriptionReportType,
    items,
    status: statusForIndex(i),
    totalValue: items * (450 + ((i * 137) % 1800)),
  };
});

export const PRESCRIPTION_RECORDS: PrescriptionReportRecord[] = [
  ...CURATED_RECORDS,
  ...GENERATED_RECORDS,
];
