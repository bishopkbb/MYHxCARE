'use client';

import { Suspense } from 'react';

import { EmergencyProceduresWorkspace } from '@/features/emergency/components/EmergencyProceduresWorkspace';

export default function ProceduresPage() {
  return (
    <Suspense fallback={null}>
      <EmergencyProceduresWorkspace />
    </Suspense>
  );
}
