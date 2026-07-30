'use client';

/**
 * Procurement Requests — real, shared, reactive state (`useSyncExternalStore`,
 * same pattern as `stockAdjustmentStore.ts`/`stockTransferStore.ts`). The one
 * genuine cross-store write is `markAsOrdered()`: it calls
 * `stockReceivingStore.ts`'s `addPurchaseOrder()`, so an Approved request
 * becoming "Ordered" creates a real Pending purchase order that shows up in
 * Stock Receiving immediately — not a status flip that goes nowhere else.
 * Swap out by pointing these actions at real `POST /pharmacy/procurement`
 * endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  PROCUREMENT_REQUESTS_SEED,
  type ProcurementPriority,
  type ProcurementRequest,
  type ProcurementRequestItem,
  type ProcurementRequestType,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { addPurchaseOrder } from '@/features/pharmacy/store/stockReceivingStore';

let requests: ProcurementRequest[] = [...PROCUREMENT_REQUESTS_SEED];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ProcurementRequest[] {
  return requests;
}
function getServerSnapshot(): ProcurementRequest[] {
  return PROCUREMENT_REQUESTS_SEED;
}

export function useProcurementRequests(): ProcurementRequest[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getProcurementRequest(id: string): ProcurementRequest | null {
  return requests.find((r) => r.id === id) ?? null;
}

let seq = PROCUREMENT_REQUESTS_SEED.length;

function nextRequestId(): string {
  seq += 1;
  return `PR-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
}

export type CreateProcurementRequestInput = {
  requestType: ProcurementRequestType;
  department: string;
  priority: ProcurementPriority;
  items: ProcurementRequestItem[];
  notes?: string;
};

/** Raises a new request — always starts Pending Approval. */
export function createRequest(input: CreateProcurementRequestInput, requestedBy: string): string {
  const id = nextRequestId();
  const request: ProcurementRequest = {
    id,
    requestType: input.requestType,
    department: input.department,
    requestedBy,
    priority: input.priority,
    createdAt: new Date().toISOString(),
    items: input.items,
    status: 'Pending Approval',
    ...(input.notes ? { notes: input.notes } : {}),
  };
  requests = [request, ...requests];
  emit();
  return id;
}

export function approveRequest(id: string, approvedBy: string): void {
  requests = requests.map((r) => (r.id === id ? { ...r, status: 'Approved', approvedBy } : r));
  emit();
}

export function rejectRequest(id: string, rejectedReason: string): void {
  requests = requests.map((r) => (r.id === id ? { ...r, status: 'Rejected', rejectedReason } : r));
  emit();
}

/** The real cross-workflow write: creates a live Pending purchase order in
 * stockReceivingStore.ts (visible on Stock Receiving right away) and links
 * this request to it. */
export function markAsOrdered(id: string, supplier: string): string | null {
  const request = requests.find((r) => r.id === id);
  if (!request) return null;

  const poNumber = addPurchaseOrder({
    supplier,
    items: request.items.map((item, i) => ({
      medicationName: item.name,
      batchNo: `PENDING-${id.slice(-4)}${i}`,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      orderedQty: item.quantity,
    })),
  });

  requests = requests.map((r) =>
    r.id === id ? { ...r, status: 'Ordered', supplier, poNumber } : r,
  );
  emit();
  return poNumber;
}
