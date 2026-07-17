'use client';

import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  DOCTOR_POOL,
  ON_CALL_LEVEL_META,
  type OnCallAssignment,
  type OnCallDoctorStatus,
} from '@/features/workforce/__mocks__/workforceFixtures';

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

const STATUS_OPTIONS: { value: OnCallDoctorStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
];

export function ReassignOnCallModal({
  assignment,
  onClose,
  onSave,
}: {
  assignment: OnCallAssignment;
  onClose: () => void;
  onSave: (assignment: OnCallAssignment) => void;
}) {
  const toast = useToast();
  const [doctorId, setDoctorId] = useState(
    DOCTOR_POOL.find((d) => d.name === assignment.doctorName)?.id ?? DOCTOR_POOL[0]!.id,
  );
  const [phone, setPhone] = useState(assignment.phone);
  const [status, setStatus] = useState<OnCallDoctorStatus>(assignment.status);

  function handleSubmit() {
    const doctor = DOCTOR_POOL.find((d) => d.id === doctorId);
    if (!doctor) {
      toast.error('Required', 'Please select a doctor.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Required', 'Please enter a contact phone number.');
      return;
    }
    onSave({
      ...assignment,
      doctorName: doctor.name,
      initials: doctor.initials,
      avatarBg: doctor.avatarBg,
      phone: phone.trim(),
      status,
    });
    toast.success(
      'On-call reassigned',
      `${doctor.name} is now ${ON_CALL_LEVEL_META[assignment.level].label.toLowerCase()} on-call for ${assignment.department}.`,
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
        className="flex w-full flex-col gap-5 overflow-y-auto scroll-smooth bg-white"
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16, padding: 24 }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Reassign On-Call
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              {assignment.department} · {ON_CALL_LEVEL_META[assignment.level].label}
            </p>
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
            Doctor
          </p>
          <div className="relative">
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full appearance-none transition-[border-color]"
              style={{ ...FIELD_BASE, paddingRight: 36, cursor: 'pointer' }}
            >
              {DOCTOR_POOL.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.role}
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
            Contact Phone
          </p>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+234 803 000 0000"
            className="transition-[border-color] placeholder:text-[#8A98A3]"
            style={FIELD_BASE}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
          />
        </div>

        <div>
          <p className="mb-1.5 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            Availability
          </p>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OnCallDoctorStatus)}
              className="w-full appearance-none transition-[border-color]"
              style={{ ...FIELD_BASE, paddingRight: 36, cursor: 'pointer' }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
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
            Save Reassignment
          </button>
        </div>
      </div>
    </div>
  );
}
