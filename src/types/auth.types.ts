// ─── Workspace Role ────────────────────────────────────────────────────────
// Machine-readable role discriminant. Drives workspace routing, nav
// filtering, and role-scoped dashboard selection. NOT a display label —
// use User.role (string) for display purposes.

export type WorkspaceRole =
  | 'RECORDS_OFFICER'
  | 'REGISTRATION_OFFICER'
  | 'DOCTOR'
  | 'CONSULTANT'
  | 'NURSE'
  | 'MATRON'
  | 'WARD_MANAGER'
  | 'PHARMACIST'
  | 'LAB_SCIENTIST'
  | 'LAB_TECHNICIAN'
  | 'BILLING_OFFICER'
  | 'EMERGENCY_NURSE'
  | 'EMERGENCY_DOCTOR'
  | 'HOD'
  | 'SYSTEM_ADMIN';

// ─── Workspace Identity ────────────────────────────────────────────────────
// The 9 role-based workspaces in the HMS. Each WorkspaceRole maps to exactly
// one WorkspaceId. HOD maps to 'clinical' (their primary workspace).

export type WorkspaceId =
  | 'records'
  | 'registration'
  | 'clinical'
  | 'nursing'
  | 'ward-management'
  | 'pharmacy'
  | 'laboratory'
  | 'finance'
  | 'emergency'
  | 'administration';

export const WORKSPACE_BY_ROLE: Record<WorkspaceRole, WorkspaceId> = {
  RECORDS_OFFICER: 'records',
  REGISTRATION_OFFICER: 'registration',
  DOCTOR: 'clinical',
  CONSULTANT: 'clinical',
  NURSE: 'nursing',
  MATRON: 'nursing',
  WARD_MANAGER: 'ward-management',
  PHARMACIST: 'pharmacy',
  LAB_SCIENTIST: 'laboratory',
  LAB_TECHNICIAN: 'laboratory',
  BILLING_OFFICER: 'finance',
  EMERGENCY_NURSE: 'emergency',
  EMERGENCY_DOCTOR: 'emergency',
  HOD: 'clinical',
  SYSTEM_ADMIN: 'administration',
} as const;

export function resolveWorkspace(role: WorkspaceRole): WorkspaceId {
  // Falls back to 'clinical' for a role that doesn't resolve (e.g. a stale
  // session/token carrying a role from before a workspace remap) — a
  // resumed session should never hard-crash the app over a lookup miss.
  return WORKSPACE_BY_ROLE[role] ?? 'clinical';
}

// Physician roles only — the ones a medical council registration and a
// clinical specialization actually apply to. Nurses, pharmacists, lab
// scientists, etc. are clinical-adjacent but have different credentialing
// (nursing council, pharmacy council…) that isn't modeled yet, so they fall
// through to the same non-clinical field set as Registration/Records.
const CLINICAL_ROLES: ReadonlySet<WorkspaceRole> = new Set([
  'DOCTOR',
  'CONSULTANT',
  'EMERGENCY_DOCTOR',
  'HOD',
]);

export function isClinicalRole(role: WorkspaceRole): boolean {
  return CLINICAL_ROLES.has(role);
}

// ─── JWT Claims ────────────────────────────────────────────────────────────

export type JwtClaims = {
  tenant_id: string;
  actor_id: string;
  role_ids: string[];
  workspace_role?: WorkspaceRole;
  exp: number;
  iat: number;
};

// ─── User ──────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  name: string;
  email: string;
  role: string; // Display label, e.g. "Consultant Physician"
  workspaceRole: WorkspaceRole;
  department?: string;
  departmentId?: string;
  permissions: string[];
};

// ─── Auth State ────────────────────────────────────────────────────────────

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User; claims: JwtClaims }
  | { status: 'session-expired'; user: User }
  | { status: 'unauthenticated' };

// ─── Session ───────────────────────────────────────────────────────────────

export type Session = {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
};

// ─── Trusted Device ────────────────────────────────────────────────────────

export type TrustedDevice = {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  trustedAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
};

// ─── Login ─────────────────────────────────────────────────────────────────

export type LoginCredentials = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};
