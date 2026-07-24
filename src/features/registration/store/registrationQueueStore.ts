'use client';

/**
 * The registration queue as live, shared state — not a static fixture.
 * Registration's Check-In (and, going forward, Emergency Registration)
 * append real entries here; the Nurse Patient Queue reads and edits
 * (Reassign, Mark Emergency) through the same store. Same
 * `useSyncExternalStore` module-singleton pattern as
 * `nursing/store/nursingWorkflowStore.ts` — the two screens are mounted at
 * different times/routes, so a page-local `useState` seeded once from
 * `QUEUE_ENTRIES` would silently fork the moment either side made an edit.
 *
 * Swap out by pointing these actions at real queue-entry endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  QUEUE_ENTRIES,
  pickClinicForDepartment,
  type QueueEntry,
  type QueueStatus,
} from '@/features/registration/__mocks__/queueFixtures';

let entries: QueueEntry[] = [...QUEUE_ENTRIES];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): QueueEntry[] {
  return entries;
}

function getServerSnapshot(): QueueEntry[] {
  return QUEUE_ENTRIES;
}

/** Reactive hook — re-renders the caller whenever an entry is added or edited. */
export function useQueueEntries(): QueueEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Check-in → queue (the arrival→triage bridge) ────────────────────────────

// Check-In's own department picker (`checkInFixtures.DEPARTMENT_OPTIONS`) is
// a patient-facing list, not the queue's clinic-routing vocabulary
// (`queueFixtures.DEPARTMENTS`) — this is the translation between the two.
// Departments with no dedicated queue clinic yet (antenatal/eye/ENT) route to
// General Outpatient with the chosen department kept as the visible clinic
// label, so the entry is still triageable rather than silently dropped.
const CHECKIN_DEPARTMENT_TO_QUEUE_DEPARTMENT: Record<string, string> = {
  'general-opd': 'General Outpatient',
  emergency: 'General Outpatient',
  antenatal: 'General Outpatient',
  pediatric: 'Paediatrics',
  dental: 'Dental',
  eye: 'General Outpatient',
  ent: 'General Outpatient',
  physiotherapy: 'Physiotherapy',
};

const CHECKIN_DEPARTMENT_FALLBACK_CLINIC: Record<string, string> = {
  emergency: 'Emergency Room',
  antenatal: 'Antenatal Clinic',
  eye: 'Eye Clinic',
  ent: 'ENT Clinic',
};

export type NewQueueEntryInput = {
  patientName: string;
  mrn: string;
  gender: 'Male' | 'Female';
  age: number;
  /** Raw `checkInFixtures.DEPARTMENT_OPTIONS` value, e.g. `'general-opd'`. */
  checkinDepartment: string;
  isEmergency: boolean;
  isNewPatient?: boolean;
  /** Physician selected at check-in, if any — overrides the department's
   * default on-duty clinic/doctor assignment. */
  physician?: { label: string; doctorId?: string | undefined } | undefined;
  consultingRoomLabel?: string | undefined;
  checkedInBy: string;
};

function nextQueueNumber(isEmergency: boolean): string {
  if (isEmergency) {
    const emergencyCount = entries.filter((e) => e.isEmergency).length;
    return `E${String(emergencyCount + 1).padStart(3, '0')}`;
  }
  return String(entries.length + 1).padStart(3, '0');
}

/** Registration Check-In calling this is what makes a walk-in or verified
 * appointment patient actually arrive on the Nurse Patient Queue — before
 * this, completing check-in only issued a queue number locally. */
export function addQueueEntry(input: NewQueueEntryInput): QueueEntry {
  const department =
    CHECKIN_DEPARTMENT_TO_QUEUE_DEPARTMENT[input.checkinDepartment] ?? 'General Outpatient';
  const clinicAssignment = pickClinicForDepartment(department);

  const assignedClinic =
    input.consultingRoomLabel ??
    CHECKIN_DEPARTMENT_FALLBACK_CLINIC[input.checkinDepartment] ??
    clinicAssignment?.clinic ??
    'Front Desk';
  const attendingDoctor = input.physician?.label ?? clinicAssignment?.doctor ?? 'Unassigned';
  const doctorId = input.physician?.doctorId ?? clinicAssignment?.doctorId;

  const now = new Date().toISOString();
  const history: QueueEntry['history'] = [
    { time: now, label: 'Checked in at Registration', by: input.checkedInBy },
  ];
  if (input.isEmergency) {
    history.push({ time: now, label: 'Marked as Emergency Priority', by: input.checkedInBy });
    history.push({ time: null, label: 'Seen by Triage Nurse', pending: true });
  }

  const entry: QueueEntry = {
    id: `checkin-${Date.now()}`,
    queueNumber: nextQueueNumber(input.isEmergency),
    isEmergency: input.isEmergency,
    patientName: input.patientName,
    mrn: input.mrn,
    gender: input.gender,
    age: input.age,
    department,
    assignedClinic,
    attendingDoctor,
    doctorId,
    isNewPatient: input.isNewPatient ?? false,
    arrivalTime: now,
    status: input.isEmergency ? 'Emergency' : 'New Arrival',
    history,
  };

  entries = [entry, ...entries];
  emit();
  return entry;
}

// ── Nurse-side edits (Reassign / Mark Emergency) ─────────────────────────────
// Lifted out of PatientQueueWorkspace so its edits land in the same store a
// check-in-created entry lives in, instead of a page-local fork.

export function reassignQueueEntry(
  entryId: string,
  department: string,
  clinic: string,
  actorName: string,
): void {
  entries = entries.map((e) =>
    e.id === entryId
      ? {
          ...e,
          department,
          assignedClinic: clinic,
          history: [
            ...e.history,
            { time: new Date().toISOString(), label: `Reassigned to ${clinic}`, by: actorName },
          ],
        }
      : e,
  );
  emit();
}

export function markQueueEntryEmergency(entryId: string, actorName: string): void {
  const status: QueueStatus = 'Emergency';
  entries = entries.map((e) =>
    e.id === entryId
      ? {
          ...e,
          isEmergency: true,
          status,
          history: [
            ...e.history,
            {
              time: new Date().toISOString(),
              label: 'Marked as Emergency Priority',
              by: actorName,
            },
          ],
        }
      : e,
  );
  emit();
}
