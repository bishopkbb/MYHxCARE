'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_LABEL_CLASS = 'mb-1.5 flex min-h-10 items-end font-sans font-medium';
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;

const REPORT_TYPE_OPTIONS = [
  { value: 'Laboratory Summary', label: 'Laboratory Summary' },
  { value: 'Sample Reports', label: 'Sample Reports' },
  { value: 'Published Results', label: 'Published Results' },
  { value: 'Critical Results', label: 'Critical Results' },
  { value: 'Quality Control Reports', label: 'Quality Control Reports' },
  { value: 'Department Performance', label: 'Department Performance' },
  { value: 'Turnaround Time Report', label: 'Turnaround Time Report' },
];
const FREQUENCY_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];
const FORMAT_OPTIONS = [
  { value: 'PDF', label: 'PDF' },
  { value: 'CSV', label: 'CSV' },
];

export type ScheduleReportInput = {
  reportType: string;
  frequency: string;
  format: string;
  recipients: string;
};

/** Sets up a recurring emailed report — self-contained, confirms via toast
 * on the caller side. Lazy-loaded (checklist §14). */
export function ScheduleReportModal({
  onSubmit,
  onClose,
  defaultReportType = 'Laboratory Summary',
}: {
  onSubmit: (input: ScheduleReportInput) => void;
  onClose: () => void;
  defaultReportType?: string;
}) {
  const [reportType, setReportType] = useState(defaultReportType);
  const [frequency, setFrequency] = useState('Weekly');
  const [format, setFormat] = useState('PDF');
  const [recipients, setRecipients] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isValid = recipients.trim() !== '';

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;
    onSubmit({ reportType, frequency, format, recipients: recipients.trim() });
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
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
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
              Schedule Report
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Get this report emailed automatically on a recurring basis.
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
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Report Type
              </label>
              <FormSelect
                id="sched-report-type"
                value={reportType}
                onChange={setReportType}
                options={REPORT_TYPE_OPTIONS}
                placeholder="Select report"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                  Frequency
                </label>
                <FormSelect
                  id="sched-frequency"
                  value={frequency}
                  onChange={setFrequency}
                  options={FREQUENCY_OPTIONS}
                  placeholder="Select frequency"
                />
              </div>
              <div>
                <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                  Format
                </label>
                <FormSelect
                  id="sched-format"
                  value={format}
                  onChange={setFormat}
                  options={FORMAT_OPTIONS}
                  placeholder="Select format"
                />
              </div>
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Recipients (email addresses)
              </label>
              <input
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="e.g. labmanager@myhxcare.ng, qa@myhxcare.ng"
                className={FIELD_INPUT_CLASS}
                style={{
                  fontSize: 14,
                  border: `1px solid ${submitted && !recipients.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                  color: '#0D2630',
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.18)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
