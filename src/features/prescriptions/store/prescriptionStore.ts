'use client';

/**
 * "Send Prescription" used to show a toast claiming a prescription was "sent
 * to pharmacy" while discarding the entire form on submit — no Prescription
 * record was ever created anywhere. This module-level store is what makes
 * that claim true for the rest of the session: a sent prescription now shows
 * up everywhere `getPatientDetail()` is read (Current Medications tab,
 * Consultation's active-meds summary, the Prescription page's own Active
 * Medications banner, Medical Records' Prescriptions tab — see SYS-011),
 * since `getPatientDetail()` merges this store's data in centrally. The
 * actual pharmacy hand-off itself is still out of scope until a real
 * Pharmacy module exists (`/pharmacy` is a bare stub) — this store only
 * closes the "did the prescription itself get created" half of the claim.
 *
 * Plain map, not a reactive store — every consumer reads it once per mount/
 * patient-change, the same reasoning as nursingAssessmentStore.ts. Swap out
 * by pointing hooks to a real prescriptions endpoint in Phase 6.
 */

import type { Medication } from '@/features/patients/__mocks__/patientFixtures';
import type { PrescriptionLine } from '@/features/prescriptions/__mocks__/prescriptionFixtures';

const prescriptionsByPatient = new Map<string, Medication[]>();
let seq = 0;

export function addPrescription(
  patientId: string,
  lines: PrescriptionLine[],
  prescribedBy: string,
): void {
  const newMeds: Medication[] = lines.map((line) => {
    seq += 1;
    return {
      id: `rx-${seq}`,
      name: line.name,
      dose: `${line.dosagePerDose}${line.dosageUnit}`,
      frequency: line.frequency,
      route: line.route,
      startedDate: line.startDate,
      prescribedBy,
      status: 'active',
    };
  });
  const existing = prescriptionsByPatient.get(patientId) ?? [];
  prescriptionsByPatient.set(patientId, [...newMeds, ...existing]);
}

export function getPrescriptionsForPatient(patientId: string): Medication[] {
  return prescriptionsByPatient.get(patientId) ?? [];
}
