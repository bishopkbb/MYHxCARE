'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import {
  STATUS_OPTIONS,
  type DepartmentRecord,
  type DepartmentStatus,
} from '@/features/administration/__mocks__/departmentsFixtures';
import {
  setDepartmentHead,
  setDepartmentStatus,
  updateDepartmentContact,
} from '@/features/administration/store/departmentsStore';
import { useStaffDirectory } from '@/features/administration/store/staffDirectoryStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Edits an existing department's contact info, status, and head. Name,
 * description, and identity stay fixed, departments in this HMS are
 * administratively predetermined and aren't renamed or deleted here. */
export function EditDepartmentModal({
  department,
  onClose,
  onSaved,
}: {
  department: DepartmentRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const staffRoster = useStaffDirectory();
  const deptStaff = staffRoster.filter((s) => s.department === department.id);

  const [contactPhone, setContactPhone] = useState(department.contactPhone);
  const [contactEmail, setContactEmail] = useState(department.contactEmail);
  const [status, setStatus] = useState<DepartmentStatus>(department.status);
  const [headStaffId, setHeadStaffId] = useState(department.headStaffId);

  function handleSave() {
    updateDepartmentContact(department.id, contactPhone.trim(), contactEmail.trim());
    setDepartmentStatus(department.id, status);
    if (headStaffId) setDepartmentHead(department.id, headStaffId);
    onSaved();
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
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              Edit Department
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {department.id}
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
          <div className="flex flex-col gap-4">
            <FormField label="Department Head" htmlFor="dept-head">
              <FormSelect
                id="dept-head"
                value={headStaffId}
                onChange={setHeadStaffId}
                options={deptStaff.map((s) => ({ value: s.staffId, label: s.fullName }))}
                placeholder="Select head"
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Contact Phone" htmlFor="dept-phone">
                <FormInput
                  id="dept-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </FormField>
              <FormField label="Contact Email" htmlFor="dept-email">
                <FormInput
                  id="dept-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="dept-status">
              <FormSelect
                id="dept-status"
                value={status}
                onChange={(v) => setStatus(v as DepartmentStatus)}
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
            onClick={handleSave}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
