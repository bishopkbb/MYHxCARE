'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useToast } from '@/hooks/useToast';
import { DIRECTORY_PATIENTS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import { ARCHIVED_RECORD_TYPES } from '@/features/medical-records/__mocks__/archivedRecordFixtures';
import type {
  RecordRequest,
  RequestPriority,
} from '@/features/medical-records/__mocks__/recordRequestFixtures';

const PRIORITY_OPTIONS: { value: RequestPriority; label: string }[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Urgent', label: 'Urgent' },
];

export function NewRecordRequestModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (request: RecordRequest) => void;
}) {
  const toast = useToast();
  const [patientId, setPatientId] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [recordType, setRecordType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('Normal');
  const [submitted, setSubmitted] = useState(false);

  const patientOptions = DIRECTORY_PATIENTS.slice(0, 60).map((p) => ({
    value: p.id,
    label: `${p.name} — ${p.mrn}`,
  }));

  const isValid = patientId && requestedBy.trim() && recordType && purpose.trim();

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;
    const patient = DIRECTORY_PATIENTS.find((p) => p.id === patientId);
    if (!patient) return;

    const request: RecordRequest = {
      id: `req-new-${Date.now()}`,
      requestNumber: `REQ-2026-${String(Math.floor(10000 + Math.random() * 89999))}`,
      patientName: patient.name,
      initials: patient.initials,
      avatarBg: patient.avatarBg,
      mrn: patient.mrn,
      recordType: recordType as RecordRequest['recordType'],
      requestedBy: requestedBy.trim(),
      requestDate: new Date().toISOString(),
      purpose: purpose.trim(),
      status: 'Pending',
      priority,
      notes: '',
    };
    onCreate(request);
    toast.success('Request submitted', `${request.requestNumber} logged for ${patient.name}.`);
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
            New Record Request
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
              htmlFor="req-patient"
              required
              error={submitted && !patientId ? 'Select a patient' : undefined}
            >
              <FormSelect
                id="req-patient"
                value={patientId}
                onChange={setPatientId}
                options={patientOptions}
                placeholder="Search or select patient"
                hasError={submitted && !patientId}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Requested By"
                htmlFor="req-requested-by"
                required
                error={submitted && !requestedBy.trim() ? 'Required' : undefined}
              >
                <FormInput
                  id="req-requested-by"
                  placeholder="e.g. Dr. Jane Ezeonu"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  hasError={submitted && !requestedBy.trim()}
                />
              </FormField>
              <FormField
                label="Record Type"
                htmlFor="req-record-type"
                required
                error={submitted && !recordType ? 'Required' : undefined}
              >
                <FormSelect
                  id="req-record-type"
                  value={recordType}
                  onChange={setRecordType}
                  options={ARCHIVED_RECORD_TYPES.map((t) => ({ value: t, label: t }))}
                  placeholder="Select record type"
                  hasError={submitted && !recordType}
                />
              </FormField>
            </div>

            <FormField
              label="Purpose"
              htmlFor="req-purpose"
              required
              error={submitted && !purpose.trim() ? 'Required' : undefined}
            >
              <textarea
                id="req-purpose"
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Why is this record needed?"
                className="w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  fontSize: 14,
                  color: '#0D2630',
                  border: `1px solid ${submitted && !purpose.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                }}
              />
            </FormField>

            <FormField label="Priority" htmlFor="req-priority" required>
              <FormSelect
                id="req-priority"
                value={priority}
                onChange={(v) => setPriority(v as RequestPriority)}
                options={PRIORITY_OPTIONS}
                placeholder="Select priority"
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
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
