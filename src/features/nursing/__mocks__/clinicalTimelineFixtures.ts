/**
 * Mock fixtures for the nurse-scoped Clinical Timeline screen.
 * Swap out by pointing hooks to a real clinical-events endpoint in Phase 6.
 *
 * Events are derived deterministically from each patient's existing
 * `PatientRecordDetail` (patientRecordFixtures.ts) — admission date, allergies,
 * doctor, ward/bed, nursing notes, lab results — rather than a separate
 * hand-authored list, so this timeline never drifts from what those other
 * screens already show for the same patient.
 */

import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';

export type ClinicalTimelineCategory =
  | 'Registration'
  | 'Assessment'
  | 'Vitals'
  | 'Medication'
  | 'Laboratory'
  | 'Notes'
  | 'Transfer'
  | 'Discharge';

export type ClinicalTimelineEvent = {
  id: string;
  category: ClinicalTimelineCategory;
  title: string;
  occurredAt: string; // ISO 8601
  summary: string;
  detail: string;
  actor: string;
  actorRole: string;
};

export const TIMELINE_CATEGORY_CFG: Record<
  ClinicalTimelineCategory,
  { label: string; color: string; badgeBg: string; badgeBorder: string }
> = {
  Registration: {
    label: 'Registration',
    color: '#3B82F6',
    badgeBg: 'rgba(59,130,246,0.1)',
    badgeBorder: 'rgba(59,130,246,0.35)',
  },
  Assessment: {
    label: 'Assessment',
    color: '#00B4D8',
    badgeBg: 'rgba(0,180,216,0.1)',
    badgeBorder: 'rgba(0,180,216,0.35)',
  },
  Vitals: {
    label: 'Vitals',
    color: '#0EA5E9',
    badgeBg: 'rgba(14,165,233,0.1)',
    badgeBorder: 'rgba(14,165,233,0.35)',
  },
  Medication: {
    label: 'Medication',
    color: '#7C3AED',
    badgeBg: 'rgba(124,58,237,0.1)',
    badgeBorder: 'rgba(124,58,237,0.35)',
  },
  Laboratory: {
    label: 'Laboratory',
    color: '#EF4444',
    badgeBg: 'rgba(239,68,68,0.1)',
    badgeBorder: 'rgba(239,68,68,0.35)',
  },
  Notes: {
    label: 'Notes',
    color: '#F59E0B',
    badgeBg: 'rgba(245,158,11,0.1)',
    badgeBorder: 'rgba(245,158,11,0.35)',
  },
  Transfer: {
    label: 'Transfer',
    color: '#22C55E',
    badgeBg: 'rgba(34,197,94,0.1)',
    badgeBorder: 'rgba(34,197,94,0.35)',
  },
  Discharge: {
    label: 'Discharge',
    color: '#DC2626',
    badgeBg: 'rgba(220,38,38,0.1)',
    badgeBorder: 'rgba(220,38,38,0.35)',
  },
};

export const TIMELINE_CATEGORIES: ClinicalTimelineCategory[] = [
  'Registration',
  'Assessment',
  'Vitals',
  'Medication',
  'Laboratory',
  'Notes',
  'Transfer',
  'Discharge',
];

const REGISTRATION_CLERK = 'Mrs. Ngozi Asogwa';
const CHARGE_NURSE = 'Nurse Ibrahim B.';
const WARD_NURSE = 'Nurse Chidinma Eze';
const LAB_ACTOR = 'Laboratory';

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds this patient's chronological timeline from real fields already
 * shown elsewhere (admission, allergies, doctor, ward/bed, nursing notes,
 * lab results) — sorted oldest-first, matching how care actually unfolded.
 */
export function getClinicalTimelineForPatient(patientId: string): ClinicalTimelineEvent[] {
  const record = getPatientRecord(patientId);
  if (!record) return [];
  const { patient } = record;

  const admission = new Date(record.admissionDate);
  const now = Date.now();
  const rand = mulberry32(hashSeed(patientId));
  const events: ClinicalTimelineEvent[] = [];
  let seq = 0;
  const nextId = () => `${patientId}-evt-${++seq}`;

  // Registration
  events.push({
    id: nextId(),
    category: 'Registration',
    title: 'Patient registration completed.',
    occurredAt: admission.toISOString(),
    summary: 'Patient registration completed.',
    detail: 'Source: Front Desk',
    actor: REGISTRATION_CLERK,
    actorRole: 'Registration Clerk',
  });

  // Assessment — initial, plus a follow-up reassessment for longer stays
  const assessmentTime = new Date(admission.getTime() + 35 * 60_000);
  events.push({
    id: nextId(),
    category: 'Assessment',
    title: 'Initial assessment completed.',
    occurredAt: assessmentTime.toISOString(),
    summary: `Chief complaint: ${patient.diagnosis}. Assessment by ${patient.doctorName}.`,
    detail: record.clinicalSummary,
    actor: patient.doctorName,
    actorRole: 'Consultant Physician',
  });
  if (record.lengthOfStayDays > 1) {
    const reassessTime = new Date(admission.getTime() + 1 * 24 * 3_600_000 + 9 * 3_600_000);
    if (reassessTime.getTime() <= now) {
      events.push({
        id: nextId(),
        category: 'Assessment',
        title: 'Follow-up assessment completed.',
        occurredAt: reassessTime.toISOString(),
        summary: `Reassessed by ${patient.doctorName}. Care plan reviewed.`,
        detail: record.clinicalSummary,
        actor: patient.doctorName,
        actorRole: 'Consultant Physician',
      });
    }
  }

  // Transfer — ward-admitted patients only (pre-admission patients haven't
  // reached a ward bed yet, so a transfer event would misstate their status).
  if (!patient.isPreAdmission) {
    const transferTime = new Date(admission.getTime() + 2 * 3_600_000);
    events.push({
      id: nextId(),
      category: 'Transfer',
      title: `Transferred to ${patient.ward}.`,
      occurredAt: transferTime.toISOString(),
      summary: `From Emergency Unit to ${patient.ward} (${patient.bed}).`,
      detail: `Bed assignment: ${patient.bed}`,
      actor: CHARGE_NURSE,
      actorRole: 'Charge Nurse',
    });
  }

  // Vitals — seeded checkpoints every ~6h since admission, jittered around
  // the patient's real vitals6 baseline so the "latest" always lines up with
  // Vital Signs / Observation Charts for the same patient.
  const hoursSinceAdmission = Math.max(6, (now - admission.getTime()) / 3_600_000);
  const vitalsCheckpoints = Math.min(20, Math.max(2, Math.round(hoursSinceAdmission / 6)));
  for (let i = 0; i < vitalsCheckpoints; i++) {
    const t = new Date(admission.getTime() + (i + 1) * 6 * 3_600_000);
    if (t.getTime() > now) break;
    const jitter = () => rand() - 0.5;
    const temp = (record.vitals6.temp + jitter() * 0.6).toFixed(1);
    const hr = Math.max(50, Math.round(record.vitals6.hr + jitter() * 10));
    const rr = Math.max(10, Math.round(record.vitals6.rr + jitter() * 4));
    const spo2 = Math.min(100, Math.max(85, Math.round(record.vitals6.spo2 + jitter() * 3)));
    const pain = Math.max(0, Math.min(10, Math.round(record.vitals6.painScore + jitter() * 2)));
    events.push({
      id: nextId(),
      category: 'Vitals',
      title: 'Vital signs recorded.',
      occurredAt: t.toISOString(),
      summary: `T: ${temp}°C   P: ${hr} bpm   R: ${rr}/min   BP: ${record.vitals6.bp} mmHg   SpO₂: ${spo2}%`,
      detail: `Pain Score: ${pain}/10`,
      actor: WARD_NURSE,
      actorRole: 'Staff Nurse',
    });
  }

  // Medication — administered doses of the patient's active order, spaced at
  // a typical 8-hourly round since admission.
  const medCheckpoints = Math.min(12, Math.max(1, Math.round(hoursSinceAdmission / 8)));
  for (let i = 0; i < medCheckpoints; i++) {
    const t = new Date(admission.getTime() + (i + 1) * 8 * 3_600_000 + 20 * 60_000);
    if (t.getTime() > now) break;
    events.push({
      id: nextId(),
      category: 'Medication',
      title: 'Medication administered.',
      occurredAt: t.toISOString(),
      summary: patient.nextMedication,
      detail: 'Administered per prescribed schedule.',
      actor: WARD_NURSE,
      actorRole: 'Staff Nurse',
    });
  }

  // Laboratory — real per-patient results, each shown as an order followed
  // by its result so the "ordered → resulted" sequence is honest.
  record.labResults.forEach((lr) => {
    const resultedAt = new Date(lr.date);
    const orderedAt = new Date(resultedAt.getTime() - 45 * 60_000);
    events.push({
      id: nextId(),
      category: 'Laboratory',
      title: 'Laboratory test ordered.',
      occurredAt: orderedAt.toISOString(),
      summary: `${lr.name} ordered.`,
      detail: `Test: ${lr.name}`,
      actor: patient.doctorName,
      actorRole: 'Consultant Physician',
    });
    events.push({
      id: nextId(),
      category: 'Laboratory',
      title: 'Laboratory result available.',
      occurredAt: resultedAt.toISOString(),
      summary: `${lr.name}: ${lr.value} (${lr.flag})`,
      detail: `Flag: ${lr.flag}`,
      actor: LAB_ACTOR,
      actorRole: 'Lab Scientist',
    });
  });

  // Notes — real nursing notes for this patient.
  record.nursingNotes.forEach((n) => {
    events.push({
      id: nextId(),
      category: 'Notes',
      title: 'Nursing note added.',
      occurredAt: n.dateTime,
      summary: n.note,
      detail: n.note,
      actor: n.author,
      actorRole: 'Staff Nurse',
    });
  });

  // Discharge — only when the patient's real care status says so.
  if (patient.careStatus === 'Awaiting Discharge') {
    const dischargeTime = new Date(Math.max(now, admission.getTime() + 60 * 60_000));
    events.push({
      id: nextId(),
      category: 'Discharge',
      title: 'Patient discharged.',
      occurredAt: dischargeTime.toISOString(),
      summary: `Discharge diagnosis: ${patient.diagnosis}. Discharged in stable condition.`,
      detail: `Discharged by ${patient.doctorName}.`,
      actor: patient.doctorName,
      actorRole: 'Consultant Physician',
    });
  }

  return events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}
