/**
 * Live emergency medication orders, per patient — placing or discontinuing
 * an order on the Emergency Medication Orders screen is a real hospital
 * event, not a dead-end toast. `useSyncExternalStore` module store, same
 * shape as `observationStore.ts` / `bedAssignmentStore.ts` /
 * `triageAssessmentStore.ts`.
 *
 * There is no existing shared medication-order infrastructure in this
 * codebase to plug into — Nursing's Medication Administration Record
 * (`nursing/components/MedicationAdministrationWorkspace.tsx`) is entirely
 * fixture-local with no store, and Pharmacy's dispensing model is a
 * separate outpatient-fulfillment concern. This store is the real thing for
 * the ED ordering side; wiring it into nursing's MAR is a natural follow-up,
 * not part of this pass.
 */
'use client';

import { useSyncExternalStore } from 'react';

import type {
  MedicationFrequency,
  MedicationOrderPriority,
  MedicationOrderType,
  MedicationRoute,
} from '@/features/emergency/__mocks__/emergencyFixtures';

export type MedicationOrderStatus = 'Active' | 'Completed' | 'Discontinued';

export type EmergencyMedicationOrder = {
  id: string;
  entryId: string;
  medication: string;
  type: MedicationOrderType;
  dose: string;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  priority: MedicationOrderPriority;
  status: MedicationOrderStatus;
  orderedBy: string;
  timeOrdered: string; // ISO
  discontinuedReason?: string;
  discontinuedAt?: string; // ISO
};

export type RecentAdministration = {
  id: string;
  entryId: string;
  medication: string;
  dose: string;
  time: string; // ISO
  administeredBy: string;
};

function seedOrdersFor(
  entryId: string,
  orderedBy: string,
  now: number,
): EmergencyMedicationOrder[] {
  return [
    {
      id: `${entryId}-mo-1`,
      entryId,
      medication: 'Morphine Sulfate',
      type: 'Injection',
      dose: '4 mg',
      route: 'IV',
      frequency: 'Once',
      priority: 'STAT',
      status: 'Active',
      orderedBy,
      timeOrdered: new Date(now - 65 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-mo-2`,
      entryId,
      medication: 'Ondansetron',
      type: 'Injection',
      dose: '4 mg',
      route: 'IV',
      frequency: 'Once',
      priority: 'STAT',
      status: 'Active',
      orderedBy,
      timeOrdered: new Date(now - 65 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-mo-3`,
      entryId,
      medication: 'Paracetamol',
      type: 'Injection',
      dose: '1,000 mg',
      route: 'IV',
      frequency: '8 hourly',
      priority: 'High',
      status: 'Active',
      orderedBy,
      timeOrdered: new Date(now - 70 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-mo-4`,
      entryId,
      medication: 'Ceftriaxone',
      type: 'Injection',
      dose: '1 g',
      route: 'IV',
      frequency: '12 hourly',
      priority: 'High',
      status: 'Active',
      orderedBy,
      timeOrdered: new Date(now - 70 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-mo-5`,
      entryId,
      medication: 'Normal Saline 0.9%',
      type: 'IV Fluid',
      dose: '500 ml',
      route: 'IV',
      frequency: 'Continuous',
      priority: 'Routine',
      status: 'Active',
      orderedBy,
      timeOrdered: new Date(now - 72 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-mo-6`,
      entryId,
      medication: 'Aspirin',
      type: 'Tablet',
      dose: '300 mg',
      route: 'Oral',
      frequency: 'Once',
      priority: 'Routine',
      status: 'Completed',
      orderedBy,
      timeOrdered: new Date(now - 120 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-mo-7`,
      entryId,
      medication: 'Diazepam',
      type: 'Injection',
      dose: '5 mg',
      route: 'IV',
      frequency: 'Once',
      priority: 'High',
      status: 'Discontinued',
      orderedBy,
      timeOrdered: new Date(now - 100 * 60_000).toISOString(),
      discontinuedAt: new Date(now - 80 * 60_000).toISOString(),
      discontinuedReason: 'No longer clinically indicated — patient settled.',
    },
  ];
}

function seedAdministrationsFor(entryId: string, now: number): RecentAdministration[] {
  return [
    {
      id: `${entryId}-adm-1`,
      entryId,
      medication: 'Paracetamol (IV)',
      dose: '1,000 mg',
      time: new Date(now - 80 * 60_000).toISOString(),
      administeredBy: 'Nurse Mary Ada',
    },
  ];
}

const ordersByEntry = new Map<string, EmergencyMedicationOrder[]>();
const administrationsByEntry = new Map<string, RecentAdministration[]>();
const seededEntryIds = new Set<string>();

// Stable references for the "no patient selected" case — useSyncExternalStore
// requires getSnapshot to return the same value (by reference) when nothing
// has changed, and a fresh `[]` literal on every call would fail that,
// risking an infinite re-render loop.
const EMPTY_ORDERS: EmergencyMedicationOrder[] = [];
const EMPTY_ADMINISTRATIONS: RecentAdministration[] = [];

function ensureSeeded(entryId: string, orderedBy: string) {
  if (seededEntryIds.has(entryId)) return;
  seededEntryIds.add(entryId);
  const now = Date.now();
  ordersByEntry.set(entryId, seedOrdersFor(entryId, orderedBy, now));
  administrationsByEntry.set(entryId, seedAdministrationsFor(entryId, now));
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addMedicationOrder(input: {
  entryId: string;
  medication: string;
  type: MedicationOrderType;
  dose: string;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  priority: MedicationOrderPriority;
  orderedBy: string;
}): void {
  ensureSeeded(input.entryId, input.orderedBy);
  const existing = ordersByEntry.get(input.entryId) ?? [];
  const order: EmergencyMedicationOrder = {
    id: `${input.entryId}-mo-${Date.now()}`,
    entryId: input.entryId,
    medication: input.medication,
    type: input.type,
    dose: input.dose,
    route: input.route,
    frequency: input.frequency,
    priority: input.priority,
    status: 'Active',
    orderedBy: input.orderedBy,
    timeOrdered: new Date().toISOString(),
  };
  ordersByEntry.set(input.entryId, [order, ...existing]);
  emit();
}

export function discontinueMedicationOrder(entryId: string, orderId: string, reason: string): void {
  const existing = ordersByEntry.get(entryId);
  if (!existing) return;
  ordersByEntry.set(
    entryId,
    existing.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: 'Discontinued',
            discontinuedAt: new Date().toISOString(),
            discontinuedReason: reason,
          }
        : o,
    ),
  );
  emit();
}

export function completeMedicationOrder(entryId: string, orderId: string): void {
  const existing = ordersByEntry.get(entryId);
  if (!existing) return;
  ordersByEntry.set(
    entryId,
    existing.map((o) => (o.id === orderId ? { ...o, status: 'Completed' } : o)),
  );
  emit();
}

function getOrdersSnapshot(entryId: string, orderedBy: string): EmergencyMedicationOrder[] {
  ensureSeeded(entryId, orderedBy);
  return ordersByEntry.get(entryId) ?? [];
}

function getAdministrationsSnapshot(entryId: string, orderedBy: string): RecentAdministration[] {
  ensureSeeded(entryId, orderedBy);
  return administrationsByEntry.get(entryId) ?? [];
}

export function useMedicationOrders(
  entryId: string | undefined,
  defaultOrderedBy: string,
): EmergencyMedicationOrder[] {
  return useSyncExternalStore(
    subscribe,
    () => (entryId ? getOrdersSnapshot(entryId, defaultOrderedBy) : EMPTY_ORDERS),
    () => EMPTY_ORDERS,
  );
}

export function useRecentAdministrations(
  entryId: string | undefined,
  defaultOrderedBy: string,
): RecentAdministration[] {
  return useSyncExternalStore(
    subscribe,
    () => (entryId ? getAdministrationsSnapshot(entryId, defaultOrderedBy) : EMPTY_ADMINISTRATIONS),
    () => EMPTY_ADMINISTRATIONS,
  );
}
