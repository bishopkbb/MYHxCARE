export type JwtClaims = {
  tenant_id: string;
  actor_id: string;
  role_ids: string[];
  exp: number;
  iat: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  permissions: string[];
};

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
