'use client';

/**
 * Medication Refill Requests — real, shared, reactive state
 * (`useSyncExternalStore`, same pattern as `pharmacyDispensingStore.ts`).
 * Approving a request doesn't just flip a label: it builds a real
 * `PharmacyQueueEntry` and injects it into `pharmacyDispensingStore.ts` via
 * `addManualQueueEntry()`, so the refill actually flows through the same
 * Prescription Queue → Dispense Medication pipeline every other prescription
 * does. Once that entry reaches Ready for Pickup/Collected, this store's own
 * subscription to the queue flips the refill's status to "Dispensed" —
 * closing the loop instead of leaving "Approved" as a dead end.
 * Swap out by pointing these actions at real endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import {
  deriveMedicationFields,
  REFILL_REQUESTS_SEED,
  type RefillRequest,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  addManualQueueEntry,
  isQueueEntryDispensed,
  subscribe as subscribeToQueue,
} from '@/features/pharmacy/store/pharmacyDispensingStore';

let requests: RefillRequest[] = [...REFILL_REQUESTS_SEED];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): RefillRequest[] {
  return requests;
}

function getServerSnapshot(): RefillRequest[] {
  return REFILL_REQUESTS_SEED;
}

export function useRefillRequests(): RefillRequest[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getRefillRequestsSnapshot(): RefillRequest[] {
  return getSnapshot();
}

let refillSeq = 0;
function nextRefillRxNo(): string {
  refillSeq += 1;
  return `RX-REFILL-${Date.now()}-${refillSeq}`;
}

/** Approves a refill request and creates the real, dispensable prescription
 * it represents in the shared pharmacyDispensingStore queue. */
export function approveRefillRequest(id: string, approvedBy: string): string | null {
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const req = requests[idx]!;
  const now = new Date().toISOString();
  const rxNo = nextRefillRxNo();
  const patient = getPatientDetail(req.patientId);
  const derived = deriveMedicationFields(req.medicationName);

  addManualQueueEntry({
    rxNo,
    patientId: req.patientId,
    medicationName: req.medicationName,
    dose: req.dose,
    frequency: derived.duration === 'As needed' ? 'PRN' : 'As previously prescribed',
    doctorName: req.requestedByDoctorName ?? 'Refill — see original prescriber',
    department: req.department,
    priority: 'Medium',
    pickupType: 'Self Pickup',
    hasAllergyAlert: patient.allergies.length > 0,
    receivedAt: now,
    stage: 'Pending Verification',
    ...derived,
  });

  requests = requests.map((r, i) =>
    i === idx ? { ...r, status: 'Approved', reviewedAt: now, linkedRxNo: rxNo } : r,
  );
  void approvedBy;
  emit();
  return rxNo;
}

export function denyRefillRequest(id: string, reason?: string): void {
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const now = new Date().toISOString();
  requests = requests.map((r, i) =>
    i === idx
      ? { ...r, status: 'Denied', reviewedAt: now, ...(reason ? { reviewNote: reason } : {}) }
      : r,
  );
  emit();
}

// Whenever the pharmacy queue changes, check every Approved refill's linked
// Rx — once it's actually been dispensed, close the loop here too.
subscribeToQueue(() => {
  let changed = false;
  requests = requests.map((r) => {
    if (r.status === 'Approved' && r.linkedRxNo && isQueueEntryDispensed(r.linkedRxNo)) {
      changed = true;
      return { ...r, status: 'Dispensed' };
    }
    return r;
  });
  if (changed) emit();
});
