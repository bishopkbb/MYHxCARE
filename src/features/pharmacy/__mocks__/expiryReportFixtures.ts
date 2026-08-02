/**
 * Fixtures for the Expiry Report screen.
 *
 * Same live-snapshot convention as Inventory Report — reads
 * inventoryStore.ts's real batches through the expiry-bucket lens
 * (getExpiryBucket() / getBatchDaysLeft(), the same helpers Expiry
 * Management's own table uses), rather than a parallel invented dataset.
 * Only each stat card's "vs May 2026" delta is decorative narrative.
 */

import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CalendarClock, CalendarX2, Clock, ShieldCheck, Wallet } from 'lucide-react';

import type { ExpiryBucket } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

export const BUCKET_CFG: Record<ExpiryBucket, { color: string; border: string; bg: string }> = {
  Expired: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  '≤ 30 Days': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  '31 – 60 Days': { color: '#EAB308', border: 'rgba(234,179,8,0.35)', bg: 'rgba(234,179,8,0.08)' },
  '61 – 90 Days': { color: '#2563EB', border: 'rgba(37,99,235,0.35)', bg: 'rgba(37,99,235,0.08)' },
  '> 90 Days': { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
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

// Values are filled in live by the workspace (real bucket counts/sums from
// useInventoryBatches()) — this only carries the icon/color/delta shell.
export const EXPIRY_REPORT_STAT_META: ReportStatMeta[] = [
  {
    id: 'expired',
    label: 'Expired Items',
    icon: AlertTriangle,
    accent: '#DC2626',
    iconBg: 'rgba(220,38,38,0.12)',
    info: { percent: 5.4, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'within-30',
    label: 'Expiring ≤ 30 Days',
    icon: Clock,
    accent: '#D97706',
    iconBg: 'rgba(217,119,6,0.12)',
    info: { percent: 9.8, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: '31-60',
    label: 'Expiring 31 – 60 Days',
    icon: CalendarClock,
    accent: '#EAB308',
    iconBg: 'rgba(234,179,8,0.12)',
    info: { percent: 4.2, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: '61-90',
    label: 'Expiring 61 – 90 Days',
    icon: CalendarX2,
    accent: '#2563EB',
    iconBg: 'rgba(37,99,235,0.12)',
    info: { percent: 2.6, direction: 'down', comparedTo: 'May 2026' },
  },
  {
    id: 'value-at-risk',
    label: 'Value at Risk (≤ 30 Days)',
    icon: Wallet,
    accent: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    info: { percent: 11.7, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'healthy',
    label: 'Healthy Stock (> 90 Days)',
    icon: ShieldCheck,
    accent: '#16A34A',
    iconBg: 'rgba(22,163,74,0.12)',
    info: { percent: 3.1, direction: 'up', comparedTo: 'May 2026' },
  },
];
