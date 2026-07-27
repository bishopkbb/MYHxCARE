'use client';

import { CheckCircle2, ChevronLeft, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import { formatDateTime } from '@/utils/datetime';
import type { PharmacyQueueEntry } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Medium: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Low: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

/** Verify & dispense flow for a pending prescription — lazy-loaded (checklist
 * §14). Opened either pre-targeted at one queue row (row-level action) or
 * with no target (Quick Actions tiles), in which case the pharmacist picks
 * from the pending list first. */
export function VerifyDispenseModal({
  pendingQueue,
  initialRxNo,
  onClose,
  onDispense,
}: {
  pendingQueue: PharmacyQueueEntry[];
  initialRxNo?: string;
  onClose: () => void;
  onDispense: (rxNo: string) => void;
}) {
  const [selectedRxNo, setSelectedRxNo] = useState<string | null>(initialRxNo ?? null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingQueue;
    return pendingQueue.filter((e) => {
      const patient = getPatientDetail(e.patientId);
      return (
        patient.name.toLowerCase().includes(q) ||
        e.medicationName.toLowerCase().includes(q) ||
        e.rxNo.toLowerCase().includes(q)
      );
    });
  }, [pendingQueue, search]);

  const selected = selectedRxNo ? pendingQueue.find((e) => e.rxNo === selectedRxNo) : null;
  const patient = selected ? getPatientDetail(selected.patientId) : null;

  function handleConfirm() {
    if (!selected) return;
    onDispense(selected.rxNo);
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
          <div className="flex min-w-0 items-center gap-2">
            {selected && !initialRxNo && (
              <button
                type="button"
                onClick={() => setSelectedRxNo(null)}
                aria-label="Back to list"
                className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
              >
                <ChevronLeft style={{ width: 20, height: 20, color: '#4A7080' }} />
              </button>
            )}
            <div className="min-w-0">
              <h2
                className="font-display font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
              >
                Verify &amp; Dispense
              </h2>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                {selected ? `Rx ${selected.rxNo}` : 'Select a pending prescription'}
              </p>
            </div>
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
          {!selected ? (
            <div className="flex flex-col gap-3.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient, medication, or Rx No…"
                  className={`h-11 w-full rounded-[10px] pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
              {filtered.length === 0 ? (
                <p className="py-6 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No pending prescriptions match your search.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.slice(0, 20).map((entry) => {
                    const p = getPatientDetail(entry.patientId);
                    const cfg = PRIORITY_CFG[entry.priority]!;
                    return (
                      <button
                        key={entry.rxNo}
                        type="button"
                        onClick={() => setSelectedRxNo(entry.rxNo)}
                        className={`flex items-center justify-between gap-3 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {p.name}
                          </p>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {entry.medicationName} {entry.dose} · {entry.rxNo}
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            background: cfg.bg,
                          }}
                        >
                          {entry.priority}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AllergyBanner allergies={patient!.allergies} />
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Patient</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {patient!.name}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {patient!.mrn}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Medication</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {selected.medicationName} {selected.dose}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Frequency</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {selected.frequency}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Prescribed By</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {selected.doctorName}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Received</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatDateTime(selected.receivedAt)}
                  </p>
                </div>
              </div>
              <div
                className="flex items-start gap-2.5 rounded-[10px] p-3"
                style={{
                  background: 'rgba(0,180,216,0.06)',
                  border: '1px solid rgba(0,180,216,0.25)',
                }}
              >
                <CheckCircle2
                  style={{ width: 16, height: 16, color: '#00B4D8' }}
                  className="mt-0.5 shrink-0"
                />
                <p style={{ fontSize: 14, color: '#0D2630' }}>
                  Confirm the medication and dose match the prescription before dispensing.
                </p>
              </div>
            </div>
          )}
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
            disabled={!selected}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <CheckCircle2 style={{ width: 15, height: 15 }} />
            Verify &amp; Dispense
          </button>
        </div>
      </div>
    </div>
  );
}
