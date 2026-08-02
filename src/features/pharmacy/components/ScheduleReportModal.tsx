'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FREQUENCY_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

/** Lazy-loaded (checklist §14). Sets up a recurring delivery of the currently
 * filtered report — recipient + cadence only; no attachment-format toggle,
 * that's what "Export Report" is for. */
export function ScheduleReportModal({
  onSchedule,
  onClose,
}: {
  onSchedule: (frequency: string, recipientEmail: string) => void;
  onClose: () => void;
}) {
  const [frequency, setFrequency] = useState('Weekly');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail);

  function handleSubmit() {
    setTouched(true);
    if (!isValidEmail) return;
    onSchedule(frequency, recipientEmail);
  }

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
            Schedule Report
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
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            This report will be regenerated with your current filters and emailed automatically on
            the cadence you choose.
          </p>

          <div className="mt-4">
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Frequency
            </label>
            <FormSelect
              id="schedule-report-frequency"
              value={frequency}
              onChange={setFrequency}
              options={FREQUENCY_OPTIONS}
              placeholder="Select frequency"
            />
          </div>

          <div className="mt-4">
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Recipient Email
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="pharmacist@unizik.edu.ng"
              className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none ${FOCUS_RING}`}
              style={{
                fontSize: 14,
                border: `1px solid ${touched && !isValidEmail ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                color: '#0D2630',
              }}
            />
            {touched && !isValidEmail && (
              <p className="mt-1" style={{ fontSize: 14, color: '#EF4444' }}>
                Enter a valid email address.
              </p>
            )}
          </div>
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
            onClick={handleSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
}
