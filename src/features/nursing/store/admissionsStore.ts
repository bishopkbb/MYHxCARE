'use client';

/**
 * Admissions as live, shared state — not a static fixture. Both Nursing's own
 * "New Admission" button and the doctor's "Request Admission" action on
 * Consultation call `addAdmission()`, which is the fix for gap G7 in the
 * workflow audit ("no admission action anywhere on the doctor side"). Same
 * `useSyncExternalStore` module-singleton pattern as the other cross-screen
 * stores this session.
 *
 * Swap out by pointing these actions at real admission endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import { ADMISSIONS, type AdmissionRecord } from '@/features/nursing/__mocks__/admissionsFixtures';
import type { NewAdmissionInput } from '@/features/nursing/components/NewAdmissionModal';

let admissions: AdmissionRecord[] = [...ADMISSIONS];
let idCounter = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AdmissionRecord[] {
  return admissions;
}

function getServerSnapshot(): AdmissionRecord[] {
  return ADMISSIONS;
}

/** Reactive hook — re-renders the caller whenever an admission is added or edited. */
export function useAdmissions(): AdmissionRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function updateAdmission(id: string, patch: Partial<AdmissionRecord>): void {
  admissions = admissions.map((a) => (a.id === id ? { ...a, ...patch } : a));
  emit();
}

/** A future `admittedAt` creates a Scheduled admission instead of starting
 * the workflow now — the same rule the Admissions screen used when this
 * logic lived locally there. */
export function addAdmission(input: NewAdmissionInput): AdmissionRecord {
  const isFuture = new Date(input.admittedAt).getTime() > Date.now();
  const admission: AdmissionRecord = {
    id: `adm-new-${idCounter++}`,
    patientName: input.patientName,
    mrn: input.mrn,
    age: input.age,
    gender: input.gender,
    admittedAt: input.admittedAt,
    ward: input.ward,
    admissionType: input.admissionType,
    currentStep: isFuture ? 0 : 1,
    status: isFuture ? 'Scheduled' : 'Pending',
    assignedDoctor: input.assignedDoctor || 'Unassigned',
  };
  admissions = [admission, ...admissions];
  emit();
  return admission;
}
