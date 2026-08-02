/**
 * Fixtures for the Procurement Report screen.
 *
 * Same live-snapshot convention as Inventory/Expiry/Stock Movement Report —
 * reads procurementRequestStore.ts's real requests rather than a parallel
 * invented dataset. Marking a request "Ordered" already creates a real
 * PurchaseOrder in stockReceivingStore.ts (the same bridge Stock Movement
 * Report's ledger reads), so a request that's progressed through the real
 * pipeline shows that here too. Only each stat card's "vs May 2026" delta
 * is decorative narrative.
 */

import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, ClipboardList, Clock, PackageCheck, Truck, Wallet } from 'lucide-react';

import type { ProcurementRequestStatus } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

export const STATUS_CFG: Record<
  ProcurementRequestStatus,
  { color: string; border: string; bg: string }
> = {
  'Pending Approval': {
    color: '#D97706',
    border: 'rgba(217,119,6,0.35)',
    bg: 'rgba(217,119,6,0.08)',
  },
  Approved: { color: '#2563EB', border: 'rgba(37,99,235,0.35)', bg: 'rgba(37,99,235,0.08)' },
  Rejected: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Ordered: { color: '#7C3AED', border: 'rgba(124,58,237,0.35)', bg: 'rgba(124,58,237,0.08)' },
  'Partially Received': {
    color: '#EAB308',
    border: 'rgba(234,179,8,0.35)',
    bg: 'rgba(234,179,8,0.08)',
  },
  Completed: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

export const PRIORITY_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Medium: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Low: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

export type ReportStatInfo = { percent: number; direction: 'up' | 'down'; comparedTo: string };

export type ReportStatMeta = {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  info: ReportStatInfo;
};

// Values are filled in live by the workspace (real counts/sums from
// useProcurementRequests()) — this only carries the icon/color/delta shell.
export const PROCUREMENT_REPORT_STAT_META: ReportStatMeta[] = [
  {
    id: 'total-requests',
    label: 'Total Requests',
    icon: ClipboardList,
    accent: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    info: { percent: 9.1, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'pending-approval',
    label: 'Pending Approval',
    icon: Clock,
    accent: '#D97706',
    iconBg: 'rgba(217,119,6,0.12)',
    info: { percent: 6.4, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'approved',
    label: 'Approved',
    icon: CheckCircle2,
    accent: '#2563EB',
    iconBg: 'rgba(37,99,235,0.12)',
    info: { percent: 5.2, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'ordered',
    label: 'Ordered / In Transit',
    icon: Truck,
    accent: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.12)',
    info: { percent: 8.9, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: PackageCheck,
    accent: '#16A34A',
    iconBg: 'rgba(22,163,74,0.12)',
    info: { percent: 11.5, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'total-spend',
    label: 'Total Spend (₦)',
    icon: Wallet,
    accent: '#EC4899',
    iconBg: 'rgba(236,72,153,0.12)',
    info: { percent: 13.8, direction: 'up', comparedTo: 'May 2026' },
  },
];
