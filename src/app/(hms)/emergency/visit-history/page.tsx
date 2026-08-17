'use client';

import { Suspense } from 'react';

import { EmergencyVisitHistoryWorkspace } from '@/features/emergency/components/EmergencyVisitHistoryWorkspace';

export default function VisitHistoryPage() {
  return (
    <Suspense fallback={null}>
      <EmergencyVisitHistoryWorkspace />
    </Suspense>
  );
}
