'use client';

import { CalendarPlus, X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import type { NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import type { DischargeType } from '@/features/nursing/__mocks__/dischargesFixtures';
import { DISCHARGE_TYPE_LABELS } from '@/features/nursing/__mocks__/dischargesFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const DISCHARGE_TYPE_OPTIONS: { value: DischargeType; label: string }[] = (
  Object.entries(DISCHARGE_TYPE_LABELS) as [DischargeType, string][]
).map(([value, label]) => ({ value, label }));

export type PlanDischargeInput = {
  patientId: string;
  dischargeType: DischargeType;
  plannedDischargeAt: string; // ISO
  notes: string;
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PlanDischargeModal({
  eligiblePatients,
  onClose,
  onConfirm,
}: {
  eligiblePatients: NursePatient[];
  onClose: () => void;
  onConfirm: (input: PlanDischargeInput) => void;
}) {
  const [patientId, setPatientId] = useState(eligiblePatients[0]?.id ?? '');
  const [dischargeType, setDischargeType] = useState<DischargeType>('Routine');
  const [plannedDischargeAt, setPlannedDischargeAt] = useState(toLocalInputValue(new Date()));
  const [notes, setNotes] = useState('');

  const patientOptions = eligiblePatients.map((p) => ({
    value: p.id,
    label: `${p.patientName} — ${p.ward}, ${p.bed}`,
  }));
  const selectedPatient = eligiblePatients.find((p) => p.id === patientId);
  const canSave = patientId !== '' && !!selectedPatient;

  function handleSave() {
    if (!canSave) return;
    onConfirm({
      patientId,
      dischargeType,
      plannedDischargeAt: new Date(plannedDischargeAt).toISOString(),
      notes: notes.trim(),
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
              Plan Discharge
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Start a discharge plan for a patient currently on the ward.
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
            {eligiblePatients.length === 0 ? (
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                Every patient on your roster already has an active discharge plan.
              </p>
            ) : (
              <FormField label="Patient" htmlFor="pd-patient" required>
                <FormSelect
                  id="pd-patient"
                  value={patientId}
                  onChange={setPatientId}
                  options={patientOptions}
                  placeholder="Select patient"
                />
              </FormField>
            )}

            {selectedPatient && (
              <div
                className="rounded-[10px] px-3.5 py-3"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {selectedPatient.diagnosis}
                </p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  {selectedPatient.mrn} · {selectedPatient.doctorName}
                </p>
              </div>
            )}

            <FormField label="Discharge Type" htmlFor="pd-type">
              <FormSelect
                id="pd-type"
                value={dischargeType}
                onChange={(v) => setDischargeType(v as DischargeType)}
                options={DISCHARGE_TYPE_OPTIONS}
                placeholder="Select type"
              />
            </FormField>

            <FormField label="Planned Discharge Date & Time" htmlFor="pd-planned">
              <input
                id="pd-planned"
                type="datetime-local"
                value={plannedDischargeAt}
                onChange={(e) => setPlannedDischargeAt(e.target.value)}
                className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </FormField>

            <FormField label="Notes" htmlFor="pd-notes">
              <textarea
                id="pd-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                rows={3}
                maxLength={500}
                placeholder="e.g. Follow-up booked, transport arranged by family"
                className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
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
            disabled={!canSave}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <CalendarPlus style={{ width: 15, height: 15 }} />
            Create Plan
          </button>
        </div>
      </div>
    </div>
  );
}
