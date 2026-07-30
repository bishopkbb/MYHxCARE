'use client';

/**
 * Suppliers — real, shared, reactive state (`useSyncExternalStore`, same
 * pattern as `procurementRequestStore.ts`). Adding, approving, or
 * deactivating a supplier here is what every other supplier dropdown in the
 * app (Drug Inventory, Add Stock, Procurement Requests) reads from —
 * `useSupplierOptions()` replaces the old static `SUPPLIER_OPTIONS` snapshot
 * so a brand-new supplier is selectable immediately, not only after reload.
 */

import { useSyncExternalStore } from 'react';

import {
  SUPPLIER_DIRECTORY,
  type SupplierCategory,
  type SupplierInfo,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import type { SelectOption } from '@/features/registration/__mocks__/registerPatientOptions';

let suppliers: SupplierInfo[] = [...SUPPLIER_DIRECTORY];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SupplierInfo[] {
  return suppliers;
}
function getServerSnapshot(): SupplierInfo[] {
  return SUPPLIER_DIRECTORY;
}

export function useSuppliers(): SupplierInfo[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Only Active/Preferred suppliers are selectable when recording real stock
 * movement — a Pending Approval or Inactive supplier can't fulfil an order
 * yet. */
export function useSupplierOptions(): SelectOption[] {
  const all = useSuppliers();
  return all.filter((s) => s.status === 'Active').map((s) => ({ value: s.name, label: s.name }));
}

let supplierSeq = SUPPLIER_DIRECTORY.length;

export type AddSupplierInput = {
  name: string;
  category: SupplierCategory;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  address: string;
};

/** New suppliers start Pending Approval — a real onboarding step, not an
 * immediately-usable entry. */
export function addSupplier(input: AddSupplierInput): string {
  supplierSeq += 1;
  const code = `SUP-${String(supplierSeq).padStart(5, '0')}`;
  const supplier: SupplierInfo = {
    name: input.name,
    code,
    address: input.address,
    phone: input.phone,
    email: input.email,
    category: input.category,
    contactPerson: input.contactPerson,
    location: input.location,
    status: 'Pending Approval',
    isPreferred: false,
    performanceRating: 0,
    lastOrderDate: '',
    totalSpendYTD: 0,
  };
  suppliers = [supplier, ...suppliers];
  emit();
  return code;
}

export function approveSupplier(name: string): void {
  suppliers = suppliers.map((s) => (s.name === name ? { ...s, status: 'Active' } : s));
  emit();
}

export function rejectSupplier(name: string): void {
  suppliers = suppliers.map((s) => (s.name === name ? { ...s, status: 'Inactive' } : s));
  emit();
}

export function setSupplierPreferred(name: string, isPreferred: boolean): void {
  suppliers = suppliers.map((s) => (s.name === name ? { ...s, isPreferred } : s));
  emit();
}

/** The only place a supplier's Performance Rating ever changes — called from
 * the click-to-rate stars in `SupplierDetailModal`, not a seeded/derived
 * value. */
export function rateSupplier(name: string, rating: number): void {
  suppliers = suppliers.map((s) => (s.name === name ? { ...s, performanceRating: rating } : s));
  emit();
}

export function toggleSupplierActive(name: string): void {
  suppliers = suppliers.map((s) =>
    s.name === name
      ? { ...s, status: s.status === 'Inactive' ? 'Active' : 'Inactive', isPreferred: false }
      : s,
  );
  emit();
}
