'use client';

/**
 * "Save Draft"/"Submit" on Nursing Assessment used to do nothing beyond a
 * toast — the entire structured ABCDE/pain/fall-risk/pressure-injury/
 * nutrition/mental-status/mobility/fluid-balance form was discarded on
 * unmount, despite "Submit" claiming the assessment "has been added to the
 * patient record." This module-level map is what makes that claim true for
 * the rest of the session: reopening the same patient's assessment now shows
 * what was actually saved instead of reverting to blank/curated seed data.
 *
 * Plain map, not a reactive store — only this screen reads it, and only at
 * mount/patient-change, so no useSyncExternalStore subscription is needed
 * (same reasoning as nursingWorkflowStore.ts's `recordedVitals` tracking).
 * Swap out by pointing hooks to a real nursing-assessments endpoint in Phase 6.
 */

import type { NursingAssessmentForm } from '@/features/nursing/__mocks__/nursingAssessmentFixtures';

export type StoredAssessment = {
  form: NursingAssessmentForm;
  status: 'draft' | 'submitted';
  savedAt: string;
};

const stored = new Map<string, StoredAssessment>();

export function saveAssessmentDraft(patientId: string, form: NursingAssessmentForm): void {
  stored.set(patientId, { form, status: 'draft', savedAt: new Date().toISOString() });
}

export function submitAssessment(patientId: string, form: NursingAssessmentForm): void {
  stored.set(patientId, { form, status: 'submitted', savedAt: new Date().toISOString() });
}

export function getStoredAssessment(patientId: string): StoredAssessment | undefined {
  return stored.get(patientId);
}
