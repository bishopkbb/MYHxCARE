'use client';

import { X } from 'lucide-react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type AlertSettings = {
  criticalDays: number;
  lowStockDays: number;
};

const CRITICAL_OPTIONS = [1, 2, 3, 5];
const LOW_STOCK_OPTIONS = [5, 7, 10, 14];

/** Configures the day thresholds this screen's Critical/Low Stock alert
 * levels are computed from — lazy-loaded (checklist §14). Every control
 * takes effect immediately across the table, stat cards, and donut, so
 * there's nothing to "save" separately. */
export function AlertSettingsModal({
  settings,
  onChange,
  onClose,
}: {
  settings: AlertSettings;
  onChange: (next: AlertSettings) => void;
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
            Alert Settings
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
                Critical threshold
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                Flag a batch as Critical when its stock will last this many days or fewer.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {CRITICAL_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange({ ...settings, criticalDays: n })}
                    className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: settings.criticalDays === n ? '#DC2626' : '#4A7080',
                      border: `1px solid ${settings.criticalDays === n ? '#DC2626' : 'rgba(0,100,130,0.18)'}`,
                      background:
                        settings.criticalDays === n ? 'rgba(220,38,38,0.06)' : 'transparent',
                    }}
                  >
                    ≤ {n} days
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Low Stock threshold
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                Flag a batch as Low Stock when its stock will last this many days or fewer (and it
                isn&apos;t already Critical).
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {LOW_STOCK_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange({ ...settings, lowStockDays: n })}
                    disabled={n <= settings.criticalDays}
                    className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: settings.lowStockDays === n ? '#D97706' : '#4A7080',
                      border: `1px solid ${settings.lowStockDays === n ? '#D97706' : 'rgba(0,100,130,0.18)'}`,
                      background:
                        settings.lowStockDays === n ? 'rgba(217,119,6,0.06)' : 'transparent',
                    }}
                  >
                    ≤ {n} days
                  </button>
                ))}
              </div>
            </div>
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
