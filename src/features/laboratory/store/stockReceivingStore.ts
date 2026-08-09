'use client';

/**
 * The Stock Receiving store — the current goods-receipt session. Same
 * `useSyncExternalStore` module-singleton pattern as `inventoryStore.ts`.
 * Completing the GRN calls `adjustStock()` on the inventory store for
 * every accepted line — a real write into shared inventory data, so
 * Laboratory Inventory's stock levels and Inventory History immediately
 * reflect what was received, not a disconnected receiving form.
 *
 * Swap out by pointing these actions at real `POST /lab/inventory/grn`
 * endpoints once that domain exists on the backend.
 */

import { useSyncExternalStore } from 'react';

import {
  INITIAL_ACTIVITY_LOG,
  INITIAL_ATTACHMENTS,
  INITIAL_GRN,
  INITIAL_LINE_ITEMS,
  nextGrnNumber,
  type ActivityLogEntry,
  type Attachment,
  type GoodsReceiptNote,
  type LineItemStatus,
  type ReceivedLineItem,
} from '@/features/laboratory/__mocks__/stockReceivingFixtures';
import { adjustStock, getInventoryItemById } from '@/features/laboratory/store/inventoryStore';

let grn: GoodsReceiptNote = { ...INITIAL_GRN };
let lineItems: ReceivedLineItem[] = [...INITIAL_LINE_ITEMS];
const attachments: Attachment[] = [...INITIAL_ATTACHMENTS];
let activityLog: ActivityLogEntry[] = [...INITIAL_ACTIVITY_LOG];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getGrnSnapshot(): GoodsReceiptNote {
  return grn;
}
function getGrnServerSnapshot(): GoodsReceiptNote {
  return INITIAL_GRN;
}
export function useGrn(): GoodsReceiptNote {
  return useSyncExternalStore(subscribe, getGrnSnapshot, getGrnServerSnapshot);
}

function getLineItemsSnapshot(): ReceivedLineItem[] {
  return lineItems;
}
function getLineItemsServerSnapshot(): ReceivedLineItem[] {
  return INITIAL_LINE_ITEMS;
}
export function useLineItems(): ReceivedLineItem[] {
  return useSyncExternalStore(subscribe, getLineItemsSnapshot, getLineItemsServerSnapshot);
}

function getAttachmentsSnapshot(): Attachment[] {
  return attachments;
}
export function useAttachments(): Attachment[] {
  return useSyncExternalStore(subscribe, getAttachmentsSnapshot, getAttachmentsSnapshot);
}

function getActivityLogSnapshot(): ActivityLogEntry[] {
  return activityLog;
}
function getActivityLogServerSnapshot(): ActivityLogEntry[] {
  return INITIAL_ACTIVITY_LOG;
}
export function useActivityLog(): ActivityLogEntry[] {
  return useSyncExternalStore(subscribe, getActivityLogSnapshot, getActivityLogServerSnapshot);
}

// ── Derived status — never stored, always computed from live qty fields ────

export function getLineItemStatus(line: ReceivedLineItem): LineItemStatus {
  if (line.receivedQty > 0 && line.acceptedQty === line.receivedQty && line.rejectedQty === 0) {
    return 'Accepted';
  }
  if (line.acceptedQty === 0 && line.receivedQty > 0) return 'Rejected';
  return 'Partial';
}

// ── Write actions ────────────────────────────────────────────────────────

function log(label: string, actor: string) {
  activityLog = [
    { id: `act-${Date.now()}`, label, actor, at: new Date().toISOString() },
    ...activityLog,
  ];
}

export type LineItemPatch = Partial<
  Pick<ReceivedLineItem, 'receivedQty' | 'acceptedQty' | 'rejectedQty' | 'unitCost'>
>;

export function updateLineItem(id: string, patch: LineItemPatch): void {
  lineItems = lineItems.map((l) => (l.id === id ? { ...l, ...patch } : l));
  emit();
}

export function removeLineItem(id: string): void {
  lineItems = lineItems.filter((l) => l.id !== id);
  emit();
}

export type NewLineItemInput = {
  itemId: string;
  lotBatchNo: string;
  expiryDate: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unitCost: number;
};

let lineSeq = lineItems.length;

export function addLineItem(input: NewLineItemInput): ReceivedLineItem {
  const item = getInventoryItemById(input.itemId);
  lineSeq += 1;
  const line: ReceivedLineItem = {
    id: `rli-${String(lineSeq).padStart(4, '0')}`,
    itemId: input.itemId,
    lotBatchNo: input.lotBatchNo,
    expiryDate: input.expiryDate,
    uom: item?.unit ?? '1 pc',
    orderedQty: input.orderedQty,
    receivedQty: input.receivedQty,
    acceptedQty: input.acceptedQty,
    rejectedQty: input.rejectedQty,
    unitCost: input.unitCost,
  };
  lineItems = [...lineItems, line];
  emit();
  return line;
}

export function updateDeliveryInfo(patch: Partial<GoodsReceiptNote>): void {
  grn = { ...grn, ...patch };
  emit();
}

/** Applies every accepted line to Laboratory Inventory's live stock via
 * `adjustStock()`, marks the GRN Completed, and logs the action. */
export function completeReceiving(actorName: string): void {
  if (grn.status === 'Completed') return;
  for (const line of lineItems) {
    if (line.acceptedQty <= 0) continue;
    const item = getInventoryItemById(line.itemId);
    adjustStock(
      line.itemId,
      line.acceptedQty,
      'Received',
      actorName,
      `Received against GRN ${grn.id}${item ? ` (${item.name})` : ''}, lot ${line.lotBatchNo}.`,
    );
  }
  grn = { ...grn, status: 'Completed' };
  log('Receiving completed', actorName);
  emit();
}

/** Starts a fresh receiving session once the current one is completed —
 * closes the loop instead of leaving the screen at a dead end. */
export function startNewReceiving(): void {
  grn = {
    ...INITIAL_GRN,
    id: nextGrnNumber(),
    status: 'Receiving',
    createdAt: new Date().toISOString(),
  };
  lineItems = [];
  activityLog = [
    { id: `act-${Date.now()}`, label: 'GRN created', actor: grn.receivedBy, at: grn.createdAt },
  ];
  emit();
}

// ── Derived selectors ────────────────────────────────────────────────────

export type GrnSummary = {
  totalItems: number;
  totalQuantity: number;
  totalPackages: number;
  subTotal: number;
  taxRate: number;
  tax: number;
  totalAmount: number;
};

export function getGrnSummary(): GrnSummary {
  const totalQuantity = lineItems.reduce((sum, l) => sum + l.acceptedQty, 0);
  const subTotal = lineItems.reduce((sum, l) => sum + l.acceptedQty * l.unitCost, 0);
  const taxRate = 0.075;
  const tax = Math.round(subTotal * taxRate);
  return {
    totalItems: lineItems.length,
    totalQuantity,
    totalPackages: grn.noOfPackages,
    subTotal,
    taxRate,
    tax,
    totalAmount: subTotal + tax,
  };
}
