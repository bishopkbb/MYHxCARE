'use client';

import { X } from 'lucide-react';

import { formatDateTime } from '@/utils/datetime';
import {
  getSupplierInfo,
  type PurchaseOrder,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<PurchaseOrder['status'], { color: string; border: string; bg: string }> = {
  Pending: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Partial: { color: '#7C3AED', border: 'rgba(124,58,237,0.35)', bg: 'rgba(124,58,237,0.08)' },
  Received: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

/** Lists every purchase order so a pharmacist can review one before
 * receiving it — lazy-loaded (checklist §14). Picking a still-open PO here
 * loads it into the receiving form and closes this modal. */
export function PurchaseOrdersModal({
  purchaseOrders,
  onSelect,
  onClose,
}: {
  purchaseOrders: PurchaseOrder[];
  onSelect: (poNumber: string) => void;
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
              Purchase Orders
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {purchaseOrders.length} order{purchaseOrders.length === 1 ? '' : 's'}
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
            {purchaseOrders.map((po) => {
              const cfg = STATUS_CFG[po.status];
              const supplier = getSupplierInfo(po.supplier);
              const totalQty = po.items.reduce((sum, i) => sum + i.orderedQty, 0);
              return (
                <div
                  key={po.poNumber}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] p-3.5"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {po.poNumber}
                      </p>
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          whiteSpace: 'nowrap',
                          color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                          background: cfg.bg,
                        }}
                      >
                        {po.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {supplier?.name ?? po.supplier} · {po.items.length} item
                      {po.items.length === 1 ? '' : 's'} · Qty {totalQty.toLocaleString('en-GB')}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Created {formatDateTime(po.createdAt)}
                    </p>
                  </div>
                  {po.status !== 'Received' && (
                    <button
                      type="button"
                      onClick={() => onSelect(po.poNumber)}
                      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      Receive
                    </button>
                  )}
                </div>
              );
            })}
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
