'use client';

import { Suspense } from 'react';

import { EmergencyMedicationOrdersWorkspace } from '@/features/emergency/components/EmergencyMedicationOrdersWorkspace';

export default function MedicationOrdersPage() {
  return (
    <Suspense fallback={null}>
      <EmergencyMedicationOrdersWorkspace />
    </Suspense>
  );
}
