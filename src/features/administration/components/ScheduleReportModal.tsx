'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type ReportFrequency = 'Daily' | 'Weekly' | 'Monthly';

const FREQUENCY_OPTIONS: { value: ReportFrequency; label: string }[] = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ScheduleReportModal({
  reportOptions,
  defaultReportId,
  onClose,
}: {
  reportOptions: { id: string; name: string }[];
  defaultReportId?: string | undefined;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reportId, setReportId] = useState(defaultReportId ?? reportOptions[0]?.id ?? '');
  const [frequency, setFrequency] = useState<ReportFrequency>('Daily');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectOptions = reportOptions.map((r) => ({ value: r.id, label: r.name }));
  const emailValid = EMAIL_RE.test(recipientEmail.trim());

  function handleSubmit() {
    setSubmitted(true);
    if (!emailValid) return;
    const report = reportOptions.find((r) => r.id === reportId);
    toast.success(
      'Report scheduled',
      `${report?.name ?? 'Report'} will be sent ${frequency.toLowerCase()} to ${recipientEmail.trim()}.`,
    );
    onClose();
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
        style={{ maxWidth: 480, borderRadius: 16 }}
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

        <div className="px-6 py-5">
          <div className="flex flex-col gap-4">
            <FormField label="Report" htmlFor="schedule-report-type">
              <FormSelect
                id="schedule-report-type"
                value={reportId}
                onChange={setReportId}
                options={selectOptions}
                placeholder="Select report"
              />
            </FormField>

            <FormField label="Frequency" htmlFor="schedule-report-frequency">
              <FormSelect
                id="schedule-report-frequency"
                value={frequency}
                onChange={(v) => setFrequency(v as ReportFrequency)}
                options={FREQUENCY_OPTIONS}
                placeholder="Select frequency"
              />
            </FormField>

            <FormField
              label="Recipient Email"
              htmlFor="schedule-report-email"
              required
              error={submitted && !emailValid ? 'Enter a valid email address' : undefined}
            >
              <FormInput
                id="schedule-report-email"
                type="email"
                placeholder="e.g. admin@naumc.edu.ng"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                hasError={submitted && !emailValid}
              />
            </FormField>
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
