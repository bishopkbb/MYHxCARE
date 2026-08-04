'use client';

/**
 * The canonical LabResult store — real, shared, reactive state for every lab
 * test in the hospital, replacing the old `labOrderStore.ts` (a plain,
 * non-reactive array the doctor's own screen read once at mount) and the
 * page-local `useState` the nurse's Laboratory workspace used to hold its own
 * disconnected copy in. Same `useSyncExternalStore` module-singleton pattern
 * as `encounterStore.ts`/`nursingWorkflowStore.ts` — this is what makes a lab
 * order a doctor places visible to the nurse who must collect the sample, and
 * a nurse's critical-value acknowledgment visible to the doctor who must act
 * on it, in the same session, without a reload. See
 * MYHXCARE_SYSTEM_CONSISTENCY_REGISTER.md SYS-004.
 *
 * Swap out by pointing these actions at real
 * `POST /lab/orders` / `POST /lab/samples/{id}/collect` /
 * `POST /lab/results/{id}/verify` endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import { LAB_CATEGORIES } from '@/features/laboratory/__mocks__/labOrderFixtures';
import {
  CANONICAL_LAB_RESULTS,
  type LabDepartment,
  type LabResult,
  type LabResultFlag,
  type LabResultNote,
  type LabResultPriority,
  type LabResultRow,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import type { Gender } from '@/types/patient.types';

let results: LabResult[] = [...CANONICAL_LAB_RESULTS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): LabResult[] {
  return results;
}

function getServerSnapshot(): LabResult[] {
  return CANONICAL_LAB_RESULTS;
}

/** Reactive hook — re-renders the caller whenever any lab result is created
 * or updated, by either the nurse-facing or doctor-facing screen. */
export function useLabResults(): LabResult[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function updateResult(id: string, patch: Partial<LabResult>): void {
  const idx = results.findIndex((r) => r.id === id);
  if (idx === -1) return;
  results = results.map((r, i) => (i === idx ? { ...r, ...patch } : r));
  emit();
}

const CATEGORY_TO_DEPARTMENT: Record<string, LabDepartment> = {
  haematology: 'Hematology',
  'clinical-chemistry': 'Biochemistry',
  microbiology: 'Microbiology',
  serology: 'Immunology',
};

function findTestName(testId: string): string {
  for (const category of LAB_CATEGORIES) {
    const test = category.tests.find((t) => t.id === testId);
    if (test) return test.name;
  }
  return testId;
}

function findDepartmentForTest(testId: string): LabDepartment {
  for (const category of LAB_CATEGORIES) {
    if (category.tests.some((t) => t.id === testId)) {
      return CATEGORY_TO_DEPARTMENT[category.id] ?? 'Biochemistry';
    }
  }
  return 'Biochemistry';
}

let seq = 0;

/** Called from the doctor's "Send Request to Laboratory" (patient-context lab
 * order screen) — creates one real, `ORDERED` row per selected test, now
 * visible on the nurse's own Laboratory workspace ("Doctor Requests" tab)
 * immediately, not just on the doctor's own `/lab/results`. */
export function addLabOrder(params: {
  patientId?: string;
  patientName: string;
  mrn: string;
  initials: string;
  avatarBg: string;
  age?: number;
  gender?: Gender;
  testIds: string[];
  priority: LabResultPriority;
  orderedBy: string;
  isWalkIn?: boolean;
}): void {
  const orderedAt = new Date().toISOString();
  const newOrders: LabResult[] = params.testIds.map((testId) => {
    seq += 1;
    return {
      id: `lab-order-${seq}`,
      ...(params.patientId ? { patientId: params.patientId } : {}),
      mrn: params.mrn,
      patientName: params.patientName,
      initials: params.initials,
      avatarBg: params.avatarBg,
      ...(params.age !== undefined ? { age: params.age } : {}),
      ...(params.gender ? { gender: params.gender } : {}),
      testName: findTestName(testId),
      department: findDepartmentForTest(testId),
      priority: params.priority,
      status: 'ORDERED',
      orderedBy: params.orderedBy,
      orderedAt,
      ...(params.isWalkIn ? { isWalkIn: true } : {}),
    };
  });
  results = [...newOrders, ...results];
  emit();
}

/** Nurse action — collects (or recollects, after a rejection) the specimen. */
export function collectSample(id: string, collectedBy: string, collectedAt: string): void {
  const idx = results.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const { rejectionReason: _rejectionReason, ...rest } = results[idx]!;
  results = results.map((r, i) =>
    i === idx
      ? {
          ...rest,
          status: 'SAMPLE_COLLECTED',
          sampleCollectedAt: collectedAt,
          sampleCollectedBy: collectedBy,
        }
      : r,
  );
  emit();
}

/** Nurse action — the specimen the lab produced this result for is a real,
 * shared row; this is the "I told the ordering doctor about the critical
 * value" step, distinct from the doctor's own `verifyResult()`. */
export function acknowledgeCritical(id: string, ackBy: string): void {
  updateResult(id, {
    criticalAcknowledgedAt: new Date().toISOString(),
    criticalAcknowledgedBy: ackBy,
  });
}

/** Lab Scientist action — Sample Reception: the specimen has physically
 * arrived at the bench and been logged in. The one real transition to
 * `IN_PROCESS` — nothing set this live before Sample Reception existed. */
export function receiveSample(id: string, receivedBy: string, receivedAt: string): void {
  updateResult(id, { status: 'IN_PROCESS', receivedAt, receivedBy });
}

/** Lab Scientist action — Sample Reception rejects a specimen on inspection
 * (hemolysis, insufficient volume, wrong tube, mislabeling, etc.). The
 * nurse's own `collectSample()` is what un-rejects it later via
 * recollection — this is the forward direction, which nothing set live
 * before Sample Reception existed (every prior `REJECTED` row was static
 * seed data). */
export function rejectSample(id: string, rejectedBy: string, reason: string): void {
  updateResult(id, {
    status: 'REJECTED',
    rejectionReason: reason,
    rejectedAt: new Date().toISOString(),
    rejectedBy,
  });
}

/** Lab Scientist action — Test Work Queue: claims and starts an in-process
 * test at the bench. Nothing set this live before Test Work Queue existed —
 * `IN_PROCESS` previously had no "actually being worked on right now" signal,
 * only "received." */
export function startTest(id: string, startedBy: string): void {
  updateResult(id, { analysisStartedAt: new Date().toISOString(), analysisStartedBy: startedBy });
}

/** Lab Scientist action — pauses an in-process test (reagent shortage,
 * instrument down, needs recollection confirmation, etc.) without rejecting
 * the specimen outright. */
export function putTestOnHold(id: string, heldBy: string, reason: string): void {
  updateResult(id, {
    isOnHold: true,
    holdReason: reason,
    heldAt: new Date().toISOString(),
    heldBy,
  });
}

/** Lab Scientist action — Result Entry: persists in-progress parameter
 * values without finalizing. Status stays `IN_PROCESS` so the test remains
 * on Test Work Queue; lets a scientist leave mid-entry and pick up later
 * from the same real values instead of losing work. */
export function saveResultDraft(id: string, rows: LabResultRow[], comment?: string): void {
  updateResult(id, { rows, ...(comment !== undefined ? { comment } : {}) });
}

/** Lab Scientist action — Result Entry: the one real transition to
 * `RESULTED`. `criticalValueLabel` is only ever set here when `flag` is
 * `CRITICAL`, matching the shape every existing critical seed row already
 * uses, so a live-entered critical value flows straight into the
 * already-built Critical Results page. */
export function finalizeResult(
  id: string,
  rows: LabResultRow[],
  flag: LabResultFlag,
  criticalValueLabel: string | undefined,
  comment?: string,
): void {
  updateResult(id, {
    rows,
    status: 'RESULTED',
    resultAt: new Date().toISOString(),
    flag,
    ...(comment !== undefined ? { comment } : {}),
    ...(criticalValueLabel !== undefined ? { criticalValueLabel } : {}),
  });
}

/** Lab Scientist action — Result Entry's "Add Reflex Test": appends one new
 * test to an existing order (same patient/`orderedAt`/`orderedBy`, so
 * `groupIntoOrders()` naturally folds it in), already `IN_PROCESS` and
 * started — a reflex test runs directly off the specimen already at the
 * bench, not a fresh draw/reception cycle. */
export function addReflexTest(groupKey: string, testId: string, addedBy: string): void {
  const source = results.find((r) => `${r.patientId ?? r.mrn}|${r.orderedAt}` === groupKey);
  if (!source) return;
  seq += 1;
  const now = new Date().toISOString();
  const newTest: LabResult = {
    id: `lab-reflex-${seq}`,
    ...(source.patientId ? { patientId: source.patientId } : {}),
    mrn: source.mrn,
    patientName: source.patientName,
    initials: source.initials,
    avatarBg: source.avatarBg,
    ...(source.age !== undefined ? { age: source.age } : {}),
    ...(source.gender ? { gender: source.gender } : {}),
    ...(source.ward ? { ward: source.ward } : {}),
    ...(source.bed ? { bed: source.bed } : {}),
    testName: findTestName(testId),
    department: findDepartmentForTest(testId),
    priority: source.priority,
    status: 'IN_PROCESS',
    orderedBy: source.orderedBy,
    orderedAt: source.orderedAt,
    receivedAt: now,
    receivedBy: addedBy,
    analysisStartedAt: now,
    analysisStartedBy: addedBy,
  };
  results = [newTest, ...results];
  emit();
}

/** Lab Scientist action — clears a hold. Only the hold fields are cleared;
 * `analysisStartedAt` is left as-is since resuming isn't restarting. */
export function resumeTest(id: string): void {
  const idx = results.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const {
    isOnHold: _isOnHold,
    holdReason: _holdReason,
    heldAt: _heldAt,
    heldBy: _heldBy,
    ...rest
  } = results[idx]!;
  results = results.map((r, i) => (i === idx ? rest : r));
  emit();
}

/** Nurse action — chases an overdue result with the lab. */
export function recordFollowUp(id: string): number {
  const existing = results.find((r) => r.id === id);
  const nextCount = (existing?.followUpCount ?? 0) + 1;
  updateResult(id, { lastFollowUpAt: new Date().toISOString(), followUpCount: nextCount });
  return nextCount;
}

/** Doctor action — acknowledges having seen the result without formally
 * verifying it yet (kept distinct from `verifyResult()`, matching the
 * doctor-facing screen's own existing two-step Mark Reviewed / Verify Result
 * flow). */
export function markDoctorReviewed(id: string, reviewedBy: string): void {
  updateResult(id, { doctorReviewedAt: new Date().toISOString(), doctorReviewedBy: reviewedBy });
}

/** Doctor action — the one real state transition to the terminal
 * `VERIFIED` status. */
export function verifyResult(id: string, reviewedBy: string): void {
  updateResult(id, {
    status: 'VERIFIED',
    doctorReviewedAt: new Date().toISOString(),
    doctorReviewedBy: reviewedBy,
  });
}

export function addNote(id: string, note: Omit<LabResultNote, 'id'>): void {
  const target = results.find((r) => r.id === id);
  if (!target) return;
  const newNote: LabResultNote = {
    id: `note-${id}-${(target.notes?.length ?? 0) + 1}`,
    ...note,
  };
  updateResult(id, { notes: [...(target.notes ?? []), newNote] });
}

export type { LabResult, LabResultFlag, LabResultPriority, LabResultRow, LabResultNote };
