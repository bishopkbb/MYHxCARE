'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { formatCurrencyWhole } from '@/utils/currency';
import {
  REFUND_REASONS,
  type PaymentWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

export function RecordRefundModal({
  payment,
  onClose,
  onRecord,
}: {
  payment: PaymentWithAccount;
  onClose: () => void;
  onRecord: (amount: number, reason: string) => void;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [reason, setReason] = useState(REFUND_REASONS[0] ?? 'Overpayment');
  const [note, setNote] = useState('');

  const numericAmount = Number(amount);
  const canSubmit = numericAmount > 0 && numericAmount <= payment.amount;

  function handleSubmit() {
    if (!canSubmit) return;
    onRecord(numericAmount, note.trim() || reason);
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
        style={{ maxWidth: 460, borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
              Record Refund
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {payment.paymentNumber} · {payment.patientName}
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

        <div className="flex flex-col gap-3.5 px-6 py-5">
          <div
            className="flex items-center justify-between gap-2 rounded-[10px] p-3"
            style={{ background: '#F5FBFD' }}
          >
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Amount Paid</span>
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {formatCurrencyWhole(payment.amount)}
            </span>
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Refund Amount (₦)
            </label>
            <input
              type="number"
              min={1}
              max={payment.amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
            {numericAmount > payment.amount && (
              <p className="mt-1" style={{ fontSize: 14, color: '#DC2626' }}>
                Cannot exceed the amount paid.
              </p>
            )}
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Reason
            </label>
            <FormSelect
              id="record-refund-reason"
              value={reason}
              onChange={setReason}
              options={REFUND_REASONS.map((r) => ({ value: r, label: r }))}
              placeholder="Select reason"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional detail for the audit trail"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
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
            disabled={!canSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 ${canSubmit ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'} ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Record Refund
          </button>
        </div>
      </div>
    </div>
  );
}
