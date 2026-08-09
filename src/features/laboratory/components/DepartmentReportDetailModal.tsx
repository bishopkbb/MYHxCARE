'use client';

import { X } from 'lucide-react';

import {
  formatMinutes,
  type DepartmentReportRow,
  type ReportPeriod,
} from '@/features/laboratory/__mocks__/laboratoryReportsFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Read-only breakdown for a single department row — opened from the
 * Report Summary table's eye icon. Lazy-loaded (checklist §14). */
export function DepartmentReportDetailModal({
  row,
  period,
  onClose,
}: {
  row: DepartmentReportRow;
  period: ReportPeriod;
  onClose: () => void;
}) {
  const rejectRate =
    row.samplesReceived > 0 ? (row.rejectedSamples / row.samplesReceived) * 100 : 0;

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
              {row.department}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {period}
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
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Total Tests', row.totalTests.toLocaleString('en-GB'), '#0D2630'],
              ['Samples Received', row.samplesReceived.toLocaleString('en-GB'), '#0D2630'],
              ['Results Published', row.resultsPublished.toLocaleString('en-GB'), '#0D2630'],
              ['Pending Results', row.pendingResults.toLocaleString('en-GB'), '#D97706'],
              ['Rejected Samples', row.rejectedSamples.toLocaleString('en-GB'), '#DC2626'],
              [
                'Critical Results',
                row.criticalResults.toLocaleString('en-GB'),
                row.criticalResults > 0 ? '#DC2626' : '#8A98A3',
              ],
              ['Avg TAT', formatMinutes(row.avgTatMinutes), '#0D2630'],
              ['On-time %', `${row.onTimePct.toFixed(1)}%`, '#16A34A'],
            ].map(([label, value, color]) => (
              <div
                key={label}
                className="rounded-[10px] p-3"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
              >
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
                <p className="font-display mt-1 font-bold" style={{ fontSize: 18, color }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-4 flex items-center justify-between gap-2 rounded-[10px] p-3"
            style={{ background: 'rgba(0,180,216,0.06)' }}
          >
            <span style={{ fontSize: 14, color: '#0D2630' }}>Sample rejection rate</span>
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {rejectRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
