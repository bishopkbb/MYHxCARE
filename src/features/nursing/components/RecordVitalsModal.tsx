'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { useToast } from '@/hooks/useToast';

export type RecordedVitals = {
  systolic: number;
  diastolic: number;
  pulse: number;
  respRate: number;
  temp: number;
  spo2: number;
  painScore: number;
  bloodSugar: number;
  weight: number;
  height: number;
};

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function toNumber(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function RecordVitalsModal({
  patientName,
  currentWeight,
  currentHeight,
  onClose,
  onSave,
}: {
  patientName: string;
  currentWeight: number;
  currentHeight: number;
  onClose: () => void;
  onSave: (vitals: RecordedVitals) => void;
}) {
  const toast = useToast();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [respRate, setRespRate] = useState('');
  const [temp, setTemp] = useState('');
  const [spo2, setSpo2] = useState('');
  const [painScore, setPainScore] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [weight, setWeight] = useState(String(currentWeight));
  const [height, setHeight] = useState(String(currentHeight));
  const [submitted, setSubmitted] = useState(false);

  const fields = {
    systolic: toNumber(systolic),
    diastolic: toNumber(diastolic),
    pulse: toNumber(pulse),
    respRate: toNumber(respRate),
    temp: toNumber(temp),
    spo2: toNumber(spo2),
    painScore: toNumber(painScore),
    bloodSugar: toNumber(bloodSugar),
    weight: toNumber(weight),
    height: toNumber(height),
  };
  const isValid = Object.values(fields).every((v) => v !== null);

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) {
      toast.error('Required', 'Please fill in every vital sign field with a valid number.');
      return;
    }
    onSave(fields as RecordedVitals);
  }

  function numField(
    label: string,
    value: string,
    setValue: (v: string) => void,
    id: string,
    unit: string,
  ) {
    const hasError = submitted && toNumber(value) === null;
    return (
      <FormField
        label={`${label} (${unit})`}
        htmlFor={id}
        required
        error={hasError ? 'Required' : undefined}
      >
        <FormInput
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          hasError={hasError}
        />
      </FormField>
    );
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
        style={{ maxWidth: 640, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              Record New Vitals
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {numField('Systolic BP', systolic, setSystolic, 'v-systolic', 'mmHg')}
            {numField('Diastolic BP', diastolic, setDiastolic, 'v-diastolic', 'mmHg')}
            {numField('Pulse', pulse, setPulse, 'v-pulse', 'bpm')}
            {numField('Respiratory Rate', respRate, setRespRate, 'v-rr', 'rpm')}
            {numField('Temperature', temp, setTemp, 'v-temp', '°C')}
            {numField('Oxygen Saturation', spo2, setSpo2, 'v-spo2', '%')}
            {numField('Pain Score', painScore, setPainScore, 'v-pain', '0-10')}
            {numField('Blood Sugar', bloodSugar, setBloodSugar, 'v-bs', 'mg/dL')}
            {numField('Weight', weight, setWeight, 'v-weight', 'kg')}
            {numField('Height', height, setHeight, 'v-height', 'cm')}
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
            Save Vitals
          </button>
        </div>
      </div>
    </div>
  );
}
