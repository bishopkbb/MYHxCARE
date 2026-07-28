'use client';

import { CheckCircle2, FileText, PauseCircle, X, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { formatDateTime } from '@/utils/datetime';
import type { PharmacyQueueEntry } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type AuditEvent = {
  label: string;
  detail?: string;
  timestamp: string;
  icon: LucideIcon;
  color: string;
};

/** Reconstructs a timeline purely from the entry's own recorded timestamps —
 * no separate audit log is kept, so this is a derived view, not a fabricated
 * one. Lazy-loaded (checklist §14). */
export function AuditTrailModal({
  entry,
  onClose,
}: {
  entry: PharmacyQueueEntry;
  onClose: () => void;
}) {
  const events: AuditEvent[] = [
    {
      label: 'Prescription received',
      detail: `${entry.medicationName} ${entry.dose} prescribed by ${entry.doctorName}`,
      timestamp: entry.receivedAt,
      icon: FileText,
      color: '#7C3AED',
    },
  ];
  if (entry.dispensedAt) {
    events.push({
      label: 'Verified & dispensed',
      detail: 'Moved to Ready for Pickup',
      timestamp: entry.dispensedAt,
      icon: CheckCircle2,
      color: '#16A34A',
    });
  }
  if (entry.collectedAt) {
    events.push({
      label: 'Collected by patient',
      timestamp: entry.collectedAt,
      icon: CheckCircle2,
      color: '#2563EB',
    });
  }
  if (entry.cancelledAt) {
    events.push({
      label: 'Cancelled',
      timestamp: entry.cancelledAt,
      icon: XCircle,
      color: '#64748B',
    });
  }
  if (entry.noteUpdatedAt) {
    events.push({
      label: 'Pharmacist note added',
      ...(entry.pharmacistNote ? { detail: entry.pharmacistNote } : {}),
      timestamp: entry.noteUpdatedAt,
      icon: FileText,
      color: '#D97706',
    });
  }
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  if (entry.isOnHold) {
    events.push({
      label: 'Currently on hold',
      timestamp: '',
      icon: PauseCircle,
      color: '#D97706',
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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              Audit Trail
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Rx {entry.rxNo}
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
          <div className="flex flex-col">
            {events.map((event, i) => (
              <div key={`${event.label}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${event.color}1F` }}
                  >
                    <event.icon style={{ width: 15, height: 15, color: event.color }} />
                  </div>
                  {i < events.length - 1 && (
                    <span
                      className="w-px flex-1"
                      style={{ background: 'rgba(0,100,130,0.15)', minHeight: 24 }}
                    />
                  )}
                </div>
                <div className="min-w-0 pb-4">
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {event.label}
                  </p>
                  {event.detail && <p style={{ fontSize: 14, color: '#4A7080' }}>{event.detail}</p>}
                  {event.timestamp && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {formatDateTime(event.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            ))}
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
