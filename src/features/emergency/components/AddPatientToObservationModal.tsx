'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1.5 block font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
    {children}
  </label>
);

export type AvailableSlot = { bay: string; slotLabel: string };

const REVIEW_INTERVALS = [
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '90 minutes', minutes: 90 },
  { label: '2 hours', minutes: 120 },
];

export function AddPatientToObservationModal({
  availableSlots,
  physicianOptions,
  onClose,
  onSubmit,
}: {
  availableSlots: AvailableSlot[];
  physicianOptions: string[];
  onClose: () => void;
  onSubmit: (input: {
    patientName: string;
    age: number;
    gender: 'Male' | 'Female';
    bay: string;
    slotLabel: string;
    reason: string;
    physician: string;
    reviewMinutes: number;
  }) => void;
}) {
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [slotKey, setSlotKey] = useState(
    availableSlots.length > 0 ? `${availableSlots[0]!.bay}__${availableSlots[0]!.slotLabel}` : '',
  );
  const [reason, setReason] = useState('');
  const [physician, setPhysician] = useState(physicianOptions[0] ?? '');
  const [reviewMinutes, setReviewMinutes] = useState(60);

  const isValid =
    patientName.trim().length > 0 &&
    Number(age) > 0 &&
    reason.trim().length > 0 &&
    physician.trim().length > 0 &&
    slotKey !== '';

  function handleSubmit() {
    if (!isValid) return;
    const [bay, slotLabel] = slotKey.split('__');
    onSubmit({
      patientName: patientName.trim(),
      age: Number(age),
      gender,
      bay: bay!,
      slotLabel: slotLabel!,
      reason: reason.trim(),
      physician,
      reviewMinutes,
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
        style={{ maxWidth: 520, maxHeight: '90vh', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
            Add Patient to Observation
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

        <div className="flex flex-col gap-3.5 overflow-y-auto px-6 py-5">
          <div>
            <FieldLabel>Patient Name</FieldLabel>
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Ngozi Adeyemi"
              autoFocus
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <FieldLabel>Age</FieldLabel>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="34"
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <FieldLabel>Gender</FieldLabel>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
          </div>

          <div>
            <FieldLabel>Bed / Seat</FieldLabel>
            {availableSlots.length === 0 ? (
              <p
                className="rounded-[10px] p-3"
                style={{ fontSize: 14, color: '#D97706', background: 'rgba(217,119,6,0.06)' }}
              >
                No beds or seats are currently available — discharge a patient first.
              </p>
            ) : (
              <select
                value={slotKey}
                onChange={(e) => setSlotKey(e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              >
                {availableSlots.map((s) => (
                  <option key={`${s.bay}__${s.slotLabel}`} value={`${s.bay}__${s.slotLabel}`}>
                    {s.bay} / {s.slotLabel}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <FieldLabel>Reason for Observation</FieldLabel>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Chest pain, R/O ACS"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <FieldLabel>Observing Physician</FieldLabel>
              <select
                value={physician}
                onChange={(e) => setPhysician(e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              >
                {physicianOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Review In</FieldLabel>
              <select
                value={reviewMinutes}
                onChange={(e) => setReviewMinutes(Number(e.target.value))}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              >
                {REVIEW_INTERVALS.map((r) => (
                  <option key={r.minutes} value={r.minutes}>
                    {r.label}
                  </option>
                ))}
              </select>
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
            disabled={!isValid}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 ${isValid ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'} ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#0D2630' }}
          >
            Admit to Observation
          </button>
        </div>
      </div>
    </div>
  );
}
