'use client';

import { CheckCircle2, FileText, Truck, X, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { formatDateTime } from '@/utils/datetime';
import type { StockTransfer } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type TimelineEvent = { label: string; timestamp: string; icon: LucideIcon; color: string };

/** Full detail of one transfer — items and timeline, reconstructed purely
 * from the transfer's own recorded timestamps. Lazy-loaded (checklist §14). */
export function TransferDetailModal({
  transfer,
  onClose,
}: {
  transfer: StockTransfer;
  onClose: () => void;
}) {
  const events: TimelineEvent[] = [
    { label: 'Requested', timestamp: transfer.requestedAt, icon: FileText, color: '#7C3AED' },
  ];
  if (transfer.dispatchedAt) {
    events.push({
      label: 'Approved & dispatched',
      timestamp: transfer.dispatchedAt,
      icon: Truck,
      color: '#2563EB',
    });
  }
  if (transfer.completedAt) {
    events.push({
      label: 'Completed — stock moved',
      timestamp: transfer.completedAt,
      icon: CheckCircle2,
      color: '#16A34A',
    });
  }
  if (transfer.cancelledAt) {
    events.push({
      label: transfer.status === 'Rejected' ? 'Rejected' : 'Cancelled',
      timestamp: transfer.cancelledAt,
      icon: XCircle,
      color: '#DC2626',
    });
  }
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const totalQty = transfer.items.reduce((sum, i) => sum + i.qty, 0);

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
          <div className="min-w-0">
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              {transfer.id}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {getPharmacyLocation(transfer.fromLocationId).name} →{' '}
              {getPharmacyLocation(transfer.toLocationId).name}
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
          <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Items ({transfer.items.length}) — Qty {totalQty.toLocaleString('en-GB')}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {transfer.items.map((item) => (
              <div
                key={`${item.medicationName}-${item.batchNo}`}
                className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2"
                style={{ background: '#F5FBFD' }}
              >
                <div className="min-w-0">
                  <p
                    className="truncate font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {item.medicationName} {item.strength}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Batch {item.batchNo}</p>
                </div>
                <p
                  className="shrink-0 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {item.qty} {item.unit}
                  {item.qty === 1 ? '' : 's'}
                </p>
              </div>
            ))}
          </div>

          {transfer.notes && (
            <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
              <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
                Notes:{' '}
              </span>
              {transfer.notes}
            </p>
          )}

          <p className="mt-4 mb-2 font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Timeline
          </p>
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
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    {formatDateTime(event.timestamp)}
                  </p>
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
