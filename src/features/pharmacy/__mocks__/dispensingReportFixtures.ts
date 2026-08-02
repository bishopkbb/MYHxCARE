/**
 * Mock fixtures for the Dispensing Report screen.
 * Swap out by pointing hooks to a real reporting endpoint in Phase 6.
 *
 * Report-total numbers (stat cards, donut, summary panel) intentionally
 * represent the full month's dataset and are NOT derived from
 * DISPENSING_RECORDS, which only holds a working sample for the details
 * table — same decoupling convention as prescriptionReportFixtures.ts.
 * DISPENSING_RECORDS itself, though, IS derived from that other file's
 * PRESCRIPTION_RECORDS (the Dispensed subset, enriched with medication/
 * pharmacist detail) rather than invented separately — the same prescription
 * that appears in Prescription Report shows up here too, just with the
 * dispensing-specific fields filled in.
 */

import { Clock, FileCheck2, Package, Tags, Users, Wallet, type LucideIcon } from 'lucide-react';

import { DRUG_CATALOGUE } from '@/features/prescriptions/__mocks__/prescriptionFixtures';
import {
  LOCATION_OPTIONS,
  PRESCRIPTION_RECORDS,
  REPORT_DEPARTMENT_OPTIONS,
  type SelectOption,
} from '@/features/pharmacy/__mocks__/prescriptionReportFixtures';

export { LOCATION_OPTIONS, REPORT_DEPARTMENT_OPTIONS };

// The same informal pharmacist roster already reused across ADR Reports,
// the Dispensing Audit Trail actor list, and Queue Monitor's pharmacist
// assignment — not invented fresh for this screen.
export const DISPENSING_PHARMACISTS = [
  'Pharm. Adaeze',
  'Pharm. Victoria',
  'Pharm. John',
  'Pharm. Grace',
  'Pharm. Ngozi',
];

export const PHARMACIST_OPTIONS: SelectOption[] = [
  ...DISPENSING_PHARMACISTS.map((p) => ({ value: p, label: p })),
  { value: 'System', label: 'System (auto-dispensed)' },
];

export const DISPENSED_BY_OPTIONS: SelectOption[] = [
  { value: 'System', label: 'System (auto-dispensed)' },
  ...DISPENSING_PHARMACISTS.map((p) => ({ value: p, label: p })),
];

// ─── Stat cards ─────────────────────────────────────────────────────────────

export type ReportStatInfo = { percent: number; direction: 'up' | 'down'; comparedTo: string };

export type ReportStat = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  info: ReportStatInfo;
};

const TOTAL_ITEMS_DISPENSED = 5632;
const TOTAL_PRESCRIPTIONS_DISPENSED = 1102;
const UNIQUE_PATIENTS = 876;

export const DISPENSING_REPORT_STATS: ReportStat[] = [
  {
    id: 'total-items',
    label: 'Total Items Dispensed',
    value: TOTAL_ITEMS_DISPENSED.toLocaleString(),
    icon: Package,
    accent: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    info: { percent: 16.2, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'total-rx',
    label: 'Total Prescriptions Dispensed',
    value: TOTAL_PRESCRIPTIONS_DISPENSED.toLocaleString(),
    icon: FileCheck2,
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
    info: { percent: 14.8, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'unique-patients',
    label: 'Unique Patients',
    value: UNIQUE_PATIENTS.toLocaleString(),
    icon: Users,
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
    info: { percent: 12.6, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'total-value',
    label: 'Total Value (₦)',
    value: '₦8,325,450.00',
    icon: Wallet,
    accent: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    info: { percent: 18.7, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'avg-items',
    label: 'Avg. Items per Prescription',
    value: '5.11',
    icon: Tags,
    accent: '#EC4899',
    iconBg: 'rgba(236,72,153,0.12)',
    info: { percent: 0.8, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'avg-time',
    label: 'Avg. Dispensing Time',
    value: '06:42 mins',
    icon: Clock,
    accent: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
    info: { percent: 1.2, direction: 'down', comparedTo: 'May 2026' },
  },
];

// ─── Charts ───────────────────────────────────────────────────────────────

export type DispensingTrendPoint = { label: string; items: number; prescriptions: number };

export const DISPENSING_TREND_DAILY: DispensingTrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const wave = Math.sin(day / 2.1) * 55 + Math.cos(day / 1.6) * 35;
  const items = Math.max(90, Math.round(190 + wave));
  const prescriptions = Math.max(20, Math.round(items * (0.19 + Math.sin(day / 3) * 0.02)));
  return { label: `Jun ${day}`, items, prescriptions };
});

/** Weekly view is a real aggregation of the same daily series. */
export const DISPENSING_TREND_WEEKLY: DispensingTrendPoint[] = Array.from({ length: 5 }, (_, w) => {
  const bucket = DISPENSING_TREND_DAILY.slice(w * 7, w * 7 + 7);
  return {
    label: `Week ${w + 1}`,
    items: bucket.reduce((sum, p) => sum + p.items, 0),
    prescriptions: bucket.reduce((sum, p) => sum + p.prescriptions, 0),
  };
}).filter((w) => w.items > 0);

/** Monthly view is a separate historical series, same convention as
 * prescriptionReportFixtures.ts's PRESCRIPTIONS_TREND_MONTHLY. */
export const DISPENSING_TREND_MONTHLY: DispensingTrendPoint[] = [
  { label: 'Jan', items: 4480, prescriptions: 862 },
  { label: 'Feb', items: 4780, prescriptions: 921 },
  { label: 'Mar', items: 4120, prescriptions: 790 },
  { label: 'Apr', items: 5980, prescriptions: 1158 },
  { label: 'May', items: 4845, prescriptions: 953 },
  { label: 'Jun', items: 5632, prescriptions: 1102 },
];

export type DistributionSlice = { label: string; value: number; percent: number; color: string };

const DEPARTMENT_ITEM_COUNTS: { label: string; value: number; color: string }[] = [
  { label: 'Family Medicine', value: 1782, color: '#00B4D8' },
  { label: 'Internal Medicine', value: 1402, color: '#3B82F6' },
  { label: 'Surgery', value: 876, color: '#F59E0B' },
  { label: 'Pediatrics', value: 742, color: '#8B5CF6' },
  { label: 'Obstetrics & Gynaecology', value: 456, color: '#EC4899' },
  { label: 'Others', value: 374, color: '#8A98A3' },
];

export const DISPENSING_BY_DEPARTMENT: DistributionSlice[] = DEPARTMENT_ITEM_COUNTS.map((d) => ({
  ...d,
  percent: Math.round((d.value / TOTAL_ITEMS_DISPENSED) * 1000) / 10,
}));

// ─── Dispensing Summary panel ───────────────────────────────────────────────
// Every figure here is computed from the same three totals above, not
// entered separately — New+Repeat sums back to TOTAL_PRESCRIPTIONS_DISPENSED,
// and the per-day averages are that total divided by the 30-day report window.

const NEW_RX_DISPENSED = 1048;
const UNIQUE_MEDICATIONS_DISPENSED = 487;
const REPORT_WINDOW_DAYS = 30;

export const DISPENSING_SUMMARY: { label: string; value: string }[] = [
  {
    label: 'New Prescriptions Dispensed',
    value: `${NEW_RX_DISPENSED.toLocaleString()} (${((NEW_RX_DISPENSED / TOTAL_PRESCRIPTIONS_DISPENSED) * 100).toFixed(1)}%)`,
  },
  {
    label: 'Repeat Prescriptions Dispensed',
    value: `${(TOTAL_PRESCRIPTIONS_DISPENSED - NEW_RX_DISPENSED).toLocaleString()} (${(((TOTAL_PRESCRIPTIONS_DISPENSED - NEW_RX_DISPENSED) / TOTAL_PRESCRIPTIONS_DISPENSED) * 100).toFixed(1)}%)`,
  },
  { label: 'Items Dispensed', value: TOTAL_ITEMS_DISPENSED.toLocaleString() },
  { label: 'Unique Medications Dispensed', value: UNIQUE_MEDICATIONS_DISPENSED.toLocaleString() },
  { label: 'Patients Served', value: UNIQUE_PATIENTS.toLocaleString() },
  {
    label: 'Prescriptions per Day (Avg.)',
    value: (TOTAL_PRESCRIPTIONS_DISPENSED / REPORT_WINDOW_DAYS).toFixed(2),
  },
  {
    label: 'Items per Day (Avg.)',
    value: (TOTAL_ITEMS_DISPENSED / REPORT_WINDOW_DAYS).toFixed(2),
  },
  { label: 'Total Value (₦)', value: '₦8,325,450.00' },
];

// ─── Top Dispensed Medications / Top Dispensing Pharmacists ────────────────

export type LeaderboardEntry = { label: string; count: number; percent: number };

function drugName(id: string): string {
  return DRUG_CATALOGUE.find((d) => d.id === id)?.name ?? id;
}

// Same catalogue subset as prescriptionReportFixtures.ts's Top Prescribed
// Medications — percent is computed against Items Dispensed so it can't
// drift from the summary panel.
const TOP_MED_COUNTS: { drugId: string; strength: string; count: number }[] = [
  { drugId: 'dc-amoxicillin', strength: '500mg', count: 186 },
  { drugId: 'dc-paracetamol', strength: '500mg', count: 162 },
  { drugId: 'dc-ibuprofen', strength: '400mg', count: 148 },
  { drugId: 'dc-metronidazole', strength: '400mg', count: 124 },
  { drugId: 'dc-ciprofloxacin', strength: '500mg', count: 112 },
];

export const TOP_DISPENSED_MEDICATIONS: LeaderboardEntry[] = TOP_MED_COUNTS.map((m) => ({
  label: `${drugName(m.drugId)} ${m.strength}`,
  count: m.count,
  percent: Math.round((m.count / TOTAL_ITEMS_DISPENSED) * 1000) / 10,
}));

const TOP_PHARMACIST_COUNTS: { name: string; count: number }[] = [
  { name: DISPENSING_PHARMACISTS[1]!, count: 1124 }, // Pharm. Victoria
  { name: DISPENSING_PHARMACISTS[2]!, count: 876 }, // Pharm. John
  { name: DISPENSING_PHARMACISTS[3]!, count: 742 }, // Pharm. Grace
  { name: DISPENSING_PHARMACISTS[0]!, count: 618 }, // Pharm. Adaeze
  { name: DISPENSING_PHARMACISTS[4]!, count: 456 }, // Pharm. Ngozi
];

export const TOP_DISPENSING_PHARMACISTS: LeaderboardEntry[] = TOP_PHARMACIST_COUNTS.map((p) => ({
  label: p.name,
  count: p.count,
  percent: Math.round((p.count / TOTAL_ITEMS_DISPENSED) * 1000) / 10,
}));

// ─── Dispensing Details table ──────────────────────────────────────────────
// Derived from prescriptionReportFixtures.ts's Dispensed subset rather than
// invented separately — the same RX-2026-#### row that appears in
// Prescription Report shows up here too, enriched with the medication,
// strength, form, quantity, and dispensing pharmacist that report has no
// reason to carry.

export type DispensingReportRecord = {
  id: string;
  date: string; // ISO
  patientName: string;
  mrn: string;
  medicationName: string;
  strength: string;
  form: string;
  qtyDispensed: number;
  dispensedBy: string;
  department: string;
  totalValue: number; // naira
};

function hashString(s: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i);
  return Math.abs(h);
}

function medicationFor(id: string) {
  const drug = DRUG_CATALOGUE[hashString(id, 17) % DRUG_CATALOGUE.length]!;
  return { name: drug.name, strength: drug.defaultStrength, form: drug.defaultForm };
}

function dispensedByFor(id: string): string {
  const h = hashString(id, 41);
  if (h % 9 === 0) return 'System';
  return DISPENSING_PHARMACISTS[h % DISPENSING_PHARMACISTS.length]!;
}

function qtyFor(id: string): number {
  return 10 + (hashString(id, 71) % 50);
}

function unitPriceFor(id: string): number {
  return 30 + (hashString(id, 113) % 150);
}

export const DISPENSING_RECORDS: DispensingReportRecord[] = PRESCRIPTION_RECORDS.filter(
  (r) => r.status === 'Dispensed',
).map((r) => {
  const med = medicationFor(r.id);
  const qtyDispensed = qtyFor(r.id);
  return {
    id: r.id,
    date: r.date,
    patientName: r.patientName,
    mrn: r.mrn,
    medicationName: med.name,
    strength: med.strength,
    form: med.form,
    qtyDispensed,
    dispensedBy: dispensedByFor(r.id),
    department: r.department,
    totalValue: qtyDispensed * unitPriceFor(r.id),
  };
});
