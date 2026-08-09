'use client';

import { Star, X } from 'lucide-react';

import { formatCurrency } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import {
  supplierAvatarColor,
  supplierInitials,
  type Supplier,
} from '@/features/laboratory/__mocks__/supplierFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Active: { color: '#16A34A', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)' },
  'Pending Evaluation': {
    color: '#B45309',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.35)',
  },
  Blacklisted: { color: '#DC2626', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' },
  Inactive: { color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.35)' },
};

/** Read-only, richer detail view than the docked panel — full contact
 * profile, performance summary, and complete recent-orders list. Opens
 * from the panel's external-link icon or "View Full Profile" button.
 * Lazy-loaded (checklist §14). */
export function SupplierDetailModal({
  supplier,
  onClose,
}: {
  supplier: Supplier;
  onClose: () => void;
}) {
  const cfg = STATUS_CFG[supplier.status]!;

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
        style={{ maxWidth: 760, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
              style={{ fontSize: 16, background: supplierAvatarColor(supplier.name) }}
            >
              {supplierInitials(supplier.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  className="font-display truncate font-semibold"
                  style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                >
                  {supplier.name}
                </h2>
                <span
                  className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                  style={{
                    fontSize: 14,
                    color: cfg.color,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  {supplier.status}
                </span>
                {supplier.isPreferred && (
                  <span
                    className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                    style={{
                      fontSize: 14,
                      color: '#7C3AED',
                      background: 'rgba(124,58,237,0.1)',
                      border: '1px solid rgba(124,58,237,0.35)',
                    }}
                  >
                    Preferred Supplier
                  </span>
                )}
              </div>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                {supplier.id} · {supplier.category}
              </p>
            </div>
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
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              ['Contact Person', `${supplier.contactPerson} (${supplier.contactRole})`],
              ['Email', supplier.email],
              ['Phone', supplier.phone],
              ['Alternate Phone', supplier.altPhone || '—'],
              ['Address', `${supplier.address}`],
              ['Payment Terms', supplier.paymentTerms],
              ['Credit Limit', formatCurrency(supplier.creditLimit)],
              ['Date Added', formatHumanDate(supplier.dateAdded)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                <span
                  className="truncate text-right font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Star style={{ width: 16, height: 16, color: '#F59E0B' }} fill="#F59E0B" />
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {supplier.rating.toFixed(1)}
            </span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>
              ({supplier.reviewCount} review{supplier.reviewCount !== 1 ? 's' : ''})
            </span>
          </div>

          {supplier.notes && (
            <p className="mt-3" style={{ fontSize: 14, color: '#2F3A40' }}>
              {supplier.notes}
            </p>
          )}

          <div className="mt-6">
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Performance Summary (YTD)
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Total Orders', String(supplier.totalOrdersYTD)],
                ['Total Spend', formatCurrency(supplier.ytdSpend)],
                ['On-time Delivery', `${supplier.onTimeDeliveryPct}%`],
                ['Quality Rating', `${supplier.qualityRating.toFixed(1)}/5`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[10px] p-3"
                  style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
                  <p
                    className="font-display mt-1 font-bold"
                    style={{ fontSize: 18, color: '#0D2630' }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Recent Orders
            </p>
            {supplier.recentOrders.length === 0 ? (
              <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                No orders recorded yet.
              </p>
            ) : (
              <div className="mt-2.5 flex flex-col gap-2">
                {supplier.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-[10px] p-3"
                    style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="min-w-0">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        {order.id}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        {formatHumanDate(order.date)}
                      </p>
                    </div>
                    <p
                      className="shrink-0 font-sans font-medium whitespace-nowrap"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrency(order.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
