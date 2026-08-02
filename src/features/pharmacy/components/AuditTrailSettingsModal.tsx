'use client';

import { X } from 'lucide-react';

import { PreferenceToggle } from '@components/shared/PreferenceToggle';
import {
  updateAuditTrailSettings,
  useAuditTrailSettings,
} from '@/features/pharmacy/store/auditTrailStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function SettingRow({
  label,
  description,
  on,
  onToggle,
}: {
  label: string;
  description: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {label}
        </p>
        <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
          {description}
        </p>
      </div>
      <PreferenceToggle on={on} onToggle={onToggle} ariaLabel={label} />
    </div>
  );
}

/** Real, shared settings for the audit trail — lazy-loaded (checklist §14).
 * Backed by `auditTrailStore.ts`, not local state, so a change here persists
 * across navigation for the rest of the session. */
export function AuditTrailSettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useAuditTrailSettings();

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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Audit Trail Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-2">
          <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(0,100,130,0.08)' }}>
            <SettingRow
              label="Log Access Events"
              description="Record every time a pharmacist views a patient's prescription or dispense history."
              on={settings.logAccessEvents}
              onToggle={() =>
                updateAuditTrailSettings({ logAccessEvents: !settings.logAccessEvents })
              }
            />
            <SettingRow
              label="Require Void/Delete Reason"
              description="A pharmacist must record a reason before voiding a dispense or deleting a draft record."
              on={settings.requireVoidDeleteReason}
              onToggle={() =>
                updateAuditTrailSettings({
                  requireVoidDeleteReason: !settings.requireVoidDeleteReason,
                })
              }
            />
            <SettingRow
              label="Auto-Export Monthly Report"
              description="Automatically generate and archive a compliance report at the end of each month."
              on={settings.autoExportMonthly}
              onToggle={() =>
                updateAuditTrailSettings({ autoExportMonthly: !settings.autoExportMonthly })
              }
            />
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#0F766E' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
