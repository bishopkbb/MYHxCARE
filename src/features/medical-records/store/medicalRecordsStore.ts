'use client';

/**
 * The Patient Records list (`/medical-records`) as live, shared state — not a
 * static fixture. `encounters/store/encounterStore.ts` appends a real record
 * here when a doctor completes a consultation, which is what makes that
 * visit actually show up for Medical Records instead of leaving no trace
 * anywhere once the doctor's screen moved on. Same `useSyncExternalStore`
 * module-singleton pattern as the other cross-workspace stores this session.
 *
 * Swap out by pointing these actions at a real medical-records endpoint in
 * Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  MOCK_MEDICAL_RECORDS,
  type MedicalRecord,
} from '@/features/medical-records/__mocks__/medicalRecordFixtures';

let records: MedicalRecord[] = [...MOCK_MEDICAL_RECORDS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): MedicalRecord[] {
  return records;
}

function getServerSnapshot(): MedicalRecord[] {
  return MOCK_MEDICAL_RECORDS;
}

/** Reactive hook — re-renders the caller whenever a new record is added. */
export function useMedicalRecords(): MedicalRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addMedicalRecord(record: MedicalRecord): void {
  records = [record, ...records];
  emit();
}
