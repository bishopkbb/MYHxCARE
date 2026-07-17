'use client';

import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import type { AssignableDoctor } from '@/features/workforce/__mocks__/workforceFixtures';
import { WARD_OPTIONS } from '@/app/(hms)/duty-roster/config';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FIELD_BASE: React.CSSProperties = {
  height: 44,
  border: '1px solid #0064821F',
  borderRadius: 10,
  background: '#FFFFFF',
  color: '#0D2630',
  fontSize: 14,
  lineHeight: '22px',
  padding: '0 12px',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
};

export function AssignDoctorModal({
  doctor,
  onClose,
  onSave,
}: {
  doctor: AssignableDoctor;
  onClose: () => void;
  onSave: (doctor: AssignableDoctor, notes: string) => void;
}) {
  const toast = useToast();
  const [ward, setWard] = useState(doctor.currentWard ?? WARD_OPTIONS[0]!);
  const [effectiveDate, setEffectiveDate] = useState('Today');
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    if (!ward) {
      toast.error('Required', 'Please select a ward.');
      return;
    }
    onSave({ ...doctor, currentWard: ward, status: 'ASSIGNED' }, notes.trim());
    toast.success('Doctor assigned', `${doctor.name} has been assigned to ${ward}.`);
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
        className="flex w-full flex-col gap-5 overflow-y-auto scroll-smooth bg-white"
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16, padding: 24 }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
              style={{ background: doctor.avatarBg, fontSize: 15 }}
            >
              {doctor.initials}
            </div>
            <div>
              <p
                className="font-display font-semibold"
                style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
              >
                {doctor.name}
              </p>
              <p style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}>{doctor.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div>
          <p className="mb-1.5 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            Assign to Ward/Clinic
          </p>
          <div className="relative">
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              className="w-full appearance-none transition-[border-color]"
              style={{ ...FIELD_BASE, paddingRight: 36, cursor: 'pointer' }}
            >
              {WARD_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
              style={{ width: 16, height: 16, color: '#8A98A3' }}
            />
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            Effective From
          </p>
          <input
            type="text"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            placeholder="e.g. Today, Jul 20, 2026"
            className="transition-[border-color] placeholder:text-[#8A98A3]"
            style={FIELD_BASE}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
          />
        </div>

        <div>
          <p className="mb-1.5 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            Hand-off Notes (optional)
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Patient status, pending tasks, anything the incoming doctor should know..."
            rows={3}
            className="resize-none transition-[border-color] placeholder:text-[#8A98A3]"
            style={{ ...FIELD_BASE, height: 'auto', padding: '10px 12px' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
          />
        </div>

        <div
          className="flex flex-wrap justify-end gap-3"
          style={{ borderTop: '1px solid #0064821F', paddingTop: 16 }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] ${FOCUS_RING}`}
            style={{
              height: 44,
              borderRadius: 12,
              padding: '0 20px',
              background: '#FFFFFF',
              border: '1px solid #0064821F',
              fontSize: 14,
              color: '#0D2630',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{
              height: 44,
              borderRadius: 12,
              padding: '0 20px',
              background: '#00B4D8',
              fontSize: 14,
            }}
          >
            Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  );
}
