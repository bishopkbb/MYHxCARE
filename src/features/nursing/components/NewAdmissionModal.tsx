'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const GENDER_OPTIONS = [
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
];

const ADMISSION_TYPE_OPTIONS = [
  { value: 'Medical', label: 'Medical' },
  { value: 'Surgical', label: 'Surgical' },
];

export type NewAdmissionInput = {
  patientName: string;
  mrn: string;
  age: number;
  gender: 'Male' | 'Female';
  admissionType: 'Medical' | 'Surgical';
  ward: string;
  assignedDoctor: string;
  admittedAt: string; // ISO
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NewAdmissionModal({
  wardOptions,
  onClose,
  onConfirm,
}: {
  wardOptions: { value: string; label: string }[];
  onClose: () => void;
  onConfirm: (input: NewAdmissionInput) => void;
}) {
  const [patientName, setPatientName] = useState('');
  const [mrn, setMrn] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [admissionType, setAdmissionType] = useState<'Medical' | 'Surgical'>('Medical');
  const [ward, setWard] = useState(wardOptions[0]?.value ?? '');
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [admittedAt, setAdmittedAt] = useState(toLocalInputValue(new Date()));

  const canSave = patientName.trim() !== '' && mrn.trim() !== '' && ward !== '';

  function handleSave() {
    if (!canSave) return;
    onConfirm({
      patientName: patientName.trim(),
      mrn: mrn.trim(),
      age: Number(age) || 0,
      gender,
      admissionType,
      ward,
      assignedDoctor: assignedDoctor.trim(),
      admittedAt: new Date(admittedAt).toISOString(),
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
              New Admission
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Start a new patient through the admission workflow.
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
            <FormField label="Patient Name" htmlFor="na-patient-name" required>
              <input
                id="na-patient-name"
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Chika Obioma"
                className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </FormField>

            <FormField label="MRN" htmlFor="na-mrn" required>
              <input
                id="na-mrn"
                type="text"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                placeholder="e.g. MRN-2026-01234"
                className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3.5">
              <FormField label="Age" htmlFor="na-age">
                <input
                  id="na-age"
                  type="number"
                  min={0}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 34"
                  className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </FormField>
              <FormField label="Gender" htmlFor="na-gender">
                <FormSelect
                  id="na-gender"
                  value={gender}
                  onChange={(v) => setGender(v as 'Male' | 'Female')}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <FormField label="Admission Type" htmlFor="na-type">
                <FormSelect
                  id="na-type"
                  value={admissionType}
                  onChange={(v) => setAdmissionType(v as 'Medical' | 'Surgical')}
                  options={ADMISSION_TYPE_OPTIONS}
                  placeholder="Select type"
                />
              </FormField>
              <FormField label="Ward" htmlFor="na-ward" required>
                <FormSelect
                  id="na-ward"
                  value={ward}
                  onChange={setWard}
                  options={wardOptions}
                  placeholder="Select ward"
                />
              </FormField>
            </div>

            <FormField label="Assigned Doctor" htmlFor="na-doctor">
              <input
                id="na-doctor"
                type="text"
                value={assignedDoctor}
                onChange={(e) => setAssignedDoctor(e.target.value)}
                placeholder="e.g. Dr. Amina Yusuf"
                className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </FormField>

            <FormField label="Admission Date & Time" htmlFor="na-admitted">
              <input
                id="na-admitted"
                type="datetime-local"
                value={admittedAt}
                onChange={(e) => setAdmittedAt(e.target.value)}
                className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
              <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                A future date/time creates a Scheduled admission instead of starting the workflow
                now.
              </p>
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
            disabled={!canSave}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Create Admission
          </button>
        </div>
      </div>
    </div>
  );
}
