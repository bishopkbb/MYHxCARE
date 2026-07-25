'use client';

/**
 * The registration staff roster as live, shared state — not a static
 * fixture. Registration Workforce Management (supervisor roster CRUD) and
 * My Shift (a staff member's own read + acknowledge view) both need to see
 * the exact same shift records; two independent `useState` copies would
 * silently diverge the moment either screen edited a shift — the same class
 * of bug already fixed once this session for Referrals
 * (`referralStore.ts`). Same `useSyncExternalStore` module-singleton
 * pattern as every other store in this feature.
 *
 * Swap out by pointing these actions at real staff-shift endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  MOCK_REGISTRATION_ROSTER,
  type RegistrationShift,
} from '@/features/registration/__mocks__/registrationWorkforceFixtures';

let shifts: RegistrationShift[] = [...MOCK_REGISTRATION_ROSTER];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): RegistrationShift[] {
  return shifts;
}

function getServerSnapshot(): RegistrationShift[] {
  return MOCK_REGISTRATION_ROSTER;
}

/** Reactive hook — re-renders the caller whenever a shift is created, edited, or acknowledged. */
export function useRegistrationShifts(): RegistrationShift[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addShift(shift: RegistrationShift): void {
  shifts = [shift, ...shifts];
  emit();
}

export function updateShift(shift: RegistrationShift): void {
  shifts = shifts.map((s) => (s.id === shift.id ? shift : s));
  emit();
}

/** A status transition, not a delete — the cancelled shift stays on the
 * roster (filterable, auditable) instead of silently disappearing. */
export function cancelShift(id: string): void {
  shifts = shifts.map((s) => (s.id === id ? { ...s, status: 'CANCELLED' as const } : s));
  emit();
}

export function duplicateShift(shift: RegistrationShift): void {
  shifts = [{ ...shift, id: `rgs-dup-${Date.now()}` }, ...shifts];
  emit();
}

/** Called from both Workforce Management (supervisor acknowledging on a
 * staff member's behalf) and My Shift (genuine self-service — the logged-in
 * officer acknowledging their own shift). */
export function acknowledgeShift(id: string): void {
  shifts = shifts.map((s) => (s.id === id ? { ...s, acknowledged: true } : s));
  emit();
}
