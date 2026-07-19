'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import { PATIENT_CATEGORY_OPTIONS } from '@/features/registration/__mocks__/registerPatientOptions';

export function AssignCategoryModal({
  patientCount,
  onClose,
  onAssign,
}: {
  patientCount: number;
  onClose: () => void;
  onAssign: (category: string) => void;
}) {
  const [category, setCategory] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleAssign() {
    setSubmitted(true);
    if (!category) return;
    onAssign(category);
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
        style={{ maxWidth: 440, borderRadius: 16 }}
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
              Assign Category
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Applies to {patientCount} selected patient{patientCount !== 1 ? 's' : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="px-6 py-5">
          <FormField
            label="Patient Category"
            htmlFor="assign-category"
            required
            error={submitted && !category ? 'Required' : undefined}
          >
            <FormSelect
              id="assign-category"
              value={category}
              onChange={setCategory}
              options={PATIENT_CATEGORY_OPTIONS}
              placeholder="Select category"
              hasError={submitted && !category}
            />
          </FormField>
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
            onClick={handleAssign}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
