'use client';

import { PackageCheck, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type ReceiveAtBenchInput = {
  testIds: string[];
  receivedAt: string; // ISO
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Sample Reception's own receive modal. Sample ID/Sample Type are the real,
 * already-derived values from `labOrders.ts` — shown read-only here since
 * they're not persisted fields to edit. Expected Volume and Temperature are
 * a lightweight, non-persisted confirmation checklist (no field on
 * `LabResult` backs them, and no other screen would ever read them back) —
 * same convention as the identity-confirmation checkbox elsewhere. */
export function ReceiveAtBenchModal({
  orderId,
  patientName,
  mrn,
  sampleId,
  sampleType,
  pendingTests,
  onClose,
  onConfirm,
}: {
  orderId: string;
  patientName: string;
  mrn: string;
  sampleId: string;
  sampleType: string;
  pendingTests: { id: string; testName: string }[];
  onClose: () => void;
  onConfirm: (input: ReceiveAtBenchInput) => void;
}) {
  const toast = useToast();
  const [receivedAt, setReceivedAt] = useState(toLocalInputValue(new Date()));
  const [volumeOk, setVolumeOk] = useState(false);
  const [temperatureOk, setTemperatureOk] = useState(false);
  const [integrityConfirmed, setIntegrityConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSave = volumeOk && temperatureOk && integrityConfirmed;

  function handleSubmit() {
    setSubmitted(true);
    if (!canSave) {
      toast.error(
        'Confirmation required',
        'Confirm volume, temperature, and specimen integrity before receiving.',
      );
      return;
    }
    onConfirm({
      testIds: pendingTests.map((t) => t.id),
      receivedAt: new Date(receivedAt).toISOString(),
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
              Receive Sample
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

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Sample ID</span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {sampleId}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Sample Type</span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {sampleType}
                </span>
              </div>
            </div>

            <div>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Tests on this specimen ({pendingTests.length})
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

            <label
              className="flex items-start gap-2.5 rounded-[10px] p-3"
              style={{
                background: 'rgba(0,180,216,0.06)',
                border: `1px solid ${submitted && !volumeOk ? '#EF4444' : 'rgba(0,180,216,0.25)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={volumeOk}
                onChange={(e) => setVolumeOk(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[#00B4D8]"
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                Volume is sufficient for the tests ordered.
              </span>
            </label>

            <label
              className="flex items-start gap-2.5 rounded-[10px] p-3"
              style={{
                background: 'rgba(0,180,216,0.06)',
                border: `1px solid ${submitted && !temperatureOk ? '#EF4444' : 'rgba(0,180,216,0.25)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={temperatureOk}
                onChange={(e) => setTemperatureOk(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[#00B4D8]"
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                Specimen arrived within the required temperature range.
              </span>
            </label>

            <label
              className="flex items-start gap-2.5 rounded-[10px] p-3"
              style={{
                background: 'rgba(0,180,216,0.06)',
                border: `1px solid ${submitted && !integrityConfirmed ? '#EF4444' : 'rgba(0,180,216,0.25)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={integrityConfirmed}
                onChange={(e) => setIntegrityConfirmed(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[#00B4D8]"
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                Specimen labeling matches the patient&apos;s identity — no leakage or contamination.
              </span>
            </label>

            <div>
              <label
                htmlFor="rb-time"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Received Date &amp; Time
              </label>
              <input
                id="rb-time"
                type="datetime-local"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
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
            <PackageCheck style={{ width: 15, height: 15 }} />
            Confirm Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
