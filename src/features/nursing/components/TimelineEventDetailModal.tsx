'use client';

import { Lock, X } from 'lucide-react';

import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  TIMELINE_CATEGORY_CFG,
  type ClinicalTimelineEvent,
} from '@/features/nursing/__mocks__/clinicalTimelineFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
      <span className="text-right font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value}
      </span>
    </div>
  );
}

export function TimelineEventDetailModal({
  event,
  patientName,
  mrn,
  onClose,
}: {
  event: ClinicalTimelineEvent;
  patientName: string;
  mrn: string;
  onClose: () => void;
}) {
  const cfg = TIMELINE_CATEGORY_CFG[event.category];

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
          <div className="min-w-0">
            <span
              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{
                fontSize: 14,
                color: cfg.color,
                background: cfg.badgeBg,
                border: `1px solid ${cfg.badgeBorder}`,
              }}
            >
              {cfg.label}
            </span>
            <h2
              className="font-display mt-2 font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              {event.title}
            </h2>
            <p className="mt-0.5 truncate" style={{ fontSize: 14, color: '#4A7080' }}>
              {patientName} · MRN: {mrn}
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
          <div className="flex flex-col gap-4">
            <div
              className="flex flex-col gap-2 rounded-[10px] p-3.5"
              style={{ background: '#F5FBFD' }}
            >
              <Row
                label="Occurred At"
                value={`${formatHumanDate(event.occurredAt)}, ${formatTime(event.occurredAt)}`}
              />
              <Row label="Recorded By" value={`${event.actor} — ${event.actorRole}`} />
            </div>

            <div>
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                Details
              </p>
              <p className="mt-1" style={{ fontSize: 14, color: '#2F3A40', lineHeight: '22px' }}>
                {event.detail}
              </p>
            </div>

            <div
              className="flex items-start gap-2 rounded-[10px] p-3"
              style={{ background: 'rgba(0,100,130,0.05)' }}
            >
              <Lock
                className="mt-0.5 shrink-0"
                style={{ width: 14, height: 14, color: '#8A98A3' }}
              />
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                This is a read-only record of a past clinical event and cannot be edited.
              </p>
            </div>
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
