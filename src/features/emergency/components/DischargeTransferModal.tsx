'use client';

import { ArrowRightLeft, DoorOpen, Home, X } from 'lucide-react';
import { useState } from 'react';

import type { ObservationOutcome } from '@/features/emergency/store/observationStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const OUTCOMES: { value: ObservationOutcome; label: string; icon: typeof Home; desc: string }[] = [
  {
    value: 'Discharged',
    label: 'Discharge Home',
    icon: Home,
    desc: 'Patient is stable and fit to go home.',
  },
  {
    value: 'Admitted',
    label: 'Admit to Ward',
    icon: DoorOpen,
    desc: 'Patient needs ongoing inpatient care.',
  },
  {
    value: 'Transferred',
    label: 'Transfer Out',
    icon: ArrowRightLeft,
    desc: 'Patient is moving to another facility/unit.',
  },
];

export function DischargeTransferModal({
  patientName,
  bay,
  slotLabel,
  onClose,
  onConfirm,
}: {
  patientName: string;
  bay: string;
  slotLabel: string;
  onClose: () => void;
  onConfirm: (outcome: ObservationOutcome, note: string) => void;
}) {
  const [outcome, setOutcome] = useState<ObservationOutcome>('Discharged');
  const [note, setNote] = useState('');

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
              Discharge / Transfer
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {patientName} · {bay} / {slotLabel}
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

        <div className="flex flex-col gap-2.5 px-6 py-5">
          {OUTCOMES.map((o) => {
            const isSelected = outcome === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setOutcome(o.value)}
                className={`flex items-start gap-3 rounded-[10px] p-3.5 text-left transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  border: isSelected ? '1px solid #00B4D8' : '1px solid rgba(0,100,130,0.18)',
                  background: isSelected ? 'rgba(0,180,216,0.06)' : '#FFFFFF',
                }}
              >
                <o.icon
                  style={{ width: 18, height: 18, color: isSelected ? '#00B4D8' : '#4A7080' }}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {o.label}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{o.desc}</p>
                </div>
              </button>
            );
          })}

          <div className="mt-1">
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => e.target.value.length <= 300 && setNote(e.target.value)}
              rows={2}
              placeholder="Add any disposition notes..."
              className={`w-full resize-none rounded-[10px] p-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
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
            onClick={() => onConfirm(outcome, note.trim())}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#0D2630' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
