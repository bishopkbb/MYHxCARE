'use client';

import { GlassWater, X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export type FluidBalanceEntry = {
  intakeMl: number;
  outputMl: number;
  note: string;
};

function toNumber(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function FluidBalanceModal({
  patientName,
  onClose,
  onSave,
}: {
  patientName: string;
  onClose: () => void;
  onSave: (entry: FluidBalanceEntry) => void;
}) {
  const toast = useToast();
  const [intakeMl, setIntakeMl] = useState('');
  const [outputMl, setOutputMl] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const intake = toNumber(intakeMl);
  const output = toNumber(outputMl);
  const isValid = intake !== null && output !== null && (intake > 0 || output > 0);

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) {
      toast.error('Required', 'Enter at least one of fluid intake or output, as a valid number.');
      return;
    }
    onSave({ intakeMl: intake!, outputMl: output!, note: note.trim() });
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
              Input Fluid Balance
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              For {patientName}
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
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <FormField
                label="Fluid Intake (ml)"
                htmlFor="fb-intake"
                error={submitted && intake === null ? 'Enter a valid amount' : undefined}
              >
                <FormInput
                  id="fb-intake"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={intakeMl}
                  onChange={(e) => setIntakeMl(e.target.value)}
                  hasError={submitted && intake === null}
                  placeholder="e.g. 250"
                />
              </FormField>
              <FormField
                label="Fluid Output (ml)"
                htmlFor="fb-output"
                error={submitted && output === null ? 'Enter a valid amount' : undefined}
              >
                <FormInput
                  id="fb-output"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={outputMl}
                  onChange={(e) => setOutputMl(e.target.value)}
                  hasError={submitted && output === null}
                  placeholder="e.g. 200"
                />
              </FormField>
            </div>

            <FormField label="Note" htmlFor="fb-note">
              <textarea
                id="fb-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 300))}
                rows={3}
                maxLength={300}
                placeholder="e.g. Oral fluids, IV line, urine output, drain output..."
                className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </FormField>
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
            <GlassWater style={{ width: 15, height: 15 }} />
            Save Fluid Balance
          </button>
        </div>
      </div>
    </div>
  );
}
