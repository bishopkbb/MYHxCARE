'use client';

import { AlertTriangle, TestTube2, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type SampleCollectionInput = {
  collectedAt: string; // ISO
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CollectSampleModal({
  patientName,
  mrn,
  testName,
  fastingRequired,
  isRecollection,
  onClose,
  onConfirm,
}: {
  patientName: string;
  mrn: string;
  testName: string;
  fastingRequired: boolean;
  isRecollection?: boolean;
  onClose: () => void;
  onConfirm: (input: SampleCollectionInput) => void;
}) {
  const toast = useToast();
  const [collectedAt, setCollectedAt] = useState(toLocalInputValue(new Date()));
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [fastingConfirmed, setFastingConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSave = identityConfirmed && (!fastingRequired || fastingConfirmed);

  function handleSubmit() {
    setSubmitted(true);
    if (!canSave) {
      toast.error(
        'Confirmation required',
        'Confirm the patient’s identity' +
          (fastingRequired ? ' and fasting status' : '') +
          ' before collecting.',
      );
      return;
    }
    onConfirm({ collectedAt: new Date(collectedAt).toISOString() });
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
              {isRecollection ? 'Recollect Sample' : 'Collect Sample'}
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
              style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                {patientName}
              </p>
              <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {mrn}</p>
            </div>

            <label
              className="flex items-start gap-2.5 rounded-[10px] p-3"
              style={{
                background: 'rgba(0,180,216,0.06)',
                border: `1px solid ${submitted && !identityConfirmed ? '#EF4444' : 'rgba(0,180,216,0.25)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={identityConfirmed}
                onChange={(e) => setIdentityConfirmed(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[#00B4D8]"
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                I have verified this patient&apos;s identity using two identifiers (full name and
                MRN) at the bedside before collecting this sample.
              </span>
            </label>

            {fastingRequired && (
              <label
                className="flex items-start gap-2.5 rounded-[10px] p-3"
                style={{
                  background: 'rgba(245,158,11,0.06)',
                  border: `1px solid ${submitted && !fastingConfirmed ? '#EF4444' : 'rgba(245,158,11,0.3)'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={fastingConfirmed}
                  onChange={(e) => setFastingConfirmed(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[#F59E0B]"
                />
                <span style={{ fontSize: 14, color: '#0D2630' }}>
                  <AlertTriangle
                    style={{
                      width: 14,
                      height: 14,
                      color: '#F59E0B',
                      display: 'inline',
                      marginRight: 4,
                    }}
                  />
                  This test requires fasting — I have confirmed the patient has fasted as required.
                </span>
              </label>
            )}

            {isRecollection && (
              <p style={{ fontSize: 14, color: '#EF4444' }}>
                The previous sample was rejected by the laboratory. Collect a fresh sample.
              </p>
            )}

            <div>
              <label
                htmlFor="cs-time"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Collection Date &amp; Time
              </label>
              <input
                id="cs-time"
                type="datetime-local"
                value={collectedAt}
                onChange={(e) => setCollectedAt(e.target.value)}
                className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
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
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <TestTube2 style={{ width: 15, height: 15 }} />
            Confirm Collection
          </button>
        </div>
      </div>
    </div>
  );
}
