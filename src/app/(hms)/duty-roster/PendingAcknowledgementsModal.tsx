'use client';

import { X } from 'lucide-react';

import { PENDING_ACKNOWLEDGEMENTS } from '@/features/workforce/__mocks__/workforceFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function PendingAcknowledgementsModal({
  onClose,
  onSetReminder,
}: {
  onClose: () => void;
  onSetReminder: (doctorName: string) => void;
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
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #0064821F' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Pending Shifts Acknowledgement
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              {PENDING_ACKNOWLEDGEMENTS.length} doctors awaiting acknowledgement
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto scroll-smooth px-4 py-3">
          {PENDING_ACKNOWLEDGEMENTS.map((ack) => (
            <div
              key={ack.id}
              className="flex items-center gap-3 rounded-[10px] px-2 py-2.5"
              style={{ border: '1px solid rgba(0,100,130,0.08)' }}
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                style={{ background: ack.avatarBg }}
              >
                {ack.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {ack.doctorName}
                </p>
                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                  {ack.shiftLabel} • {ack.day}
                </p>
              </div>
              <span
                className="hidden shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium sm:inline"
                style={{
                  fontSize: 14,
                  color: '#F59E0B',
                  border: '1px solid rgba(245,158,11,0.40)',
                  background: 'rgba(245,158,11,0.06)',
                }}
              >
                Awaiting
              </span>
              <button
                type="button"
                onClick={() => onSetReminder(ack.doctorName)}
                className={`shrink-0 rounded-[8px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  color: '#00B4D8',
                  border: '1px solid #00B4D8',
                  whiteSpace: 'nowrap',
                }}
              >
                Set Reminder
              </button>
            </div>
          ))}
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid #0064821F' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] ${FOCUS_RING}`}
            style={{
              height: 40,
              borderRadius: 10,
              padding: '0 16px',
              background: '#FFFFFF',
              border: '1px solid #0064821F',
              fontSize: 14,
              color: '#4A7080',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
