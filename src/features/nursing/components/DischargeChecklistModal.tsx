'use client';

import { CheckCircle2, X } from 'lucide-react';

import { DISCHARGE_STEPS } from '@/features/nursing/__mocks__/dischargesFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: 'The attending doctor writes and confirms the discharge order.',
  2: 'Discharge medications are reconciled against current orders and take-home prescriptions are issued.',
  3: 'The patient (and caregiver, where relevant) receives and understands discharge instructions — medication, wound, diet, and activity guidance.',
  4: 'Any outstanding labs or imaging are reviewed and confirmed clear before the patient can leave.',
  5: 'The discharge summary and any referral letters are completed in the patient record.',
  6: 'A follow-up appointment is booked and transport or family pickup is confirmed.',
  7: 'The patient physically leaves the ward and the bed is handed to Bed Management for cleaning.',
};

export function DischargeChecklistModal({ onClose }: { onClose: () => void }) {
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
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Discharge Checklist
          </h2>
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
            {DISCHARGE_STEPS.map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
                  style={{ fontSize: 14, color: '#00B4D8', background: 'rgba(0,180,216,0.1)' }}
                >
                  {s.step}
                </div>
                <div className="min-w-0">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {s.label}
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>{STEP_DESCRIPTIONS[s.step]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <CheckCircle2 style={{ width: 15, height: 15 }} />
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
