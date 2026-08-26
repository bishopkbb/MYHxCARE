'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useToast } from '@/hooks/useToast';
import { ORG_DEPARTMENT_OPTIONS } from '@/constants/organizationalDepartments';
import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';
import {
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  nextStaffId,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
} from '@/features/administration/__mocks__/staffDirectoryFixtures';
import {
  useStaffDirectory,
  addStaff,
  updateStaff,
} from '@/features/administration/store/staffDirectoryStore';

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#22C55E', '#00B4D8', '#EC4899'];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function AddEditStaffModal({
  member,
  onClose,
  onSubmit,
}: {
  member: StaffMember | null;
  onClose: () => void;
  onSubmit: (member: StaffMember) => void;
}) {
  const isEditing = Boolean(member);
  const toast = useToast();
  const roster = useStaffDirectory();

  const [fullName, setFullName] = useState(member?.fullName ?? '');
  const [title, setTitle] = useState(member?.title ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [department, setDepartment] = useState<string>(member?.department ?? '');
  const [role, setRole] = useState<string>(member?.role ?? '');
  const [status, setStatus] = useState<StaffStatus>(member?.status ?? 'Active');
  const [submitted, setSubmitted] = useState(false);

  const isValid = fullName.trim() && email.trim() && department && role;

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) {
      toast.error('Required', 'Please fill in full name, email, department, and role.');
      return;
    }
    const staffMember: StaffMember = {
      staffId: member?.staffId ?? nextStaffId(roster),
      fullName: fullName.trim(),
      initials: member?.initials ?? initialsOf(fullName),
      avatarBg:
        member?.avatarBg ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!,
      title: title.trim() || role,
      department: department as OrganizationalDepartment,
      role: role as StaffRole,
      email: email.trim(),
      phone: phone.trim(),
      status,
      lastLogin: member?.lastLogin ?? null,
      newThisMonth: member?.newThisMonth ?? true,
    };
    if (isEditing) {
      updateStaff(staffMember);
    } else {
      addStaff(staffMember);
    }
    onSubmit(staffMember);
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
            {isEditing ? 'Edit Staff' : 'Add New Staff'}
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
            <FormField
              label="Full Name"
              htmlFor="staff-full-name"
              required
              error={submitted && !fullName.trim() ? 'Required' : undefined}
            >
              <FormInput
                id="staff-full-name"
                placeholder="e.g. Dr. Adaeze Okonkwo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                hasError={submitted && !fullName.trim()}
              />
            </FormField>

            <FormField label="Job Title" htmlFor="staff-title">
              <FormInput
                id="staff-title"
                placeholder="e.g. Consultant Physician"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Email"
                htmlFor="staff-email"
                required
                error={submitted && !email.trim() ? 'Required' : undefined}
              >
                <FormInput
                  id="staff-email"
                  type="email"
                  placeholder="name@unizikmedical.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  hasError={submitted && !email.trim()}
                />
              </FormField>
              <FormField label="Phone" htmlFor="staff-phone">
                <FormInput
                  id="staff-phone"
                  placeholder="0803 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Department"
                htmlFor="staff-department"
                required
                error={submitted && !department ? 'Required' : undefined}
              >
                <FormSelect
                  id="staff-department"
                  value={department}
                  onChange={setDepartment}
                  options={ORG_DEPARTMENT_OPTIONS}
                  placeholder="Select department"
                  hasError={submitted && !department}
                />
              </FormField>
              <FormField
                label="Role"
                htmlFor="staff-role"
                required
                error={submitted && !role ? 'Required' : undefined}
              >
                <FormSelect
                  id="staff-role"
                  value={role}
                  onChange={setRole}
                  options={ROLE_OPTIONS}
                  placeholder="Select role"
                  hasError={submitted && !role}
                />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="staff-status">
              <FormSelect
                id="staff-status"
                value={status}
                onChange={(v) => setStatus(v as StaffStatus)}
                options={STATUS_OPTIONS}
                placeholder="Select status"
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
            {isEditing ? 'Save Changes' : 'Add Staff'}
          </button>
        </div>
      </div>
    </div>
  );
}
