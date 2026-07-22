'use client';

import { X } from 'lucide-react';

import { formatDateTime } from '@/utils/datetime';
import type { CarePlan } from '@/features/nursing/__mocks__/carePlansFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function CarePlanTimelineModal({
  plans,
  patientName,
  onClose,
}: {
  plans: CarePlan[];
  patientName: string;
  onClose: () => void;
}) {
  const entries = plans
    .flatMap((p) =>
      p.progressEntries.map((e) => ({
        ...e,
        planProblem: p.problem,
        accentColor: p.accentColor,
      })),
    )
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

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
              Care Plan Timeline
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Every progress entry across {patientName}&apos;s active care plans.
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
          {entries.length === 0 ? (
            <p style={{ fontSize: 14, color: '#8A98A3' }}>No progress entries recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {entries.map((e) => (
                <div key={e.id} className="flex gap-3">
                  <span
                    className="mt-1.5 size-2.5 shrink-0 rounded-full"
                    style={{ background: e.accentColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {e.planProblem}
                      </p>
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>
                        {formatDateTime(e.time)}
                      </span>
                    </div>
                    <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                      {e.note}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>By {e.authorName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
