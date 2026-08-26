'use client';

/**
 * A small slice of illustrative, local-only department-management config
 * (the "Department Settings" modal on Departments). Same shape and same
 * useSyncExternalStore singleton pattern as `permissionSettingsStore.ts`
 * from the Roles & Permissions build.
 */

import { useSyncExternalStore } from 'react';

export type DepartmentSettings = {
  showInactiveByDefault: boolean;
  notifyHeadOnStaffReassignment: boolean;
  requireApprovalForStatusChange: boolean;
};

const DEFAULT_SETTINGS: DepartmentSettings = {
  showInactiveByDefault: false,
  notifyHeadOnStaffReassignment: true,
  requireApprovalForStatusChange: false,
};

let settings: DepartmentSettings = { ...DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DepartmentSettings {
  return settings;
}

function getServerSnapshot(): DepartmentSettings {
  return DEFAULT_SETTINGS;
}

export function useDepartmentSettings(): DepartmentSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setDepartmentSetting<K extends keyof DepartmentSettings>(
  key: K,
  value: DepartmentSettings[K],
): void {
  settings = { ...settings, [key]: value };
  emit();
}
