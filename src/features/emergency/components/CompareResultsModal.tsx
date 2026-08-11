'use client';

import { X } from 'lucide-react';

import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { LabResult } from '@/features/laboratory/store/labResultStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function CompareResultsModal({
  results,
  onClose,
}: {
  results: [LabResult, LabResult];
  onClose: () => void;
}) {
  const [newer, older] = results;
  const parameters = Array.from(
    new Set([...(newer.rows ?? []), ...(older.rows ?? [])].map((r) => r.parameter)),
  );

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
        style={{ maxWidth: 640, borderRadius: 16, maxHeight: '85vh' }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
              Compare Results
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {newer.testName}
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

        <div className="overflow-y-auto scroll-smooth px-6 py-5">
          <div
            className="grid grid-cols-3 gap-2 border-b pb-2"
            style={{ borderColor: 'rgba(0,100,130,0.12)' }}
          >
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Parameter</span>
            <span className="text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
              {older.resultAt ? formatHumanDate(older.resultAt) : formatHumanDate(older.orderedAt)}
              <br />
              {older.resultAt ? formatTime(older.resultAt) : formatTime(older.orderedAt)}
            </span>
            <span className="text-right" style={{ fontSize: 14, color: '#00B4D8' }}>
              {newer.resultAt ? formatHumanDate(newer.resultAt) : formatHumanDate(newer.orderedAt)}
              <br />
              {newer.resultAt ? formatTime(newer.resultAt) : formatTime(newer.orderedAt)}
            </span>
          </div>
          {parameters.map((param) => {
            const olderRow = older.rows?.find((r) => r.parameter === param);
            const newerRow = newer.rows?.find((r) => r.parameter === param);
            return (
              <div
                key={param}
                className="grid grid-cols-3 items-center gap-2 py-2.5"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
              >
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {param}
                </span>
                <span className="text-right" style={{ fontSize: 14, color: '#4A7080' }}>
                  {olderRow ? `${olderRow.value} ${olderRow.unit ?? ''}`.trim() : '—'}
                </span>
                <span
                  className="text-right font-sans font-semibold"
                  style={{
                    fontSize: 14,
                    color:
                      newerRow?.flag === 'H'
                        ? '#DC2626'
                        : newerRow?.flag === 'L'
                          ? '#2563EB'
                          : '#0D2630',
                  }}
                >
                  {newerRow ? `${newerRow.value} ${newerRow.unit ?? ''}`.trim() : '—'}
                </span>
              </div>
            );
          })}
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
