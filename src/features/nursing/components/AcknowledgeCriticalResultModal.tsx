'use client';

import { PhoneCall, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type CriticalAcknowledgementInput = {
  notifiedDoctor: string;
  notes: string;
};

export function AcknowledgeCriticalResultModal({
  patientName,
  mrn,
  testName,
  criticalValueLabel,
  orderedBy,
  onClose,
  onConfirm,
}: {
  patientName: string;
  mrn: string;
  testName: string;
  criticalValueLabel: string;
  orderedBy: string;
  onClose: () => void;
  onConfirm: (input: CriticalAcknowledgementInput) => void;
}) {
  const toast = useToast();
  const [notifiedDoctor, setNotifiedDoctor] = useState(orderedBy);
  const [notes, setNotes] = useState('');
  const [readBackConfirmed, setReadBackConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSave = readBackConfirmed && notifiedDoctor.trim() !== '';

  function handleSubmit() {
    setSubmitted(true);
    if (!canSave) {
      toast.error(
        'Confirmation required',
        'Confirm the read-back and name the doctor notified before continuing.',
      );
      return;
    }
    onConfirm({ notifiedDoctor: notifiedDoctor.trim(), notes: notes.trim() });
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
          style={{ background: '#FEF2F2', borderBottom: '1px solid #FFC9C9' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(239,68,68,0.12)' }}
            >
              <ShieldAlert style={{ width: 20, height: 20, color: '#EF4444' }} />
            </div>
            <div>
              <h2
                className="font-display font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
              >
                Acknowledge Critical Result
              </h2>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                {testName}
              </p>
            </div>
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
              className="rounded-[10px] px-3.5 py-3"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Critical Value</p>
              <p className="font-display font-bold" style={{ fontSize: 18, color: '#EF4444' }}>
                {criticalValueLabel}
              </p>
            </div>

            <label
              className="flex items-start gap-2.5 rounded-[10px] p-3"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: `1px solid ${submitted && !readBackConfirmed ? '#EF4444' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={readBackConfirmed}
                onChange={(e) => setReadBackConfirmed(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[#EF4444]"
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                I have called the ordering doctor, read back this critical value to confirm it was
                heard correctly, and documented the notification below.
              </span>
            </label>

            <div>
              <label
                htmlFor="ack-doctor"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Doctor Notified
              </label>
              <input
                id="ack-doctor"
                type="text"
                value={notifiedDoctor}
                onChange={(e) => setNotifiedDoctor(e.target.value)}
                className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>

            <div>
              <label
                htmlFor="ack-notes"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Notes (optional)
              </label>
              <textarea
                id="ack-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                rows={3}
                maxLength={300}
                placeholder="e.g. New orders received to repeat U&E in 2 hours."
                className={`mt-1.5 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
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
            Confirm Notification
          </button>
        </div>
      </div>
    </div>
  );
}
