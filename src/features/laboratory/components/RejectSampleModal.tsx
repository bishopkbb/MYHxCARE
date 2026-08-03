'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type RejectSampleInput = {
  testIds: string[];
  reason: string;
};

const COMMON_REASONS = [
  'Insufficient sample volume',
  'Hemolyzed specimen',
  'Clotted specimen',
  'Incorrect tube/container',
  'Mislabeled or unlabeled specimen',
  'Specimen leaked in transit',
];

/** Sample Reception's reject action — the forward direction of a real state
 * transition (`SAMPLE_COLLECTED` → `REJECTED`) that nothing in the app ever
 * drove live before this screen; the nurse's own "Recollect Sample" already
 * handles the reverse. */
export function RejectSampleModal({
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
  onConfirm: (input: RejectSampleInput) => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
    if (!reason.trim()) {
      toast.error('Reason required', 'Explain why this specimen is being rejected.');
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
              Reject Sample
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

            <div
              className="flex items-start gap-2.5 rounded-[10px] p-3"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <AlertTriangle
                style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0, marginTop: 2 }}
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                Rejecting notifies the ordering team a fresh sample is needed. This applies to all{' '}
                {pendingTests.length} test{pendingTests.length === 1 ? '' : 's'} on this specimen.
              </span>
            </div>

            <div>
              <label
                htmlFor="rj-reason"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Reason for rejection
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
                      background: reason === r ? '#EF4444' : 'rgba(0,100,130,0.06)',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                id="rj-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for rejection"
                className={`mt-2 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/30 focus:outline-none ${FOCUS_RING}`}
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
            style={{ fontSize: 14, background: '#EF4444' }}
          >
            <X style={{ width: 15, height: 15 }} />
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}
