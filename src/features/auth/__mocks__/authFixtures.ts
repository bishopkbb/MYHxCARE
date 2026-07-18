import type { LoginResponse, User, WorkspaceRole } from '@/types/auth.types';

// Pre-computed base64url of {"alg":"HS256","typ":"JWT"}
const JWT_HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

export function createMockAccessToken(
  actorId = 'usr_001',
  workspaceRole: WorkspaceRole = 'CONSULTANT',
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    tenant_id: 'tenant_unizik',
    actor_id: actorId,
    role_ids: [`role_${actorId}`],
    workspace_role: workspaceRole,
    exp: now + 3600,
    iat: now,
  };
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${JWT_HEADER}.${payloadB64}.mock_sig`;
}

// ─── Mock Users (one per representative workspace role) ────────────────────
// Use these identifiers at the login screen to switch workspaces during dev:
//
//   CONSULTANT      →  dr.adaeze / DR-001 / (default)
//   NURSE           →  nurse / NRS-001 / chidinma
//   PHARMACIST      →  pharm / PHM-001 / emeka
//   RECORDS_OFFICER →  record / REC-001 / ngozi
//   EMERGENCY_DOCTOR→  emergency / EMG-001 / chukwuemeka
//   LAB_SCIENTIST   →  lab / LAB-001 / adaora
//   BILLING_OFFICER →  bill / BIL-001 / ifeanyi
//   WARD_MANAGER    →  ward / WRD-001 / amaka
//   HOD             →  hod / obiora
//   SYSTEM_ADMIN    →  admin / ADM-001 / kelechi
//   REGISTRATION_OFFICER → register / REG-001 / adaobi

const MOCK_USERS: User[] = [
  {
    id: 'usr_001',
    name: 'Dr. Adaeze Okonkwo',
    email: 'adaeze.okonkwo@unizikmedical.edu.ng',
    role: 'Consultant Physician',
    workspaceRole: 'CONSULTANT',
    department: 'Internal Medicine',
    departmentId: 'dept_internal_medicine',
    permissions: [
      'patients:read',
      'patients:write',
      'encounters:read',
      'encounters:write',
      'prescriptions:write',
      'lab_orders:read',
      'lab_orders:write',
      'referrals:write',
      'notifications:read',
    ],
  },
  {
    id: 'usr_002',
    name: 'Nurse Chidinma Eze',
    email: 'chidinma.eze@unizikmedical.edu.ng',
    role: 'Staff Nurse',
    workspaceRole: 'NURSE',
    department: 'General Ward',
    departmentId: 'dept_general_ward',
    permissions: ['patients:read', 'encounters:read', 'wards:read', 'notifications:read'],
  },
  {
    id: 'usr_003',
    name: 'Mr. Emeka Obi',
    email: 'emeka.obi@unizikmedical.edu.ng',
    role: 'Pharmacist',
    workspaceRole: 'PHARMACIST',
    department: 'Pharmacy',
    departmentId: 'dept_pharmacy',
    permissions: ['patients:read', 'pharmacy:read', 'pharmacy:dispense', 'notifications:read'],
  },
  {
    id: 'usr_004',
    name: 'Mrs. Ngozi Asogwa',
    email: 'ngozi.asogwa@unizikmedical.edu.ng',
    role: 'Medical Records Officer',
    workspaceRole: 'RECORDS_OFFICER',
    department: 'Medical Records',
    departmentId: 'dept_medical_records',
    permissions: ['patients:read', 'patients:write', 'notifications:read'],
  },
  {
    id: 'usr_005',
    name: 'Dr. Chukwuemeka Nwosu',
    email: 'chukwuemeka.nwosu@unizikmedical.edu.ng',
    role: 'Emergency Physician',
    workspaceRole: 'EMERGENCY_DOCTOR',
    department: 'Accident & Emergency',
    departmentId: 'dept_emergency',
    permissions: [
      'patients:read',
      'patients:write',
      'encounters:read',
      'encounters:write',
      'emergency:read',
      'emergency:write',
      'prescriptions:write',
      'lab_orders:read',
      'lab_orders:write',
      'notifications:read',
    ],
  },
  {
    id: 'usr_006',
    name: 'Mrs. Adaora Ugwu',
    email: 'adaora.ugwu@unizikmedical.edu.ng',
    role: 'Medical Laboratory Scientist',
    workspaceRole: 'LAB_SCIENTIST',
    department: 'Haematology Laboratory',
    departmentId: 'dept_lab_haematology',
    permissions: ['patients:read', 'lab_orders:read', 'lab_orders:write', 'notifications:read'],
  },
  {
    id: 'usr_007',
    name: 'Mr. Ifeanyi Okafor',
    email: 'ifeanyi.okafor@unizikmedical.edu.ng',
    role: 'Billing Officer',
    workspaceRole: 'BILLING_OFFICER',
    department: 'Finance Department',
    departmentId: 'dept_finance',
    permissions: ['patients:read', 'billing:read', 'billing:write', 'notifications:read'],
  },
  {
    id: 'usr_008',
    name: 'Mrs. Amaka Nwosu',
    email: 'amaka.nwosu@unizikmedical.edu.ng',
    role: 'Ward Manager',
    workspaceRole: 'WARD_MANAGER',
    department: 'Female Surgical Ward',
    departmentId: 'dept_ward_surgical_female',
    permissions: [
      'patients:read',
      'encounters:read',
      'wards:read',
      'wards:write',
      'notifications:read',
    ],
  },
  {
    id: 'usr_009',
    name: 'Dr. Obiora Eze',
    email: 'obiora.eze@unizikmedical.edu.ng',
    role: 'Head of Department',
    workspaceRole: 'HOD',
    department: 'Internal Medicine',
    departmentId: 'dept_internal_medicine',
    permissions: [
      'patients:read',
      'patients:write',
      'encounters:read',
      'encounters:write',
      'prescriptions:write',
      'lab_orders:read',
      'lab_orders:write',
      'referrals:write',
      'admin:read',
      'duty_roster:read',
      'notifications:read',
    ],
  },
  {
    id: 'usr_010',
    name: 'Mr. Kelechi Obasi',
    email: 'kelechi.obasi@unizikmedical.edu.ng',
    role: 'Systems Administrator',
    workspaceRole: 'SYSTEM_ADMIN',
    department: 'ICT Department',
    departmentId: 'dept_ict',
    permissions: [
      'admin:read',
      'admin:write',
      'duty_roster:read',
      'duty_roster:write',
      'patients:read',
      'notifications:read',
    ],
  },
  {
    id: 'usr_011',
    name: 'Mrs. Adaobi Nwankwo',
    email: 'adaobi.nwankwo@unizikmedical.edu.ng',
    role: 'Registration Officer',
    workspaceRole: 'REGISTRATION_OFFICER',
    department: 'Patient Registration',
    departmentId: 'dept_patient_registration',
    permissions: ['patients:read', 'patients:write', 'referrals:write', 'notifications:read'],
  },
];

const MOCK_USERS_BY_ID = new Map<string, User>(MOCK_USERS.map((u) => [u.id, u]));
const MOCK_USERS_BY_EMAIL = new Map<string, User>(MOCK_USERS.map((u) => [u.email, u]));

// Ordered list: first matching keyword wins
const IDENTIFIER_KEYWORDS: Array<[string, string]> = [
  ['nurse', 'usr_002'],
  ['nrs-', 'usr_002'],
  ['chidinma', 'usr_002'],
  ['pharm', 'usr_003'],
  ['phm-', 'usr_003'],
  ['emeka', 'usr_003'],
  ['record', 'usr_004'],
  ['rec-', 'usr_004'],
  ['ngozi', 'usr_004'],
  ['emergency', 'usr_005'],
  ['emg-', 'usr_005'],
  ['chukwuemeka', 'usr_005'],
  ['lab', 'usr_006'],
  ['lab-', 'usr_006'],
  ['adaora', 'usr_006'],
  ['bill', 'usr_007'],
  ['bil-', 'usr_007'],
  ['ifeanyi', 'usr_007'],
  ['ward', 'usr_008'],
  ['wrd-', 'usr_008'],
  ['amaka', 'usr_008'],
  ['hod', 'usr_009'],
  ['obiora', 'usr_009'],
  ['admin', 'usr_010'],
  ['adm-', 'usr_010'],
  ['kelechi', 'usr_010'],
  ['sys-', 'usr_010'],
  ['register', 'usr_011'],
  ['reg-', 'usr_011'],
  ['adaobi', 'usr_011'],
];

/**
 * Resolves a login identifier (staff ID, email, or keyword) to a mock user.
 * Used by the mock login path and by resumeSession (which passes user.email).
 * Falls back to Dr. Adaeze Okonkwo (CONSULTANT) when no match is found.
 */
export function getMockUser(identifier: string): User {
  // Email match first — resumeSession passes the stored email
  const byEmail = MOCK_USERS_BY_EMAIL.get(identifier);
  if (byEmail) return byEmail;

  const id = identifier.toLowerCase();
  for (const [keyword, userId] of IDENTIFIER_KEYWORDS) {
    if (id.includes(keyword)) {
      const user = MOCK_USERS_BY_ID.get(userId);
      if (user) return user;
    }
  }

  return MOCK_USERS_BY_ID.get('usr_001') as User;
}

/**
 * Resolves an actor ID (from a decoded JWT) to a mock user.
 * Used by the mock getMe() path.
 */
export function getMockUserById(actorId: string): User {
  return MOCK_USERS_BY_ID.get(actorId) ?? (MOCK_USERS_BY_ID.get('usr_001') as User);
}

export function createMockLoginResponse(
  actorId: string,
  workspaceRole: WorkspaceRole,
): LoginResponse {
  return {
    access_token: createMockAccessToken(actorId, workspaceRole),
    refresh_token: `mock-refresh-token-${actorId}`,
    expires_in: 3600,
  };
}

// Legacy export — kept so any existing test imports still resolve
export const MOCK_USER: User = MOCK_USERS_BY_ID.get('usr_001') as User;
