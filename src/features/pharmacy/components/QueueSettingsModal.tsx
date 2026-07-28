'use client';

import { X } from 'lucide-react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type QueueSettings = {
  defaultRowsPerPage: number;
  showCancelled: boolean;
  highlightAllergyRows: boolean;
};

const ROWS_PER_PAGE_OPTIONS = [8, 10, 25, 50];

/** Queue display preferences — lazy-loaded (checklist §14). Every control
 * here writes straight back to the workspace's own state and takes effect
 * immediately, so there's nothing to "save" separately. */
export function QueueSettingsModal({
  settings,
  onChange,
  onClose,
}: {
  settings: QueueSettings;
  onChange: (next: QueueSettings) => void;
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
        style={{ maxWidth: 440, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Queue Settings
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-5">
            <div>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Default rows per page
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange({ ...settings, defaultRowsPerPage: n })}
                    className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: settings.defaultRowsPerPage === n ? '#00B4D8' : '#4A7080',
                      border: `1px solid ${settings.defaultRowsPerPage === n ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                      background:
                        settings.defaultRowsPerPage === n ? 'rgba(0,180,216,0.06)' : 'transparent',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={settings.showCancelled}
                onChange={(e) => onChange({ ...settings, showCancelled: e.target.checked })}
                className={`mt-0.5 size-5 shrink-0 rounded ${FOCUS_RING}`}
                style={{ accentColor: '#00B4D8' }}
              />
              <span>
                <span
                  className="block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Show cancelled prescriptions
                </span>
                <span className="block" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Include cancelled prescriptions in the queue table below.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={settings.highlightAllergyRows}
                onChange={(e) => onChange({ ...settings, highlightAllergyRows: e.target.checked })}
                className={`mt-0.5 size-5 shrink-0 rounded ${FOCUS_RING}`}
                style={{ accentColor: '#00B4D8' }}
              />
              <span>
                <span
                  className="block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Highlight allergy-alert rows
                </span>
                <span className="block" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Tint rows with a known allergy conflict so they stand out at a glance.
                </span>
              </span>
            </label>
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
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
