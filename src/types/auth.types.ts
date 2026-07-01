// ─── Workspace Role ────────────────────────────────────────────────────────
// Machine-readable role discriminant. Drives workspace routing, nav
// filtering, and role-scoped dashboard selection. NOT a display label —
// use User.role (string) for display purposes.

export type WorkspaceRole =
  | 'RECORDS_OFFICER'
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
  return WORKSPACE_BY_ROLE[role];
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

export type LoginCredentials = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};
