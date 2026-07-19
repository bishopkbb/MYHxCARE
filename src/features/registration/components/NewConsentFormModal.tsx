'use client';

import { FileText, X } from 'lucide-react';
import { useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import {
  CONSENT_DOCTOR_OPTIONS,
  CONSENT_TYPE_OPTIONS,
  type ConsentForm,
  type ConsentType,
} from '@/features/registration/__mocks__/consentFormFixtures';

const CONSENT_TYPE_TO_DEPARTMENT: Record<ConsentType, string> = {
  'Surgery Consent': 'Surgery',
  'Blood Transfusion': 'Emergency Department',
  'Radiology Consent': 'Radiology',
  'Laboratory Consent': 'Laboratory',
  'General Treatment': 'General Outpatient Clinic',
  'Anaesthesia Consent': 'Surgery',
  'Telemedicine Consent': 'Family Medicine',
  'Data Privacy Consent': 'General Outpatient Clinic',
};

const CONSENT_TYPE_TO_PROCEDURE: Record<ConsentType, string> = {
  'Surgery Consent': 'Appendectomy',
  'Blood Transfusion': 'Blood Transfusion',
  'Radiology Consent': 'X-Ray Imaging',
  'Laboratory Consent': 'Laboratory Test',
  'General Treatment': 'General Consultation',
  'Anaesthesia Consent': 'Anaesthesia Administration',
  'Telemedicine Consent': 'Video Consultation',
  'Data Privacy Consent': 'Data Sharing',
};

function toDateInputValue(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function NewConsentFormModal({
  existing,
  onClose,
  onSave,
}: {
  existing?: ConsentForm;
  onClose: () => void;
  onSave: (consent: ConsentForm) => void;
}) {
  const isEdit = Boolean(existing);
  const [patientName, setPatientName] = useState(existing?.patientName ?? '');
  const [mrn, setMrn] = useState(existing?.mrn ?? '');
  const [consentType, setConsentType] = useState<ConsentType | ''>(existing?.consentType ?? '');
  const [doctor, setDoctor] = useState(existing?.doctor ?? '');
  const [expiryDate, setExpiryDate] = useState(
    existing ? toDateInputValue(existing.expiryDate) : '',
  );
  const [description, setDescription] = useState(existing?.description ?? '');
  const [submitted, setSubmitted] = useState(false);

  const isValid = patientName.trim() && mrn.trim() && consentType && doctor;

  function handleSave() {
    setSubmitted(true);
    if (!isValid || !consentType) return;
    const now = new Date().toISOString();
    const consent: ConsentForm = existing
      ? {
          ...existing,
          patientName: patientName.trim(),
          mrn: mrn.trim(),
          consentType,
          department: CONSENT_TYPE_TO_DEPARTMENT[consentType],
          procedure: CONSENT_TYPE_TO_PROCEDURE[consentType],
          doctor,
          expiryDate: expiryDate || existing.expiryDate,
          description: description.trim(),
        }
      : {
          id: `CON-2026-NEW-${Date.now().toString().slice(-6)}`,
          patientName: patientName.trim(),
          mrn: mrn.trim(),
          gender: 'Female',
          dateOfBirth: '',
          phone: '',
          email: '',
          address: '',
          consentType,
          department: CONSENT_TYPE_TO_DEPARTMENT[consentType],
          procedure: CONSENT_TYPE_TO_PROCEDURE[consentType],
          doctor,
          dateIssued: now,
          expiryDate: expiryDate || now.slice(0, 10),
          status: 'Pending',
          description: description.trim(),
          signatures: [
            { role: 'Patient / Guardian', status: 'Pending' },
            { role: 'Doctor', status: 'Pending' },
            { role: 'Witness', status: 'Pending' },
          ],
          timeline: [
            {
              id: 'tl-1',
              label: 'Consent form created',
              dateTime: now,
              icon: FileText,
              color: '#00B4D8',
              bg: 'rgba(0,180,216,0.12)',
            },
          ],
          audit: [{ id: 'au-1', action: 'Created', actor: 'Adaobi Nwankwo', dateTime: now }],
        };
    onSave(consent);
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
            {isEdit ? 'Edit Consent' : 'New Consent Form'}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Patient Name"
                htmlFor="con-patient-name"
                required
                error={submitted && !patientName.trim() ? 'Required' : undefined}
              >
                <FormInput
                  id="con-patient-name"
                  placeholder="Enter patient name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  hasError={submitted && !patientName.trim()}
                  disabled={isEdit}
                />
              </FormField>
              <FormField
                label="MRN"
                htmlFor="con-mrn"
                required
                error={submitted && !mrn.trim() ? 'Required' : undefined}
              >
                <FormInput
                  id="con-mrn"
                  placeholder="MRN-2026-00000"
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  hasError={submitted && !mrn.trim()}
                  disabled={isEdit}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Consent Type"
                htmlFor="con-type"
                required
                error={submitted && !consentType ? 'Required' : undefined}
              >
                <FormSelect
                  id="con-type"
                  value={consentType}
                  onChange={(v) => setConsentType(v as ConsentType)}
                  options={CONSENT_TYPE_OPTIONS}
                  placeholder="Select consent type"
                  hasError={submitted && !consentType}
                />
              </FormField>
              <FormField
                label="Doctor"
                htmlFor="con-doctor"
                required
                error={submitted && !doctor ? 'Required' : undefined}
              >
                <FormSelect
                  id="con-doctor"
                  value={doctor}
                  onChange={setDoctor}
                  options={CONSENT_DOCTOR_OPTIONS}
                  placeholder="Select doctor"
                  hasError={submitted && !doctor}
                />
              </FormField>
            </div>

            <FormField label="Expiry Date" htmlFor="con-expiry">
              <FormDateInput
                id="con-expiry"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </FormField>

            <FormField label="Description" htmlFor="con-description">
              <textarea
                id="con-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this consent covers"
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
            onClick={handleSave}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            {isEdit ? 'Save Changes' : 'Create Consent Form'}
          </button>
        </div>
      </div>
    </div>
  );
}
