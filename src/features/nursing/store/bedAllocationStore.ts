'use client';

/**
 * Bridges Admissions' "Assign Bed" workflow step to Bed Management's real bed
 * grid (`bedManagementFixtures.ts`'s `WARD_LAYOUTS`) — before this store
 * existed, advancing an admission to step 4 was a bare counter increment with
 * no effect on any bed anywhere. This store is deliberately scoped to the two
 * wards whose bed codes Admissions' own seed data already correlates with
 * (Female/Male Medical Ward, `bedCode` values like "A-06") — Ward Census uses
 * a fundamentally different numbering scheme ("Bed 12") for the same wards
 * with no honest mapping to bed codes, so it isn't wired to this store; see
 * the gap report for that as a documented, separately-tracked limitation.
 *
 * Same `useSyncExternalStore` module-singleton pattern as this feature's other
 * cross-screen stores. Swap out by pointing these actions at real bed-
 * allocation endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

export type BedAllocation = {
  wardId: string; // WARD_LAYOUTS id, e.g. 'ward-female'
  bedCode: string; // e.g. 'A-06'
  patientKey: string; // AdmissionRecord.patientId if linked, else AdmissionRecord.id
  patientName: string;
  mrn: string;
  admittedAt: string; // ISO
};

let allocations: BedAllocation[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): BedAllocation[] {
  return allocations;
}

function getServerSnapshot(): BedAllocation[] {
  return [];
}

/** Reactive hook — re-renders the caller whenever a bed is allocated or released. */
export function useBedAllocations(): BedAllocation[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getAllocationForBed(wardId: string, bedCode: string): BedAllocation | undefined {
  return allocations.find((a) => a.wardId === wardId && a.bedCode === bedCode);
}

/** First bed code in `candidateBedCodes` (in order) with no live allocation —
 * the caller is responsible for only offering codes whose *underlying* static
 * status is already 'Available', so this only guards against a double
 * allocation racing with one made moments earlier in the same session. */
export function findAvailableBedCode(
  wardId: string,
  candidateBedCodes: string[],
): string | undefined {
  const takenCodes = new Set(allocations.filter((a) => a.wardId === wardId).map((a) => a.bedCode));
  return candidateBedCodes.find((code) => !takenCodes.has(code));
}

export function allocateBed(allocation: BedAllocation): void {
  allocations = [
    ...allocations.filter(
      (a) => !(a.wardId === allocation.wardId && a.bedCode === allocation.bedCode),
    ),
    allocation,
  ];
  emit();
}

/** Called when a formal Discharge completes — frees whichever bed (if any)
 * this store had allocated for the patient, the same way completing a
 * Discharge already vacates a roster-slot bed via `markPatientDischarged()`. */
export function releaseBedForPatient(patientKey: string): void {
  const next = allocations.filter((a) => a.patientKey !== patientKey);
  if (next.length !== allocations.length) {
    allocations = next;
    emit();
  }
}
