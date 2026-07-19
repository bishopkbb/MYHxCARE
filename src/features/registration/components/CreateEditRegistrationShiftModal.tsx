'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useToast } from '@/hooks/useToast';
import {
  ROLE_OPTIONS,
  SHIFT_TYPE_OPTIONS,
  STATUS_OPTIONS,
  WARD_OPTIONS,
  nextShiftId,
  type RegistrationShift,
  type ShiftStatus,
  type ShiftType,
} from '@/features/registration/__mocks__/registrationWorkforceFixtures';

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#22C55E', '#00B4D8', '#EC4899'];

const SHIFT_TIME_RANGE: Record<ShiftType, string> = {
  MORNING: '07:00 - 15:00',
  AFTERNOON: '15:00 - 23:00',
  NIGHT: '23:00 - 07:00',
  ON_CALL: '00:00 - 23:59',
  EMERGENCY: '07:00 - 19:00',
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export function CreateEditRegistrationShiftModal({
  editingShift,
  onClose,
  onSave,
}: {
  editingShift?: RegistrationShift | undefined;
  onClose: () => void;
  onSave: (shift: RegistrationShift) => void;
}) {
  const isEditing = Boolean(editingShift);
  const toast = useToast();
  const [staffName, setStaffName] = useState(editingShift?.staffName ?? '');
  const [role, setRole] = useState(editingShift?.role ?? '');
  const [ward, setWard] = useState(editingShift?.ward ?? '');
  const [shiftType, setShiftType] = useState<ShiftType>(editingShift?.shiftType ?? 'MORNING');
  const [status, setStatus] = useState<ShiftStatus>(editingShift?.status ?? 'SCHEDULED');
  const [submitted, setSubmitted] = useState(false);

  const isValid = staffName.trim() && role && ward;

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) {
      toast.error('Required', 'Please fill in staff name, role, and station.');
      return;
    }
    const shift: RegistrationShift = {
      id: editingShift?.id ?? nextShiftId(),
      staffName: staffName.trim(),
      initials: editingShift?.initials ?? initialsOf(staffName),
      avatarBg:
        editingShift?.avatarBg ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!,
      role,
      ward,
      shiftType,
      timeRange: SHIFT_TIME_RANGE[shiftType],
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
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            {isEditing ? 'Edit Shift' : 'Create Shift'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-4">
            <FormField
              label="Staff Name"
              htmlFor="shift-staff-name"
              required
              error={submitted && !staffName.trim() ? 'Required' : undefined}
            >
              <FormInput
                id="shift-staff-name"
                placeholder="e.g. Ifeoma Okonkwo"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                hasError={submitted && !staffName.trim()}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Role"
                htmlFor="shift-role"
                required
                error={submitted && !role ? 'Required' : undefined}
              >
                <FormSelect
                  id="shift-role"
                  value={role}
                  onChange={setRole}
                  options={ROLE_OPTIONS}
                  placeholder="Select role"
                  hasError={submitted && !role}
                />
              </FormField>
              <FormField
                label="Station"
                htmlFor="shift-ward"
                required
                error={submitted && !ward ? 'Required' : undefined}
              >
                <FormSelect
                  id="shift-ward"
                  value={ward}
                  onChange={setWard}
                  options={WARD_OPTIONS}
                  placeholder="Select station"
                  hasError={submitted && !ward}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Shift Type" htmlFor="shift-type">
                <FormSelect
                  id="shift-type"
                  value={shiftType}
                  onChange={(v) => setShiftType(v as ShiftType)}
                  options={SHIFT_TYPE_OPTIONS}
                  placeholder="Select shift type"
                />
              </FormField>
              <FormField label="Status" htmlFor="shift-status">
                <FormSelect
                  id="shift-status"
                  value={status}
                  onChange={(v) => setStatus(v as ShiftStatus)}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                />
              </FormField>
            </div>

            <p style={{ fontSize: 14, color: '#8A98A3' }}>
              Time range: <span style={{ color: '#0D2630' }}>{SHIFT_TIME_RANGE[shiftType]}</span>
            </p>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            {isEditing ? 'Save Changes' : 'Create Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}
