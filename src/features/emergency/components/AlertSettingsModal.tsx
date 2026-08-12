'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type AlertPreferences = {
  notifyCritical: boolean;
  notifyHigh: boolean;
  notifyModerate: boolean;
  playSound: boolean;
};

export function AlertSettingsModal({
  initial,
  onClose,
  onSave,
}: {
  initial: AlertPreferences;
  onClose: () => void;
  onSave: (prefs: AlertPreferences) => void;
}) {
  const [prefs, setPrefs] = useState<AlertPreferences>(initial);

  function toggle(key: keyof AlertPreferences) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  const ROWS: { key: keyof AlertPreferences; label: string; desc: string }[] = [
    {
      key: 'notifyCritical',
      label: 'Critical alerts',
      desc: 'Notify immediately on any critical result.',
    },
    {
      key: 'notifyHigh',
      label: 'High priority alerts',
      desc: 'Notify on high-priority abnormal results.',
    },
    {
      key: 'notifyModerate',
      label: 'Moderate priority alerts',
      desc: 'Notify on moderate-priority abnormal results.',
    },
    {
      key: 'playSound',
      label: 'Play sound',
      desc: 'Play an audible chime for new critical alerts.',
    },
  ];

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
        style={{ maxWidth: 440, borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
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

        <div className="flex flex-col gap-3.5 px-6 py-5">
          {ROWS.map((row) => (
            <label
              key={row.key}
              className={`flex cursor-pointer items-start gap-3 rounded-[10px] p-3 transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <input
                type="checkbox"
                checked={prefs[row.key]}
                onChange={() => toggle(row.key)}
                className={`mt-0.5 size-4 shrink-0 ${FOCUS_RING}`}
              />
              <div>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {row.label}
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{row.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(prefs)}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#0D2630' }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
