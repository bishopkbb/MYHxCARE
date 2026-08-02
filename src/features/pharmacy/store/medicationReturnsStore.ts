'use client';

/**
 * Medication Returns — real, shared, reactive state (`useSyncExternalStore`,
 * same pattern as `adrReportStore.ts`). Approving a Pending return is the one
 * genuine cross-store write: `completeReturn()` calls `addStockBatch()` in
 * `inventoryStore.ts`, so the returned units actually re-enter Drug
 * Inventory as a real, quarantined batch — "update inventory accurately"
 * (this screen's own subtitle) is a real write, not a status flip. Swap out
 * by pointing these actions at real `POST /pharmacy/returns` endpoints in
 * Phase 6.
 */

import { useSyncExternalStore } from 'react';

import { PHARMACY_LOCATIONS } from '@/constants/pharmacyLocations';
import {
  MEDICATION_RETURNS,
  type MedicationReturn,
  type RefundType,
  type ReturnReasonCategory,
  type ReturnType,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { addStockBatch } from '@/features/pharmacy/store/inventoryStore';

let returns: MedicationReturn[] = [...MEDICATION_RETURNS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): MedicationReturn[] {
  return returns;
}
function getServerSnapshot(): MedicationReturn[] {
  return MEDICATION_RETURNS;
}

export function useMedicationReturns(): MedicationReturn[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getMedicationReturn(id: string): MedicationReturn | null {
  return returns.find((r) => r.id === id) ?? null;
}

let seq = MEDICATION_RETURNS.length;

function nextReturnId(): string {
  seq += 1;
  return `RTN-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
}

export type CreateReturnInput = {
  patientId: string;
  patientName: string;
  mrn: string;
  medicationName: string;
  strength: string;
  form: string;
  category: string;
  unitPrice: number;
  qtyReturned: number;
  returnType: ReturnType;
  reason: string;
  reasonCategory: ReturnReasonCategory;
  refundType: RefundType;
  refundAmount: number;
};

/** A new return always starts Pending — it needs a pharmacist to verify the
 * medication and process it before it affects stock or a refund. */
export function createReturn(input: CreateReturnInput, returnedBy: string): string {
  const id = nextReturnId();
  const record: MedicationReturn = {
    id,
    returnDate: new Date().toISOString(),
    patientId: input.patientId,
    patientName: input.patientName,
    mrn: input.mrn,
    medicationName: input.medicationName,
    strength: input.strength,
    form: input.form,
    category: input.category,
    unitPrice: input.unitPrice,
    qtyReturned: input.qtyReturned,
    returnType: input.returnType,
    reason: input.reason,
    reasonCategory: input.reasonCategory,
    status: 'Pending',
    returnedBy,
    refundType: input.refundType,
    refundAmount: input.refundAmount,
  };
  returns = [record, ...returns];
  emit();
  return id;
}

/** Approves a Pending return. Expired/Damaged stock is destroyed, not
 * resold, so only every other return type creates a real restocked batch —
 * quarantined (`isOnHold`) pending the usual QA check before it's dispensed
 * again. */
export function completeReturn(id: string): void {
  const idx = returns.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const ret = returns[idx]!;
  if (ret.status !== 'Pending') return;

  if (ret.returnType !== 'Expired/Damaged') {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    addStockBatch({
      medicationName: ret.medicationName,
      strength: ret.strength,
      form: ret.form,
      unit: ret.form,
      category: ret.category,
      locationId: PHARMACY_LOCATIONS[0]!.id,
      supplier: `Return — ${ret.patientName}`,
      batchNo: `RTN-${ret.id.slice(-4)}`,
      expiryDate: expiryDate.toISOString().slice(0, 10),
      stockQty: ret.qtyReturned,
      reorderLevel: 0,
      unitPrice: ret.unitPrice,
      isOnHold: true,
    });
  }

  returns = returns.map((r, i) => (i === idx ? { ...r, status: 'Completed' } : r));
  emit();
}

export function rejectReturn(id: string, rejectedReason: string): void {
  const idx = returns.findIndex((r) => r.id === id);
  if (idx === -1) return;
  if (returns[idx]!.status !== 'Pending') return;
  returns = returns.map((r, i) =>
    i === idx
      ? { ...r, status: 'Rejected', refundType: 'None', refundAmount: 0, rejectedReason }
      : r,
  );
  emit();
}
