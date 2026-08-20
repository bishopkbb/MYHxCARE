'use client';

import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

import { formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { ReconciliationRow, ReconciliationStatus } from './PaymentReconciliationWorkspace';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<ReconciliationStatus, { color: string; bg: string }> = {
  Matched: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Unmatched: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Pending: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Exception: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};

export function ReconciliationDetailModal({
  row,
  onClose,
  onMarkMatched,
  onFlagException,
}: {
  row: ReconciliationRow;
  onClose: () => void;
  onMarkMatched: () => void;
  onFlagException: () => void;
}) {
  const cfg = STATUS_CFG[row.status];

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
        style={{ maxWidth: 520, borderRadius: 16, maxHeight: '85vh' }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
                {row.sourceRef}
              </h2>
              <span
                className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
              >
                {row.status}
              </span>
            </div>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {formatHumanDate(row.date)}, {formatTime(row.date)}
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
          {row.exceptionReason && (
            <div
              className="mb-4 flex items-start gap-2 rounded-[10px] p-3"
              style={{ background: 'rgba(220,38,38,0.08)' }}
            >
              <AlertTriangle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0 }} />
              <p style={{ fontSize: 14, color: '#0D2630' }}>{row.exceptionReason}</p>
            </div>
          )}

          <p className="font-display font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            Source Transaction
          </p>
          <div
            className="mt-2 flex flex-col gap-2 rounded-[10px] p-3"
            style={{ background: '#F5FBFD' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Reference</span>
              <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {row.sourceRef}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Description</span>
              <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {row.sourceDescription}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Method</span>
              <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {row.method}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Amount</span>
              <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                {formatCurrencyWhole(row.sourceAmount)}
              </span>
            </div>
          </div>

          <p className="font-display mt-4 font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            System Payment
          </p>
          {row.systemPaymentNumber ? (
            <div
              className="mt-2 flex flex-col gap-2 rounded-[10px] p-3"
              style={{ background: '#F5FBFD' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Payment No.</span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {row.systemPaymentNumber}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Invoice No.</span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {row.invoiceNumber ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Patient</span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {row.patientName ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Amount</span>
                <span
                  className="font-sans font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {row.systemAmount !== undefined ? formatCurrencyWhole(row.systemAmount) : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-[10px] p-3" style={{ background: '#F5FBFD' }}>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                No matching system payment was found for this transaction.
              </p>
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 px-6 py-4"
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
          {row.status === 'Matched' && (
            <button
              type="button"
              onClick={onFlagException}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#FDECEC] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}
            >
              <AlertTriangle style={{ width: 15, height: 15 }} />
              Flag Exception
            </button>
          )}
          {(row.status === 'Pending' || row.status === 'Exception') && (
            <button
              type="button"
              onClick={onMarkMatched}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <CheckCircle2 style={{ width: 15, height: 15 }} />
              Mark as Matched
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
