'use client';

import { X } from 'lucide-react';

import { PreferenceToggle } from '@components/shared/PreferenceToggle';

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

/** Real page-local settings for the queue monitor specifically — lazy-loaded
 * (checklist §14). Both toggles actually change the workspace's behavior
 * (live re-render cadence and table sort order), not just labels on a modal
 * that does nothing. Distinct from Prescription Queue's own
 * QueueSettingsModal.tsx, which controls a different screen. */
export function QueueMonitorSettingsModal({
  autoRefresh,
  onToggleAutoRefresh,
  sortPriorityFirst,
  onToggleSortPriorityFirst,
  onClose,
}: {
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  sortPriorityFirst: boolean;
  onToggleSortPriorityFirst: () => void;
  onClose: () => void;
}) {
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
            View Queue Settings
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
              label="Auto Refresh"
              description="Wait times recalculate every 30 seconds without needing a page reload."
              on={autoRefresh}
              onToggle={onToggleAutoRefresh}
            />
            <SettingRow
              label="Sort Priority First"
              description="High-priority entries are always listed above Medium and Low, regardless of who joined first."
              on={sortPriorityFirst}
              onToggle={onToggleSortPriorityFirst}
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
