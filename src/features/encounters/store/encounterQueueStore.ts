'use client';

/**
 * The doctor's OPD queue as live, shared state — not a static fixture.
 * Completing a consultation calls `completeEncounterQueueRow()`, which is
 * what makes that row actually leave "Waiting"/"In Consultation" on both
 * `/encounters` and the dashboard queue widget, instead of the row sitting
 * there forever while the real interaction (Complete Consultation) only
 * showed a toast. Same `useSyncExternalStore` module-singleton pattern as
 * `registrationQueueStore.ts` / `nursingWorkflowStore.ts`.
 *
 * Swap out by pointing these actions at real encounter endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import { MOCK_QUEUE, type PatientRow } from '@/features/encounters/__mocks__/encounterFixtures';
import { formatTime } from '@/utils/datetime';

let queueEntries: PatientRow[] = [...MOCK_QUEUE];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PatientRow[] {
  return queueEntries;
}

function getServerSnapshot(): PatientRow[] {
  return MOCK_QUEUE;
}

/** Reactive hook — pass the result into `getDoctorQueueFrom()` as the base
 * entries so both `/encounters` and the dashboard re-render when a row completes. */
export function useEncounterQueueEntries(): PatientRow[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function findQueueRowByPatientId(patientId: string): PatientRow | undefined {
  return queueEntries.find((row) => row.patientId === patientId);
}

/** Called when a doctor completes a consultation — advances the matching
 * queue row to `completed`. A no-op when the patient didn't come through
 * today's OPD queue (e.g. opened directly from the general Patients list),
 * since there's no row to advance. */
export function completeEncounterQueueRow(patientId: string, completedAtIso: string): void {
  const idx = queueEntries.findIndex((row) => row.patientId === patientId);
  if (idx === -1) return;
  queueEntries = queueEntries.map((row, i) =>
    i === idx
      ? { ...row, status: 'completed', waitDisplay: null, completedAt: formatTime(completedAtIso) }
      : row,
  );
  emit();
}
