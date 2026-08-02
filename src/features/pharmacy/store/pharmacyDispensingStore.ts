'use client';

/**
 * The Pharmacy dispensing queue — real, shared, reactive state
 * (`useSyncExternalStore`, same pattern as `labResultStore.ts`/
 * `prescriptionStore.ts`), seeded with a realistic baseline
 * (`PHARMACY_QUEUE_SEED`) and then bridged live to `prescriptionStore.ts`:
 * on module init it subscribes to that store's writes, so a prescription a
 * doctor sends mid-session appears here as a new Pending Verification row
 * without a reload — the exact cross-workflow connection SYS-014's
 * `prescriptionStore.ts` reactivity fix was built to enable. Swap out by
 * pointing these actions at real `POST /pharmacy/dispense/{rxNo}` /
 * `POST /pharmacy/collect/{rxNo}` endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import { getDoctorByName } from '@/features/shared/__mocks__/doctorDirectory';
import {
  getAllPrescriptionEntries,
  subscribe as subscribeToPrescriptions,
} from '@/features/prescriptions/store/prescriptionStore';
import {
  deriveMedicationFields,
  DISPENSING_ACTIVITY_SEED,
  PHARMACY_QUEUE_SEED,
  type DispensingActivityEntry,
  type PharmacyQueueEntry,
  type PharmacyQueueStage,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

/** The single-step progression Pharmacy Queue Monitor's "Move to Next
 * Queue" walks through — one stage per click, distinct from
 * `verifyAndDispense()`'s "jump straight to Ready for Pickup" shortcut. */
const QUEUE_STAGE_ORDER: PharmacyQueueStage[] = [
  'Pending Verification',
  'In Progress',
  'Ready for Dispense',
  'Ready for Pickup',
];

let queue: PharmacyQueueEntry[] = [...PHARMACY_QUEUE_SEED];
let activityLog: DispensingActivityEntry[] = [...DISPENSING_ACTIVITY_SEED];
const listeners = new Set<() => void>();

// Medication ids already represented in `queue`, so the prescriptionStore
// bridge below never double-ingests the same prescription on repeated emits.
const ingestedMedicationIds = new Set<string>();

function emit() {
  for (const listener of listeners) listener();
}

/** Exported so other pharmacy stores (e.g. refillRequestStore.ts) can react
 * to a queue change without re-deriving their own copy of this state. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function getSnapshot(): PharmacyQueueEntry[] {
  return queue;
}

function getServerSnapshot(): PharmacyQueueEntry[] {
  return PHARMACY_QUEUE_SEED;
}

export function useAllQueueEntries(): PharmacyQueueEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Plain (non-hook) snapshot — for non-React consumers, mirroring
 * `prescriptionStore.ts`'s own `getPrescriptionsForPatient()`. */
export function getAllQueueEntriesSnapshot(): PharmacyQueueEntry[] {
  return getSnapshot();
}

export function usePendingVerificationQueue(): PharmacyQueueEntry[] {
  const all = useAllQueueEntries();
  return all.filter((e) => e.stage === 'Pending Verification');
}

export function useReadyForPickupQueue(): PharmacyQueueEntry[] {
  const all = useAllQueueEntries();
  return all.filter((e) => e.stage === 'Ready for Pickup');
}

export function useInProgressQueue(): PharmacyQueueEntry[] {
  const all = useAllQueueEntries();
  return all.filter((e) => e.stage === 'In Progress');
}

export function useReadyForDispenseQueue(): PharmacyQueueEntry[] {
  const all = useAllQueueEntries();
  return all.filter((e) => e.stage === 'Ready for Dispense');
}

export function useCancelledQueue(): PharmacyQueueEntry[] {
  const all = useAllQueueEntries();
  return all.filter((e) => e.stage === 'Cancelled');
}

/** Dispensed prescriptions the patient is currently on — Ready for Pickup
 * (dispensed, not yet collected) or already Collected — for the Active
 * Prescriptions screen. */
export function useActivePrescriptions(): PharmacyQueueEntry[] {
  const all = useAllQueueEntries();
  return all.filter((e) => e.stage === 'Ready for Pickup' || e.stage === 'Collected');
}

/** Live-updating single entry, for the Prescription Details screen — re-runs
 * whenever the shared queue emits, so a change made on the Queue screen (or
 * the live prescriptionStore bridge) is reflected here without a reload. */
export function useQueueEntry(rxNo: string | null): PharmacyQueueEntry | null {
  const all = useAllQueueEntries();
  if (!rxNo) return null;
  return all.find((e) => e.rxNo === rxNo) ?? null;
}

/** Most recent dispensing activity for a patient, across the whole log —
 * powers the Prescription Details "Patient Summary" Last Dispensed field. */
export function getLastDispensedForPatient(patientId: string): DispensingActivityEntry | null {
  const entries = activityLog
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => new Date(b.dispensedAt).getTime() - new Date(a.dispensedAt).getTime());
  return entries[0] ?? null;
}

export function useDispensedTodayCount(): number {
  const all = useAllQueueEntries();
  return all.filter((e) => isToday(e.dispensedAt)).length;
}

function activityGetSnapshot(): DispensingActivityEntry[] {
  return activityLog;
}

function activityGetServerSnapshot(): DispensingActivityEntry[] {
  return DISPENSING_ACTIVITY_SEED;
}

export function useRecentDispensingActivity(): DispensingActivityEntry[] {
  return useSyncExternalStore(subscribe, activityGetSnapshot, activityGetServerSnapshot);
}

/** Plain (non-hook) snapshot — lets auditTrailStore.ts bridge real dispense
 * activity into the audit log without a React hook, mirroring
 * `getAllQueueEntriesSnapshot()` above. */
export function getRecentDispensingActivitySnapshot(): DispensingActivityEntry[] {
  return activityGetSnapshot();
}

/** Injects a fully-built queue entry — e.g. a refill request the pharmacist
 * approved becoming a real, dispensable prescription in this same queue,
 * rather than a dead-end "approved" label with nothing behind it. */
export function addManualQueueEntry(entry: PharmacyQueueEntry): void {
  queue = [entry, ...queue];
  emit();
}

/** True once an entry with this Rx No. has reached Ready for Pickup or
 * Collected — used by refillRequestStore.ts to know when an approved refill
 * it created has actually been dispensed. */
export function isQueueEntryDispensed(rxNo: string): boolean {
  const entry = queue.find((e) => e.rxNo === rxNo);
  return Boolean(entry && (entry.stage === 'Ready for Pickup' || entry.stage === 'Collected'));
}

/** Pharmacist verifies and dispenses a pending prescription — moves it to
 * Ready for Pickup and logs the action. */
export function verifyAndDispense(rxNo: string, dispensedBy: string): void {
  const idx = queue.findIndex((e) => e.rxNo === rxNo);
  if (idx === -1) return;
  const now = new Date().toISOString();
  const entry = queue[idx]!;
  queue = queue.map((e, i) =>
    i === idx ? { ...e, stage: 'Ready for Pickup', dispensedAt: now } : e,
  );
  activityLog = [
    {
      id: `da-${rxNo}-${Date.now()}`,
      medicationName: `${entry.medicationName} ${entry.dose}`,
      patientId: entry.patientId,
      rxNo: entry.rxNo,
      dispensedAt: now,
      dose: entry.dose,
      qty: entry.quantity,
      unit: entry.form,
      doctorName: entry.doctorName,
      department: entry.department,
      status: 'Completed',
      dispensedBy,
    },
    ...activityLog,
  ];
  emit();
}

/** Moves a queue entry one step forward (Pending Verification → In
 * Progress → Ready for Dispense → Ready for Pickup) — Pharmacy Queue
 * Monitor's "Move to Next Queue" action. Reaching Ready for Pickup this way
 * logs a real dispense activity entry too, exactly like `verifyAndDispense()`,
 * so it shows up in Dispensing Audit Trail the same way. No-ops for an entry
 * already at Ready for Pickup or in a terminal stage (Collected/Cancelled). */
export function advanceQueueStage(rxNo: string, dispensedBy: string): void {
  const idx = queue.findIndex((e) => e.rxNo === rxNo);
  if (idx === -1) return;
  const entry = queue[idx]!;
  const stageIdx = QUEUE_STAGE_ORDER.indexOf(entry.stage);
  if (stageIdx === -1 || stageIdx === QUEUE_STAGE_ORDER.length - 1) return;
  const nextStage = QUEUE_STAGE_ORDER[stageIdx + 1]!;
  const now = new Date().toISOString();

  queue = queue.map((e, i) =>
    i === idx
      ? {
          ...e,
          stage: nextStage,
          ...(nextStage === 'Ready for Pickup' ? { dispensedAt: now } : {}),
        }
      : e,
  );

  if (nextStage === 'Ready for Pickup') {
    activityLog = [
      {
        id: `da-${rxNo}-${Date.now()}`,
        medicationName: `${entry.medicationName} ${entry.dose}`,
        patientId: entry.patientId,
        rxNo: entry.rxNo,
        dispensedAt: now,
        dose: entry.dose,
        qty: entry.quantity,
        unit: entry.form,
        doctorName: entry.doctorName,
        department: entry.department,
        status: 'Completed',
        dispensedBy,
      },
      ...activityLog,
    ];
  }
  emit();
}

/** Patient collects a ready prescription — closes out the queue entry. */
export function markCollected(rxNo: string): void {
  const idx = queue.findIndex((e) => e.rxNo === rxNo);
  if (idx === -1) return;
  const now = new Date().toISOString();
  queue = queue.map((e, i) => (i === idx ? { ...e, stage: 'Collected', collectedAt: now } : e));
  emit();
}

/** Cancels a prescription still earlier in the pipeline — by the prescriber,
 * the patient, or a pharmacist safety hold. Not available once a prescription
 * has already reached the patient (Ready for Pickup/Collected). */
export function cancelPrescription(rxNo: string): void {
  const idx = queue.findIndex((e) => e.rxNo === rxNo);
  if (idx === -1) return;
  const now = new Date().toISOString();
  queue = queue.map((e, i) => (i === idx ? { ...e, stage: 'Cancelled', cancelledAt: now } : e));
  emit();
}

/** Toggles a temporary safety hold — independent of `stage`, so a held
 * prescription stays exactly where it is in the pipeline but is flagged. */
export function toggleHold(rxNo: string): void {
  const idx = queue.findIndex((e) => e.rxNo === rxNo);
  if (idx === -1) return;
  queue = queue.map((e, i) => (i === idx ? { ...e, isOnHold: !e.isOnHold } : e));
  emit();
}

/** A pharmacist's note on a specific Rx — real, shared state (checklist §16),
 * not local component state that vanishes on navigation. */
export function setPharmacistNote(rxNo: string, note: string): void {
  const idx = queue.findIndex((e) => e.rxNo === rxNo);
  if (idx === -1) return;
  const now = new Date().toISOString();
  queue = queue.map((e, i) => (i === idx ? { ...e, pharmacistNote: note, noteUpdatedAt: now } : e));
  emit();
}

/** Countersigns a controlled-substance dispensing record still sitting at
 * Pending Approval — the second-pharmacist sign-off real controlled drugs
 * require, flipping it to Completed instead of leaving it stuck forever. */
export function approveControlledDispenseRecord(activityId: string, approvedBy: string): void {
  const idx = activityLog.findIndex((a) => a.id === activityId);
  if (idx === -1) return;
  const entry = activityLog[idx]!;
  if (entry.status !== 'Pending Approval') return;
  activityLog = activityLog.map((a, i) =>
    i === idx ? { ...a, status: 'Completed', approvedBy } : a,
  );
  emit();
}

function ingestNewPrescriptions() {
  const before = queue.length;
  const newRows: PharmacyQueueEntry[] = [];
  for (const { patientId, medication } of getAllPrescriptionEntries()) {
    if (ingestedMedicationIds.has(medication.id)) continue;
    ingestedMedicationIds.add(medication.id);
    newRows.push({
      rxNo: medication.id,
      patientId,
      medicationName: medication.name,
      dose: medication.dose,
      frequency: medication.frequency,
      doctorName: medication.prescribedBy,
      department: getDoctorByName(medication.prescribedBy)?.department ?? 'General Medicine',
      priority: 'Medium',
      pickupType: 'Self Pickup',
      hasAllergyAlert: getPatientDetail(patientId).allergies.length > 0,
      receivedAt: new Date().toISOString(),
      stage: 'Pending Verification',
      ...deriveMedicationFields(medication.name),
    });
  }
  if (newRows.length > 0) {
    queue = [...newRows, ...queue];
    if (queue.length !== before) emit();
  }
}

// Prime the ingested-id set with the seed data's own rx numbers so seeded
// rows are never mistaken for "new" prescriptions on first bridge run.
for (const entry of queue) ingestedMedicationIds.add(entry.rxNo);
subscribeToPrescriptions(ingestNewPrescriptions);
