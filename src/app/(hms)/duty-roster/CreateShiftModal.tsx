'use client';

import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import type {
  DoctorShift,
  ShiftStatus,
  ShiftType,
} from '@/features/workforce/__mocks__/workforceFixtures';
import { SHIFT_TYPE_OPTIONS, STATUS_OPTIONS, WARD_OPTIONS } from './config';

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

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#22C55E', '#00B4D8', '#EC4899'];

function initialsOf(name: string): string {
  const parts = name.replace('Dr. ', '').trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export function CreateShiftModal({
  editingShift,
  onClose,
  onSave,
}: {
  editingShift?: DoctorShift;
  onClose: () => void;
  onSave: (shift: DoctorShift) => void;
}) {
  const isEditing = Boolean(editingShift);
  const toast = useToast();
  const [doctorName, setDoctorName] = useState(editingShift?.doctorName ?? '');
  const [role, setRole] = useState(editingShift?.role ?? '');
  const [shiftType, setShiftType] = useState<ShiftType>(editingShift?.shiftType ?? 'MORNING');
  const [status, setStatus] = useState<ShiftStatus>(editingShift?.status ?? 'SCHEDULED');
  const [ward, setWard] = useState(editingShift?.ward ?? WARD_OPTIONS[0]!);
  const [timeRange, setTimeRange] = useState(editingShift?.timeRange ?? '');

  function handleSubmit() {
    if (!doctorName.trim() || !role.trim() || !timeRange.trim()) {
      toast.error('Required', 'Please fill in doctor name, role, and time range.');
      return;
    }
    const shift: DoctorShift = {
      id: editingShift?.id ?? `shift-${Date.now()}`,
      doctorName: doctorName.trim(),
      initials: editingShift?.initials ?? initialsOf(doctorName),
      avatarBg:
        editingShift?.avatarBg ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!,
      role: role.trim(),
      department: editingShift?.department ?? role.trim(),
      shiftType,
      timeRange: timeRange.trim(),
      ward,
      status,
      acknowledged: editingShift?.acknowledged ?? false,
    };
    onSave(shift);
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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16, padding: 24 }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 22, lineHeight: '30px', color: '#0D2630' }}
          >
            {isEditing ? 'Edit Shift' : 'Create Shift'}
          </h2>
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
            Doctor Name
          </p>
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="e.g. Dr. Jane Ezeonu"
            className="transition-[border-color] placeholder:text-[#8A98A3]"
            style={FIELD_BASE}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p
              className="mb-1.5 font-sans font-semibold"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Role
            </p>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. GP, Consultant..."
              className="transition-[border-color] placeholder:text-[#8A98A3]"
              style={FIELD_BASE}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
            />
          </div>

          <div>
            <p
              className="mb-1.5 font-sans font-semibold"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Shift Type
            </p>
            <div className="relative">
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as ShiftType)}
                className="w-full appearance-none transition-[border-color]"
                style={{ ...FIELD_BASE, paddingRight: 36, cursor: 'pointer' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
              >
                {SHIFT_TYPE_OPTIONS.map((o) => (
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p
              className="mb-1.5 font-sans font-semibold"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Ward/Clinic
            </p>
            <div className="relative">
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full appearance-none transition-[border-color]"
                style={{ ...FIELD_BASE, paddingRight: 36, cursor: 'pointer' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
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
            <p
              className="mb-1.5 font-sans font-semibold"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Status
            </p>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShiftStatus)}
                className="w-full appearance-none transition-[border-color]"
                style={{ ...FIELD_BASE, paddingRight: 36, cursor: 'pointer' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
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
        </div>

        <div>
          <p className="mb-1.5 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            Time Range
          </p>
          <input
            type="text"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            placeholder="e.g. 08:00 AM – 4:00 PM"
            className="transition-[border-color] placeholder:text-[#8A98A3]"
            style={FIELD_BASE}
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
            {isEditing ? 'Save Changes' : 'Create Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}
