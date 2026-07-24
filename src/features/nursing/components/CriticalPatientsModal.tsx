'use client';

import { AlertTriangle, Check, X } from 'lucide-react';

import type { CriticalPatientRow } from '@/features/nursing/__mocks__/shiftHandoverFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Unstable: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  Watch: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
};

export function CriticalPatientsModal({
  patients,
  reviewedBeds,
  onToggleReviewed,
  onClose,
}: {
  patients: CriticalPatientRow[];
  reviewedBeds: Set<string>;
  onToggleReviewed: (bed: string) => void;
  onClose: () => void;
}) {
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
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle style={{ width: 20, height: 20, color: '#EF4444' }} />
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Critical Patients
            </h2>
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
          <div className="flex flex-col gap-3">
            {patients.map((p) => {
              const cfg = STATUS_CFG[p.status]!;
              const reviewed = reviewedBeds.has(p.bed);
              return (
                <div
                  key={p.bed}
                  className="rounded-[10px] p-3.5"
                  style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.1)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {p.patientName}
                        </span>
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Bed {p.bed}</span>
                      </div>
                      <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                        {p.diagnosis}
                      </p>
                      <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                        {p.reason}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: cfg.color,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleReviewed(p.bed)}
                    className={`mt-2.5 flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                    style={
                      reviewed
                        ? {
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.35)',
                            color: '#16A34A',
                            fontSize: 14,
                          }
                        : {
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.15)',
                            color: '#0D2630',
                            fontSize: 14,
                          }
                    }
                  >
                    {reviewed && <Check style={{ width: 14, height: 14 }} />}
                    {reviewed ? 'Reviewed at handover' : 'Mark Reviewed'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="flex shrink-0 justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ background: '#00B4D8', fontSize: 14 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
