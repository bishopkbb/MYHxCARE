'use client';

/**
 * Stock Transfers — real, shared, reactive state (`useSyncExternalStore`,
 * same pattern as `stockReceivingStore.ts`/`inventoryStore.ts`). Completing a
 * transfer is a genuine stock movement: it calls inventoryStore.ts's
 * transferStockBetweenLocations(), which decrements the source location's
 * batch and credits the destination — not just a status flip. Swap out by
 * pointing these actions at real `POST /pharmacy/transfers` endpoints in
 * Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  STOCK_TRANSFERS_SEED,
  type StockTransfer,
  type StockTransferItem,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { transferStockBetweenLocations } from '@/features/pharmacy/store/inventoryStore';
import type { PharmacyLocationId } from '@/constants/pharmacyLocations';

let transfers: StockTransfer[] = [...STOCK_TRANSFERS_SEED];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StockTransfer[] {
  return transfers;
}

function getServerSnapshot(): StockTransfer[] {
  return STOCK_TRANSFERS_SEED;
}

export function useTransfers(): StockTransfer[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getTransfersSnapshot(): StockTransfer[] {
  return getSnapshot();
}

let transferSeq = 1000;

export type CreateTransferInput = {
  fromLocationId: PharmacyLocationId;
  toLocationId: PharmacyLocationId;
  requestedBy: string;
  items: StockTransferItem[];
  notes?: string;
};

/** Requests a new transfer — starts life as Pending Approval, waiting for a
 * pharmacist to approve and dispatch it. */
export function createTransfer(input: CreateTransferInput): string {
  transferSeq += 1;
  const id = `TRF-${new Date().getFullYear()}-${String(transferSeq).padStart(5, '0')}`;
  const transfer: StockTransfer = {
    id,
    fromLocationId: input.fromLocationId,
    toLocationId: input.toLocationId,
    status: 'Pending Approval',
    requestedAt: new Date().toISOString(),
    requestedBy: input.requestedBy,
    items: input.items,
    ...(input.notes ? { notes: input.notes } : {}),
  };
  transfers = [transfer, ...transfers];
  emit();
  return id;
}

/** Approves a pending request and dispatches it — the stock is now
 * physically in transit, but hasn't moved in the system yet. */
export function approveTransfer(id: string): void {
  const idx = transfers.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const t = transfers[idx]!;
  if (t.status !== 'Pending Approval') return;
  transfers = transfers.map((x, i) =>
    i === idx ? { ...x, status: 'In Transit', dispatchedAt: new Date().toISOString() } : x,
  );
  emit();
}

/** Declines a pending request — it never gets dispatched. */
export function rejectTransfer(id: string): void {
  const idx = transfers.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const t = transfers[idx]!;
  if (t.status !== 'Pending Approval') return;
  transfers = transfers.map((x, i) =>
    i === idx ? { ...x, status: 'Rejected', cancelledAt: new Date().toISOString() } : x,
  );
  emit();
}

/** Withdraws a transfer that hasn't been dispatched yet. */
export function cancelTransfer(id: string): void {
  const idx = transfers.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const t = transfers[idx]!;
  if (t.status !== 'Draft' && t.status !== 'Pending Approval') return;
  transfers = transfers.map((x, i) =>
    i === idx ? { ...x, status: 'Cancelled', cancelledAt: new Date().toISOString() } : x,
  );
  emit();
}

/** Confirms the stock has arrived — the one write action that genuinely
 * moves inventory: the source location's batch loses the quantity, and the
 * destination location gains it. */
export function completeTransfer(id: string): void {
  const idx = transfers.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const t = transfers[idx]!;
  if (t.status !== 'In Transit') return;
  transfers = transfers.map((x, i) =>
    i === idx ? { ...x, status: 'Completed', completedAt: new Date().toISOString() } : x,
  );
  transferStockBetweenLocations(
    t.fromLocationId,
    t.toLocationId,
    t.items.map((item) => ({
      medicationName: item.medicationName,
      batchNo: item.batchNo,
      qty: item.qty,
    })),
  );
  emit();
}
