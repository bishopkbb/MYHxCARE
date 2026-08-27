'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type CustomReportParams = {
  reportId: string;
  dateFrom: string;
  dateTo: string;
};

export function CreateCustomReportModal({
  reportOptions,
  defaultDateFrom,
  defaultDateTo,
  onClose,
  onGenerate,
}: {
  reportOptions: { id: string; name: string }[];
  defaultDateFrom: string;
  defaultDateTo: string;
  onClose: () => void;
  onGenerate: (params: CustomReportParams) => void;
}) {
  const [reportId, setReportId] = useState(reportOptions[0]?.id ?? '');
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);

  const selectOptions = reportOptions.map((r) => ({ value: r.id, label: r.name }));

  function handleSubmit() {
    onGenerate({ reportId, dateFrom, dateTo });
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
            Create Custom Report
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
            <FormField label="Report Type" htmlFor="custom-report-type">
              <FormSelect
                id="custom-report-type"
                value={reportId}
                onChange={setReportId}
                options={selectOptions}
                placeholder="Select report type"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="From" htmlFor="custom-report-from">
                <FormDateInput
                  id="custom-report-from"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </FormField>
              <FormField label="To" htmlFor="custom-report-to">
                <FormDateInput
                  id="custom-report-to"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </FormField>
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
            Generate & Download
          </button>
        </div>
      </div>
    </div>
  );
}
