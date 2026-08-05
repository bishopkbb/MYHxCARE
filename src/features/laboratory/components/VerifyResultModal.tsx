'use client';

import { AlertTriangle, Check, CheckCircle2, X } from 'lucide-react';

import type { LabResult } from '@/features/laboratory/__mocks__/labResultFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type ChecklistItem = { key: string; label: string; passed: boolean; blocking: boolean };

const FLAG_STYLE: Record<'H' | 'L' | 'A', { background: string; color: string }> = {
  H: { background: 'rgba(239,68,68,0.12)', color: '#DC2626' },
  L: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
  A: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
};

/** Result Verification's final look before sign-off — every awaiting test's
 * already-entered values shown read-only (this screen never edits a result,
 * only signs off on it), the same checklist the right rail shows, and the
 * one real gate: `canVerify` (computed from the checklist's blocking items
 * in the parent, not re-derived here) disables "Confirm & Verify". */
export function VerifyResultModal({
  orderId,
  patientName,
  mrn,
  tests,
  checklist,
  canVerify,
  onClose,
  onConfirm,
}: {
  orderId: string;
  patientName: string;
  mrn: string;
  tests: LabResult[];
  checklist: ChecklistItem[];
  canVerify: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
              Review &amp; Verify Result
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
              </div>
            ))}

            <div
              className="rounded-[10px] p-3.5"
              style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                Verification Checklist
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {checklist.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    {item.passed ? (
                      <CheckCircle2 style={{ width: 16, height: 16, color: '#22C55E' }} />
                    ) : (
                      <AlertTriangle
                        style={{
                          width: 16,
                          height: 16,
                          color: item.blocking ? '#EF4444' : '#F59E0B',
                        }}
                      />
                    )}
                    <span style={{ fontSize: 14, color: item.passed ? '#0D2630' : '#4A7080' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              {!canVerify && (
                <p className="mt-2.5" style={{ fontSize: 14, color: '#EF4444' }}>
                  Resolve the items above marked in red before this result can be verified.
                </p>
              )}
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
            onClick={onConfirm}
            disabled={!canVerify}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 ${canVerify ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'} ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <Check style={{ width: 15, height: 15 }} />
            Confirm &amp; Verify
          </button>
        </div>
      </div>
    </div>
  );
}
