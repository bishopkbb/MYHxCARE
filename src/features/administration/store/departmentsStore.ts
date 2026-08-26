'use client';

/**
 * Departments as live, shared state, not a static fixture.
 * useSyncExternalStore module-singleton pattern, same as
 * `staffDirectoryStore.ts` / `rolePermissionsStore.ts`.
 *
 * Deliberately has NO addDepartment/deleteDepartment action, at all. The
 * department list is administratively fixed (see the "+ Add Department"
 * button's own AddDepartmentInfoModal), so that constraint is enforced at
 * the store level, not just in the UI copy. Only per-department contact
 * info, status, head, and operating hours are editable.
 *
 * Swap out by pointing these actions at a real departments endpoint in
 * Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  DEPARTMENT_RECORDS,
  type DepartmentRecord,
  type DepartmentStatus,
  type OperatingHours,
} from '@/features/administration/__mocks__/departmentsFixtures';
import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';

let departments: DepartmentRecord[] = [...DEPARTMENT_RECORDS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DepartmentRecord[] {
  return departments;
}

function getServerSnapshot(): DepartmentRecord[] {
  return DEPARTMENT_RECORDS;
}

/** Reactive hook, re-renders the caller whenever a department's contact
 * info, status, head, or hours changes, from any screen. */
export function useDepartments(): DepartmentRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function updateDepartmentContact(
  id: OrganizationalDepartment,
  contactPhone: string,
  contactEmail: string,
): void {
  departments = departments.map((d) => (d.id === id ? { ...d, contactPhone, contactEmail } : d));
  emit();
}

export function setDepartmentStatus(id: OrganizationalDepartment, status: DepartmentStatus): void {
  departments = departments.map((d) => (d.id === id ? { ...d, status } : d));
  emit();
}

export function setDepartmentHead(id: OrganizationalDepartment, headStaffId: string): void {
  departments = departments.map((d) => (d.id === id ? { ...d, headStaffId } : d));
  emit();
}

export function updateDepartmentHours(id: OrganizationalDepartment, hours: OperatingHours): void {
  departments = departments.map((d) => (d.id === id ? { ...d, operatingHours: hours } : d));
  emit();
}
