'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/useToast';
import { HOSPITAL_DEPARTMENT_OPTIONS } from '@/constants/departments';
import { DIRECTORY_PATIENTS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  ARCHIVED_RECORD_TYPES,
  type ArchivedRecord,
} from '@/features/medical-records/__mocks__/archivedRecordFixtures';

export function NewArchiveRecordModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (record: ArchivedRecord) => void;
}) {
  const toast = useToast();
  const { user } = useAuth();
  const [patientId, setPatientId] = useState('');
  const [recordType, setRecordType] = useState('');
  const [department, setDepartment] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const patientOptions = DIRECTORY_PATIENTS.slice(0, 60).map((p) => ({
    value: p.id,
    label: `${p.name} — ${p.mrn}`,
  }));

  const isValid = patientId && recordType && department && reason.trim();

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;
    const patient = DIRECTORY_PATIENTS.find((p) => p.id === patientId);
    if (!patient) return;

    const now = new Date().toISOString();
    const actor = user?.name ?? 'Unknown Staff';
    const record: ArchivedRecord = {
      id: `arc-new-${Date.now()}`,
      patientName: patient.name,
      initials: patient.initials,
      avatarBg: patient.avatarBg,
      mrn: patient.mrn,
      recordType: recordType as ArchivedRecord['recordType'],
      department,
      archiveDate: now,
      reason: reason.trim(),
      status: 'Archived',
      archivedBy: actor,
      auditTrail: [{ dateTime: now, label: 'Record archived', actor }],
    };
    onCreate(record);
    toast.success('Record archived', `${patient.name}'s record has been archived.`);
    onClose();
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
            Archive Record
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
              label="Patient"
              htmlFor="arc-patient"
              required
              error={submitted && !patientId ? 'Select a patient' : undefined}
            >
              <FormSelect
                id="arc-patient"
                value={patientId}
                onChange={setPatientId}
                options={patientOptions}
                placeholder="Search or select patient"
                hasError={submitted && !patientId}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Record Type"
                htmlFor="arc-record-type"
                required
                error={submitted && !recordType ? 'Required' : undefined}
              >
                <FormSelect
                  id="arc-record-type"
                  value={recordType}
                  onChange={setRecordType}
                  options={ARCHIVED_RECORD_TYPES.map((t) => ({ value: t, label: t }))}
                  placeholder="Select record type"
                  hasError={submitted && !recordType}
                />
              </FormField>
              <FormField
                label="Department"
                htmlFor="arc-department"
                required
                error={submitted && !department ? 'Required' : undefined}
              >
                <FormSelect
                  id="arc-department"
                  value={department}
                  onChange={setDepartment}
                  options={HOSPITAL_DEPARTMENT_OPTIONS}
                  placeholder="Select department"
                  hasError={submitted && !department}
                />
              </FormField>
            </div>

            <FormField
              label="Reason"
              htmlFor="arc-reason"
              required
              error={submitted && !reason.trim() ? 'Required' : undefined}
            >
              <FormInput
                id="arc-reason"
                placeholder="e.g. Inactive - No visit for 3 years"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                hasError={submitted && !reason.trim()}
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
            Archive Record
          </button>
        </div>
      </div>
    </div>
  );
}
