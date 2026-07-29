'use client';

/**
 * Stock Receiving — real, shared, reactive state (`useSyncExternalStore`,
 * same pattern as `inventoryStore.ts`/`pharmacyDispensingStore.ts`).
 * Confirming a receipt does two real things, not one dead-end toast: it
 * marks the linked purchase order Received/Partial, AND calls
 * `inventoryStore.ts`'s `addStockBatch()` for every line item — a goods-
 * received event genuinely becomes new Drug Inventory stock. Swap out by
 * pointing these actions at real `POST /pharmacy/receiving` endpoints in
 * Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  PURCHASE_ORDERS_SEED,
  STOCK_RECEIPTS_SEED,
  type PurchaseOrder,
  type StockReceipt,
  type StockReceiptItem,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { addStockBatch } from '@/features/pharmacy/store/inventoryStore';
import type { PharmacyLocationId } from '@/constants/pharmacyLocations';

let purchaseOrders: PurchaseOrder[] = [...PURCHASE_ORDERS_SEED];
let receipts: StockReceipt[] = [...STOCK_RECEIPTS_SEED];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getPOSnapshot(): PurchaseOrder[] {
  return purchaseOrders;
}
function getPOServerSnapshot(): PurchaseOrder[] {
  return PURCHASE_ORDERS_SEED;
}
export function usePurchaseOrders(): PurchaseOrder[] {
  return useSyncExternalStore(subscribe, getPOSnapshot, getPOServerSnapshot);
}
export function useOpenPurchaseOrders(): PurchaseOrder[] {
  const all = usePurchaseOrders();
  return all.filter((po) => po.status !== 'Received');
}

function getReceiptsSnapshot(): StockReceipt[] {
  return receipts;
}
function getReceiptsServerSnapshot(): StockReceipt[] {
  return STOCK_RECEIPTS_SEED;
}
export function useReceipts(): StockReceipt[] {
  return useSyncExternalStore(subscribe, getReceiptsSnapshot, getReceiptsServerSnapshot);
}

export function getPurchaseOrder(poNumber: string): PurchaseOrder | null {
  return purchaseOrders.find((po) => po.poNumber === poNumber) ?? null;
}

let receiptSeq = 0;

export type SubmitReceiptInput = {
  poNumber: string;
  supplier: string;
  warehouseLocationId: PharmacyLocationId;
  deliveryNote: string;
  referenceNo: string;
  receivedBy: string;
  receivedAt: string; // ISO — the date the pharmacist recorded on the form
  notes: string;
  items: StockReceiptItem[];
};

/** Confirms a goods receipt — the one write action on this screen, and it
 * ripples to two other real places: the linked PO's status, and the Drug
 * Inventory batches this stock actually becomes. */
export function submitReceipt(input: SubmitReceiptInput): string {
  receiptSeq += 1;
  const now = new Date();
  const id = `RCV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(receiptSeq).padStart(3, '0')}`;

  const totalValueExclTax = input.items.reduce((sum, i) => sum + i.receivedQty * i.unitPrice, 0);
  const tax = Math.round(totalValueExclTax * 0.075);
  const isPartial = input.items.some((i) => i.receivedQty < i.orderedQty);

  const receipt: StockReceipt = {
    id,
    poNumber: input.poNumber,
    supplier: input.supplier,
    warehouseLocationId: input.warehouseLocationId,
    deliveryNote: input.deliveryNote,
    referenceNo: input.referenceNo,
    receivedBy: input.receivedBy,
    receivedAt: input.receivedAt,
    notes: input.notes,
    items: input.items,
    totalValueExclTax,
    tax,
    totalValueInclTax: totalValueExclTax + tax,
    status: isPartial ? 'Partial' : 'Completed',
  };

  receipts = [receipt, ...receipts];
  purchaseOrders = purchaseOrders.map((po) =>
    po.poNumber === input.poNumber ? { ...po, status: isPartial ? 'Partial' : 'Received' } : po,
  );

  for (const item of input.items) {
    if (item.receivedQty <= 0) continue;
    addStockBatch({
      medicationName: item.medicationName,
      strength: item.strength,
      form: item.form,
      unit: item.unit,
      category: item.category,
      locationId: input.warehouseLocationId,
      supplier: input.supplier,
      batchNo: item.batchNo,
      expiryDate: item.expiryDate,
      stockQty: item.receivedQty,
      reorderLevel: item.reorderLevel,
      unitPrice: item.unitPrice,
      ...(item.controlledSchedule ? { controlledSchedule: item.controlledSchedule } : {}),
    });
  }

  emit();
  return id;
}
