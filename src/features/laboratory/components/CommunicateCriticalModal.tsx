'use client';

import { PhoneCall, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type CommunicateCriticalInput = { method: string; note: string };

const COMMON_METHODS = [
  'Called ward directly',
  'Texted physician',
  'Left message with charge nurse',
  'Notified via EMR',
];

/** Critical Results' own primary action — the lab's own "I called/paged the
 * ward about this" step, distinct from the nurse's own downstream
 * acknowledgment (a different modal, on a different screen). */
export function CommunicateCriticalModal({
  testName,
  patientName,
  mrn,
  criticalValueLabel,
  onClose,
  onConfirm,
}: {
  testName: string;
  patientName: string;
  mrn: string;
  criticalValueLabel: string | undefined;
  onClose: () => void;
  onConfirm: (input: CommunicateCriticalInput) => void;
}) {
  const toast = useToast();
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
    if (!method) {
      toast.error('Method required', 'Select how the ward was notified.');
      return;
    }
    onConfirm({ method, note: note.trim() });
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
              Acknowledge &amp; Communicate
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {testName}
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
              style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                {patientName}
              </p>
              <p style={{ fontSize: 14, color: '#4A7080' }}>MRN: {mrn}</p>
              {criticalValueLabel && (
                <p
                  className="mt-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#DC2626' }}
                >
                  {criticalValueLabel}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="cc-method"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                How was the ward notified?
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {COMMON_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-full px-2.5 py-1 font-sans transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: method === m ? '#FFFFFF' : '#4A7080',
                      background: method === m ? '#EF4444' : 'rgba(0,100,130,0.06)',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {submitted && !method && (
                <p className="mt-1.5" style={{ fontSize: 14, color: '#EF4444' }}>
                  Select a notification method.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="cc-note"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Note (optional)
              </label>
              <textarea
                id="cc-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Who you spoke to, any instructions given…"
                className={`mt-1.5 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/30 focus:outline-none ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.18)' }}
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
            <PhoneCall style={{ width: 15, height: 15 }} />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
