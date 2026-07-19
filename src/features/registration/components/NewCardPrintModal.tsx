'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import {
  BLOOD_GROUP_OPTIONS,
  CARD_TYPE_OPTIONS,
  type CardType,
  type PatientCard,
} from '@/features/registration/__mocks__/patientCardFixtures';

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

function validityDaysFor(cardType: CardType): number {
  if (cardType === 'Visitor') return 30;
  if (cardType === 'Staff') return 700;
  return 365;
}

export function NewCardPrintModal({
  initialCardType,
  onClose,
  onCreate,
}: {
  initialCardType?: CardType | undefined;
  onClose: () => void;
  onCreate: (card: PatientCard) => void;
}) {
  const [patientName, setPatientName] = useState('');
  const [mrn, setMrn] = useState('');
  const [patientId, setPatientId] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [cardType, setCardType] = useState<CardType | ''>(initialCardType ?? '');
  const [submitted, setSubmitted] = useState(false);

  const isValid = patientName.trim() && mrn.trim() && gender && cardType;

  function handleCreate() {
    setSubmitted(true);
    if (!isValid || !cardType) return;
    const now = new Date().toISOString();
    const validityDays = validityDaysFor(cardType);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + validityDays);
    const card: PatientCard = {
      id: `CARD-2026-NEW-${Date.now().toString().slice(-6)}`,
      patientName: patientName.trim(),
      mrn: mrn.trim(),
      patientId: patientId.trim() || `PT-${Date.now().toString().slice(-6)}`,
      gender: gender as 'Male' | 'Female',
      dateOfBirth,
      bloodGroup: bloodGroup || 'O+',
      cardType,
      issueDate: now,
      expiryDate: expiry.toISOString().slice(0, 10),
      status: 'Pending',
      printCount: 0,
      lastPrintedBy: '—',
    };
    onCreate(card);
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
            New Card Print
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
                htmlFor="card-patient-name"
                required
                error={submitted && !patientName.trim() ? 'Required' : undefined}
              >
                <FormInput
                  id="card-patient-name"
                  placeholder="Enter patient name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  hasError={submitted && !patientName.trim()}
                />
              </FormField>
              <FormField
                label="MRN"
                htmlFor="card-mrn"
                required
                error={submitted && !mrn.trim() ? 'Required' : undefined}
              >
                <FormInput
                  id="card-mrn"
                  placeholder="MRN-2026-00000"
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  hasError={submitted && !mrn.trim()}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Patient ID" htmlFor="card-patient-id">
                <FormInput
                  id="card-patient-id"
                  placeholder="PT-000000 (auto-generated if blank)"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                />
              </FormField>
              <FormField label="Date of Birth" htmlFor="card-dob">
                <FormInput
                  id="card-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                label="Gender"
                htmlFor="card-gender"
                required
                error={submitted && !gender ? 'Required' : undefined}
              >
                <FormSelect
                  id="card-gender"
                  value={gender}
                  onChange={setGender}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                  hasError={submitted && !gender}
                />
              </FormField>
              <FormField label="Blood Group" htmlFor="card-blood-group">
                <FormSelect
                  id="card-blood-group"
                  value={bloodGroup}
                  onChange={setBloodGroup}
                  options={BLOOD_GROUP_OPTIONS.map((b) => ({ value: b, label: b }))}
                  placeholder="Select blood group"
                />
              </FormField>
              <FormField
                label="Card Type"
                htmlFor="card-type"
                required
                error={submitted && !cardType ? 'Required' : undefined}
              >
                <FormSelect
                  id="card-type"
                  value={cardType}
                  onChange={(v) => setCardType(v as CardType)}
                  options={CARD_TYPE_OPTIONS}
                  placeholder="Select card type"
                  hasError={submitted && !cardType}
                />
              </FormField>
            </div>
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
            Add to Print Queue
          </button>
        </div>
      </div>
    </div>
  );
}
