/**
 * Mock fixtures for the Administration Dashboard. The workforce-related
 * stats on this dashboard are deliberately NOT here; they're computed live
 * from `staffShiftStore.ts` in `AdministrationDashboardWorkspace.tsx` itself
 * (same `computeWorkforceStats()` Workforce Management uses), so a shift
 * created/cancelled/acknowledged there is reflected here immediately. This
 * file only holds the things with no real cross-module store yet: account
 * counts, system tickets, facility reports, recent activity, and alerts.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  UserPlus,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { HOSPITAL_DEPARTMENTS } from '@/constants/departments';
import { formatDateTime } from '@/utils/datetime';

export type DashboardStat = {
  label: string;
  count: number;
  info: string;
};

// Total staff accounts across every workspace: a plausible hospital-wide
// headcount, not derived from any one workspace's own roster (no single
// store holds every account yet; see the domain model's own note that a
// unified Staff/User directory is Administration's future remit).
export const TOTAL_STAFF_ACCOUNTS = 156;
export const PENDING_STAFF_REQUESTS = 4;
export const OPEN_SYSTEM_TICKETS = 7;
export const FACILITY_ISSUES_REPORTED = 3;

// Real, not fabricated: the same canonical department list Registration's
// own Check-In/Insurance screens already read from.
export const DEPARTMENT_COUNT = HOSPITAL_DEPARTMENTS.length;

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
    icon: UserPlus,
    iconColor: '#22C55E',
    iconBg: 'rgba(34,197,94,0.10)',
    title: 'New staff account created',
    detail: 'Chidinma Obasi (HR Manager) · IT & Systems',
    timeLabel: hoursAgo(1),
  },
  {
    id: 'act-2',
    icon: KeyRound,
    iconColor: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.10)',
    title: 'Role permissions updated',
    detail: 'BILLING_OFFICER role granted billing:write',
    timeLabel: hoursAgo(3),
  },
  {
    id: 'act-3',
    icon: Wrench,
    iconColor: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.10)',
    title: 'Facility issue reported',
    detail: 'Generator maintenance flagged at Awka campus',
    timeLabel: hoursAgo(6),
  },
  {
    id: 'act-4',
    icon: Building2,
    iconColor: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.10)',
    title: 'Department configuration updated',
    detail: 'Laboratory department contact details revised',
    timeLabel: hoursAgo(9),
  },
  {
    id: 'act-5',
    icon: CheckCircle2,
    iconColor: '#22C55E',
    iconBg: 'rgba(34,197,94,0.10)',
    title: 'System ticket resolved',
    detail: 'Pharmacy login-timeout issue closed by IT',
    timeLabel: hoursAgo(14),
  },
];

export type SystemAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  timeLabel: string;
};

export const SYSTEM_ALERTS: SystemAlert[] = [
  {
    id: 'alrt-1',
    severity: 'warning',
    title: 'Pending staff account approvals',
    detail: `${PENDING_STAFF_REQUESTS} new account requests awaiting review`,
    timeLabel: hoursAgo(2),
  },
  {
    id: 'alrt-2',
    severity: 'critical',
    title: 'Facility issue unresolved',
    detail: 'Nnewi campus plumbing report open for 2 days',
    timeLabel: hoursAgo(48),
  },
  {
    id: 'alrt-3',
    severity: 'info',
    title: 'Scheduled maintenance window',
    detail: 'System-wide maintenance planned for Sunday 02:00–04:00',
    timeLabel: hoursAgo(20),
  },
];

export const ALERT_SEVERITY_CFG: Record<
  SystemAlert['severity'],
  { icon: LucideIcon; color: string; bg: string; border: string }
> = {
  critical: {
    icon: ShieldAlert,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.3)',
  },
  warning: {
    icon: AlertTriangle,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.3)',
  },
  info: {
    icon: CheckCircle2,
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.06)',
    border: 'rgba(0,180,216,0.3)',
  },
};
