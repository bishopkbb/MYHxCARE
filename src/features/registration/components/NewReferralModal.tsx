'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import {
  DEPARTMENT_OPTIONS,
  OUR_DEPARTMENT,
  PRIORITY_OPTIONS,
  REFERRED_BY_OPTIONS,
  type Referral,
  type ReferralDirection,
  type ReferralPriority,
} from '@/features/registration/__mocks__/referralFixtures';

export function NewReferralModal({
  initialDirection = 'Outgoing',
  initialReason = '',
  onClose,
  onCreate,
}: {
  initialDirection?: ReferralDirection;
  initialReason?: string;
  onClose: () => void;
  onCreate: (referral: Referral) => void;
}) {
  const [direction, setDirection] = useState<ReferralDirection>(initialDirection);
  const [patientName, setPatientName] = useState('');
  const [mrn, setMrn] = useState('');
  const [otherDepartment, setOtherDepartment] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [priority, setPriority] = useState<ReferralPriority>('Normal');
  const [reason, setReason] = useState(initialReason);
  const [submitted, setSubmitted] = useState(false);

  const isValid = patientName.trim() && mrn.trim() && otherDepartment && referredBy;

  function handleCreate() {
    setSubmitted(true);
    if (!isValid) return;
    const referral: Referral = {
      id: `REF-2026-NEW-${Date.now().toString().slice(-6)}`,
      patientName: patientName.trim(),
      mrn: mrn.trim(),
      direction,
      fromDepartment: direction === 'Outgoing' ? OUR_DEPARTMENT : otherDepartment,
      toDepartment: direction === 'Outgoing' ? otherDepartment : OUR_DEPARTMENT,
      referredBy,
      date: new Date().toISOString(),
      status: 'Pending',
      priority,
      reason: reason.trim(),
    };
    onCreate(referral);
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
        style={{ maxWidth: 600, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            New Referral
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
            <div>
              <label
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Referral Direction
              </label>
              <div className="mt-1.5 flex gap-2.5">
                {(['Outgoing', 'Incoming'] as ReferralDirection[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDirection(d);
                      setOtherDepartment('');
                    }}
                    className="flex h-11 flex-1 items-center justify-center rounded-[10px] font-sans font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{
                      fontSize: 14,
                      color: direction === d ? '#FFFFFF' : '#0D2630',
                      background: direction === d ? '#00B4D8' : '#FFFFFF',
                      border: `1px solid ${direction === d ? '#00B4D8' : 'rgba(0,100,130,0.2)'}`,
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Patient Name"
                htmlFor="ref-patient-name"
                required
                error={submitted && !patientName.trim() ? 'Required' : undefined}
              >
                <FormInput
                  id="ref-patient-name"
                  placeholder="Enter patient name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  hasError={submitted && !patientName.trim()}
                />
              </FormField>
              <FormField
                label="MRN"
                htmlFor="ref-mrn"
                required
                error={submitted && !mrn.trim() ? 'Required' : undefined}
              >
                <FormInput
                  id="ref-mrn"
                  placeholder="MRN-2026-00000"
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  hasError={submitted && !mrn.trim()}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label={
                  direction === 'Outgoing' ? 'From Department' : 'Referring Facility/Department'
                }
                htmlFor="ref-from-dept"
              >
                <FormInput
                  id="ref-from-dept"
                  value={direction === 'Outgoing' ? OUR_DEPARTMENT : otherDepartment}
                  disabled={direction === 'Outgoing'}
                  onChange={(e) => setOtherDepartment(e.target.value)}
                  placeholder="Enter department"
                />
              </FormField>
              <FormField
                label={direction === 'Outgoing' ? 'Receiving Department' : 'To Department'}
                htmlFor="ref-to-dept"
                required
                error={submitted && !otherDepartment ? 'Required' : undefined}
              >
                {direction === 'Outgoing' ? (
                  <FormSelect
                    id="ref-to-dept"
                    value={otherDepartment}
                    onChange={setOtherDepartment}
                    options={DEPARTMENT_OPTIONS.filter((d) => d.value !== OUR_DEPARTMENT)}
                    placeholder="Select department"
                    hasError={submitted && !otherDepartment}
                  />
                ) : (
                  <FormInput id="ref-to-dept" value={OUR_DEPARTMENT} disabled />
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Referred By"
                htmlFor="ref-referred-by"
                required
                error={submitted && !referredBy ? 'Required' : undefined}
              >
                <FormSelect
                  id="ref-referred-by"
                  value={referredBy}
                  onChange={setReferredBy}
                  options={REFERRED_BY_OPTIONS}
                  placeholder="Select referring physician"
                  hasError={submitted && !referredBy}
                />
              </FormField>
              <FormField label="Priority" htmlFor="ref-priority">
                <FormSelect
                  id="ref-priority"
                  value={priority}
                  onChange={(v) => setPriority(v as ReferralPriority)}
                  options={PRIORITY_OPTIONS}
                  placeholder="Select priority"
                />
              </FormField>
            </div>

            <FormField label="Reason for Referral" htmlFor="ref-reason">
              <textarea
                id="ref-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for this referral"
                className="w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.18)' }}
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
            onClick={handleCreate}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Create Referral
          </button>
        </div>
      </div>
    </div>
  );
}
