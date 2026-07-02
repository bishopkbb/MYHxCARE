import type { Metadata } from 'next';

import { ActiveSessionsList } from '@features/auth/components/ActiveSessionsList';

export const metadata: Metadata = { title: 'Active Sessions' };

export default function SessionsPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <ActiveSessionsList />
    </div>
  );
}
