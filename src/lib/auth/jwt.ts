import type { JwtClaims } from '@/types/auth.types';

// Decodes a JWT payload without verifying the signature.
// Verification is the server's responsibility — we only need the claims
// to schedule token refresh and read tenant/user IDs client-side.
export function decodeJwt(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    const payload = parts[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export function isTokenExpired(claims: JwtClaims): boolean {
  return Date.now() / 1000 >= claims.exp;
}

// Returns milliseconds until the token expires (negative if already expired).
export function msUntilExpiry(claims: JwtClaims): number {
  return claims.exp * 1000 - Date.now();
}
