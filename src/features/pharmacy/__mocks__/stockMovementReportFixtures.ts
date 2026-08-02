/**
 * Fixtures/adapter for the Stock Movement Report screen.
 *
 * Unlike Inventory Report (one live snapshot store), this one unifies FOUR
 * live stores into a single movement ledger — every one of them already
 * mutates the real inventoryStore.ts batches, so this report is a real
 * audit trail, not a parallel invented log:
 *   - stockReceivingStore.ts's receipts   → always "In" (goods received)
 *   - stockTransferStore.ts's transfers   → "Out" at the source location and
 *     "In" at the destination, one row each, only for status === 'Completed'
 *     (the one status where transferStockBetweenLocations() actually ran)
 *   - stockAdjustmentStore.ts's adjustments → "In" for Increase, "Out" for
 *     Decrease — every adjustment already mutated real stock on creation
 *   - medicationReturnsStore.ts's returns → "In" for a genuine restock,
 *     "Out" for a Completed Expired/Damaged return (destroyed, never
 *     re-enters stock) — only status === 'Completed' counts either way
 * Only each stat card's "vs May 2026" delta remains decorative narrative,
 * same as every other report screen.
 */

import type { LucideIcon } from 'lucide-react';
import { ArrowLeftRight, Layers, PackageMinus, PackagePlus, Scale, Wallet } from 'lucide-react';

import { getCatalogEntry } from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import type {
  MedicationReturn,
  StockAdjustment,
  StockReceipt,
  StockTransfer,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import type { PharmacyLocationId } from '@/constants/pharmacyLocations';

export type MovementType = 'Received' | 'Transferred' | 'Adjusted' | 'Returned';
export type MovementDirection = 'In' | 'Out';

export type StockMovementRecord = {
  id: string;
  date: string; // ISO
  type: MovementType;
  direction: MovementDirection;
  medicationName: string;
  strength: string;
  form: string;
  qty: number;
  locationId: PharmacyLocationId;
  reference: string;
  performedBy: string;
  reason: string;
  unitValue: number;
  totalValue: number;
};

export function buildMovementLedger(
  receipts: StockReceipt[],
  transfers: StockTransfer[],
  adjustments: StockAdjustment[],
  returns: MedicationReturn[],
): StockMovementRecord[] {
  const rows: StockMovementRecord[] = [];

  for (const r of receipts) {
    for (const item of r.items) {
      if (item.receivedQty <= 0) continue;
      rows.push({
        id: `${r.id}-${item.batchNo}`,
        date: r.receivedAt,
        type: 'Received',
        direction: 'In',
        medicationName: item.medicationName,
        strength: item.strength,
        form: item.form,
        qty: item.receivedQty,
        locationId: r.warehouseLocationId,
        reference: r.id,
        performedBy: r.receivedBy,
        reason: `Goods receipt from ${r.supplier}`,
        unitValue: item.unitPrice,
        totalValue: item.receivedQty * item.unitPrice,
      });
    }
  }

  for (const t of transfers) {
    if (t.status !== 'Completed') continue;
    for (const item of t.items) {
      const unitValue = getCatalogEntry(item.medicationName)?.unitPrice ?? 0;
      const base = {
        date: t.completedAt ?? t.requestedAt,
        type: 'Transferred' as const,
        medicationName: item.medicationName,
        strength: item.strength,
        form: item.form,
        qty: item.qty,
        reference: t.id,
        performedBy: t.requestedBy,
        unitValue,
        totalValue: item.qty * unitValue,
      };
      rows.push({
        ...base,
        id: `${t.id}-${item.batchNo}-out`,
        direction: 'Out',
        locationId: t.fromLocationId,
        reason: `Transfer out to destination location`,
      });
      rows.push({
        ...base,
        id: `${t.id}-${item.batchNo}-in`,
        direction: 'In',
        locationId: t.toLocationId,
        reason: `Transfer in from source location`,
      });
    }
  }

  for (const a of adjustments) {
    for (const item of a.items) {
      rows.push({
        id: `${a.id}-${item.batchNo}`,
        date: a.adjustedAt,
        type: 'Adjusted',
        direction: a.adjustmentType === 'Increase' ? 'In' : 'Out',
        medicationName: item.medicationName,
        strength: item.strength,
        form: item.form,
        qty: item.qty,
        locationId: a.locationId,
        reference: a.id,
        performedBy: a.adjustedBy,
        reason: a.reason,
        unitValue: item.unitPrice,
        totalValue: item.qty * item.unitPrice,
      });
    }
  }

  for (const ret of returns) {
    if (ret.status !== 'Completed') continue;
    rows.push({
      id: ret.id,
      date: ret.returnDate,
      type: 'Returned',
      direction: ret.returnType === 'Expired/Damaged' ? 'Out' : 'In',
      medicationName: ret.medicationName,
      strength: ret.strength,
      form: ret.form,
      qty: ret.qtyReturned,
      // Returns restock at the flagship campus (medicationReturnsStore.ts's
      // own completeReturn() convention) — mirrored here for consistency.
      locationId: 'loc_awka' as PharmacyLocationId,
      reference: ret.id,
      performedBy: ret.returnedBy,
      reason: `${ret.returnType} — ${ret.reason}`,
      unitValue: ret.unitPrice,
      totalValue: ret.qtyReturned * ret.unitPrice,
    });
  }

  return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const MOVEMENT_TYPE_OPTIONS: { value: MovementType; label: string }[] = [
  { value: 'Received', label: 'Received' },
  { value: 'Transferred', label: 'Transferred' },
  { value: 'Adjusted', label: 'Adjusted' },
  { value: 'Returned', label: 'Returned' },
];

export const MOVEMENT_DIRECTION_OPTIONS: { value: MovementDirection; label: string }[] = [
  { value: 'In', label: 'In' },
  { value: 'Out', label: 'Out' },
];

export const MOVEMENT_TYPE_CFG: Record<
  MovementType,
  { color: string; border: string; bg: string; icon: LucideIcon }
> = {
  Received: {
    color: '#16A34A',
    border: 'rgba(22,163,74,0.35)',
    bg: 'rgba(22,163,74,0.08)',
    icon: PackagePlus,
  },
  Transferred: {
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.35)',
    bg: 'rgba(59,130,246,0.08)',
    icon: ArrowLeftRight,
  },
  Adjusted: {
    color: '#D97706',
    border: 'rgba(217,119,6,0.35)',
    bg: 'rgba(217,119,6,0.08)',
    icon: Scale,
  },
  Returned: {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.35)',
    bg: 'rgba(124,58,237,0.08)',
    icon: PackageMinus,
  },
};

// ── Stat card shells — values are computed live by the workspace ───────────

export type ReportStatInfo = { percent: number; direction: 'up' | 'down'; comparedTo: string };

export type ReportStatMeta = {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  info: ReportStatInfo;
};

export const STOCK_MOVEMENT_STAT_META: ReportStatMeta[] = [
  {
    id: 'total-movements',
    label: 'Total Movements',
    icon: Layers,
    accent: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    info: { percent: 11.3, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'stock-in',
    label: 'Total Stock In (Units)',
    icon: PackagePlus,
    accent: '#16A34A',
    iconBg: 'rgba(22,163,74,0.12)',
    info: { percent: 9.6, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'stock-out',
    label: 'Total Stock Out (Units)',
    icon: PackageMinus,
    accent: '#DC2626',
    iconBg: 'rgba(220,38,38,0.12)',
    info: { percent: 6.4, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'net-change',
    label: 'Net Stock Change (Units)',
    icon: Scale,
    accent: '#D97706',
    iconBg: 'rgba(217,119,6,0.12)',
    info: { percent: 4.1, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'total-value',
    label: 'Total Value Moved (₦)',
    icon: Wallet,
    accent: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    info: { percent: 15.2, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'completed-transfers',
    label: 'Completed Transfers',
    icon: ArrowLeftRight,
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
    info: { percent: 7.8, direction: 'up', comparedTo: 'May 2026' },
  },
];

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  Received: '#16A34A',
  Transferred: '#3B82F6',
  Adjusted: '#D97706',
  Returned: '#7C3AED',
};
