'use client';

import { Suspense } from 'react';

import { EmergencyResultsReviewWorkspace } from '@/features/emergency/components/EmergencyResultsReviewWorkspace';

export default function ResultsReviewPage() {
  return (
    <Suspense fallback={null}>
      <EmergencyResultsReviewWorkspace />
    </Suspense>
  );
}
