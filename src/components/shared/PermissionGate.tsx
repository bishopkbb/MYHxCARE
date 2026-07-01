'use client';

import type { ReactNode } from 'react';

import { usePermissions } from '@providers/PermissionsProvider';

interface PermissionGateProps {
  /** Require exactly this one permission. */
  permission?: string;
  /** Require at least one of these permissions. */
  anyOf?: string[];
  /** Require all of these permissions. */
  allOf?: string[];
  /** Rendered when the check fails. Defaults to null. */
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();

  let allowed = true;
  if (permission !== undefined) allowed = can(permission);
  else if (anyOf !== undefined) allowed = canAny(...anyOf);
  else if (allOf !== undefined) allowed = canAll(...allOf);

  return <>{allowed ? children : fallback}</>;
}
