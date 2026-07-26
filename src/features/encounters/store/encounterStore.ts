'use client';

/**
 * Real, persisted Encounter records — adopting the canonical `VisitStatus`
 * state machine from `src/types/visit.types.ts` instead of the screen-local
 * status strings each workflow invented separately. Before this, completing
 * a consultation only showed a toast: no encounter existed anywhere, so
 * nothing downstream (Medical Records, reporting, audit) could ever see that
 * the visit happened. Same `useSyncExternalStore` module-singleton pattern as
 * the other cross-workspace stores this session.
 *
 * Swap out by pointing `completeEncounter` at a real
 * `POST /encounters/{id}/complete` endpoint in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import type { MedicalRecord } from '@/features/medical-records/__mocks__/medicalRecordFixtures';
import { addMedicalRecord } from '@/features/medical-records/store/medicalRecordsStore';
import { isTerminalStatus, type Encounter } from '@/types/visit.types';
import { formatHumanDate } from '@/utils/datetime';

let encounters: Encounter[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Encounter[] {
  return encounters;
}

function getServerSnapshot(): Encounter[] {
  return [];
}

/** Reactive hook — re-renders the caller whenever a new encounter completes. */
export function useEncounters(): Encounter[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type StartEncounterInput = {
  patientId: string;
  patientName: string;
  mrn: string;
  attendingPhysicianId?: string | undefined;
  attendingPhysicianName?: string | undefined;
};

/** Called the moment a doctor clicks "Start Consultation" (every entry point —
 * `/encounters`, `/dashboard`, `/patients`) — this is what gives `Encounter`
 * a real, live status *during* a visit instead of the record only existing
 * once `completeEncounter()` runs at the very end (see
 * MYHXCARE_CROSS_MODULE_WORKFLOW_MAP.md stage 7, and SYS-002 in the
 * consistency register). Idempotent: returns the existing in-progress
 * encounter rather than creating a duplicate if one is already open for this
 * patient. `fileNumber`/`departmentId`/`departmentName` aren't known yet at
 * this point in the flow — left honestly blank/placeholder rather than
 * fabricated; `completeEncounter()` fills them in once the doctor has that
 * context. */
export function startEncounter(input: StartEncounterInput): Encounter {
  const activeIdx = encounters.findIndex(
    (e) => e.patientId === input.patientId && !isTerminalStatus(e.status),
  );
  if (activeIdx !== -1) return encounters[activeIdx]!;

  const now = new Date().toISOString();
  const [firstName, ...rest] = input.patientName.trim().split(/\s+/);
  const lastName = rest.join(' ') || (firstName ?? '');

  const encounter: Encounter = {
    id: `enc-${Date.now()}`,
    patientId: input.patientId,
    mrn: input.mrn,
    patientSummary: {
      fileNumber: '',
      firstName: firstName ?? input.patientName,
      lastName,
    },
    type: 'OPD',
    status: 'IN_CONSULTATION',
    departmentId: 'dept-unknown',
    departmentName: 'General',
    ...(input.attendingPhysicianId ? { attendingPhysicianId: input.attendingPhysicianId } : {}),
    ...(input.attendingPhysicianName
      ? { attendingPhysicianName: input.attendingPhysicianName }
      : {}),
    checkedInAt: now,
    createdAt: now,
    updatedAt: now,
  };

  encounters = [encounter, ...encounters];
  emit();
  return encounter;
}

export type CompleteEncounterInput = {
  patientId: string;
  patientName: string;
  /** Hospital MRN — recorded on the Medical Records entry, distinct from `fileNumber`. */
  mrn: string;
  /** University file number, e.g. "UZ/MED/2021/0234" — the `Encounter` entity's own identifier. */
  fileNumber: string;
  departmentId: string;
  departmentName: string;
  attendingPhysicianId: string;
  attendingPhysicianName: string;
  chiefComplaint: string;
  vitalsSummary: string;
  diagnosis: string;
  treatmentPlan: string;
};

/** The doctor's "Complete Consultation" button calling this is what turns a
 * consultation into a durable Encounter and feeds Medical Records' Patient
 * Records list — the fix for gap G3 in the workflow audit. Completion is
 * always allowed (matching the button's existing behaviour) even with a
 * blank diagnosis/plan; missing fields are recorded honestly as "—" rather
 * than blocking the doctor or fabricating clinical content. */
export function completeEncounter(input: CompleteEncounterInput): Encounter {
  const now = new Date().toISOString();
  const [firstName, ...rest] = input.patientName.trim().split(/\s+/);
  const lastName = rest.join(' ') || (firstName ?? '');

  // Update the in-progress encounter `startEncounter()` created when the
  // doctor clicked "Start Consultation", rather than always creating a fresh
  // row — this is what makes `Encounter.status` a real, single-source-of-truth
  // lifecycle (IN_CONSULTATION -> COMPLETED) instead of jumping straight to
  // COMPLETED with no prior state ever having existed. Falls back to
  // create-fresh-and-complete for any caller that reaches completion without
  // having started one (kept for resilience, not expected in normal use).
  const activeIdx = encounters.findIndex(
    (e) => e.patientId === input.patientId && !isTerminalStatus(e.status),
  );

  const patientSummary = {
    fileNumber: input.fileNumber,
    firstName: firstName ?? input.patientName,
    lastName,
  };

  let encounter: Encounter;
  if (activeIdx !== -1) {
    encounter = {
      ...encounters[activeIdx]!,
      mrn: input.mrn,
      patientSummary,
      departmentId: input.departmentId,
      departmentName: input.departmentName,
      attendingPhysicianId: input.attendingPhysicianId,
      attendingPhysicianName: input.attendingPhysicianName,
      status: 'COMPLETED',
      ...(input.chiefComplaint ? { chiefComplaint: input.chiefComplaint } : {}),
      ...(input.diagnosis ? { diagnosis: input.diagnosis } : {}),
      ...(input.treatmentPlan ? { treatmentPlan: input.treatmentPlan } : {}),
      completedAt: now,
      updatedAt: now,
    };
    encounters = encounters.map((e, i) => (i === activeIdx ? encounter : e));
  } else {
    encounter = {
      id: `enc-${Date.now()}`,
      patientId: input.patientId,
      mrn: input.mrn,
      patientSummary,
      type: 'OPD',
      status: 'COMPLETED',
      departmentId: input.departmentId,
      departmentName: input.departmentName,
      attendingPhysicianId: input.attendingPhysicianId,
      attendingPhysicianName: input.attendingPhysicianName,
      ...(input.chiefComplaint ? { chiefComplaint: input.chiefComplaint } : {}),
      ...(input.diagnosis ? { diagnosis: input.diagnosis } : {}),
      ...(input.treatmentPlan ? { treatmentPlan: input.treatmentPlan } : {}),
      checkedInAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    encounters = [encounter, ...encounters];
  }
  emit();

  const record: MedicalRecord = {
    id: `mr-${encounter.id}`,
    type: 'consultation',
    title: input.chiefComplaint ? `Consultation — ${input.chiefComplaint}` : 'Consultation',
    patientName: input.patientName,
    mrn: input.mrn,
    date: formatHumanDate(now),
    provider: input.attendingPhysicianName,
    status: 'completed',
    detail: {
      summary: input.chiefComplaint || 'Consultation completed.',
      fields: [
        { label: 'Chief Complaint', value: input.chiefComplaint || '—' },
        { label: 'Diagnosis', value: input.diagnosis || '—' },
        { label: 'Vitals', value: input.vitalsSummary || '—' },
        { label: 'Plan', value: input.treatmentPlan || '—' },
      ],
    },
  };
  addMedicalRecord(record);

  return encounter;
}
