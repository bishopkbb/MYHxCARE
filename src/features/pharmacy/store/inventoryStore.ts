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
