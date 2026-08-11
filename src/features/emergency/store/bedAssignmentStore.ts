/**
 * Live overrides on top of `emergencyFixtures.ts`'s `EMERGENCY_BEDS` starting
 * snapshot — confirming or holding a bed on the Bed Assignment screen is a
 * real hospital event, not a dead-end toast. `useSyncExternalStore` module
 * store, same shape as `triageAssessmentStore.ts`. Any screen showing bed
 * status (this one, and eventually the Emergency Tracking Board) reads the
 * base list merged with these overrides at read time.
 */
'use client';

import { useSyncExternalStore } from 'react';

export type BedOverrideStatus = 'Occupied' | 'Reserved';

export type BedOverride = {
  bedId: string;
  status: BedOverrideStatus;
  entryId?: string;
  patientName?: string;
  assignedByName: string;
  assignedAt: string; // ISO
  /** Only set for a 'Reserved' hold — when the hold expires and the bed
   * reverts to Available if not confirmed by then. */
  heldUntil?: string; // ISO
};

export type RecentBedAssignment = {
  id: string;
  patientName: string;
  bedId: string;
  assignedAt: string; // ISO
};

const bedOverrides = new Map<string, BedOverride>();

// Illustrative history seeded before this session — same honest-fixture
// treatment as everything else with no backing store, replaced by real
// entries the moment a real assignment is confirmed.
let recentAssignments: RecentBedAssignment[] = [
  { id: 'ra-seed-1', patientName: 'Chidinma Eze', bedId: 'ED-05', assignedAt: minutesAgoIso(70) },
  { id: 'ra-seed-2', patientName: 'Samuel Dike', bedId: 'ED-08', assignedAt: minutesAgoIso(75) },
  { id: 'ra-seed-3', patientName: 'Ibrahim Musa', bedId: 'ER-03', assignedAt: minutesAgoIso(78) },
];

function minutesAgoIso(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function confirmBedAssignment(input: {
  bedId: string;
  entryId: string;
  patientName: string;
  assignedByName: string;
}): void {
  bedOverrides.set(input.bedId, {
    bedId: input.bedId,
    status: 'Occupied',
    entryId: input.entryId,
    patientName: input.patientName,
    assignedByName: input.assignedByName,
    assignedAt: new Date().toISOString(),
  });
  recentAssignments = [
    {
      id: `ra-${input.bedId}-${Date.now()}`,
      patientName: input.patientName,
      bedId: input.bedId,
      assignedAt: new Date().toISOString(),
    },
    ...recentAssignments,
  ].slice(0, 10);
  emit();
}

export function holdBed(input: {
  bedId: string;
  entryId: string;
  patientName: string;
  assignedByName: string;
  minutes: number;
}): void {
  bedOverrides.set(input.bedId, {
    bedId: input.bedId,
    status: 'Reserved',
    entryId: input.entryId,
    patientName: input.patientName,
    assignedByName: input.assignedByName,
    assignedAt: new Date().toISOString(),
    heldUntil: new Date(Date.now() + input.minutes * 60_000).toISOString(),
  });
  emit();
}

export function releaseBed(bedId: string): void {
  bedOverrides.delete(bedId);
  emit();
}

function getOverridesSnapshot(): Map<string, BedOverride> {
  return bedOverrides;
}

function getRecentSnapshot(): RecentBedAssignment[] {
  return recentAssignments;
}

export function useBedOverrides(): Map<string, BedOverride> {
  return useSyncExternalStore(subscribe, getOverridesSnapshot, getOverridesSnapshot);
}

export function useRecentBedAssignments(): RecentBedAssignment[] {
  return useSyncExternalStore(subscribe, getRecentSnapshot, getRecentSnapshot);
}

/** True once a real, confirmed (not merely held) bed exists for this entry. */
export function useIsEntryBedAssigned(entryId: string | undefined): boolean {
  const overrides = useBedOverrides();
  if (!entryId) return false;
  for (const override of overrides.values()) {
    if (override.entryId === entryId && override.status === 'Occupied') return true;
  }
  return false;
}
