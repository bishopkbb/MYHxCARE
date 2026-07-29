'use client';

/**
 * Stock Adjustments — real, shared, reactive state (`useSyncExternalStore`,
 * same pattern as `stockTransferStore.ts`/`inventoryStore.ts`). Recording an
 * adjustment calls inventoryStore.ts's `adjustStockQty()` on the real batch
 * — the number this screen shows becomes the number Drug Inventory shows,
 * not a parallel ledger. Swap out by pointing this at a real
 * `POST /pharmacy/adjustments` endpoint in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  STOCK_ADJUSTMENTS_SEED,
  type AdjustmentReason,
  type AdjustmentType,
  type StockAdjustment,
  type StockAdjustmentItem,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { adjustStockQty, getAllBatchesAtLocation } from '@/features/pharmacy/store/inventoryStore';
import type { PharmacyLocationId } from '@/constants/pharmacyLocations';

let adjustments: StockAdjustment[] = [...STOCK_ADJUSTMENTS_SEED];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StockAdjustment[] {
  return adjustments;
}

function getServerSnapshot(): StockAdjustment[] {
  return STOCK_ADJUSTMENTS_SEED;
}

export function useAdjustments(): StockAdjustment[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

let seq = 1000;

export type CreateAdjustmentInput = {
  locationId: PharmacyLocationId;
  adjustmentType: AdjustmentType;
  reason: AdjustmentReason;
  items: StockAdjustmentItem[];
  referenceNo?: string;
  notes?: string;
};

/** Records an adjustment and applies it to the real batch at that location —
 * an Increase raises stockQty, a Decrease lowers it (never below 0). */
export function createAdjustment(input: CreateAdjustmentInput, adjustedBy: string): string {
  seq += 1;
  const id = `ADJ-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;

  const adjustment: StockAdjustment = {
    id,
    locationId: input.locationId,
    adjustmentType: input.adjustmentType,
    reason: input.reason,
    items: input.items,
    adjustedBy,
    adjustedAt: new Date().toISOString(),
    ...(input.referenceNo ? { referenceNo: input.referenceNo } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };
  adjustments = [adjustment, ...adjustments];

  const locationBatches = getAllBatchesAtLocation(input.locationId);
  for (const item of input.items) {
    const batch = locationBatches.find(
      (b) => b.medicationName === item.medicationName && b.batchNo === item.batchNo,
    );
    if (!batch) continue;
    const delta = input.adjustmentType === 'Increase' ? item.qty : -item.qty;
    adjustStockQty(batch.id, batch.stockQty + delta);
  }

  emit();
  return id;
}
