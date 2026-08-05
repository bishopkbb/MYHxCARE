'use client';

import { Printer, X } from 'lucide-react';

import { formatDateTime } from '@/utils/datetime';
import type { LabResult } from '@/features/laboratory/__mocks__/labResultFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FLAG_STYLE: Record<'H' | 'L' | 'A', { background: string; color: string }> = {
  H: { background: 'rgba(239,68,68,0.12)', color: '#DC2626' },
  L: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
  A: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
};

/** Published Results' read-only report — every published test's final
 * values plus who verified it and when, reusing the same per-row display
 * shape `VerifyResultModal` uses (no checklist/confirm action here, since
 * this screen never writes; it only ever shows what already happened). */
export function PublishedReportModal({
  orderId,
  patientName,
  mrn,
  tests,
  onClose,
  onPrint,
}: {
  orderId: string;
  patientName: string;
  mrn: string;
  tests: LabResult[];
  onClose: () => void;
  onPrint: () => void;
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
        style={{ maxWidth: 640, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              Published Result Report
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {orderId} — {patientName} · {mrn}
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
            {tests.map((test) => (
              <div
                key={test.id}
                className="overflow-hidden rounded-[10px]"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="px-3.5 py-2" style={{ background: '#F5FBFD' }}>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {test.testName}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{test.department}</p>
                </div>
                <div className="flex flex-col">
                  {(test.rows ?? []).map((row) => (
                    <div
                      key={row.parameter}
                      className="flex items-center gap-3 px-3.5 py-2"
                      style={{ borderTop: '1px solid rgba(0,100,130,0.06)' }}
                    >
                      <span
                        className="min-w-0 flex-1 truncate"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {row.parameter}
                      </span>
                      <span
                        className="shrink-0 font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {row.value}
                        {row.unit ? ` ${row.unit}` : ''}
                      </span>
                      <span
                        className="w-28 shrink-0 text-right"
                        style={{ fontSize: 14, color: '#8A98A3' }}
                      >
                        Ref: {row.reference}
                      </span>
                      {row.flag && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 font-sans font-semibold"
                          style={{ fontSize: 13, ...FLAG_STYLE[row.flag] }}
                        >
                          {row.flag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {test.comment && (
                  <p
                    className="px-3.5 py-2"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      borderTop: '1px solid rgba(0,100,130,0.06)',
                    }}
                  >
                    {test.comment}
                  </p>
                )}
                {test.doctorReviewedAt && (
                  <p
                    className="px-3.5 py-2"
                    style={{
                      fontSize: 14,
                      color: '#4A7080',
                      borderTop: '1px solid rgba(0,100,130,0.06)',
                    }}
                  >
                    Verified by {test.doctorReviewedBy} — {formatDateTime(test.doctorReviewedAt)}
                  </p>
                )}
              </div>
            ))}
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
            Close
          </button>
          <button
            type="button"
            onClick={onPrint}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <Printer style={{ width: 15, height: 15 }} />
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}
