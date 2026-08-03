'use client';

import { TestTube2, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type CollectSampleInput = {
  testIds: string[];
  sampleType: string;
  collectedAt: string; // ISO
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Laboratory Sample Collection's own collection modal — distinct from
 * nursing's own `CollectSampleModal.tsx` (different persona, different
 * folder, no import collision). Unlike the single-test nurse flow or the
 * Orders screen's blanket "collect everything pending" `ReceiveSampleModal`,
 * this lets the collector uncheck individual tests on a multi-test
 * requisition — leaving one unchecked is exactly what produces the real
 * "In Progress" (partially collected) bucket on the worklist. */
export function CollectSampleModal({
  orderId,
  patientName,
  mrn,
  pendingTests,
  defaultSampleType,
  onClose,
  onConfirm,
}: {
  orderId: string;
  patientName: string;
  mrn: string;
  pendingTests: { id: string; testName: string }[];
  defaultSampleType: string;
  onClose: () => void;
  onConfirm: (input: CollectSampleInput) => void;
}) {
  const toast = useToast();
  const [checked, setChecked] = useState<Set<string>>(new Set(pendingTests.map((t) => t.id)));
  const [sampleType, setSampleType] = useState(defaultSampleType);
  const [collectedAt, setCollectedAt] = useState(toLocalInputValue(new Date()));
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleTest(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    setSubmitted(true);
    if (checked.size === 0) {
      toast.error('No tests selected', 'Select at least one test to collect.');
      return;
    }
    if (!identityConfirmed) {
      toast.error(
        'Confirmation required',
        "Confirm the patient's identity before collecting this specimen.",
      );
      return;
    }
    onConfirm({
      testIds: Array.from(checked),
      sampleType: sampleType.trim() || defaultSampleType,
      collectedAt: new Date(collectedAt).toISOString(),
    });
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
              Start Collection
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
                Tests to collect now
              </p>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                Uncheck a test to leave it pending for a later draw.
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {pendingTests.map((t) => {
                  const isChecked = checked.has(t.id);
                  return (
                    <li key={t.id}>
                      <label
                        className="flex cursor-pointer items-center gap-2.5 rounded-[10px] p-2.5 transition-colors duration-150"
                        style={{ background: isChecked ? 'rgba(0,180,216,0.06)' : 'transparent' }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTest(t.id)}
                          className="size-4 shrink-0 accent-[#00B4D8]"
                        />
                        <span style={{ fontSize: 14, color: '#0D2630' }}>{t.testName}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <label
                htmlFor="cs-sample-type"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Sample Type
              </label>
              <input
                id="cs-sample-type"
                type="text"
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
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
                MRN) at the point of collection.
              </span>
            </label>

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
