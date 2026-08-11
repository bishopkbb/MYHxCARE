'use client';

import { Suspense } from 'react';

import { BedAssignmentWorkspace } from '@/features/emergency/components/BedAssignmentWorkspace';

export default function BedAssignmentPage() {
  return (
    <Suspense fallback={null}>
      <BedAssignmentWorkspace />
    </Suspense>
  );
}
