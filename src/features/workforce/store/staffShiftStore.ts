'use client';

/**
 * The canonical StaffShift entity + reactive store — replacing five
 * independently-declared, independently-seeded shift populations
 * (Registration's `RegistrationShift`, Medical Records' `RecordsShift`,
 * Nurse Station's `NurseShift`, Doctor's Dashboard/Duty Roster's
 * `DoctorShift`, and Pharmacy's `PharmacyShift`, all structurally
 * near-identical). Every module's own audit docs referred to reusing a
 * canonical `StaffShift` entity that did not actually exist anywhere in the
 * codebase — this is that entity, finally built.
 *
 * Deliberately NOT unified here (still open, see
 * `MYHXCARE_SYSTEM_CONSISTENCY_REGISTER.md` SYS-005): My Schedule's own
 * lowercase `ShiftType` — both the Doctor (`schedule/__mocks__/
 * scheduleFixtures.ts`) and Nurse (`nursing/__mocks__/nurseScheduleFixtures.ts`,
 * an undocumented structural duplicate of the same shape) variants — and
 * Shift Handover's own `ShiftType` ('Day'|'Night'), a handover *record's*
 * own metadata field, a different concept from a staff roster entry. None
 * of these three import or read this store; they remain fully separate
 * fixtures. Unifying them needs a date dimension this store doesn't have,
 * staffId-linked seed rows neither roster currently carries, and a decision
 * on Shift Handover's 12-hour Day/Night vs. this store's 8-hour Morning/
 * Afternoon/Night granularity — a larger structural pass, not a rename.
 *
 * Each of the five migrated workspaces keeps its own long-standing display
 * shape (`RegistrationShift`/`RecordsShift`/`NurseShift`/`DoctorShift`/
 * `PharmacyShift`) as a derived projection of this canonical row — the
 * adapter pattern already proven for SYS-004's LabResult unification, chosen
 * again here to avoid rewriting five ~1000+ line workspace components'
 * existing, working UI.
 *
 * Swap out by pointing these actions at real `/rosters`/`/duty-assignments`
 * endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  MOCK_REGISTRATION_ROSTER,
  type RegistrationShift,
} from '@/features/registration/__mocks__/registrationWorkforceFixtures';
import {
  MOCK_RECORDS_ROSTER,
  type RecordsShift,
} from '@/features/medical-records/__mocks__/recordsWorkforceFixtures';
import {
  MOCK_NURSE_ROSTER,
  type NurseShift,
} from '@/features/nursing/__mocks__/nurseWorkforceFixtures';
import { MOCK_ROSTER, type DoctorShift } from '@/features/workforce/__mocks__/workforceFixtures';
import {
  MOCK_PHARMACY_ROSTER,
  type PharmacyShift,
} from '@/features/pharmacy/__mocks__/pharmacyWorkforceFixtures';
import {
  MOCK_LABORATORY_ROSTER,
  type LaboratoryShift,
} from '@/features/laboratory/__mocks__/laboratoryWorkforceFixtures';
import {
  MOCK_BILLING_ROSTER,
  type BillingShift,
} from '@/features/billing/__mocks__/billingWorkforceFixtures';

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ON_CALL' | 'EMERGENCY';
export type ShiftStatus = 'ON_DUTY' | 'SCHEDULED' | 'ON_CALL' | 'COMPLETED' | 'CANCELLED';

/** Which workspace's roster this shift belongs to — the discriminator that
 * lets one shared store back seven separately-scoped screens (a Matron's
 * Nursing Workforce Management should never show a Registration officer's
 * shift, even though both now live in the same store). */
export type StaffShiftHomeModule =
  | 'registration'
  | 'medical-records'
  | 'nursing'
  | 'clinical'
  | 'pharmacy'
  | 'laboratory'
  | 'billing';

export type StaffShift = {
  id: string;
  homeModule: StaffShiftHomeModule;
  /** Foreign key into a real staff/login account — set for the handful of
   * demo rows that correspond to an actual demo login (mirroring how each
   * pre-unification population already did this narrowly), undefined
   * otherwise. This is the field none of the six pre-unification shapes had
   * consistently. */
  staffId?: string | undefined;
  staffName: string;
  initials: string;
  avatarBg: string;
  role: string;
  /** Doctor/clinical shifts only — the other three modules' "department" is
   * just their own workspace, already captured by `homeModule`. */
  department?: string;
  ward: string;
  shiftType: ShiftType;
  timeRange: string;
  status: ShiftStatus;
  acknowledged: boolean;
};

function fromRegistration(s: RegistrationShift): StaffShift {
  return { ...s, homeModule: 'registration' };
}
function fromRecords(s: RecordsShift): StaffShift {
  return { ...s, homeModule: 'medical-records' };
}
function fromNurse(s: NurseShift): StaffShift {
  return { ...s, homeModule: 'nursing' };
}
function fromDoctor(s: DoctorShift): StaffShift {
  const { doctorName, ...rest } = s;
  return { ...rest, staffName: doctorName, homeModule: 'clinical' };
}
function fromPharmacy(s: PharmacyShift): StaffShift {
  return { ...s, homeModule: 'pharmacy' };
}
function fromLaboratory(s: LaboratoryShift): StaffShift {
  return { ...s, homeModule: 'laboratory' };
}
function fromBilling(s: BillingShift): StaffShift {
  return { ...s, homeModule: 'billing' };
}

const SEED: StaffShift[] = [
  ...MOCK_REGISTRATION_ROSTER.map(fromRegistration),
  ...MOCK_RECORDS_ROSTER.map(fromRecords),
  ...MOCK_NURSE_ROSTER.map(fromNurse),
  ...MOCK_ROSTER.map(fromDoctor),
  ...MOCK_PHARMACY_ROSTER.map(fromPharmacy),
  ...MOCK_LABORATORY_ROSTER.map(fromLaboratory),
  ...MOCK_BILLING_ROSTER.map(fromBilling),
];

let shifts: StaffShift[] = [...SEED];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StaffShift[] {
  return shifts;
}

function getServerSnapshot(): StaffShift[] {
  return SEED;
}

/** Reactive hook — re-renders the caller whenever any shift, in any module,
 * is created, edited, cancelled, duplicated, or acknowledged. */
export function useStaffShifts(): StaffShift[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addShift(shift: StaffShift): void {
  shifts = [shift, ...shifts];
  emit();
}

export function updateShift(shift: StaffShift): void {
  shifts = shifts.map((s) => (s.id === shift.id ? shift : s));
  emit();
}

/** A status transition, not a delete — the cancelled shift stays on the
 * roster (filterable, auditable) instead of silently disappearing. */
export function cancelShift(id: string): void {
  shifts = shifts.map((s) => (s.id === id ? { ...s, status: 'CANCELLED' as const } : s));
  emit();
}

export function duplicateShift(shift: StaffShift): void {
  shifts = [{ ...shift, id: `stf-dup-${Date.now()}` }, ...shifts];
  emit();
}

/** Called from both a Workforce Management screen (supervisor acknowledging
 * on a staff member's behalf) and a self-service screen (My Shift / My
 * Schedule — the logged-in staff member acknowledging their own shift). */
export function acknowledgeShift(id: string): void {
  shifts = shifts.map((s) => (s.id === id ? { ...s, acknowledged: true } : s));
  emit();
}
