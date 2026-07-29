'use client';

import { X } from 'lucide-react';

import { formatCurrency } from '@/utils/currency';
import { formatDateTime } from '@/utils/datetime';
import type { StockReceipt } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Full receiving history — lazy-loaded (checklist §14); the Recent Receipts
 * panel only shows the latest 3. */
export function ReceivingHistoryModal({
  receipts,
  onClose,
}: {
  receipts: StockReceipt[];
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
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Receiving History
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {receipts.length} receipt{receipts.length === 1 ? '' : 's'}
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
          <div className="flex flex-col gap-3">
            {receipts.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] p-3.5"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="min-w-0">
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {r.id}
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {r.supplier} · {r.items.length} item{r.items.length === 1 ? '' : 's'}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatDateTime(r.receivedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatCurrency(r.totalValueInclTax)}
                  </p>
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                    style={{
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      color: r.status === 'Completed' ? '#16A34A' : '#D97706',
                      border: `1px solid ${r.status === 'Completed' ? 'rgba(22,163,74,0.35)' : 'rgba(217,119,6,0.35)'}`,
                      background:
                        r.status === 'Completed' ? 'rgba(22,163,74,0.08)' : 'rgba(217,119,6,0.08)',
                    }}
                  >
                    {r.status}
                  </span>
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
