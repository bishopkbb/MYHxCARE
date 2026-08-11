'use client';

import { Suspense } from 'react';

import { EmergencyDiagnosticRequestsWorkspace } from '@/features/emergency/components/EmergencyDiagnosticRequestsWorkspace';

export default function DiagnosticRequestsPage() {
  return (
    <Suspense fallback={null}>
      <EmergencyDiagnosticRequestsWorkspace />
    </Suspense>
  );
}
