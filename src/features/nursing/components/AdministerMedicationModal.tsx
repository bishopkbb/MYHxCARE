'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import type { Allergy } from '@/types/patient.types';
import { formatTime } from '@/utils/datetime';
import type { MedicationOrder } from '@/features/nursing/__mocks__/medicationAdministrationFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const RIGHTS_CHECKLIST = [
  'Correct Patient',
  'Correct Medication',
  'Correct Dose',
  'Correct Route',
  'Correct Time',
];

export type AdministerResult = { remarks: string };

export function AdministerMedicationModal({
  order,
  patientName,
  allergies,
  onClose,
  onConfirm,
}: {
  order: MedicationOrder;
  patientName: string;
  allergies: Allergy[];
  onClose: () => void;
  onConfirm: (result: AdministerResult) => void;
}) {
  const [checked, setChecked] = useState<boolean[]>(() => RIGHTS_CHECKLIST.map(() => false));
  const [remarks, setRemarks] = useState('');

  const allChecked = checked.every(Boolean);

  function toggle(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function handleConfirm() {
    if (!allChecked) return;
    onConfirm({ remarks: remarks.trim() || 'Administered as scheduled.' });
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
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Administer Medication
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              For {patientName}
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
          <div
            className="rounded-[12px] p-4"
            style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              {order.medication}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Dose</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {order.dose}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Route</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {order.route}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Frequency</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {order.frequency}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Time Due</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {order.timeDueLabel ?? formatTime(order.timeDue)}
                </p>
              </div>
            </div>
          </div>

          <AllergyBanner allergies={allergies} className="mt-4" />

          <div className="mt-4">
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              Verify before administering
            </p>
            <div className="mt-1 flex flex-col gap-1">
              {RIGHTS_CHECKLIST.map((label, i) => (
                <label
                  key={label}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[8px] py-1 transition-colors duration-150 hover:bg-[#F5FBFD]"
                >
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() => toggle(i)}
                    className="size-4 shrink-0 cursor-pointer rounded"
                    style={{ accentColor: '#00B4D8' }}
                  />
                  <span style={{ fontSize: 14, color: '#0D2630' }}>{label}</span>
                </label>
              ))}
            </div>
            {!allChecked && (
              <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                Confirm all 5 rights to enable Confirm Administration.
              </p>
            )}
          </div>

          <div className="mt-4">
            <label
              htmlFor="administer-remarks"
              className="block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Remarks
            </label>
            <textarea
              id="administer-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value.slice(0, 200))}
              placeholder="e.g. Tolerated well, no reaction observed..."
              rows={3}
              maxLength={200}
              className={`mt-1.5 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
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
            onClick={handleConfirm}
            disabled={!allChecked}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Confirm Administration
          </button>
        </div>
      </div>
    </div>
  );
}
