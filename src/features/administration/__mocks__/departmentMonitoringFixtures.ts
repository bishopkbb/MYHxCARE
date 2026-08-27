/**
 * Mock fixtures for Department Monitoring (`/admin/department-monitoring`),
 * the Administration Dashboard's own intended drill-down target: two of
 * `AdministrationDashboardWorkspace.tsx`'s stat cards already route here.
 * Numbers below match that dashboard's own `DEPARTMENT_STATUS` fixture
 * (`administrationDashboardFixtures.ts`) wherever a department overlaps
 * (Clinical, Nursing, Pharmacy, Laboratory, Emergency, Accounts & Billing),
 * extended with the 2 departments that fixture doesn't cover (Records,
 * Administration), a second metric per card, and hourly trend data, so the
 * two screens can never numerically disagree.
 *
 * None of the 8 department cards' key metrics are backed by a real
 * cross-module aggregate hook, confirmed per-department: Nursing's one real
 * bed store (`bedAllocationStore.ts`) is explicitly scoped to two wards, not
 * hospital-wide; Billing has no real store at all
 * (`billingDashboardFixtures.ts`'s own header says so); Laboratory/Emergency/
 * Clinical have real underlying records but no pre-built "today" aggregate;
 * Records' pending-requests count is local `useState`, not a shared store.
 * The Administration Dashboard, facing this identical need, already chose
 * static illustrative fixtures over fragile bespoke derivation, this file
 * follows that precedent. Hourly trend data is necessarily illustrative,
 * nothing in this codebase records a per-hour history for any department.
 * Swap out by pointing hooks to real per-department metrics endpoints in
 * Phase 6.
 */

import {
  Beaker,
  BedDouble,
  FolderOpen,
  Pill,
  Settings,
  Siren,
  Stethoscope,
  Wallet,
} from 'lucide-react';

import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';
import { ADMINISTRATIVE_ALERTS } from '@/features/administration/__mocks__/administrationDashboardFixtures';

export const ACTIVE_ALERTS_COUNT = ADMINISTRATIVE_ALERTS.length;

export const TOTAL_CONSULTATIONS_TODAY = 24;
export const LAB_TESTS_PROCESSED_TODAY = 46;
export const INVOICES_GENERATED_TODAY = 42;

export type DepartmentCardStatus = 'Operational' | 'Busy';

export type TrendVisual = { kind: 'trend'; color: string; hourlyData: number[] };
export type BarsVisual = {
  kind: 'bars';
  segments: { label: string; value: number; color: string; isCurrency?: boolean }[];
  totalLabel: string;
  total: number;
};
export type TasksVisual = {
  kind: 'tasks';
  tasks: { id: string; label: string; timeLabel: string }[];
};

export type DepartmentMonitoringCard = {
  id: string;
  department: OrganizationalDepartment;
  icon: typeof Stethoscope;
  iconColor: string;
  iconBg: string;
  status: DepartmentCardStatus;
  primaryMetric: { value: number; label: string };
  secondaryMetric: { value: number; label: string };
  visual: TrendVisual | BarsVisual | TasksVisual;
  detailsRoute: string;
};

/** Smooth illustrative 00:00-24:00 curve (13 two-hourly points) peaking
 * around `peakHour`, scaled to `peakValue`. Shared by every trend card
 * rather than hand-writing 5 near-identical arrays. */
export function buildHourlyTrend(peakHour: number, peakValue: number): number[] {
  const points: number[] = [];
  for (let hour = 0; hour <= 24; hour += 2) {
    const distance = Math.abs(hour - peakHour) / 12;
    const shape = Math.max(0, 1 - distance * distance * 1.6);
    const value = Math.round(peakValue * (0.12 + shape * 0.88));
    points.push(Math.max(0, value));
  }
  return points;
}

export const HOURLY_LABELS = [
  '00:00',
  '02:00',
  '04:00',
  '06:00',
  '08:00',
  '10:00',
  '12:00',
  '14:00',
  '16:00',
  '18:00',
  '20:00',
  '22:00',
  '24:00',
];

export const DEPARTMENT_MONITORING_CARDS: DepartmentMonitoringCard[] = [
  {
    id: 'dmc-clinical',
    department: 'Clinical / Consultation',
    icon: Stethoscope,
    iconColor: '#2563EB',
    iconBg: 'rgba(37,99,235,0.1)',
    status: 'Operational',
    primaryMetric: { value: TOTAL_CONSULTATIONS_TODAY, label: 'Consultations Today' },
    secondaryMetric: { value: 8, label: 'Pending' },
    visual: { kind: 'trend', color: '#2563EB', hourlyData: buildHourlyTrend(11, 30) },
    detailsRoute: '/admin/departments',
  },
  {
    id: 'dmc-nursing',
    department: 'Nursing / Wards',
    icon: BedDouble,
    iconColor: '#16A34A',
    iconBg: 'rgba(22,163,74,0.1)',
    status: 'Operational',
    primaryMetric: { value: 18, label: 'Patients in Wards' },
    secondaryMetric: { value: 62, label: 'Bed Occupancy %' },
    visual: {
      kind: 'bars',
      segments: [
        { label: 'Occupied Beds', value: 18, color: '#16A34A' },
        { label: 'Available Beds', value: 11, color: '#A7E3C1' },
      ],
      totalLabel: 'Total Beds',
      total: 29,
    },
    detailsRoute: '/nurse/ward-census',
  },
  {
    id: 'dmc-pharmacy',
    department: 'Pharmacy',
    icon: Pill,
    iconColor: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.1)',
    status: 'Operational',
    primaryMetric: { value: 31, label: 'Prescriptions Dispensed' },
    secondaryMetric: { value: 6, label: 'Pending Dispensing' },
    visual: { kind: 'trend', color: '#7C3AED', hourlyData: buildHourlyTrend(13, 40) },
    detailsRoute: '/pharmacy/prescriptions/queue',
  },
  {
    id: 'dmc-laboratory',
    department: 'Laboratory',
    icon: Beaker,
    iconColor: '#D97706',
    iconBg: 'rgba(217,119,6,0.1)',
    status: 'Operational',
    primaryMetric: { value: LAB_TESTS_PROCESSED_TODAY, label: 'Tests Processed' },
    secondaryMetric: { value: 14, label: 'Pending Results' },
    visual: { kind: 'trend', color: '#D97706', hourlyData: buildHourlyTrend(10, 58) },
    detailsRoute: '/laboratory/result-verification',
  },
  {
    id: 'dmc-emergency',
    department: 'Emergency',
    icon: Siren,
    iconColor: '#DC2626',
    iconBg: 'rgba(220,38,38,0.1)',
    status: 'Busy',
    primaryMetric: { value: 8, label: 'Active Cases' },
    secondaryMetric: { value: 7, label: 'Waiting Patients' },
    visual: { kind: 'trend', color: '#DC2626', hourlyData: buildHourlyTrend(20, 15) },
    detailsRoute: '/emergency/tracking-board',
  },
  {
    id: 'dmc-billing',
    department: 'Accounts & Billing',
    icon: Wallet,
    iconColor: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.1)',
    status: 'Operational',
    primaryMetric: { value: INVOICES_GENERATED_TODAY, label: 'Invoices Today' },
    secondaryMetric: { value: 986_000, label: 'Payments Collected' },
    visual: {
      kind: 'bars',
      segments: [
        { label: 'Outstanding Invoices', value: 259_500, color: '#D97706', isCurrency: true },
        { label: 'Overdue Invoices', value: 73_000, color: '#DC2626', isCurrency: true },
      ],
      totalLabel: 'Payments Collected',
      total: 986_000,
    },
    detailsRoute: '/admin/billing-overview',
  },
  {
    id: 'dmc-records',
    department: 'Records',
    icon: FolderOpen,
    iconColor: '#2563EB',
    iconBg: 'rgba(37,99,235,0.1)',
    status: 'Operational',
    primaryMetric: { value: 32, label: 'New Records' },
    secondaryMetric: { value: 16, label: 'Requests Pending' },
    visual: { kind: 'trend', color: '#2563EB', hourlyData: buildHourlyTrend(15, 35) },
    detailsRoute: '/medical-records/requests',
  },
  {
    id: 'dmc-administration',
    department: 'Administration',
    icon: Settings,
    iconColor: '#4A7080',
    iconBg: 'rgba(74,112,128,0.1)',
    status: 'Operational',
    primaryMetric: { value: 7, label: 'System Notices' },
    secondaryMetric: { value: 3, label: 'Tasks Pending' },
    visual: {
      kind: 'tasks',
      tasks: [
        { id: 'task-1', label: 'Approve pricing update for Malaria Test', timeLabel: '20m ago' },
        { id: 'task-2', label: 'Review staff access requests', timeLabel: '1h ago' },
        { id: 'task-3', label: 'Department meeting at 3:00 PM', timeLabel: '2h ago' },
      ],
    },
    detailsRoute: '/admin',
  },
];
