/**
 * Fixtures for the Inventory Report screen.
 *
 * Unlike Prescription Report and Dispensing Report (which model a month of
 * transactional history no live store tracks), inventory IS a point-in-time
 * snapshot — exactly what inventoryStore.ts's live `batches` array already
 * is. So this file carries only what genuinely has no live equivalent:
 * - the Inventory Value Trend series (the store keeps current stock, not a
 *   history of what it was worth on past days)
 * - the Fast/Slow/Non Moving breakdown and turnover figures (would need a
 *   per-item dispensing-velocity history the model doesn't capture)
 * - each stat card's "vs May 2026" delta (narrative flavor, same as every
 *   other report screen — there's no stored prior-month snapshot to diff)
 * Everything else (stat values, category donut, top stocked/expiring items,
 * the details table) is computed live from useInventoryBatches() in the
 * workspace component itself, not duplicated here.
 */

import type { LucideIcon } from 'lucide-react';
import { Boxes, Package, PackageX, ShoppingCart, TriangleAlert, Wallet } from 'lucide-react';

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
// useInventoryBatches()) — this only carries the icon/color/delta shell.
export const INVENTORY_REPORT_STAT_META: ReportStatMeta[] = [
  {
    id: 'total-value',
    label: 'Total Inventory Value (₦)',
    icon: Wallet,
    accent: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
    info: { percent: 18.7, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'total-items',
    label: 'Total Items in Stock',
    icon: Boxes,
    accent: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    info: { percent: 12.6, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'low-stock',
    label: 'Low Stock Items',
    icon: TriangleAlert,
    accent: '#D97706',
    iconBg: 'rgba(217,119,6,0.12)',
    info: { percent: 8.8, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'out-of-stock',
    label: 'Out of Stock Items',
    icon: PackageX,
    accent: '#DC2626',
    iconBg: 'rgba(220,38,38,0.12)',
    info: { percent: 3.2, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'near-expiry',
    label: 'Near Expiry Items',
    icon: Package,
    accent: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.12)',
    info: { percent: 15.4, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'items-received',
    label: 'Items Received',
    icon: ShoppingCart,
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
    info: { percent: 14.2, direction: 'up', comparedTo: 'May 2026' },
  },
];

export type TrendPoint = { label: string; value: number };

/** Synthetic day-by-day fluctuation, anchored so the last point equals the
 * real current total value passed in — the shape is decorative, the
 * endpoint isn't. */
export function buildInventoryValueTrend(currentTotal: number): TrendPoint[] {
  const days = 30;
  const points: TrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = i + 1;
    const wave = Math.sin(day / 2.4) * 0.05 + Math.cos(day / 1.8) * 0.03;
    const isLast = i === days - 1;
    const value = isLast ? currentTotal : Math.max(0, Math.round(currentTotal * (0.88 + wave)));
    points.push({ label: `Jun ${day}`, value });
  }
  return points;
}

// ── Inventory Summary panel — the two figures with no live equivalent ──────
export const AVERAGE_STOCK_COVERAGE_DAYS = 34;
export const INVENTORY_TURNOVER_RATIO = 2.48;

/** Fast/Slow/Non Moving needs a per-item dispensing-velocity history the
 * inventory model doesn't track — percentages are a plausible static split
 * of the real batch count, not independently invented totals. */
export function buildMovementBreakdown(totalBatches: number) {
  const fastMoving = Math.round(totalBatches * 0.33);
  const slowMoving = Math.round(totalBatches * 0.229);
  const nonMoving = Math.max(0, totalBatches - fastMoving - slowMoving);
  return [
    { label: 'Fast Moving Items', value: fastMoving },
    { label: 'Slow Moving Items', value: slowMoving },
    { label: 'Non Moving Items', value: nonMoving },
  ];
}

export const CATEGORY_COLORS = [
  '#00B4D8',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#22C55E',
  '#8A98A3',
];
