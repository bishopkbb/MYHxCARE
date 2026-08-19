'use client';

import { use } from 'react';

import { BillingAccountDetailWorkspace } from '@/features/billing/components/BillingAccountDetailWorkspace';

export default function BillingAccountDetailPage({ params }: { params: Promise<{ mrn: string }> }) {
  const { mrn } = use(params);
  return <BillingAccountDetailWorkspace mrn={decodeURIComponent(mrn)} />;
}
