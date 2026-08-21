'use client';

/**
 * General (non-legacy) clinical documents uploaded against a patient, keyed
 * by patient id — the Registration module's own Patient Profile Documents
 * tab writes here so an upload survives navigating away and back, instead
 * of vanishing like `DocumentUploadWorkspace.tsx`'s page-local `useState`
 * does today (a known pre-existing gap in that screen, not fixed here —
 * out of scope for this pass). Same `useSyncExternalStore` module-singleton
 * pattern as `patientDirectoryStore.ts` / `registrationQueueStore.ts`.
 *
 * Reuses `ClinicalDocumentEntry` (medical-records' own document shape)
 * rather than inventing a parallel type, so this store is a plausible
 * future migration target for `DocumentUploadWorkspace.tsx` too.
 *
 * Swap out by pointing these actions at real document endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import type { ClinicalDocumentEntry } from '@/features/medical-records/__mocks__/medicalRecordDetailFixtures';

type DocumentsByPatient = Record<string, ClinicalDocumentEntry[]>;

let documentsByPatient: DocumentsByPatient = {};
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DocumentsByPatient {
  return documentsByPatient;
}

function getServerSnapshot(): DocumentsByPatient {
  return {};
}

const EMPTY: ClinicalDocumentEntry[] = [];

/** Reactive hook — re-renders the caller whenever this patient's documents change. */
export function usePatientDocuments(patientId: string | null): ClinicalDocumentEntry[] {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!patientId) return EMPTY;
  return all[patientId] ?? EMPTY;
}

export function addPatientDocuments(patientId: string, docs: ClinicalDocumentEntry[]): void {
  if (docs.length === 0) return;
  documentsByPatient = {
    ...documentsByPatient,
    [patientId]: [...docs, ...(documentsByPatient[patientId] ?? [])],
  };
  emit();
}

export function removePatientDocument(patientId: string, documentId: string): void {
  documentsByPatient = {
    ...documentsByPatient,
    [patientId]: (documentsByPatient[patientId] ?? []).filter((d) => d.id !== documentId),
  };
  emit();
}
