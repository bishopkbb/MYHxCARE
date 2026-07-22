'use client';

import { Lock, X } from 'lucide-react';

import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { LabTestOrder } from '@/features/nursing/__mocks__/laboratoryFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FLAG_COLOR: Record<string, string> = {
  H: '#DC2626',
  L: '#6366F1',
  A: '#D97706',
};

const RESULT_FLAG_CFG: Record<string, { color: string; border: string; bg: string }> = {
  Normal: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  Abnormal: { color: '#D97706', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Critical: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
      <span className="text-right font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value}
      </span>
    </div>
  );
}

export function LabResultDetailModal({
  order,
  onClose,
}: {
  order: LabTestOrder;
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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              {order.testName}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {order.patientName} · MRN: {order.mrn}
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
            <div
              className="flex flex-col gap-2 rounded-[10px] p-3.5"
              style={{ background: '#F5FBFD' }}
            >
              <Row label="Department" value={order.department} />
              <Row label="Priority" value={order.priority} />
              <Row label="Ordered By" value={order.orderedBy} />
              <Row
                label="Ordered At"
                value={`${formatHumanDate(order.orderedAt)}, ${formatTime(order.orderedAt)}`}
              />
              {order.sampleCollectedAt && (
                <Row
                  label="Sample Collected"
                  value={`${formatHumanDate(order.sampleCollectedAt)}, ${formatTime(order.sampleCollectedAt)} — ${order.sampleCollectedBy}`}
                />
              )}
              <Row label="Status" value={order.status} />
            </div>

            {order.rejectionReason && (
              <div
                className="rounded-[10px] p-3.5"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#EF4444' }}>
                  Sample Rejected
                </p>
                <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                  {order.rejectionReason}
                </p>
              </div>
            )}

            {order.status === 'Completed' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Result
                  </h3>
                  {order.resultFlag && (
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-semibold whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: RESULT_FLAG_CFG[order.resultFlag]!.color,
                        border: `1px solid ${RESULT_FLAG_CFG[order.resultFlag]!.border}`,
                        background: RESULT_FLAG_CFG[order.resultFlag]!.bg,
                      }}
                    >
                      {order.resultFlag}
                    </span>
                  )}
                </div>

                {order.resultRows && order.resultRows.length > 0 && (
                  <div className="overflow-x-auto scroll-smooth">
                    <div className="min-w-[420px]">
                      <div
                        className="flex"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.1)' }}
                      >
                        {['Parameter', 'Value', 'Reference'].map((h) => (
                          <div key={h} className="min-w-0 flex-1 py-2 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              {h}
                            </span>
                          </div>
                        ))}
                      </div>
                      {order.resultRows.map((r) => (
                        <div
                          key={r.parameter}
                          className="flex"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
                        >
                          <div className="min-w-0 flex-1 py-2.5 pr-2">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>{r.parameter}</p>
                          </div>
                          <div className="min-w-0 flex-1 py-2.5 pr-2">
                            <p
                              className="font-sans font-medium"
                              style={{
                                fontSize: 14,
                                color: r.flag ? FLAG_COLOR[r.flag] : '#0D2630',
                              }}
                            >
                              {r.value}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1 py-2.5 pr-2">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{r.reference}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.resultComment && (
                  <div
                    className="rounded-[10px] p-3.5"
                    style={{
                      background:
                        order.resultFlag === 'Critical' ? 'rgba(239,68,68,0.06)' : '#F5FBFD',
                    }}
                  >
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{order.resultComment}</p>
                  </div>
                )}

                {order.resultFlag === 'Critical' && (
                  <div
                    className="rounded-[10px] p-3.5"
                    style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Critical Value Notification
                    </p>
                    {order.criticalAcknowledgedAt ? (
                      <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                        Read back and notified to {order.criticalAcknowledgedBy} on{' '}
                        {formatHumanDate(order.criticalAcknowledgedAt)},{' '}
                        {formatTime(order.criticalAcknowledgedAt)}.
                      </p>
                    ) : (
                      <p className="mt-0.5" style={{ fontSize: 14, color: '#EF4444' }}>
                        Not yet acknowledged — notify the ordering doctor immediately.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-between gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <span className="flex items-center gap-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
            <Lock style={{ width: 13, height: 13 }} />
            View only — results cannot be edited by nursing staff.
          </span>
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
