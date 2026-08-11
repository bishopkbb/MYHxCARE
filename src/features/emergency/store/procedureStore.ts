/**
 * Live emergency procedure log, per patient — logging, updating the status
 * of, or cancelling a procedure on the Emergency Procedures screen is a real
 * hospital event, not a dead-end toast. `useSyncExternalStore` module store,
 * same shape as `medicationOrderStore.ts` / `observationStore.ts`.
 */
'use client';

import { useSyncExternalStore } from 'react';

import type { ProcedureType } from '@/features/emergency/__mocks__/emergencyFixtures';

export type ProcedureStatus = 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
export type ProcedureNoteType = 'Note' | 'Complication';

export type ProcedureNote = {
  id: string;
  text: string;
  type: ProcedureNoteType;
  authoredBy: string;
  at: string; // ISO
};

export type ProcedureDocument = {
  id: string;
  name: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string; // ISO
};

export type ProcedureRecord = {
  id: string;
  entryId: string;
  name: string;
  type: ProcedureType;
  status: ProcedureStatus;
  performedBy: string;
  location: string;
  startedAt: string; // ISO
  completedAt?: string;
  cancelledReason?: string;
  cancelledAt?: string;
  notes: ProcedureNote[];
  documents: ProcedureDocument[];
};

function seedProceduresFor(
  entryId: string,
  performedBy: string,
  location: string,
  now: number,
): ProcedureRecord[] {
  return [
    {
      id: `${entryId}-proc-1`,
      entryId,
      name: 'Endotracheal Intubation',
      type: 'Airway',
      status: 'In Progress',
      performedBy,
      location,
      startedAt: new Date(now - 2 * 60_000).toISOString(),
      notes: [],
      documents: [],
    },
    {
      id: `${entryId}-proc-2`,
      entryId,
      name: 'Chest Tube Insertion',
      type: 'Thoracic',
      status: 'Completed',
      performedBy,
      location,
      startedAt: new Date(now - 45 * 60_000).toISOString(),
      completedAt: new Date(now - 42 * 60_000).toISOString(),
      notes: [],
      documents: [],
    },
    {
      id: `${entryId}-proc-3`,
      entryId,
      name: 'Wound Suturing',
      type: 'Minor Procedure',
      status: 'Completed',
      performedBy: 'Dr. Adeyemi Bello',
      location: 'ER-02',
      startedAt: new Date(now - 95 * 60_000).toISOString(),
      completedAt: new Date(now - 90 * 60_000).toISOString(),
      notes: [],
      documents: [],
    },
    {
      id: `${entryId}-proc-4`,
      entryId,
      name: 'Defibrillation',
      type: 'Cardiac',
      status: 'Completed',
      performedBy,
      location,
      startedAt: new Date(now - 120 * 60_000).toISOString(),
      completedAt: new Date(now - 119 * 60_000).toISOString(),
      notes: [],
      documents: [],
    },
    {
      id: `${entryId}-proc-5`,
      entryId,
      name: 'Central Line Insertion',
      type: 'Vascular Access',
      status: 'Planned',
      performedBy,
      location: 'Observation Unit',
      startedAt: new Date(now + 30 * 60_000).toISOString(),
      notes: [],
      documents: [],
    },
  ];
}

const proceduresByEntry = new Map<string, ProcedureRecord[]>();
const seededEntryIds = new Set<string>();

// Stable reference for the "no patient selected" case — see
// medicationOrderStore.ts for why this matters to useSyncExternalStore.
const EMPTY_PROCEDURES: ProcedureRecord[] = [];

function ensureSeeded(entryId: string, performedBy: string, location: string) {
  if (seededEntryIds.has(entryId)) return;
  seededEntryIds.add(entryId);
  proceduresByEntry.set(entryId, seedProceduresFor(entryId, performedBy, location, Date.now()));
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addProcedure(input: {
  entryId: string;
  name: string;
  type: ProcedureType;
  status: ProcedureStatus;
  performedBy: string;
  location: string;
}): void {
  const existing = proceduresByEntry.get(input.entryId) ?? [];
  const now = new Date().toISOString();
  const record: ProcedureRecord = {
    id: `${input.entryId}-proc-${Date.now()}`,
    entryId: input.entryId,
    name: input.name,
    type: input.type,
    status: input.status,
    performedBy: input.performedBy,
    location: input.location,
    startedAt: now,
    ...(input.status === 'Completed' ? { completedAt: now } : {}),
    notes: [],
    documents: [],
  };
  proceduresByEntry.set(input.entryId, [record, ...existing]);
  emit();
}

export function updateProcedureStatus(
  entryId: string,
  procedureId: string,
  status: 'In Progress' | 'Completed',
): void {
  const existing = proceduresByEntry.get(entryId);
  if (!existing) return;
  proceduresByEntry.set(
    entryId,
    existing.map((p) =>
      p.id === procedureId
        ? {
            ...p,
            status,
            ...(status === 'Completed' ? { completedAt: new Date().toISOString() } : {}),
          }
        : p,
    ),
  );
  emit();
}

export function cancelProcedure(entryId: string, procedureId: string, reason: string): void {
  const existing = proceduresByEntry.get(entryId);
  if (!existing) return;
  proceduresByEntry.set(
    entryId,
    existing.map((p) =>
      p.id === procedureId
        ? {
            ...p,
            status: 'Cancelled',
            cancelledReason: reason,
            cancelledAt: new Date().toISOString(),
          }
        : p,
    ),
  );
  emit();
}

export function addProcedureNote(
  entryId: string,
  procedureId: string,
  text: string,
  type: ProcedureNoteType,
  authoredBy: string,
): void {
  const existing = proceduresByEntry.get(entryId);
  if (!existing) return;
  const note: ProcedureNote = {
    id: `${procedureId}-note-${Date.now()}`,
    text,
    type,
    authoredBy,
    at: new Date().toISOString(),
  };
  proceduresByEntry.set(
    entryId,
    existing.map((p) => (p.id === procedureId ? { ...p, notes: [note, ...p.notes] } : p)),
  );
  emit();
}

export function addProcedureDocument(
  entryId: string,
  procedureId: string,
  name: string,
  category: string,
  uploadedBy: string,
): void {
  const existing = proceduresByEntry.get(entryId);
  if (!existing) return;
  const doc: ProcedureDocument = {
    id: `${procedureId}-doc-${Date.now()}`,
    name,
    category,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
  proceduresByEntry.set(
    entryId,
    existing.map((p) => (p.id === procedureId ? { ...p, documents: [doc, ...p.documents] } : p)),
  );
  emit();
}

function getSnapshot(entryId: string, performedBy: string, location: string): ProcedureRecord[] {
  ensureSeeded(entryId, performedBy, location);
  return proceduresByEntry.get(entryId) ?? [];
}

export function useProcedures(
  entryId: string | undefined,
  defaultPerformedBy: string,
  defaultLocation: string,
): ProcedureRecord[] {
  return useSyncExternalStore(
    subscribe,
    () => (entryId ? getSnapshot(entryId, defaultPerformedBy, defaultLocation) : EMPTY_PROCEDURES),
    () => EMPTY_PROCEDURES,
  );
}
