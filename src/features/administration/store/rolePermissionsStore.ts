'use client';

/**
 * The Roles & Permissions directory as live, shared state, not a static
 * fixture. useSyncExternalStore module-singleton pattern, same as
 * `staffDirectoryStore.ts`.
 *
 * This is a permissions-management surface, not a rewiring of the real
 * login/auth model: `user.permissions` (checked by `PermissionsProvider`)
 * comes from static demo fixtures at login time, and nothing in this mock
 * frontend can reach back and change that at runtime. Editing a role's
 * matrix here changes what this store reports, which is honest for a
 * config-management screen but doesn't claim to alter what a currently
 * logged-in demo user can actually do.
 *
 * Swap out by pointing these actions at a real roles/permissions endpoint
 * in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  ROLE_DEFINITIONS,
  sameLevelSet,
  type AccessLevel,
  type ModuleKey,
  type RoleDefinition,
  type RoleStatus,
} from '@/features/administration/__mocks__/rolePermissionsFixtures';
import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';

let roles: RoleDefinition[] = [...ROLE_DEFINITIONS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): RoleDefinition[] {
  return roles;
}

function getServerSnapshot(): RoleDefinition[] {
  return ROLE_DEFINITIONS;
}

/** Reactive hook, re-renders the caller whenever a role is added, edited,
 * or has a permission/department toggle changed, from any screen. */
export function useRoleDefinitions(): RoleDefinition[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addRole(role: RoleDefinition): void {
  roles = [role, ...roles];
  emit();
}

export function updateRole(role: RoleDefinition): void {
  roles = roles.map((r) => (r.id === role.id ? role : r));
  emit();
}

export function setRoleStatus(roleId: string, status: RoleStatus): void {
  roles = roles.map((r) => (r.id === roleId ? { ...r, status } : r));
  emit();
}

/** Toggles one access-level checkbox for a module. "No Access" is the one
 * exclusive value: checking it clears every other level for that module,
 * and checking any other level clears "No Access" (they can never coexist).
 * Every other pair of levels can be checked together freely. */
export function toggleRolePermission(
  roleId: string,
  moduleKey: ModuleKey,
  level: AccessLevel,
): void {
  roles = roles.map((r) => {
    if (r.id !== roleId) return r;
    const current = r.permissionsByModule[moduleKey];
    const isChecked = current.includes(level);

    let next: AccessLevel[];
    if (level === 'none') {
      next = isChecked ? [] : ['none'];
    } else if (isChecked) {
      next = current.filter((l) => l !== level);
    } else {
      next = [...current.filter((l) => l !== 'none'), level];
    }
    if (next.length === 0) next = ['none'];

    const seed = ROLE_DEFINITIONS.find((s) => s.id === roleId);
    const seedLevels = seed?.permissionsByModule[moduleKey] ?? ['none'];
    const isCustom = !sameLevelSet(next, seedLevels);
    const customizedModules = isCustom
      ? Array.from(new Set([...r.customizedModules, moduleKey]))
      : r.customizedModules.filter((m) => m !== moduleKey);

    return {
      ...r,
      permissionsByModule: { ...r.permissionsByModule, [moduleKey]: next },
      customizedModules,
    };
  });
  emit();
}

export function toggleDepartmentAccess(roleId: string, dept: OrganizationalDepartment): void {
  roles = roles.map((r) => {
    if (r.id !== roleId) return r;
    const has = r.departmentAccess.includes(dept);
    return {
      ...r,
      departmentAccess: has
        ? r.departmentAccess.filter((d) => d !== dept)
        : [...r.departmentAccess, dept],
    };
  });
  emit();
}
