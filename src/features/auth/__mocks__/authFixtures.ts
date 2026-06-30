import type { LoginResponse, User } from '@/types/auth.types';

// Pre-computed base64url of {"alg":"HS256","typ":"JWT"}
const JWT_HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

export function createMockAccessToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    tenant_id: 'tenant_unizik',
    actor_id: 'usr_001',
    role_ids: ['role_consultant'],
    exp: now + 3600,
    iat: now,
  };
  // btoa is available in Node 16+ and all modern browsers
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${JWT_HEADER}.${payloadB64}.mock_sig`;
}

export const MOCK_USER: User = {
  id: 'usr_001',
  name: 'Dr. Adaeze Okonkwo',
  email: 'adaeze.okonkwo@unizikmedical.edu.ng',
  role: 'Consultant Physician',
  department: 'Internal Medicine',
  permissions: [
    'patients:read',
    'patients:write',
    'encounters:read',
    'encounters:write',
    'prescriptions:write',
    'lab_orders:write',
    'referrals:write',
  ],
};

export function createMockLoginResponse(): LoginResponse {
  return {
    access_token: createMockAccessToken(),
    refresh_token: 'mock-refresh-token-abc123',
    expires_in: 3600,
  };
}
