/**
 * Mock fixtures for the Administration Dashboard. Modelled directly on the
 * reference mockup (`Admin Dashboard/Dashboard (2).png`). The workforce
 * stat card is deliberately NOT here; it's computed live from
 * `staffShiftStore.ts` in `AdministrationDashboardWorkspace.tsx` itself
 * (same `computeWorkforceStats()` Workforce Management uses), kept even
 * though the mockup doesn't have it since Workforce Management otherwise
 * has no Dashboard entry point. Patients Today and Appointments Today are
 * also computed live in the workspace component, from
 * `registrationQueueStore.ts` / `appointmentStore.ts`, real cross-workflow
 * counts, not fixtures. Everything else here has no real cross-module store
 * yet (a unified staff-account directory, a system-tickets queue, per-
 * department live operational metrics). Swap out by pointing hooks to real
 * endpoints in Phase 6.
 */

import {
  BadgeDollarSign,
  Building2,
  ClipboardCheck,
  FileText,
  KeyRound,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  UserPlus,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { formatDateTime } from '@/utils/datetime';

export const TOTAL_STAFF = 128;
export const TOTAL_STAFF_DELTA = '3 new this month';
export const ACTIVE_USERS = 114;
export const ACTIVE_USERS_DELTA = '5 since yesterday';
export const OUTSTANDING_TASKS = 17;
export const SYSTEM_ALERTS_COUNT = 5;

export type ActivityEntry = {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  detail: string;
  timeLabel: string;
};

function hoursAgo(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return formatDateTime(d);
}

export const RECENT_ACTIVITY: ActivityEntry[] = [
  {
    id: 'act-1',
    icon: BadgeDollarSign,
    iconColor: '#22C55E',
    iconBg: 'rgba(34,197,94,0.10)',
    title: 'Service price updated for Malaria Test',
    detail: '₦3,500 to ₦4,000',
    timeLabel: hoursAgo(1),
  },
  {
    id: 'act-2',
    icon: UserCheck,
    iconColor: '#22C55E',
    iconBg: 'rgba(34,197,94,0.10)',
    title: 'John Okafor (Pharmacist) account activated',
    detail: 'Pharmacy · Awka campus',
    timeLabel: hoursAgo(2),
  },
  {
    id: 'act-3',
    icon: UserPlus,
    iconColor: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.10)',
    title: 'New staff added to Nursing department',
    detail: 'Mary Uche · Staff Nurse',
    timeLabel: hoursAgo(9),
  },
  {
    id: 'act-4',
    icon: FileText,
    iconColor: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.10)',
    title: 'Revenue report generated',
    detail: 'July 2026 · Financial Reports',
    timeLabel: hoursAgo(15),
  },
  {
    id: 'act-5',
    icon: KeyRound,
    iconColor: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.10)',
    title: 'Password reset for user Grace Eze',
    detail: 'Nursing / Wards · Chief Nursing Officer',
    timeLabel: hoursAgo(30),
  },
];

export type AdministrativeAlert = {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  detail: string;
  timeLabel: string;
};

export const ADMINISTRATIVE_ALERTS: AdministrativeAlert[] = [
  {
    id: 'aalrt-1',
    icon: UserPlus,
    iconColor: '#DC2626',
    iconBg: 'rgba(220,38,38,0.1)',
    title: '3 staff accounts awaiting activation',
    detail: 'Pending verification and account setup',
    timeLabel: '20m ago',
  },
  {
    id: 'aalrt-2',
    icon: BadgeDollarSign,
    iconColor: '#D97706',
    iconBg: 'rgba(217,119,6,0.1)',
    title: '2 pricing changes awaiting publication',
    detail: 'Review and publish updated service prices',
    timeLabel: '1h ago',
  },
  {
    id: 'aalrt-3',
    icon: Building2,
    iconColor: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.1)',
    title: '1 department configuration issue',
    detail: 'Laboratory equipment maintenance alert',
    timeLabel: '2h ago',
  },
  {
    id: 'aalrt-4',
    icon: ClipboardCheck,
    iconColor: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.1)',
    title: '5 pending approval requests',
    detail: 'Leave, role access and document approvals',
    timeLabel: '3h ago',
  },
];

export type DepartmentStatusRow = {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  department: string;
  status: 'Operational' | 'Busy';
  keyMetric: string;
  /** Set instead of a literal keyMetric string for a Naira figure, so the
   * component can run it through formatCurrencyWhole() rather than a
   * hardcoded, unformatted string. */
  keyMetricAmount?: number;
  metricLabel: string;
  trend: 'up' | 'down';
};

export const DEPARTMENT_STATUS: DepartmentStatusRow[] = [
  {
    id: 'dept-1',
    icon: Stethoscope,
    iconColor: '#2563EB',
    iconBg: 'rgba(37,99,235,0.1)',
    department: 'Clinical / Consultation',
    status: 'Operational',
    keyMetric: '24 Consultations',
    metricLabel: 'Today',
    trend: 'up',
  },
  {
    id: 'dept-2',
    icon: Building2,
    iconColor: '#16A34A',
    iconBg: 'rgba(22,163,74,0.1)',
    department: 'Nursing / Wards',
    status: 'Operational',
    keyMetric: '18 Patients',
    metricLabel: 'in wards',
    trend: 'up',
  },
  {
    id: 'dept-3',
    icon: Wrench,
    iconColor: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.1)',
    department: 'Pharmacy',
    status: 'Operational',
    keyMetric: '31 Prescriptions',
    metricLabel: 'Dispensed today',
    trend: 'up',
  },
  {
    id: 'dept-4',
    icon: ShieldAlert,
    iconColor: '#D97706',
    iconBg: 'rgba(217,119,6,0.1)',
    department: 'Laboratory',
    status: 'Operational',
    keyMetric: '46 Tests',
    metricLabel: 'Processed today',
    trend: 'up',
  },
  {
    id: 'dept-5',
    icon: ShieldAlert,
    iconColor: '#DC2626',
    iconBg: 'rgba(220,38,38,0.1)',
    department: 'Emergency',
    status: 'Busy',
    keyMetric: '8 Active Cases',
    metricLabel: 'In triage',
    trend: 'up',
  },
  {
    id: 'dept-6',
    icon: BadgeDollarSign,
    iconColor: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.1)',
    department: 'Accounts & Billing',
    status: 'Operational',
    keyMetric: '',
    keyMetricAmount: 986_000,
    metricLabel: 'Collected today',
    trend: 'up',
  },
];
