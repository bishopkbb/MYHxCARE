'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { ReconciliationRow } from './PaymentReconciliationWorkspace';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function LinkPaymentModal({
  unmatchedRow,
  pendingRows,
  onClose,
  onLink,
}: {
  unmatchedRow: ReconciliationRow;
  pendingRows: ReconciliationRow[];
  onClose: () => void;
  onLink: (targetPendingRowId: string) => void;
}) {
  const [targetId, setTargetId] = useState(() => pendingRows[0]?.id ?? '');
  const target = pendingRows.find((r) => r.id === targetId);
  const canSubmit = !!target;

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
        style={{ maxWidth: 460, borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
              Link to Payment
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {unmatchedRow.sourceRef} · {formatCurrencyWhole(unmatchedRow.sourceAmount)}
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

        {pendingRows.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p style={{ fontSize: 14, color: '#4A7080' }}>
              There are no pending system payments to link this transaction to right now.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 px-6 py-5">
            <p style={{ fontSize: 14, color: '#4A7080' }}>
              Match this bank/POS transaction to a system payment that&apos;s awaiting
              reconciliation.
            </p>
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Pending System Payment
              </label>
              <FormSelect
                id="link-payment-target"
                value={targetId}
                onChange={setTargetId}
                options={pendingRows.map((r) => ({
                  value: r.id,
                  label: `${r.systemPaymentNumber} — ${r.patientName ?? 'Unknown'} — ${formatCurrencyWhole(r.systemAmount ?? r.sourceAmount)}`,
                }))}
                placeholder="Select a pending payment"
              />
            </div>
            {target && (
              <div
                className="flex flex-col gap-2 rounded-[10px] p-3"
                style={{ background: '#F5FBFD' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Invoice No.</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {target.invoiceNumber ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Payment Date</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {formatHumanDate(target.date)}, {formatTime(target.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Amount</span>
                  <span
                    className="font-sans font-semibold"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {formatCurrencyWhole(target.systemAmount ?? 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

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
            onClick={() => target && onLink(target.id)}
            disabled={!canSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 ${canSubmit ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'} ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Link Transaction
          </button>
        </div>
      </div>
    </div>
  );
}
