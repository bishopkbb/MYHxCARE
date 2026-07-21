'use client';

/**
 * The one piece of state in this app shared across pages rather than seeded
 * independently per page: which registration queue patients a nurse has
 * "started triage" on. Everywhere else, per-page local state seeded from
 * static fixtures has been enough — this is the first flow where an action on
 * one screen (Patient Queue) must be visible on another (My Patients) without
 * a full reload, so it's a plain module-singleton store (no new dependency)
 * rather than a second parallel data model.
 *
 * A claimed patient is promoted into a full `NursePatient` immediately, so
 * every existing/future screen that already consumes `NursePatient`
 * (My Patients, Vital Signs, Patient Record) works for them unchanged — they
 * just need to read `getEffectiveRoster()` instead of the static
 * `MY_PATIENTS_ROSTER` constant.
 */

import { useSyncExternalStore } from 'react';

import {
  MY_PATIENTS_ROSTER,
  type NursePatient,
} from '@/features/nursing/__mocks__/myPatientsFixtures';
import type { QueueEntry } from '@/features/registration/__mocks__/queueFixtures';

const AVATAR_PALETTE = [
  '#3B82F6',
  '#22C55E',
  '#8B5CF6',
  '#F59E0B',
  '#00B4D8',
  '#EC4899',
  '#EF4444',
];

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function promoteToNursePatient(entry: QueueEntry): NursePatient {
  return {
    id: entry.id,
    patientName: entry.patientName,
    initials: initialsOf(entry.patientName),
    avatarBg: AVATAR_PALETTE[hashSeed(entry.id) % AVATAR_PALETTE.length] as string,
    mrn: entry.mrn,
    age: entry.age,
    gender: entry.gender,
    ward: 'Pre-Admission',
    bed: '—',
    diagnosis: 'Pending assessment',
    doctorName: entry.attendingDoctor,
    doctorId: entry.doctorId,
    // Unremarkable placeholder — real screens key off `isPreAdmission` for a
    // "pending" display, not these values; this just keeps any other numeric
    // consumer (e.g. the Vital Signs trend generator) from anchoring on 0.
    vitals: { bp: '120/80', hr: 78, temp: 36.8, recordedAt: entry.arrivalTime },
    nextMedication: 'Pending doctor review',
    nextMedicationTime: entry.arrivalTime,
    riskLevel: entry.isEmergency ? 'High' : 'Medium',
    careStatus: 'In Progress',
    frequentVitals: entry.isEmergency,
    isPreAdmission: true,
    isNewPatient: entry.isNewPatient ?? false,
  };
}

const claimed = new Map<string, NursePatient>();
let cachedClaimed: NursePatient[] = [];
const listeners = new Set<() => void>();

function recomputeSnapshot() {
  cachedClaimed = Array.from(claimed.values());
}

function emit() {
  for (const listener of listeners) listener();
}

/** Move a registration queue patient into this nurse's active caseload. */
export function startTriage(entry: QueueEntry): NursePatient {
  const patient = promoteToNursePatient(entry);
  claimed.set(entry.id, patient);
  recomputeSnapshot();
  emit();
  return patient;
}

export function isTriageStarted(entryId: string): boolean {
  return claimed.has(entryId);
}

export function getClaimedPatients(): NursePatient[] {
  return cachedClaimed;
}

/** Admitted ward patients plus whichever pre-admission patients this nurse has claimed. */
export function getEffectiveRoster(): NursePatient[] {
  return [...MY_PATIENTS_ROSTER, ...cachedClaimed];
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): NursePatient[] {
  return cachedClaimed;
}

function getServerSnapshot(): NursePatient[] {
  return [];
}

/** Reactive hook — re-renders the calling component whenever a patient is claimed. */
export function useClaimedPatients(): NursePatient[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Pending Vital Signs hand-off ─────────────────────────────────────────────
// "Start Triage" claims the patient and immediately routes into Vital Signs
// for them, skipping the patient picker — this carries which patient across
// that one navigation. Read-only `peek` + explicit `clear` (rather than one
// combined "consume") so a React 18 Strict Mode double-invoked state
// initializer can't lose the hand-off: peeking twice is harmless, clearing
// twice is a harmless no-op, but consuming twice would drop it on the second call.

let pendingVitalsPatientId: string | null = null;

export function setPendingVitalsPatientId(id: string): void {
  pendingVitalsPatientId = id;
}

export function peekPendingVitalsPatientId(): string | null {
  return pendingVitalsPatientId;
}

export function clearPendingVitalsPatientId(): void {
  pendingVitalsPatientId = null;
}

// ── Recorded-vitals tracking ─────────────────────────────────────────────────
// A patient claimed via "Start Triage" starts with neutral placeholder vitals
// (see `promoteToNursePatient` above) but has never actually had a nurse take
// a real reading — Vital Signs shouldn't fabricate a 30-day trend history for
// them until that first reading exists. Tracked here (not on `NursePatient`
// itself) because it's a one-way fact about this session, not patient data.

const recordedVitals = new Set<string>();

export function markVitalsRecorded(patientId: string): void {
  recordedVitals.add(patientId);
  emit(); // a patient becoming "ready for doctor" can change the encounters queue
}

export function hasRecordedVitals(patientId: string): boolean {
  return recordedVitals.has(patientId);
}

/** Claimed patients whose first vitals have been recorded — ready to appear
 * on the assigned doctor's queue (see encounterFixtures.ts's getDoctorQueue). */
export function getPatientsReadyForDoctor(): NursePatient[] {
  return cachedClaimed.filter((p) => hasRecordedVitals(p.id));
}
