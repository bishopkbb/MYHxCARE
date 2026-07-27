'use client';

/**
 * "Send Prescription" used to show a toast claiming a prescription was "sent
 * to pharmacy" while discarding the entire form on submit — no Prescription
 * record was ever created anywhere. This module-level store is what makes
 * that claim true for the rest of the session: a sent prescription now shows
 * up everywhere `getPatientDetail()` is read (Current Medications tab,
 * Consultation's active-meds summary, the Prescription page's own Active
 * Medications banner, Medical Records' Prescriptions tab — see SYS-011),
 * since `getPatientDetail()` merges this store's data in centrally. The
 * actual pharmacy hand-off itself is still out of scope until a real
 * Pharmacy module exists (`/pharmacy` is a bare stub) — this store only
 * closes the "did the prescription itself get created" half of the claim.
 *
 * Real, shared, reactive state (`useSyncExternalStore`, same pattern as
 * `labResultStore.ts`) — not a plain map, so a screen mounted independently
 * of the one that sent a prescription (Pharmacy's future dispensing queue)
 * can see it update live instead of only on its own next mount. See
 * MYHXCARE_SYSTEM_CONSISTENCY_REGISTER.md SYS-014. Swap out by pointing
 * hooks to a real prescriptions endpoint in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import type { Medication } from '@/features/patients/__mocks__/patientFixtures';
import type { PrescriptionLine } from '@/features/prescriptions/__mocks__/prescriptionFixtures';

const prescriptionsByPatient = new Map<string, Medication[]>();
let seq = 0;
const listeners = new Set<() => void>();
const EMPTY: Medication[] = [];

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addPrescription(
  patientId: string,
  lines: PrescriptionLine[],
  prescribedBy: string,
): void {
  const newMeds: Medication[] = lines.map((line) => {
    seq += 1;
    return {
      id: `rx-${seq}`,
      name: line.name,
      dose: `${line.dosagePerDose}${line.dosageUnit}`,
      frequency: line.frequency,
      route: line.route,
      startedDate: line.startDate,
      prescribedBy,
      status: 'active',
    };
  });
  const existing = prescriptionsByPatient.get(patientId) ?? [];
  prescriptionsByPatient.set(patientId, [...newMeds, ...existing]);
  emit();
}

export function getPrescriptionsForPatient(patientId: string): Medication[] {
  return prescriptionsByPatient.get(patientId) ?? EMPTY;
}

/** Reactive hook — re-renders the caller whenever a prescription is sent for
 * the given patient, from any screen. Not consumed yet (Pharmacy doesn't
 * exist), added ahead of its first real consumer the same way
 * `labResultStore.ts`'s `useLabResults()` was. */
export function usePrescriptionsForPatient(patientId: string): Medication[] {
  return useSyncExternalStore(
    subscribe,
    () => getPrescriptionsForPatient(patientId),
    () => getPrescriptionsForPatient(patientId),
  );
}
