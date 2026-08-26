'use client';

/**
 * The Staff Management directory as live, shared state, not a static
 * fixture. useSyncExternalStore module-singleton pattern, same as every
 * other roster store in this codebase (`staffShiftStore.ts`,
 * `registrationQueueStore.ts`).
 *
 * Deliberately scoped to Administration only, NOT unified with
 * `authFixtures.ts`'s `MOCK_USERS` (the login roster) or any other
 * module's own staff/roster fixtures. Unifying "every account across every
 * workspace" into one directory is Administration's documented future
 * remit (see the canonical domain model's own note), but it needs a
 * decision on how login identity, permissions, and this directory's own
 * department/role vocabulary reconcile: a larger structural pass, not a
 * rename. This store is that directory's first, standalone iteration.
 *
 * Swap out by pointing these actions at a real staff-directory endpoint in
 * Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  MOCK_STAFF_ROSTER,
  type StaffMember,
  type StaffStatus,
} from '@/features/administration/__mocks__/staffDirectoryFixtures';

let staff: StaffMember[] = [...MOCK_STAFF_ROSTER];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StaffMember[] {
  return staff;
}

function getServerSnapshot(): StaffMember[] {
  return MOCK_STAFF_ROSTER;
}

/** Reactive hook, re-renders the caller whenever a staff member is added,
 * edited, imported, or has their status changed, from any screen. */
export function useStaffDirectory(): StaffMember[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addStaff(member: StaffMember): void {
  staff = [member, ...staff];
  emit();
}

export function updateStaff(member: StaffMember): void {
  staff = staff.map((s) => (s.staffId === member.staffId ? member : s));
  emit();
}

export function setStaffStatus(staffId: string, status: StaffStatus): void {
  staff = staff.map((s) => (s.staffId === staffId ? { ...s, status } : s));
  emit();
}

export function importStaffBatch(members: StaffMember[]): StaffMember[] {
  staff = [...members, ...staff];
  emit();
  return members;
}
