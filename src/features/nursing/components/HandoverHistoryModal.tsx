'use client';

import { Clock, History, X } from 'lucide-react';

import { HANDOVER_HISTORY } from '@/features/nursing/__mocks__/shiftHandoverFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const SHIFT_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Day: { color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
  Night: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
};

export function HandoverHistoryModal({ onClose }: { onClose: () => void }) {
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
            <History style={{ width: 20, height: 20, color: '#00B4D8' }} />
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Handover History
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
            {HANDOVER_HISTORY.map((entry) => {
              const cfg = SHIFT_CFG[entry.shiftType]!;
              return (
                <div
                  key={entry.id}
                  className="rounded-[10px] p-3.5"
                  style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.1)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {entry.shiftDateLabel}
                    </p>
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: cfg.color,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      {entry.shiftType} Shift
                    </span>
                  </div>
                  <p className="mt-1.5" style={{ fontSize: 14, color: '#4A7080' }}>
                    {entry.outgoingNurse} → {entry.incomingNurse} · {entry.ward}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Clock style={{ width: 13, height: 13, color: '#8A98A3' }} />
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>
                      Completed {entry.completedAtLabel}
                    </span>
                  </div>
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
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ border: '1px solid rgba(0,100,130,0.15)', color: '#0D2630', fontSize: 14 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
