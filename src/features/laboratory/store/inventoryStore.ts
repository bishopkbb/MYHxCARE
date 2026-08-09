'use client';

/**
 * The Laboratory Inventory store — real, shared, reactive state for stock
 * items, batch receipts, and the stock-movement history log. Same
 * `useSyncExternalStore` module-singleton pattern as `equipmentStore.ts`:
 * adding an item, importing a batch, or adjusting stock is immediately
 * visible everywhere else that reads this store in the same session.
 * Reordering low-stock items lives in `procurementStore.ts` instead — a
 * quick reorder and a formal procurement request are the same underlying
 * record, not a second "please buy this" system.
 *
 * Swap out by pointing these actions at real `POST /lab/inventory` /
 * `POST /lab/inventory/batches` endpoints once that domain exists on the
 * backend.
 */

import { useSyncExternalStore } from 'react';

import {
  BATCH_RECEIPTS,
  DEPARTMENT_STORE_SUFFIX,
  INVENTORY_ITEMS,
  INVENTORY_MOVEMENTS,
  type BatchReceipt,
  type InventoryCategory,
  type InventoryItem,
  type InventoryMovement,
  type InventoryStatus,
  type MovementType,
} from '@/features/laboratory/__mocks__/inventoryFixtures';

let items: InventoryItem[] = [...INVENTORY_ITEMS];
const batchReceipts: BatchReceipt[] = [...BATCH_RECEIPTS];
let movements: InventoryMovement[] = [...INVENTORY_MOVEMENTS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getItemsSnapshot(): InventoryItem[] {
  return items;
}
function getItemsServerSnapshot(): InventoryItem[] {
  return INVENTORY_ITEMS;
}
export function useInventoryItems(): InventoryItem[] {
  return useSyncExternalStore(subscribe, getItemsSnapshot, getItemsServerSnapshot);
}

function getBatchReceiptsSnapshot(): BatchReceipt[] {
  return batchReceipts;
}
function getBatchReceiptsServerSnapshot(): BatchReceipt[] {
  return BATCH_RECEIPTS;
}
export function useBatchReceipts(): BatchReceipt[] {
  return useSyncExternalStore(subscribe, getBatchReceiptsSnapshot, getBatchReceiptsServerSnapshot);
}

function getMovementsSnapshot(): InventoryMovement[] {
  return movements;
}
function getMovementsServerSnapshot(): InventoryMovement[] {
  return INVENTORY_MOVEMENTS;
}
export function useInventoryMovements(): InventoryMovement[] {
  return useSyncExternalStore(subscribe, getMovementsSnapshot, getMovementsServerSnapshot);
}

export function getInventoryItemById(id: string): InventoryItem | undefined {
  return items.find((i) => i.id === id);
}

// ── Derived status — never stored, always computed from live numbers ───────

/** Items expiring within this many days (and not yet expired) count as
 * "Expiring Soon". */
export const EXPIRY_WARNING_WINDOW_DAYS = 30;

export function getInventoryStatus(item: InventoryItem): InventoryStatus {
  if (item.expiryDate) {
    const daysUntil = Math.round((new Date(item.expiryDate).getTime() - Date.now()) / 86_400_000);
    if (daysUntil < 0) return 'Expired';
    if (item.currentStock === 0) return 'Out of Stock';
    if (daysUntil <= EXPIRY_WARNING_WINDOW_DAYS) return 'Expiring Soon';
  } else if (item.currentStock === 0) {
    return 'Out of Stock';
  }
  if (item.currentStock <= item.minStock) return 'Low Stock';
  return 'In Stock';
}

// ── Write actions ────────────────────────────────────────────────────────

function nextCatalogNo(name: string, index: number): string {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 5);
  return `${initials}-${String(9000 + index)}`;
}

export type NewInventoryItemInput = {
  name: string;
  category: InventoryCategory;
  department: string;
  lotBatchNo: string;
  expiryDate: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  manufacturer: string;
  packSize: string;
  storageCondition: string;
  location: string;
  description: string;
};

let itemSeq = items.length;

export function addInventoryItem(input: NewInventoryItemInput): InventoryItem {
  itemSeq += 1;
  const item: InventoryItem = {
    ...input,
    id: `inv-added-${String(itemSeq).padStart(4, '0')}`,
    catalogNo: nextCatalogNo(input.name, itemSeq),
    receivedDate: new Date().toISOString(),
  };
  items = [item, ...items];
  emit();
  return item;
}

/** Simulates a bulk CSV import — appends N generated items using the same
 * template the item most closely named after `baseName` used, scaled by
 * `count`. Used by the Import Inventory modal. */
export function importInventoryBatch(newItems: NewInventoryItemInput[]): InventoryItem[] {
  const created = newItems.map((input) => {
    itemSeq += 1;
    return {
      ...input,
      id: `inv-import-${String(itemSeq).padStart(4, '0')}`,
      catalogNo: nextCatalogNo(input.name, itemSeq),
      receivedDate: new Date().toISOString(),
    };
  });
  items = [...created, ...items];
  emit();
  return created;
}

export type AdjustReason = 'Received' | 'Consumed' | 'Adjusted' | 'Disposed';

let movementSeq = movements.length;

/** Adjusts an item's stock level by `delta` (positive for received stock,
 * negative for consumed/disposed) and logs the movement — keeps the
 * Inventory History tab and the item's own currentStock in sync from one
 * write, never two independently-updated numbers. */
export function adjustStock(
  itemId: string,
  delta: number,
  reason: AdjustReason,
  performedBy: string,
  notes: string,
): void {
  const item = items.find((i) => i.id === itemId);
  if (!item) return;
  const nextStock = Math.max(0, item.currentStock + delta);
  items = items.map((i) => (i.id === itemId ? { ...i, currentStock: nextStock } : i));

  movementSeq += 1;
  const movement: InventoryMovement = {
    id: `MOV-${String(movementSeq).padStart(4, '0')}`,
    itemId,
    type: reason as MovementType,
    quantity: delta,
    date: new Date().toISOString(),
    performedBy,
    notes,
  };
  movements = [movement, ...movements];
  emit();
}

// ── Derived selectors ────────────────────────────────────────────────────

export type InventorySummary = {
  total: number;
  inStock: number;
  lowStock: number;
  expiringSoon: number;
  expired: number;
  outOfStock: number;
  totalValue: number;
};

/** Every count and the total value are derived live from the item array —
 * never a second, independently-invented number. */
export function getInventorySummary(): InventorySummary {
  let inStock = 0;
  let lowStock = 0;
  let expiringSoon = 0;
  let expired = 0;
  let outOfStock = 0;
  let totalValue = 0;

  for (const item of items) {
    totalValue += item.currentStock * item.unitPrice;
    switch (getInventoryStatus(item)) {
      case 'In Stock':
        inStock++;
        break;
      case 'Low Stock':
        lowStock++;
        break;
      case 'Expiring Soon':
        expiringSoon++;
        break;
      case 'Expired':
        expired++;
        break;
      case 'Out of Stock':
        outOfStock++;
        break;
    }
  }

  return { total: items.length, inStock, lowStock, expiringSoon, expired, outOfStock, totalValue };
}

export function storeForDepartment(department: string): string {
  return DEPARTMENT_STORE_SUFFIX[department] ?? 'Central Store';
}

export function getBatchReceiptsFor(itemId: string): BatchReceipt[] {
  return batchReceipts.filter((b) => b.itemId === itemId);
}

export function getMovementsFor(itemId: string): InventoryMovement[] {
  return movements.filter((m) => m.itemId === itemId);
}
