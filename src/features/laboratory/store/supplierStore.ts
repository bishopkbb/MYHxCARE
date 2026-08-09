'use client';

/**
 * The Suppliers store — the one vendor directory for the Laboratory module.
 * Same `useSyncExternalStore` module-singleton pattern as
 * `procurementStore.ts` / `equipmentStore.ts`.
 */

import { useSyncExternalStore } from 'react';

import {
  nextSupplierId,
  SUPPLIERS,
  type Supplier,
  type SupplierCategory,
  type SupplierStatus,
} from '@/features/laboratory/__mocks__/supplierFixtures';

let suppliers: Supplier[] = [...SUPPLIERS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSuppliersSnapshot(): Supplier[] {
  return suppliers;
}
function getSuppliersServerSnapshot(): Supplier[] {
  return SUPPLIERS;
}
export function useSuppliers(): Supplier[] {
  return useSyncExternalStore(subscribe, getSuppliersSnapshot, getSuppliersServerSnapshot);
}

export function getSupplierById(id: string): Supplier | undefined {
  return suppliers.find((s) => s.id === id);
}

// ── Write actions ────────────────────────────────────────────────────────

export type NewSupplierInput = {
  name: string;
  category: SupplierCategory;
  contactPerson: string;
  contactRole: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  city: string;
  paymentTerms: string;
  creditLimit: number;
  notes: string;
};

export function addSupplier(input: NewSupplierInput): Supplier {
  const supplier: Supplier = {
    id: nextSupplierId(suppliers),
    name: input.name,
    category: input.category,
    contactPerson: input.contactPerson,
    contactRole: input.contactRole,
    phone: input.phone,
    altPhone: input.altPhone,
    email: input.email,
    address: input.address,
    city: input.city,
    country: 'Nigeria',
    status: 'Pending Evaluation',
    isPreferred: false,
    rating: 0,
    reviewCount: 0,
    lastOrderDate: null,
    ytdSpend: 0,
    paymentTerms: input.paymentTerms,
    creditLimit: input.creditLimit,
    dateAdded: new Date().toISOString(),
    notes: input.notes,
    onTimeDeliveryPct: 0,
    qualityRating: 0,
    totalOrdersYTD: 0,
    recentOrders: [],
  };
  suppliers = [supplier, ...suppliers];
  emit();
  return supplier;
}

export function setSupplierStatus(id: string, status: SupplierStatus): void {
  suppliers = suppliers.map((s) =>
    s.id === id ? { ...s, status, isPreferred: status === 'Active' ? s.isPreferred : false } : s,
  );
  emit();
}

export function setSupplierPreferred(id: string, isPreferred: boolean): void {
  suppliers = suppliers.map((s) => (s.id === id ? { ...s, isPreferred } : s));
  emit();
}

export function updateSupplierNotes(id: string, notes: string): void {
  suppliers = suppliers.map((s) => (s.id === id ? { ...s, notes } : s));
  emit();
}

// ── Derived selectors ────────────────────────────────────────────────────

export type SupplierSummary = {
  total: number;
  active: number;
  preferred: number;
  pendingEvaluation: number;
  blacklisted: number;
  totalSpendYTD: number;
};

export function getSupplierSummary(): SupplierSummary {
  return {
    total: suppliers.length,
    active: suppliers.filter((s) => s.status === 'Active').length,
    preferred: suppliers.filter((s) => s.isPreferred).length,
    pendingEvaluation: suppliers.filter((s) => s.status === 'Pending Evaluation').length,
    blacklisted: suppliers.filter((s) => s.status === 'Blacklisted').length,
    totalSpendYTD: suppliers.reduce((sum, s) => sum + s.ytdSpend, 0),
  };
}
