/**
 * Mock fixtures for Roles & Permissions (`/admin/roles-permissions`). Role
 * here is deliberately keyed to the same `StaffRole` vocabulary Staff
 * Management already uses (the "Role" badge in that screen's table) rather
 * than a new parallel enum, this makes the two screens read as a coherent
 * pair: "here are the roles staff get assigned; here's what each can
 * access." `RoleDefinition.id` is a free string, not narrowed to
 * `StaffRole`, so + Add Role can create custom roles beyond the initial 12.
 * A custom role added here is a permissions-management entry only, it does
 * not become selectable in Staff Management's own Add/Edit Staff role
 * dropdown (that would need loosening `StaffRole` itself, out of scope).
 *
 * The real permission model (`src/constants/permissions.ts`) is 34 flat
 * `module:verb` strings with no graduated read/write/approve/admin tiers
 * baked in. The 9 modules below map each tier to the closest real
 * permission(s) where one exists:
 *   - View/Write map directly to a module's own `*_READ`/`*_WRITE` pair.
 *   - Admin is only distinctly real for modules that have deeper
 *     permissions beyond plain write (Laboratory's QC/equipment/inventory/
 *     procurement/suppliers writes, Pharmacy's ADR/audit writes,
 *     Administration's admin:write). For every other module, Admin has no
 *     separate real permission behind it, it's selectable in the UI but not
 *     auto-computed, an honest simplification rather than a fabricated
 *     permission.
 *   - Approve exists nowhere in the real permission set at all (no
 *     `:approve` suffix anywhere), it's illustrative/manually-settable
 *     everywhere, never auto-computed.
 *   - Reports has no dedicated permission in `PERMISSIONS` yet; every role
 *     defaults to View there, a known gap, not a real gate.
 * Swap out by pointing hooks to a real roles/permissions endpoint in Phase 6.
 */

import {
  Activity,
  Beaker,
  BedDouble,
  ClipboardList,
  FileBarChart,
  Pill,
  Settings,
  Siren,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { PERMISSIONS } from '@/constants/permissions';
import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';
import { ORGANIZATIONAL_DEPARTMENTS } from '@/constants/organizationalDepartments';

export type AccessLevel = 'none' | 'view' | 'write' | 'approve' | 'admin';

export const ACCESS_LEVELS: { value: AccessLevel; label: string; color: string }[] = [
  { value: 'none', label: 'No Access', color: '#DC2626' },
  { value: 'view', label: 'View (Read)', color: '#2563EB' },
  { value: 'write', label: 'Write (Edit)', color: '#16A34A' },
  { value: 'approve', label: 'Approve', color: '#D97706' },
  { value: 'admin', label: 'Admin', color: '#7C3AED' },
];

export const ACCESS_LEVEL_DESCRIPTION: Record<AccessLevel, string> = {
  none: 'No access to module',
  view: 'Can view and read data',
  write: 'Can create and edit data',
  approve: 'Can approve workflows',
  admin: 'Full administrative access',
};

export type ModuleKey =
  | 'patients-records'
  | 'clinical-work'
  | 'pharmacy'
  | 'laboratory'
  | 'billing-revenue'
  | 'emergency'
  | 'wards'
  | 'reports'
  | 'administration';

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
  /** Real PERMISSIONS keys backing each tier, where one exists. Absent tiers
   * are UI-only (selectable, never auto-computed). */
  permissions: Partial<Record<'view' | 'write' | 'admin', string[]>>;
};

export const MODULE_DEFS: ModuleDef[] = [
  {
    key: 'patients-records',
    label: 'Patients & Records',
    icon: ClipboardList,
    permissions: { view: [PERMISSIONS.PATIENTS_READ], write: [PERMISSIONS.PATIENTS_WRITE] },
  },
  {
    key: 'clinical-work',
    label: 'Clinical Work',
    icon: Activity,
    permissions: { view: [PERMISSIONS.ENCOUNTERS_READ], write: [PERMISSIONS.ENCOUNTERS_WRITE] },
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    icon: Pill,
    permissions: {
      view: [PERMISSIONS.PHARMACY_READ],
      write: [PERMISSIONS.PHARMACY_DISPENSE],
      admin: [PERMISSIONS.PHARMACY_ADR_WRITE, PERMISSIONS.PHARMACY_AUDIT_WRITE],
    },
  },
  {
    key: 'laboratory',
    label: 'Laboratory',
    icon: Beaker,
    permissions: {
      view: [PERMISSIONS.LAB_ORDERS_READ],
      write: [PERMISSIONS.LAB_ORDERS_WRITE],
      admin: [
        PERMISSIONS.LAB_QC_WRITE,
        PERMISSIONS.LAB_EQUIPMENT_WRITE,
        PERMISSIONS.LAB_INVENTORY_WRITE,
        PERMISSIONS.LAB_PROCUREMENT_WRITE,
        PERMISSIONS.LAB_SUPPLIERS_WRITE,
      ],
    },
  },
  {
    key: 'billing-revenue',
    label: 'Billing & Revenue',
    icon: Wallet,
    permissions: { view: [PERMISSIONS.BILLING_READ], write: [PERMISSIONS.BILLING_WRITE] },
  },
  {
    key: 'emergency',
    label: 'Emergency',
    icon: Siren,
    permissions: { view: [PERMISSIONS.EMERGENCY_READ], write: [PERMISSIONS.EMERGENCY_WRITE] },
  },
  {
    key: 'wards',
    label: 'Wards',
    icon: BedDouble,
    permissions: { view: [PERMISSIONS.WARDS_READ], write: [PERMISSIONS.WARDS_WRITE] },
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileBarChart,
    // No dedicated `reports:*` permission exists in PERMISSIONS yet.
    permissions: {},
  },
  {
    key: 'administration',
    label: 'Administration',
    icon: Settings,
    permissions: { view: [PERMISSIONS.ADMIN_READ], admin: [PERMISSIONS.ADMIN_WRITE] },
  },
];

export type RoleStatus = 'Active' | 'Inactive';

export type RoleDefinition = {
  id: string;
  name: string;
  description: string;
  status: RoleStatus;
  /** Each module maps to a SET of access levels, not a single one. An
   * admin can check View + Write together (cumulative). "No Access" is the
   * one exclusive value: checking it clears every other level for that
   * module, and checking any other level clears "No Access". Enforced in
   * `rolePermissionsStore.ts`'s `toggleRolePermission()`, not here. */
  permissionsByModule: Record<ModuleKey, AccessLevel[]>;
  /** Modules whose access level set has been manually changed from its
   * seeded default, drives the "Show Custom Only" filter and the Custom
   * Permissions stat. */
  customizedModules: ModuleKey[];
  departmentAccess: OrganizationalDepartment[];
};

/** Seed-authoring shorthand: one level per module, cascaded to the set of
 * levels it sensibly implies (Write implies View, Admin implies Write and
 * View, Approve implies View), makes hand-written seed data read
 * naturally while still landing in the real multi-select array shape. */
const CASCADE: Record<AccessLevel, AccessLevel[]> = {
  none: ['none'],
  view: ['view'],
  write: ['view', 'write'],
  approve: ['view', 'approve'],
  admin: ['view', 'write', 'admin'],
};

function matrix(
  entries: Partial<Record<ModuleKey, AccessLevel>>,
): Record<ModuleKey, AccessLevel[]> {
  const base: Record<ModuleKey, AccessLevel> = {
    'patients-records': 'none',
    'clinical-work': 'none',
    pharmacy: 'none',
    laboratory: 'none',
    'billing-revenue': 'none',
    emergency: 'none',
    wards: 'none',
    reports: 'view',
    administration: 'none',
  };
  const merged = { ...base, ...entries };
  return Object.fromEntries(
    (Object.keys(merged) as ModuleKey[]).map((key) => [key, CASCADE[merged[key]]]),
  ) as Record<ModuleKey, AccessLevel[]>;
}

// Seeded by mapping each role to the closest real MOCK_USERS permission
// array(s) through MODULE_DEFS above, not copied from the reference
// mockup's own (illustrative) sample cell selections.
export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'doctor',
    name: 'Doctor',
    description: 'Consultant physicians, medical officers, and emergency doctors.',
    status: 'Active',
    permissionsByModule: matrix({
      'patients-records': 'write',
      'clinical-work': 'write',
      laboratory: 'write',
      emergency: 'view',
    }),
    customizedModules: [],
    departmentAccess: ['Clinical / Consultation', 'Emergency'],
  },
  {
    id: 'nurse',
    name: 'Nurse',
    description: 'Staff nurses, ward managers, and matrons.',
    status: 'Active',
    permissionsByModule: matrix({
      'patients-records': 'view',
      'clinical-work': 'write',
      wards: 'write',
    }),
    customizedModules: [],
    departmentAccess: ['Nursing / Wards', 'Emergency'],
  },
  {
    id: 'pharmacist',
    name: 'Pharmacist',
    description: 'Dispensing pharmacists and pharmacy technicians.',
    status: 'Active',
    permissionsByModule: matrix({
      'patients-records': 'view',
      pharmacy: 'admin',
    }),
    customizedModules: [],
    departmentAccess: ['Pharmacy'],
  },
  {
    id: 'lab-scientist',
    name: 'Lab Scientist',
    description: 'Medical laboratory scientists and technicians.',
    status: 'Active',
    permissionsByModule: matrix({
      'patients-records': 'view',
      laboratory: 'admin',
    }),
    customizedModules: [],
    departmentAccess: ['Laboratory'],
  },
  {
    id: 'accountant',
    name: 'Accountant',
    description: 'Billing officers and finance & accounts staff.',
    status: 'Active',
    permissionsByModule: matrix({
      'patients-records': 'view',
      'billing-revenue': 'write',
    }),
    customizedModules: [],
    departmentAccess: ['Accounts & Billing'],
  },
  {
    id: 'it-support',
    name: 'IT Support',
    description: 'System and technical support staff.',
    status: 'Active',
    permissionsByModule: matrix({
      administration: 'view',
    }),
    customizedModules: [],
    departmentAccess: ['Administration'],
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Systems administrators with full administrative access.',
    status: 'Active',
    permissionsByModule: matrix({
      'patients-records': 'view',
      administration: 'admin',
    }),
    customizedModules: [],
    departmentAccess: ['Administration'],
  },
  {
    id: 'records-officer',
    name: 'Records Officer',
    description: 'Medical records and registration officers.',
    status: 'Active',
    permissionsByModule: matrix({
      'patients-records': 'write',
    }),
    customizedModules: [],
    departmentAccess: ['Records'],
  },
  {
    id: 'hr-manager',
    name: 'HR Manager',
    description: 'Human resources and staff administration.',
    status: 'Active',
    permissionsByModule: matrix({
      administration: 'view',
    }),
    customizedModules: [],
    departmentAccess: ['Administration'],
  },
  {
    id: 'facilities-officer',
    name: 'Facilities Officer',
    description: 'Facility, equipment, and resource management.',
    status: 'Inactive',
    permissionsByModule: matrix({
      administration: 'view',
    }),
    customizedModules: [],
    departmentAccess: ['Administration'],
  },
  {
    id: 'compliance-officer',
    name: 'Compliance Officer',
    description: 'Regulatory compliance and audit oversight.',
    status: 'Inactive',
    permissionsByModule: matrix({
      administration: 'view',
    }),
    customizedModules: [],
    departmentAccess: ['Administration'],
  },
  {
    id: 'administrative-officer',
    name: 'Administrative Officer',
    description: 'General administrative and clerical support.',
    status: 'Active',
    permissionsByModule: matrix({
      administration: 'view',
    }),
    customizedModules: [],
    departmentAccess: ['Administration'],
  },
];

export type RoleStats = {
  total: number;
  active: number;
  custom: number;
  departmentCount: number;
};

export function computeRoleStats(roles: RoleDefinition[]): RoleStats {
  return {
    total: roles.length,
    active: roles.filter((r) => r.status === 'Active').length,
    custom: roles.reduce((sum, r) => sum + r.customizedModules.length, 0),
    departmentCount: ORGANIZATIONAL_DEPARTMENTS.length,
  };
}

/** Whether a module's selected level set represents any real access. */
export function hasAnyAccess(levels: AccessLevel[]): boolean {
  return !levels.includes('none');
}

/** Order-independent equality for two level sets (used to decide whether a
 * module counts as "customized" against its seeded default). */
export function sameLevelSet(a: AccessLevel[], b: AccessLevel[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
