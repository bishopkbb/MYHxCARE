'use client';

import { ChevronLeft, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { FormTextarea } from '@components/shared/FormTextarea';
import { Tooltip } from '@components/shared/Tooltip';
import { toWATDateInput } from '@/utils/datetime';
import {
  ADR_CAUSALITY_OPTIONS,
  ADR_DRUG_CLASS_OPTIONS,
  ADR_SEVERITY_OPTIONS,
  ADR_SUSPECTED_DRUG_SUGGESTIONS,
  type ADRCausality,
  type ADRDrugClass,
  type ADRSeverity,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import type { DirectoryPatient } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import { useDirectoryPatients } from '@/features/registration/store/patientDirectoryStore';
import type { CreateADRReportInput } from '@/features/pharmacy/store/adrReportStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
} as const;

/** Reports a new ADR — lazy-loaded (checklist §14). Two steps in one modal:
 * pick a real patient from the live directory first (so the allergy banner
 * and MRN are genuine, not free text), then fill in the clinical detail. */
export function ReportNewADRModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (input: CreateADRReportInput) => void;
  onClose: () => void;
}) {
  const directoryPatients = useDirectoryPatients();

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<DirectoryPatient | null>(null);

  const [drugInput, setDrugInput] = useState('');
  const [suspectedDrugs, setSuspectedDrugs] = useState<string[]>([]);
  const [drugClass, setDrugClass] = useState<ADRDrugClass | ''>('');
  const [reaction, setReaction] = useState('');
  const [severity, setSeverity] = useState<ADRSeverity | ''>('');
  const [causality, setCausality] = useState<ADRCausality | ''>('');
  const [onsetDate, setOnsetDate] = useState(toWATDateInput());
  const [actionTaken, setActionTaken] = useState('');
  const [notes, setNotes] = useState('');

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return directoryPatients.slice(0, 8);
    return directoryPatients
      .filter((p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q))
      .slice(0, 8);
  }, [directoryPatients, patientSearch]);

  function handleAddDrug() {
    const value = drugInput.trim();
    if (!value) return;
    if (suspectedDrugs.some((d) => d.toLowerCase() === value.toLowerCase())) return;
    setSuspectedDrugs((prev) => [...prev, value]);
    setDrugInput('');
  }

  function removeDrug(index: number) {
    setSuspectedDrugs((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit =
    selectedPatient !== null &&
    suspectedDrugs.length > 0 &&
    drugClass !== '' &&
    reaction.trim() !== '' &&
    severity !== '' &&
    causality !== '' &&
    onsetDate !== '';

  function handleSubmit() {
    if (!canSubmit || !selectedPatient) return;
    onSubmit({
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      mrn: selectedPatient.mrn,
      suspectedDrugs,
      drugClass,
      reaction: reaction.trim(),
      severity,
      causality,
      onsetDate,
      ...(actionTaken.trim() ? { actionTaken: actionTaken.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
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
        style={{ maxWidth: 640, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="min-w-0">
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Report New ADR
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {selectedPatient
                ? 'Fill in the clinical detail below.'
                : 'Select the patient this reaction was observed in.'}
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

        {!selectedPatient ? (
          <>
            <div className="shrink-0 px-6 pt-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                />
                <input
                  type="text"
                  autoFocus
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search by patient name or MRN..."
                  className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={FIELD_INPUT_STYLE}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-2 py-3">
              {filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Search style={{ width: 20, height: 20, color: '#8A98A3' }} />
                  </div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>No patients match your search.</p>
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatient(patient)}
                    className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-medium text-white"
                      style={{ background: patient.avatarBg, fontSize: 14 }}
                    >
                      {patient.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Tooltip content={patient.name}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {patient.name}
                        </p>
                      </Tooltip>
                      <Tooltip content={patient.mrn}>
                        <p
                          className="truncate font-sans"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {patient.mrn}
                        </p>
                      </Tooltip>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
              <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#F5FBFD] px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-medium text-white"
                    style={{ background: selectedPatient.avatarBg, fontSize: 14 }}
                  >
                    {selectedPatient.initials}
                  </div>
                  <div className="min-w-0">
                    <Tooltip content={selectedPatient.name}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selectedPatient.name}
                      </p>
                    </Tooltip>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{selectedPatient.mrn}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className={`flex h-9 shrink-0 items-center gap-1 rounded-[8px] px-2.5 font-sans font-medium transition-colors duration-150 hover:bg-white ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} />
                  Change
                </button>
              </div>

              <AllergyBanner allergies={selectedPatient.allergies} className="mt-3" />

              <div className="mt-4">
                <label className="mb-1.5 block font-sans font-medium" style={FIELD_LABEL}>
                  Suspected Drug(s) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    list="adr-drug-suggestions"
                    value={drugInput}
                    onChange={(e) => setDrugInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDrug();
                      }
                    }}
                    placeholder="e.g. Amoxicillin 500mg"
                    className={FIELD_INPUT_CLASS}
                    style={FIELD_INPUT_STYLE}
                  />
                  <datalist id="adr-drug-suggestions">
                    {ADR_SUSPECTED_DRUG_SUGGESTIONS.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={handleAddDrug}
                    disabled={!drugInput.trim()}
                    aria-label="Add suspected drug"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                    style={{ background: '#00B4D8' }}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                {suspectedDrugs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suspectedDrugs.map((drug, index) => (
                      <span
                        key={drug}
                        className="flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-3"
                        style={{
                          background: 'rgba(0,180,216,0.08)',
                          border: '1px solid rgba(0,180,216,0.3)',
                        }}
                      >
                        <span style={{ fontSize: 14, color: '#0D2630' }}>{drug}</span>
                        <button
                          type="button"
                          onClick={() => removeDrug(index)}
                          aria-label={`Remove ${drug}`}
                          className={`flex size-6 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.08)] ${FOCUS_RING}`}
                        >
                          <X style={{ width: 12, height: 12, color: '#4A7080' }} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label
                  htmlFor="adr-drug-class"
                  className="mb-1.5 block font-sans font-medium"
                  style={FIELD_LABEL}
                >
                  Drug Class *
                </label>
                <FormSelect
                  id="adr-drug-class"
                  value={drugClass}
                  onChange={(v) => setDrugClass(v as ADRDrugClass)}
                  options={ADR_DRUG_CLASS_OPTIONS}
                  placeholder="Select drug class"
                />
              </div>

              <div className="mt-4">
                <label
                  htmlFor="adr-reaction"
                  className="mb-1.5 block font-sans font-medium"
                  style={FIELD_LABEL}
                >
                  Reaction / Adverse Event *
                </label>
                <FormTextarea
                  id="adr-reaction"
                  value={reaction}
                  onChange={(e) => setReaction(e.target.value)}
                  placeholder="Describe the observed reaction, e.g. Skin rash, itching"
                  rows={2}
                  className="w-full"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="adr-severity"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Severity *
                  </label>
                  <FormSelect
                    id="adr-severity"
                    value={severity}
                    onChange={(v) => setSeverity(v as ADRSeverity)}
                    options={ADR_SEVERITY_OPTIONS}
                    placeholder="Select severity"
                  />
                </div>
                <div>
                  <label
                    htmlFor="adr-causality"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Causality Assessment *
                  </label>
                  <FormSelect
                    id="adr-causality"
                    value={causality}
                    onChange={(v) => setCausality(v as ADRCausality)}
                    options={ADR_CAUSALITY_OPTIONS}
                    placeholder="Select assessment"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="adr-onset"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Onset Date *
                  </label>
                  <FormDateInput
                    id="adr-onset"
                    value={onsetDate}
                    max={toWATDateInput()}
                    onChange={(e) => setOnsetDate(e.target.value)}
                    className="h-11 w-full"
                  />
                </div>
                <div>
                  <label
                    htmlFor="adr-action-taken"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Action Taken (Optional)
                  </label>
                  <input
                    id="adr-action-taken"
                    type="text"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="e.g. Drug discontinued"
                    className={FIELD_INPUT_CLASS}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="adr-notes"
                  className="mb-1.5 block font-sans font-medium"
                  style={FIELD_LABEL}
                >
                  Additional Notes (Optional)
                </label>
                <FormTextarea
                  id="adr-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any other relevant clinical context"
                  rows={2}
                  className="w-full"
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
                className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#4A7080', border: '1px solid rgba(0,100,130,0.18)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0F766E' }}
              >
                Submit Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
