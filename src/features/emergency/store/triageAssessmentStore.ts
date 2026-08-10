/**
 * Completed Manchester Triage assessments, keyed by the real `QueueEntry.id`
 * they were performed for. `useSyncExternalStore` module store — same shape
 * as `nursingWorkflowStore.ts` / `registrationQueueStore.ts` — so completing
 * a triage on this screen is a real hospital event that every other Emergency
 * screen reading this store sees immediately, not a dead-end toast.
 *
 * Patient Queue (and any future screen) reads this store FIRST for a given
 * entry's priority/stage/complaint, falling back to `emergencyFixtures.ts`'s
 * deterministic placeholder only when no real record exists yet — the
 * safe-merge-at-read-time pattern.
 */
'use client';

import { useSyncExternalStore } from 'react';

import type { TriagePriority } from '@/utils/triage';
import type { ArrivalSource } from '@/features/emergency/__mocks__/emergencyFixtures';

export type ManchesterAnswers = {
  ableToWalk: boolean | null;
  abnormalBreathing: boolean | null;
  abnormalRespRate: boolean | null;
  spo2Low: boolean | null;
  severePain: boolean | null;
  shock: boolean | null;
  lifeThreatening: boolean | null;
};

export const MANCHESTER_ANSWERS_DEFAULT: ManchesterAnswers = {
  ableToWalk: null,
  abnormalBreathing: null,
  abnormalRespRate: null,
  spo2Low: null,
  severePain: null,
  shock: null,
  lifeThreatening: null,
};

export type TriageVitals = {
  systolic: string;
  diastolic: string;
  pulse: string;
  respRate: string;
  temp: string;
  spo2: string;
  avpu: 'Alert' | 'Verbal' | 'Pain' | 'Unresponsive' | '';
};

export const TRIAGE_VITALS_DEFAULT: TriageVitals = {
  systolic: '',
  diastolic: '',
  pulse: '',
  respRate: '',
  temp: '',
  spo2: '',
  avpu: '',
};

export type TriageRecord = {
  entryId: string;
  chiefComplaint: string;
  onset: string;
  painScale: number;
  primaryConcern: string;
  arrivalMode: ArrivalSource;
  accompaniedBy: string;
  referredFrom: string;
  manchester: ManchesterAnswers;
  notes: string;
  vitals: TriageVitals;
  priority: TriagePriority;
  assignedDoctorId: string;
  assignedDoctorName: string;
  triageNurse: string;
  triageDurationMinutes: number;
  completedAt: string; // ISO
};

const records = new Map<string, TriageRecord>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function completeTriage(record: TriageRecord): void {
  records.set(record.entryId, record);
  emit();
}

export function getTriageRecord(entryId: string): TriageRecord | undefined {
  return records.get(entryId);
}

/** Snapshot of the whole map — stable reference unless a triage completes. */
function getSnapshot(): Map<string, TriageRecord> {
  return records;
}

export function useTriageRecords(): Map<string, TriageRecord> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useTriageRecord(entryId: string | undefined): TriageRecord | undefined {
  const all = useTriageRecords();
  return entryId ? all.get(entryId) : undefined;
}
