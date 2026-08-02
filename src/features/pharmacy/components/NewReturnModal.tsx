'use client';

import { ChevronLeft, Package, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { Tooltip } from '@components/shared/Tooltip';
import { formatCurrency } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import {
  INVENTORY_CATALOG,
  RETURN_REASON_OPTIONS,
  RETURN_TYPE_OPTIONS,
  RETURN_REASON_CATEGORIES,
  type DispensingActivityEntry,
  type InventoryCatalogEntry,
  type RefundType,
  type ReturnReasonCategory,
  type ReturnType,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import type { DirectoryPatient } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import { useDirectoryPatients } from '@/features/registration/store/patientDirectoryStore';
import { useRecentDispensingActivity } from '@/features/pharmacy/store/pharmacyDispensingStore';
import type { CreateReturnInput } from '@/features/pharmacy/store/medicationReturnsStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
} as const;

/** Reasons not called out in the donut's own 4 named buckets all roll up
 * into "Others" — matches the same categorization the seed generator uses. */
function categoryForReason(reason: string): ReturnReasonCategory {
  const named = RETURN_REASON_CATEGORIES.slice(0, 4) as string[];
  return named.includes(reason) ? (reason as ReturnReasonCategory) : 'Others';
}

function matchCatalogEntry(medicationName: string): InventoryCatalogEntry | null {
  return (
    INVENTORY_CATALOG.find((c) => medicationName.toLowerCase().startsWith(c.name.toLowerCase())) ??
    null
  );
}

/** Records a new return — lazy-loaded (checklist §14). Two steps in one
 * modal: pick a real patient from the live directory first, then either
 * select from that patient's own real dispensing history or search the
 * catalog directly — either way the return is tied to real medication data
 * (strength, category, unit price), not free text. */
export function NewReturnModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (input: CreateReturnInput) => void;
  onClose: () => void;
}) {
  const directoryPatients = useDirectoryPatients();
  const allDispensingActivity = useRecentDispensingActivity();

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<DirectoryPatient | null>(null);

  const [medicationInput, setMedicationInput] = useState('');
  const [qtyReturned, setQtyReturned] = useState('');
  const [returnType, setReturnType] = useState<ReturnType | ''>('');
  const [reason, setReason] = useState('');
  const [refundType, setRefundType] = useState<RefundType | ''>('');
  const [refundAmount, setRefundAmount] = useState('');

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return directoryPatients.slice(0, 8);
    return directoryPatients
      .filter((p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q))
      .slice(0, 8);
  }, [directoryPatients, patientSearch]);

  const patientDispenseHistory = useMemo(() => {
    if (!selectedPatient) return [];
    return allDispensingActivity.filter((a) => a.patientId === selectedPatient.id).slice(0, 5);
  }, [allDispensingActivity, selectedPatient]);

  const matchedCatalog = useMemo(() => matchCatalogEntry(medicationInput), [medicationInput]);

  function handlePickDispensed(activity: DispensingActivityEntry) {
    const catalogMatch = matchCatalogEntry(activity.medicationName);
    setMedicationInput(catalogMatch?.name ?? activity.medicationName);
    setQtyReturned(String(activity.qty));
    if (catalogMatch) {
      const suggested = Math.round((activity.qty * catalogMatch.unitPrice) / 50) * 50;
      setRefundAmount(String(suggested));
      setRefundType('Credit Note');
    }
  }

  const canSubmit =
    selectedPatient !== null &&
    matchedCatalog !== null &&
    qtyReturned.trim() !== '' &&
    Number(qtyReturned) > 0 &&
    returnType !== '' &&
    reason !== '' &&
    refundType !== '' &&
    refundAmount.trim() !== '' &&
    Number(refundAmount) >= 0;

  function handleSubmit() {
    if (!canSubmit || !selectedPatient || !matchedCatalog) return;
    onSubmit({
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      mrn: selectedPatient.mrn,
      medicationName: matchedCatalog.name,
      strength: matchedCatalog.strength,
      form: matchedCatalog.form,
      category: matchedCatalog.category,
      unitPrice: matchedCatalog.unitPrice,
      qtyReturned: Number(qtyReturned),
      returnType,
      reason,
      reasonCategory: categoryForReason(reason),
      refundType,
      refundAmount: Number(refundAmount),
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
              New Return
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {selectedPatient
                ? 'Record the medication being returned.'
                : 'Select the patient returning medication.'}
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

              {patientDispenseHistory.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 font-sans font-medium" style={FIELD_LABEL}>
                    Recently Dispensed to This Patient
                  </p>
                  <div className="flex flex-col gap-2">
                    {patientDispenseHistory.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handlePickDispensed(a)}
                        className={`flex items-center justify-between gap-2 rounded-[8px] p-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="min-w-0 flex-1">
                          <Tooltip content={a.medicationName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {a.medicationName}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            Qty {a.qty} · {formatHumanDate(a.dispensedAt)}
                          </p>
                        </div>
                        <Package
                          style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label
                  htmlFor="ret-medication"
                  className="mb-1.5 block font-sans font-medium"
                  style={FIELD_LABEL}
                >
                  Medication *
                </label>
                <input
                  id="ret-medication"
                  type="text"
                  list="ret-medication-suggestions"
                  value={medicationInput}
                  onChange={(e) => setMedicationInput(e.target.value)}
                  placeholder="Search the drug catalog..."
                  className={FIELD_INPUT_CLASS}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: `1px solid ${medicationInput && !matchedCatalog ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                  }}
                />
                <datalist id="ret-medication-suggestions">
                  {INVENTORY_CATALOG.map((c) => (
                    <option key={c.name} value={c.name} />
                  ))}
                </datalist>
                {medicationInput && !matchedCatalog && (
                  <p className="mt-1" style={{ fontSize: 14, color: '#DC2626' }}>
                    Pick a medication from the catalog list.
                  </p>
                )}
                {matchedCatalog && (
                  <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                    {matchedCatalog.strength} · {matchedCatalog.form} ·{' '}
                    {formatCurrency(matchedCatalog.unitPrice)}/unit
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="ret-qty"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Qty Returned *
                  </label>
                  <input
                    id="ret-qty"
                    type="number"
                    min={1}
                    value={qtyReturned}
                    onChange={(e) => setQtyReturned(e.target.value)}
                    placeholder="e.g. 10"
                    className={FIELD_INPUT_CLASS}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label
                    htmlFor="ret-type"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Return Type *
                  </label>
                  <FormSelect
                    id="ret-type"
                    value={returnType}
                    onChange={(v) => setReturnType(v as ReturnType)}
                    options={RETURN_TYPE_OPTIONS}
                    placeholder="Select type"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="ret-reason"
                  className="mb-1.5 block font-sans font-medium"
                  style={FIELD_LABEL}
                >
                  Reason *
                </label>
                <FormSelect
                  id="ret-reason"
                  value={reason}
                  onChange={setReason}
                  options={RETURN_REASON_OPTIONS}
                  placeholder="Select reason"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="ret-refund-type"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Refund / Adjustment *
                  </label>
                  <FormSelect
                    id="ret-refund-type"
                    value={refundType}
                    onChange={(v) => setRefundType(v as RefundType)}
                    options={[
                      { value: 'Refund', label: 'Refund' },
                      { value: 'Credit Note', label: 'Credit Note' },
                      { value: 'None', label: 'None' },
                    ]}
                    placeholder="Select type"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ret-refund-amount"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Amount (₦) *
                  </label>
                  <input
                    id="ret-refund-amount"
                    type="number"
                    min={0}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className={FIELD_INPUT_CLASS}
                    style={FIELD_INPUT_STYLE}
                  />
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
                Record Return
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
