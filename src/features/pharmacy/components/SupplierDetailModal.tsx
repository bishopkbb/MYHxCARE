'use client';

import { CheckCircle2, Star, X } from 'lucide-react';

import { StarRating } from '@components/shared/StarRating';
import {
  getSupplierDisplayStatus,
  type SupplierInfo,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/datetime';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_COLOR: Record<'Active' | 'Preferred' | 'Pending Approval' | 'Inactive', string> = {
  Active: '#16A34A',
  Preferred: '#7C3AED',
  'Pending Approval': '#D97706',
  Inactive: '#DC2626',
};

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span style={{ fontSize: 14, color: '#4A7080' }}>{label}</span>
      <span
        className="text-right font-sans font-medium"
        style={{ fontSize: 14, color: color ?? '#0D2630' }}
      >
        {value}
      </span>
    </div>
  );
}

/** Full detail of one supplier — lazy-loaded (checklist §14). Footer
 * actions change with status: Approve/Reject while Pending Approval, Mark
 * as Preferred/Deactivate while Active, Remove Preferred/Deactivate while
 * Preferred, or Reactivate while Inactive. */
export function SupplierDetailModal({
  supplier,
  onApprove,
  onReject,
  onTogglePreferred,
  onToggleActive,
  onClose,
}: {
  supplier: SupplierInfo;
  onApprove: (name: string) => void;
  onReject: (name: string) => void;
  onTogglePreferred: (name: string, isPreferred: boolean) => void;
  onToggleActive: (name: string) => void;
  onClose: () => void;
}) {
  const displayStatus = getSupplierDisplayStatus(supplier);

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
              {supplier.name}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {supplier.code} · {supplier.category}
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
          <div className="pb-3" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
            <DetailRow label="Contact Person" value={supplier.contactPerson} />
            <DetailRow label="Phone" value={supplier.phone} />
            <DetailRow label="Email" value={supplier.email} />
            <DetailRow label="Address" value={supplier.address} />
            <DetailRow label="Location" value={supplier.location} />
            <DetailRow label="Status" value={displayStatus} color={STATUS_COLOR[displayStatus]} />
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span style={{ fontSize: 14, color: '#4A7080' }}>Performance Rating</span>
              {supplier.performanceRating > 0 ? (
                <div className="flex items-center gap-1.5">
                  <StarRating rating={supplier.performanceRating} size={15} />
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {supplier.performanceRating.toFixed(1)}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Not yet rated</span>
              )}
            </div>
            <DetailRow
              label="Last Order Date"
              value={supplier.lastOrderDate ? formatDate(supplier.lastOrderDate) : 'No orders yet'}
            />
            <DetailRow label="Total Spend (YTD)" value={formatCurrency(supplier.totalSpendYTD)} />
          </div>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          {supplier.status === 'Pending Approval' && (
            <>
              <button
                type="button"
                onClick={() => onReject(supplier.name)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onApprove(supplier.name)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#16A34A' }}
              >
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                Approve
              </button>
            </>
          )}

          {supplier.status === 'Active' && (
            <>
              <button
                type="button"
                onClick={() => onToggleActive(supplier.name)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                Deactivate
              </button>
              <button
                type="button"
                onClick={() => onTogglePreferred(supplier.name, !supplier.isPreferred)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#7C3AED' }}
              >
                <Star style={{ width: 15, height: 15 }} />
                {supplier.isPreferred ? 'Remove Preferred' : 'Mark as Preferred'}
              </button>
            </>
          )}

          {supplier.status === 'Inactive' && (
            <button
              type="button"
              onClick={() => onToggleActive(supplier.name)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#16A34A' }}
            >
              Reactivate
            </button>
          )}

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
