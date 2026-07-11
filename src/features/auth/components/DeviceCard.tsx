'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';

import type { TrustedDevice } from '@/types/auth.types';
import { toRelativeTime } from '@utils/datetime';
import { cn } from '@lib/utils';
import { useRevokeDeviceMutation } from '@features/auth/hooks/useDevices';

function DeviceIcon({ name, className }: { name: string; className?: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('iphone') || lower.includes('android') || lower.includes('mobile')) {
    return <Smartphone className={className} />;
  }
  return <Monitor className={className} />;
}

interface DeviceCardProps {
  device: TrustedDevice;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const { mutate: revokeDevice, isPending } = useRevokeDeviceMutation();

  function handleRevoke() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setRevokeError(null);
    revokeDevice(device.id, {
      onError: () => {
        setRevokeError('Failed to remove device. Please try again.');
        setConfirming(false);
      },
    });
  }

  return (
    <div
      className={cn(
        'bg-card rounded-lg border p-4 transition-shadow duration-150',
        device.isCurrent && 'border-primary/40',
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            device.isCurrent ? 'bg-primary/10' : 'bg-muted',
          )}
        >
          <DeviceIcon
            name={device.deviceName}
            className={cn('size-5', device.isCurrent ? 'text-primary' : 'text-muted-foreground')}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground text-sm font-medium">{device.deviceName}</span>
            {device.isCurrent && (
              <span className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-medium">
                <span className="bg-primary size-1.5 rounded-full" aria-hidden="true" />
                This device
              </span>
            )}
          </div>

          <p className="text-muted-foreground mt-0.5 text-sm">
            {device.browser} &middot; {device.os}
          </p>

          <p className="text-muted-foreground mt-1 text-sm">
            {device.ipAddress}
            {device.location ? ` · ${device.location}` : ''}
          </p>

          <p className="text-muted-foreground mt-1 text-sm">
            Trusted {toRelativeTime(device.trustedAt)} &middot; Last used{' '}
            {toRelativeTime(device.lastUsedAt)}
          </p>

          {revokeError && <p className="text-destructive mt-1.5 text-sm">{revokeError}</p>}
        </div>

        {!device.isCurrent && (
          <div className="flex shrink-0 items-center gap-2">
            {confirming && !isPending && (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 transition-colors duration-150 hover:underline"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleRevoke}
              disabled={isPending}
              className={cn(
                'focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                confirming
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'text-muted-foreground hover:border-destructive hover:text-destructive border',
              )}
            >
              {isPending ? 'Removing…' : confirming ? 'Confirm remove' : 'Remove'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
