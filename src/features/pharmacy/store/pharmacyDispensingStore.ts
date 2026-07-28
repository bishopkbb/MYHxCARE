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
  DISPENSING_ACTIVITY_SEED,
  PHARMACY_QUEUE_SEED,
  type DispensingActivityEntry,
  type PharmacyQueueEntry,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

let queue: PharmacyQueueEntry[] = [...PHARMACY_QUEUE_SEED];
let activityLog: DispensingActivityEntry[] = [...DISPENSING_ACTIVITY_SEED];
const listeners = new Set<() => void>();

// Medication ids already represented in `queue`, so the prescriptionStore
// bridge below never double-ingests the same prescription on repeated emits.
const ingestedMedicationIds = new Set<string>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
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
    },
    ...activityLog,
  ];
  void dispensedBy;
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
      hasAllergyAlert: getPatientDetail(patientId).allergies.length > 0,
      receivedAt: new Date().toISOString(),
      stage: 'Pending Verification',
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
