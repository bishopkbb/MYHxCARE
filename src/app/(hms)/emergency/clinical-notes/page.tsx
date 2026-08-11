'use client';

import { Suspense } from 'react';

import { EmergencyClinicalNotesWorkspace } from '@/features/emergency/components/EmergencyClinicalNotesWorkspace';

export default function EmergencyClinicalNotesPage() {
  return (
    <Suspense fallback={null}>
      <EmergencyClinicalNotesWorkspace />
    </Suspense>
  );
}
