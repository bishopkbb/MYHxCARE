'use client';

import { Suspense } from 'react';

import { EmergencyClinicalTimelineWorkspace } from '@/features/emergency/components/EmergencyClinicalTimelineWorkspace';

export default function ClinicalTimelinePage() {
  return (
    <Suspense fallback={null}>
      <EmergencyClinicalTimelineWorkspace />
    </Suspense>
  );
}
