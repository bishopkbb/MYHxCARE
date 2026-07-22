'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const NURSE_OPTIONS = [
  { value: 'Nurse Grace E.|NUR-0248', label: 'Nurse Grace E. (NUR-0248)' },
  { value: 'Nurse Clara M.|NUR-0193', label: 'Nurse Clara M. (NUR-0193)' },
  { value: 'Nurse Ifeoma K.|NUR-0157', label: 'Nurse Ifeoma K. (NUR-0157)' },
];

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export type CarePlanDraftInput = {
  problem: string;
  problemDetail: string;
  goal: string;
  startDate: string;
  nextReviewDate: string;
  assignedNurse: string;
  interventions: string[];
};

export function CreateCarePlanModal({
  patientName,
  initial,
  isEdit,
  onClose,
  onSave,
}: {
  patientName: string;
  initial?: Partial<CarePlanDraftInput> & { startDateIso?: string; nextReviewIso?: string };
  isEdit?: boolean;
  onClose: () => void;
  onSave: (draft: CarePlanDraftInput) => void;
}) {
  const [problem, setProblem] = useState(initial?.problem ?? '');
  const [problemDetail, setProblemDetail] = useState(initial?.problemDetail ?? 'Related to ');
  const [goal, setGoal] = useState(initial?.goal ?? '');
  const [startDate, setStartDate] = useState(
    initial?.startDateIso
      ? toDateInputValue(initial.startDateIso)
      : toDateInputValue(new Date().toISOString()),
  );
  const [nextReviewDate, setNextReviewDate] = useState(
    initial?.nextReviewIso ? toDateInputValue(initial.nextReviewIso) : '',
  );
  const [assignedNurse, setAssignedNurse] = useState(
    initial?.assignedNurse ?? NURSE_OPTIONS[0]!.value,
  );
  const [interventions, setInterventions] = useState<string[]>(
    initial?.interventions && initial.interventions.length > 0 ? initial.interventions : [''],
  );

  const canSave = problem.trim() !== '' && goal.trim() !== '' && nextReviewDate !== '';

  function updateIntervention(i: number, value: string) {
    setInterventions((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function removeIntervention(i: number) {
    setInterventions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (!canSave) return;
    onSave({
      problem: problem.trim(),
      problemDetail: problemDetail.trim(),
      goal: goal.trim(),
      startDate,
      nextReviewDate,
      assignedNurse,
      interventions: interventions.map((i) => i.trim()).filter(Boolean),
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
        style={{ maxWidth: 640, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              {isEdit ? 'Edit Care Plan' : 'Create New Care Plan'}
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
          <div className="flex flex-col gap-3.5">
            <FormField label="Problem / Nursing Diagnosis" htmlFor="cp-problem" required>
              <input
                id="cp-problem"
                type="text"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="e.g. Acute Pain"
                className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </FormField>

            <FormField label="Related To" htmlFor="cp-detail">
              <input
                id="cp-detail"
                type="text"
                value={problemDetail}
                onChange={(e) => setProblemDetail(e.target.value)}
                placeholder="e.g. Related to surgical incision"
                className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </FormField>

            <FormField label="Goal" htmlFor="cp-goal" required>
              <textarea
                id="cp-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value.slice(0, 500))}
                rows={2}
                maxLength={500}
                placeholder="e.g. Patient will report pain score ≤ 3/10 within 24 hours."
                className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <FormField label="Start Date" htmlFor="cp-start">
                <input
                  id="cp-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </FormField>
              <FormField label="Next Review Date" htmlFor="cp-review" required>
                <input
                  id="cp-review"
                  type="date"
                  value={nextReviewDate}
                  onChange={(e) => setNextReviewDate(e.target.value)}
                  className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </FormField>
            </div>

            <FormField label="Assigned Nurse" htmlFor="cp-nurse">
              <FormSelect
                id="cp-nurse"
                value={assignedNurse}
                onChange={setAssignedNurse}
                options={NURSE_OPTIONS}
                placeholder="Select nurse"
              />
            </FormField>

            <div>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Interventions
              </p>
              <div className="mt-1.5 flex flex-col gap-2">
                {interventions.map((value, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateIntervention(i, e.target.value)}
                      placeholder="e.g. Assess pain level q4h and PRN"
                      className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeIntervention(i)}
                      aria-label="Remove intervention"
                      className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.1)] ${FOCUS_RING}`}
                    >
                      <Trash2 style={{ width: 16, height: 16, color: '#EF4444' }} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setInterventions((prev) => [...prev, ''])}
                className={`mt-2 flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8', border: '1px dashed rgba(0,180,216,0.4)' }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Add Intervention
              </button>
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
            {isEdit ? 'Save Changes' : 'Create Care Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
