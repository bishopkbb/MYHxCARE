'use client';

import { Suspense } from 'react';

import { TriageAssessmentWorkspace } from '@/features/emergency/components/TriageAssessmentWorkspace';

export default function TriageAssessmentPage() {
  return (
    <Suspense fallback={null}>
      <TriageAssessmentWorkspace />
    </Suspense>
  );
}
