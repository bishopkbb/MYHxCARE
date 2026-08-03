'use client';

import { PauseCircle, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type HoldTestInput = {
  testIds: string[];
  reason: string;
};

const COMMON_REASONS = [
  'Reagent shortage',
  'Instrument down',
  'Awaiting recollection confirmation',
  'QC failure — repeat needed',
  'Awaiting supervisor review',
];

/** Test Work Queue's pause action — a real, distinct state from Sample
 * Reception's reject (the specimen is fine, the *work* is paused). */
export function HoldTestModal({
  orderId,
  patientName,
  mrn,
  pendingTests,
  onClose,
  onConfirm,
}: {
  orderId: string;
  patientName: string;
  mrn: string;
  pendingTests: { id: string; testName: string }[];
  onClose: () => void;
  onConfirm: (input: HoldTestInput) => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
    if (!reason.trim()) {
      toast.error('Reason required', 'Explain why this test is being put on hold.');
      return;
    }
    onConfirm({ testIds: pendingTests.map((t) => t.id), reason: reason.trim() });
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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              Put On Hold
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {orderId}
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
              className="rounded-[10px] px-3.5 py-3"
              style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                {patientName}
              </p>
              <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {mrn}</p>
            </div>

            <div>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Tests affected ({pendingTests.length})
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {pendingTests.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    <span
                      className="shrink-0 rounded-full"
                      style={{ width: 5, height: 5, background: '#00B4D8' }}
                    />
                    {t.testName}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label
                htmlFor="ht-reason"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Reason for hold
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {COMMON_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`rounded-full px-2.5 py-1 font-sans transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: reason === r ? '#FFFFFF' : '#4A7080',
                      background: reason === r ? '#D97706' : 'rgba(0,100,130,0.06)',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                id="ht-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for the hold"
                className={`mt-2 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/30 focus:outline-none ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  color: '#0D2630',
                  border: `1px solid ${submitted && !reason.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                }}
              />
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
            style={{ fontSize: 14, background: '#D97706' }}
          >
            <PauseCircle style={{ width: 15, height: 15 }} />
            Confirm Hold
          </button>
        </div>
      </div>
    </div>
  );
}
