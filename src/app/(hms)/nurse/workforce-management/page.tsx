'use client';

import { ShieldAlert } from 'lucide-react';

import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { NurseWorkforceManagementWorkspace } from '@/features/nursing/components/NurseWorkforceManagementWorkspace';

// Supervisor-only screen (per this module's own fixtures doc comment). The
// sidebar already hides this link without duty_roster:write, but that alone
// doesn't stop direct navigation to the URL — this component-level gate is
// the actual enforcement; the nav entry is just a convenience.
function AccessRestricted() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-center gap-3 px-4 py-24 text-center sm:px-6">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(226,237,241,0.6)' }}
          >
            <ShieldAlert style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
            You don&apos;t have access to Workforce Management
          </p>
          <p style={{ fontSize: 14, color: '#8A98A3' }}>
            This screen is restricted to nursing supervisors. Contact your supervisor if you need
            access.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function NurseWorkforceManagementPage() {
  return (
    <PermissionGate permission={PERMISSIONS.DUTY_ROSTER_WRITE} fallback={<AccessRestricted />}>
      <NurseWorkforceManagementWorkspace />
    </PermissionGate>
  );
}
