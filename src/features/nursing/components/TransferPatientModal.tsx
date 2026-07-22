'use client';

import { ArrowLeftRight, X } from 'lucide-react';
import { useState } from 'react';

type TransferBed = { id: string; bedCode: string; room: string };

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function TransferPatientModal({
  patientName,
  sourceBedCode,
  availableBeds,
  onClose,
  onConfirm,
}: {
  patientName: string;
  sourceBedCode: string;
  availableBeds: TransferBed[];
  onClose: () => void;
  onConfirm: (destinationBedId: string) => void;
}) {
  const [destinationId, setDestinationId] = useState<string | null>(null);

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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              Transfer Patient
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Move {patientName} from {sourceBedCode} to an available bed.
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
          {availableBeds.length === 0 ? (
            <p style={{ fontSize: 14, color: '#8A98A3' }}>
              No available beds in this ward to transfer into.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {availableBeds.map((bed) => {
                const selected = destinationId === bed.id;
                return (
                  <button
                    key={bed.id}
                    type="button"
                    onClick={() => setDestinationId(bed.id)}
                    className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 text-left font-sans transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      background: selected ? '#E6F8FD' : '#FFFFFF',
                      border: `1px solid ${selected ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                    }}
                  >
                    <span className="font-medium">{bed.bedCode}</span>
                    <span style={{ color: '#8A98A3' }}>{bed.room}</span>
                  </button>
                );
              })}
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
            onClick={() => destinationId && onConfirm(destinationId)}
            disabled={!destinationId}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <ArrowLeftRight style={{ width: 15, height: 15 }} />
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
