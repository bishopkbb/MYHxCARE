'use client';

import { X } from 'lucide-react';

import { formatHumanDate, formatTime } from '@/utils/datetime';
import { deriveLatestVitals } from '@/features/emergency/__mocks__/emergencyFixtures';
import type { VisitHistoryEntry } from '@/features/emergency/__mocks__/emergencyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const DISPOSITION_CFG: Record<string, { color: string; bg: string }> = {
  Discharged: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Admitted: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Observation: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  'Left AMA': { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  Transferred: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
};

export function VisitDetailModal({
  visit,
  patientName,
  onClose,
}: {
  visit: VisitHistoryEntry;
  patientName: string;
  onClose: () => void;
}) {
  const vitals = deriveLatestVitals(visit.id);
  const cfg = DISPOSITION_CFG[visit.disposition] ?? {
    color: '#4A7080',
    bg: 'rgba(74,112,128,0.1)',
  };

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
        style={{ maxWidth: 520, borderRadius: 16, maxHeight: '85vh' }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
              Emergency Visit — {visit.visitId}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {patientName} · {formatHumanDate(visit.dateTime)}, {formatTime(visit.dateTime)}
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

        <div className="overflow-y-auto scroll-smooth px-6 py-5">
          <span
            className="inline-flex items-center rounded-[6px] px-2.5 py-1 font-sans font-semibold"
            style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
          >
            {visit.disposition}
          </span>

          <div className="mt-3.5 grid grid-cols-2 gap-3.5">
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Chief Complaint</p>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {visit.chiefComplaint}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Diagnosis</p>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {visit.diagnosis}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Provider</p>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {visit.provider}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Visit Type</p>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Emergency
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Vital Signs at Visit
            </p>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>BP</p>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {vitals.bp}
                </p>
              </div>
              <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>HR</p>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {vitals.hr}
                </p>
              </div>
              <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>RR</p>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {vitals.rr}
                </p>
              </div>
              <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>SpO₂</p>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {vitals.spo2}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
