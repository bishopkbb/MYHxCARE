'use client';

import { use } from 'react';

import { PatientRecordWorkspace } from '@/features/nursing/components/PatientRecordWorkspace';

export default function PatientRecordPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  return <PatientRecordWorkspace patientId={patientId} />;
}
