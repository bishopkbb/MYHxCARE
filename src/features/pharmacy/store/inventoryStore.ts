'use client';

/**
 * Drug Inventory — real, shared, reactive state (`useSyncExternalStore`, same
 * pattern as `pharmacyDispensingStore.ts`/`refillRequestStore.ts`). Add Stock
 * and Adjust Stock are real mutations this screen's own stat cards, donut,
 * and table all re-derive from live — not page-local state seeded once from
 * a static fixture. Swap out by pointing these actions at real
 * `POST /pharmacy/inventory/batches` / `PATCH /pharmacy/inventory/batches/{id}`
 * endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  INVENTORY_BATCHES_SEED,
  type InventoryBatchRow,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import type { PharmacyLocationId } from '@/constants/pharmacyLocations';

let batches: InventoryBatchRow[] = [...INVENTORY_BATCHES_SEED];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): InventoryBatchRow[] {
  return batches;
}

function getServerSnapshot(): InventoryBatchRow[] {
  return INVENTORY_BATCHES_SEED;
}

export function useInventoryBatches(): InventoryBatchRow[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getInventoryBatchesSnapshot(): InventoryBatchRow[] {
  return getSnapshot();
}

let seq = 0;

/** Receives a new batch into stock — a real goods-received event, not a
 * dead-end "Add Stock" toast. */
export function addStockBatch(entry: Omit<InventoryBatchRow, 'id'>): string {
  seq += 1;
  const id = `inv-new-${Date.now()}-${seq}`;
  batches = [{ ...entry, id }, ...batches];
  emit();
  return id;
}

/** Corrects a batch's on-hand quantity — a stock count, a damage write-off, a
 * dispense reconciliation. */
export function adjustStockQty(id: string, newQty: number): void {
  const idx = batches.findIndex((b) => b.id === id);
  if (idx === -1) return;
  const safeQty = Math.max(0, Math.round(newQty));
  batches = batches.map((b, i) => (i === idx ? { ...b, stockQty: safeQty } : b));
  emit();
}

/** Batches currently on hand at one location with stock to give — the source
 * list stockTransferStore.ts's New Transfer picker offers a pharmacist. */
export function getBatchesAtLocation(locationId: PharmacyLocationId): InventoryBatchRow[] {
  return batches.filter((b) => b.locationId === locationId && b.stockQty > 0);
}

/** Toggles a batch's quarantine hold — independent of stock level or expiry,
 * for Batch Management's "Put On Hold" / "Release Hold" action. */
export function toggleBatchHold(id: string): void {
  const idx = batches.findIndex((b) => b.id === id);
  if (idx === -1) return;
  batches = batches.map((b, i) => (i === idx ? { ...b, isOnHold: !b.isOnHold } : b));
  emit();
}

/** Every batch tracked at one location, including ones already at zero —
 * stockAdjustmentStore.ts's New Adjustment picker needs zero-stock batches
 * too (e.g. correcting an under-recorded receipt back up from 0). */
export function getAllBatchesAtLocation(locationId: PharmacyLocationId): InventoryBatchRow[] {
  return batches.filter((b) => b.locationId === locationId);
}

/** Moves real stock between two locations — decrements the matching batch at
 * the source (never below what's actually on hand) and credits the same
 * batch at the destination, creating it there if this is the first time that
 * batch has arrived. This is what makes completing a Stock Transfer a real
 * inventory movement rather than a status flip. */
export function transferStockBetweenLocations(
  fromLocationId: PharmacyLocationId,
  toLocationId: PharmacyLocationId,
  items: { medicationName: string; batchNo: string; qty: number }[],
): void {
  for (const item of items) {
    const sourceIdx = batches.findIndex(
      (b) =>
        b.locationId === fromLocationId &&
        b.medicationName === item.medicationName &&
        b.batchNo === item.batchNo,
    );
    if (sourceIdx === -1) continue;
    const source = batches[sourceIdx]!;
    const moveQty = Math.min(item.qty, source.stockQty);
    if (moveQty <= 0) continue;

    batches = batches.map((b, i) =>
      i === sourceIdx ? { ...b, stockQty: b.stockQty - moveQty } : b,
    );

    const destIdx = batches.findIndex(
      (b) =>
        b.locationId === toLocationId &&
        b.medicationName === item.medicationName &&
        b.batchNo === item.batchNo,
    );
    if (destIdx === -1) {
      seq += 1;
      batches = [
        {
          ...source,
          id: `inv-xfer-${Date.now()}-${seq}`,
          locationId: toLocationId,
          stockQty: moveQty,
        },
        ...batches,
      ];
    } else {
      batches = batches.map((b, i) =>
        i === destIdx ? { ...b, stockQty: b.stockQty + moveQty } : b,
      );
    }
  }
  emit();
}
