'use client';

/**
 * The patient directory as live, shared state — not a static fixture.
 * Register Patient's "Complete Registration" appends a real record here;
 * Patient Directory reads and bulk-edits (Assign Category, Archive) through
 * the same store. Same `useSyncExternalStore` module-singleton pattern as
 * `registrationQueueStore.ts` / `nursing/store/nursingWorkflowStore.ts` — the
 * two screens are mounted at different routes, so a page-local `useState`
 * seeded once from `DIRECTORY_PATIENTS` would silently fork the moment
 * either side made an edit.
 *
 * Swap out by pointing these actions at real patient endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import { computeAge } from '@/features/registration/schemas/registerPatientSchema';
import {
  DIRECTORY_PATIENTS,
  type DirectoryPatient,
  type MaritalStatus,
} from '@/features/registration/__mocks__/patientDirectoryFixtures';

let patients: DirectoryPatient[] = [...DIRECTORY_PATIENTS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DirectoryPatient[] {
  return patients;
}

function getServerSnapshot(): DirectoryPatient[] {
  return DIRECTORY_PATIENTS;
}

/** Reactive hook — re-renders the caller whenever a patient is added or edited. */
export function useDirectoryPatients(): DirectoryPatient[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Duplicate detection ──────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  // Compares by the last 10 digits so a stored "0803 100 1000" and an
  // incoming "+234 8031001000" (country code, no leading 0) still match —
  // the same way a real front desk would recognise the same phone number
  // written two different ways.
  return phone.replace(/\D/g, '').slice(-10);
}

export type DuplicateCheckInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
};

/** Run before a new registration is saved. A match on phone number, or on
 * full name + date of birth, is the same heuristic a real hospital's master
 * patient index lookup uses before minting a second record for someone
 * already on file — not exhaustive fuzzy matching, but enough to catch the
 * common case (a returning patient the front desk doesn't recognise). */
export function findPotentialDuplicates(input: DuplicateCheckInput): DirectoryPatient[] {
  const fullName = `${input.firstName} ${input.lastName}`.trim().toLowerCase();
  const normalizedPhone = normalizePhone(input.phone);
  return patients.filter((p) => {
    const phoneMatch = normalizedPhone.length >= 7 && normalizePhone(p.phone) === normalizedPhone;
    const nameAndDobMatch =
      input.dateOfBirth !== '' &&
      p.name.trim().toLowerCase() === fullName &&
      p.dateOfBirth === input.dateOfBirth;
    return phoneMatch || nameAndDobMatch;
  });
}

// ── Register Patient → Directory (the arrival→identity bridge) ─────────────

const AVATAR_PALETTE = [
  '#3B82F6',
  '#F59E0B',
  '#22C55E',
  '#8B5CF6',
  '#EC4899',
  '#00B4D8',
  '#EF4444',
];

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

const MARITAL_LABELS: Record<string, MaritalStatus> = {
  single: 'Single',
  married: 'Married',
  divorced: 'Divorced',
  widowed: 'Widowed',
  separated: 'Separated',
};

export type NewDirectoryPatientInput = {
  firstName: string;
  lastName: string;
  middleName?: string | undefined;
  /** Raw `registerPatientOptions.GENDER_OPTIONS` value: `'male' | 'female'`. */
  genderValue: string;
  dateOfBirth: string;
  /** Raw `registerPatientOptions.MARITAL_STATUS_OPTIONS` value. */
  maritalStatusValue?: string | undefined;
  nationalityLabel: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email?: string | undefined;
  address: string;
  categoryLabel: string;
  insuranceProviderLabel?: string | undefined;
  mrn: string;
  patientId: string;
};

/** Register Patient's "Complete Registration" calling this is what makes a
 * new patient actually findable in Patient Directory and Check-In search —
 * before this, finishing the wizard only showed a success screen with an
 * MRN nobody else could look up. Registration's own intake form doesn't
 * capture student ID, faculty, or blood group yet, so those are left
 * honestly unset ('—' / 'Unknown') rather than fabricated. */
export function addDirectoryPatient(input: NewDirectoryPatientInput): DirectoryPatient {
  const fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(' ');
  const initials = `${input.firstName[0] ?? ''}${input.lastName[0] ?? ''}`.toUpperCase();
  const age = computeAge(input.dateOfBirth) ?? 0;

  const patient: DirectoryPatient = {
    id: `dp-reg-${Date.now()}`,
    initials,
    avatarBg: AVATAR_PALETTE[hashSeed(fullName) % AVATAR_PALETTE.length] as string,
    name: fullName,
    phone: `${input.phoneCountryCode} ${input.phoneNumber}`,
    email: input.email ?? '',
    mrn: input.mrn,
    patientId: input.patientId,
    studentId: '—',
    age,
    gender: input.genderValue === 'female' ? 'Female' : 'Male',
    dateOfBirth: input.dateOfBirth,
    faculty: '—',
    maritalStatus: MARITAL_LABELS[input.maritalStatusValue ?? ''] ?? 'Single',
    nationality: input.nationalityLabel,
    lastVisit: 'Today',
    status: 'Active',
    category: input.categoryLabel,
    insuranceProvider: input.insuranceProviderLabel ?? 'None',
    bloodGroup: 'Unknown',
    address: input.address,
    dateRegistered: new Date().toISOString().slice(0, 10),
  };

  patients = [patient, ...patients];
  emit();
  return patient;
}

// ── Directory-side bulk edits (Assign Category / Archive) ──────────────────
// Lifted out of the Directory page so its edits land in the same store a
// freshly registered patient lives in, instead of a page-local fork.

export function bulkUpdatePatients(
  ids: ReadonlySet<string>,
  patch: Partial<DirectoryPatient>,
): void {
  patients = patients.map((p) => (ids.has(p.id) ? { ...p, ...patch } : p));
  emit();
}
