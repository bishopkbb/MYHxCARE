'use client';

/**
 * "Save Draft" on the Consultation screen used to be a pure toast with zero
 * persistence — the entire 6-step form was discarded on unmount. This module-
 * level map is what makes "your progress has been saved" true for the rest of
 * the session: reopening the same patient's consultation now resumes the
 * saved draft instead of starting blank. Not a reactive store — only this
 * screen reads it, and only at mount, so no useSyncExternalStore subscription
 * is needed (same reasoning as nursingAssessmentStore.ts). Swap out by
 * pointing hooks to a real consultation-draft endpoint in Phase 6.
 */

const drafts = new Map<string, Record<string, unknown>>();

export function saveConsultationDraft(patientId: string, form: Record<string, unknown>): void {
  drafts.set(patientId, form);
}

export function getConsultationDraft(patientId: string): Record<string, unknown> | undefined {
  return drafts.get(patientId);
}

export function clearConsultationDraft(patientId: string): void {
  drafts.delete(patientId);
}
