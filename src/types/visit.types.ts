// Visit (encounter) entity, state machine, and display config.
// The backend resource is "encounter" — "visit" is the clinical UI term.

import type { TriagePriority } from '@utils/triage';

// ─── Enumerations ──────────────────────────────────────────────────────────

export type VisitStatus =
  | 'REGISTERED'
  | 'WAITING'
  | 'IN_CONSULTATION'
  | 'INVESTIGATIONS_PENDING'
  | 'PENDING_REVIEW'
  | 'ADMITTED'
  | 'REFERRED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DNA'; // Did Not Attend

export type EncounterType = 'OPD' | 'EMERGENCY' | 'INPATIENT';

// Semantic display variant — mapped to colours by VisitStatusBadge (Phase 5).
export type VisitStatusVariant =
  | 'neutral' // grey  — registered, waiting
  | 'active' // blue  — in consultation, admitted
  | 'warning' // amber — investigations pending, pending review
  | 'muted' // slate — referred
  | 'success' // green — completed
  | 'danger'; // red   — cancelled, DNA

// ─── State machine ─────────────────────────────────────────────────────────

export const VISIT_TRANSITIONS: Readonly<Record<VisitStatus, readonly VisitStatus[]>> = {
  REGISTERED: ['WAITING', 'CANCELLED', 'DNA'],
  WAITING: ['IN_CONSULTATION', 'CANCELLED', 'DNA'],
  IN_CONSULTATION: ['INVESTIGATIONS_PENDING', 'ADMITTED', 'REFERRED', 'COMPLETED'],
  INVESTIGATIONS_PENDING: ['PENDING_REVIEW', 'IN_CONSULTATION'],
  PENDING_REVIEW: ['IN_CONSULTATION', 'ADMITTED', 'REFERRED', 'COMPLETED'],
  ADMITTED: ['COMPLETED'],
  REFERRED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  DNA: [],
};

export const TERMINAL_VISIT_STATUSES = new Set<VisitStatus>(['COMPLETED', 'CANCELLED', 'DNA']);

export function canTransitionTo(from: VisitStatus, to: VisitStatus): boolean {
  return (VISIT_TRANSITIONS[from] as readonly string[]).includes(to);
}

export function isTerminalStatus(status: VisitStatus): boolean {
  return TERMINAL_VISIT_STATUSES.has(status);
}

// ─── Display config ────────────────────────────────────────────────────────

export type VisitStatusDisplay = {
  label: string;
  variant: VisitStatusVariant;
  description: string;
};

export const VISIT_STATUS_DISPLAY: Readonly<Record<VisitStatus, VisitStatusDisplay>> = {
  REGISTERED: {
    label: 'Registered',
    variant: 'neutral',
    description: 'Patient registered and awaiting triage',
  },
  WAITING: {
    label: 'Waiting',
    variant: 'neutral',
    description: 'Patient triaged and in the waiting area',
  },
  IN_CONSULTATION: {
    label: 'In Consultation',
    variant: 'active',
    description: 'Patient currently with a clinician',
  },
  INVESTIGATIONS_PENDING: {
    label: 'Investigations Pending',
    variant: 'warning',
    description: 'Awaiting laboratory or imaging results',
  },
  PENDING_REVIEW: {
    label: 'Pending Review',
    variant: 'warning',
    description: 'Results received — awaiting clinician review',
  },
  ADMITTED: {
    label: 'Admitted',
    variant: 'active',
    description: 'Patient admitted to a ward',
  },
  REFERRED: {
    label: 'Referred',
    variant: 'muted',
    description: 'Patient referred to another department or facility',
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'success',
    description: 'Encounter completed and closed',
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'danger',
    description: 'Encounter cancelled before completion',
  },
  DNA: {
    label: 'Did Not Attend',
    variant: 'danger',
    description: 'Patient did not attend their scheduled appointment',
  },
};

// ─── Encounter entity ──────────────────────────────────────────────────────

export type Encounter = {
  id: string;
  patientId: string;
  patientSummary: {
    fileNumber: string;
    firstName: string;
    lastName: string;
  };
  type: EncounterType;
  status: VisitStatus;
  departmentId: string;
  departmentName: string;
  attendingPhysicianId?: string;
  attendingPhysicianName?: string;
  chiefComplaint?: string;
  triagePriority?: TriagePriority;
  checkedInAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

export type EncounterSummary = Pick<
  Encounter,
  | 'id'
  | 'patientId'
  | 'patientSummary'
  | 'type'
  | 'status'
  | 'departmentName'
  | 'checkedInAt'
  | 'createdAt'
>;
