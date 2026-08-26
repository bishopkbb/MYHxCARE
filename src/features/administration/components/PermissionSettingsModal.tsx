'use client';

import { X } from 'lucide-react';

import { PreferenceToggle } from '@components/shared/PreferenceToggle';
import { useToast } from '@/hooks/useToast';
import {
  setPermissionSetting,
  usePermissionSettings,
} from '@/features/administration/store/permissionSettingsStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const SETTINGS_COPY: {
  key: 'requireApprovalForAdminAssignment' | 'autoExpireCustomPermissions' | 'notifyOnRoleChange';
  label: string;
  hint: string;
}[] = [
  {
    key: 'requireApprovalForAdminAssignment',
    label: 'Require approval for Admin-tier role assignment',
    hint: 'A second administrator must confirm before Admin-level access is granted.',
  },
  {
    key: 'autoExpireCustomPermissions',
    label: 'Auto-expire custom permissions after 90 days',
    hint: 'Manually customized module access reverts to its role default after 90 days.',
  },
  {
    key: 'notifyOnRoleChange',
    label: 'Notify staff when their role changes',
    hint: 'Send a notification whenever a staff member is assigned a new role.',
  },
];

export function PermissionSettingsModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const settings = usePermissionSettings();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Permission Settings
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Global rules for how roles and permissions are managed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-4">
            {SETTINGS_COPY.map((s) => (
              <div
                key={s.key}
                className="flex items-start justify-between gap-3 rounded-[10px] p-3.5"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {s.label}
                  </p>
                  <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                    {s.hint}
                  </p>
                </div>
                <PreferenceToggle
                  on={settings[s.key]}
                  onToggle={() => {
                    setPermissionSetting(s.key, !settings[s.key]);
                    toast.success(
                      'Setting updated',
                      `${s.label} is now ${!settings[s.key] ? 'on' : 'off'}.`,
                    );
                  }}
                  ariaLabel={s.label}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
