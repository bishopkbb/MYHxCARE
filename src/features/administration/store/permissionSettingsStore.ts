'use client';

/**
 * A small slice of illustrative, local-only permission-management config
 * (the "Permission Settings" modal on Roles & Permissions). Kept separate
 * from `rolePermissionsStore.ts` since it's global settings, not per-role
 * data. Same useSyncExternalStore singleton pattern as every other store in
 * this feature. Toggling these doesn't (and can't, from a mock frontend)
 * change real runtime auth enforcement, it's a config-management surface,
 * consistent with the honest-mock convention used across this feature.
 */

import { useSyncExternalStore } from 'react';

export type PermissionSettings = {
  requireApprovalForAdminAssignment: boolean;
  autoExpireCustomPermissions: boolean;
  notifyOnRoleChange: boolean;
};

const DEFAULT_SETTINGS: PermissionSettings = {
  requireApprovalForAdminAssignment: true,
  autoExpireCustomPermissions: false,
  notifyOnRoleChange: true,
};

let settings: PermissionSettings = { ...DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PermissionSettings {
  return settings;
}

function getServerSnapshot(): PermissionSettings {
  return DEFAULT_SETTINGS;
}

export function usePermissionSettings(): PermissionSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setPermissionSetting<K extends keyof PermissionSettings>(
  key: K,
  value: PermissionSettings[K],
): void {
  settings = { ...settings, [key]: value };
  emit();
}
