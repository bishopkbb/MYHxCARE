/**
 * Live Observation Unit occupancy — admitting, discharging, recording
 * vitals, adding a nursing note, or logging an order on the real
 * Observation Unit screen are real hospital events, not dead-end toasts.
 * `useSyncExternalStore` module store, same shape as `bedAssignmentStore.ts`
 * / `triageAssessmentStore.ts`. Dashboard's Observation Patients panel and
 * Tracking Board's Under Observation rows both read this store (not the
 * static `OBSERVATION_SEED_PATIENTS` fixture directly), so an admit or
 * discharge made here shows up on both immediately.
 */
'use client';

import { useSyncExternalStore } from 'react';

import {
  OBSERVATION_SEED_PATIENTS,
  RECENT_OBSERVATION_DISPOSITIONS,
  type ObservationVitals,
} from '@/features/emergency/__mocks__/emergencyFixtures';

export type ObservationNote = { id: string; time: string; author: string; note: string };
export type ObservationDisposition = 'Active' | 'ReadyForDisposition';
export type ObservationOutcome = 'Discharged' | 'Admitted' | 'Transferred';

export type ObservationRecord = {
  id: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female';
  bay: string;
  slotLabel: string;
  reason: string;
  physician: string;
  admittedAt: string; // ISO
  nextReviewAt: string; // ISO
  disposition: ObservationDisposition;
  vitals: ObservationVitals & { updatedAt: string };
  notes: ObservationNote[];
  ordersCount: number;
};

export type RecentDisposition = {
  id: string;
  patientName: string;
  time: string; // ISO
  outcome: ObservationOutcome;
};

function seedRecords(): Map<string, ObservationRecord> {
  const now = Date.now();
  const map = new Map<string, ObservationRecord>();
  for (const p of OBSERVATION_SEED_PATIENTS) {
    const admittedAt = new Date(now - p.admittedMinutesAgo * 60_000);
    map.set(p.id, {
      id: p.id,
      patientName: p.patientName,
      age: p.age,
      gender: p.gender,
      bay: p.bay,
      slotLabel: p.slotLabel,
      reason: p.reason,
      physician: p.physician,
      admittedAt: admittedAt.toISOString(),
      nextReviewAt: new Date(admittedAt.getTime() + p.reviewIntervalMinutes * 60_000).toISOString(),
      disposition: 'Active',
      vitals: { ...p.vitals, updatedAt: admittedAt.toISOString() },
      notes: [],
      ordersCount: 0,
    });
  }
  return map;
}

let records = seedRecords();
let recentDispositions: RecentDisposition[] = RECENT_OBSERVATION_DISPOSITIONS.map((d) => ({
  id: d.id,
  patientName: d.patientName,
  time: new Date(Date.now() - d.minutesAgo * 60_000).toISOString(),
  outcome: d.outcome,
}));

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function occupiedSlotKeys(): Set<string> {
  return new Set(Array.from(records.values()).map((r) => `${r.bay}__${r.slotLabel}`));
}

export function admitToObservation(input: {
  patientName: string;
  age: number;
  gender: 'Male' | 'Female';
  bay: string;
  slotLabel: string;
  reason: string;
  physician: string;
  reviewMinutes: number;
}): void {
  const id = `obs-live-${Date.now()}`;
  const now = new Date();
  const next = new Map(records);
  next.set(id, {
    id,
    patientName: input.patientName,
    age: input.age,
    gender: input.gender,
    bay: input.bay,
    slotLabel: input.slotLabel,
    reason: input.reason,
    physician: input.physician,
    admittedAt: now.toISOString(),
    nextReviewAt: new Date(now.getTime() + input.reviewMinutes * 60_000).toISOString(),
    disposition: 'Active',
    vitals: { bp: '--/--', hr: 0, rr: 0, spo2: 0, updatedAt: now.toISOString() },
    notes: [],
    ordersCount: 0,
  });
  records = next;
  emit();
}

export function markReadyForDisposition(id: string): void {
  const rec = records.get(id);
  if (!rec) return;
  const next = new Map(records);
  next.set(id, { ...rec, disposition: 'ReadyForDisposition' });
  records = next;
  emit();
}

export function dischargeFromObservation(id: string, outcome: ObservationOutcome): void {
  const rec = records.get(id);
  if (!rec) return;
  const next = new Map(records);
  next.delete(id);
  records = next;
  recentDispositions = [
    {
      id: `disp-${Date.now()}`,
      patientName: rec.patientName,
      time: new Date().toISOString(),
      outcome,
    },
    ...recentDispositions,
  ].slice(0, 10);
  emit();
}

export function addObservationNote(id: string, author: string, note: string): void {
  const rec = records.get(id);
  if (!rec) return;
  const next = new Map(records);
  next.set(id, {
    ...rec,
    notes: [
      { id: `note-${Date.now()}`, time: new Date().toISOString(), author, note },
      ...rec.notes,
    ],
  });
  records = next;
  emit();
}

export function recordObservationVitals(id: string, vitals: ObservationVitals): void {
  const rec = records.get(id);
  if (!rec) return;
  const next = new Map(records);
  next.set(id, { ...rec, vitals: { ...vitals, updatedAt: new Date().toISOString() } });
  records = next;
  emit();
}

export function addObservationOrder(id: string): void {
  const rec = records.get(id);
  if (!rec) return;
  const next = new Map(records);
  next.set(id, { ...rec, ordersCount: rec.ordersCount + 1 });
  records = next;
  emit();
}

function getRecordsSnapshot(): Map<string, ObservationRecord> {
  return records;
}
function getRecentSnapshot(): RecentDisposition[] {
  return recentDispositions;
}

export function useObservationRecords(): Map<string, ObservationRecord> {
  return useSyncExternalStore(subscribe, getRecordsSnapshot, getRecordsSnapshot);
}

export function useRecentObservationDispositions(): RecentDisposition[] {
  return useSyncExternalStore(subscribe, getRecentSnapshot, getRecentSnapshot);
}
