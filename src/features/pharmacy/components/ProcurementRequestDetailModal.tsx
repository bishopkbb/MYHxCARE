'use client';

import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { Tooltip } from '@components/shared/Tooltip';
import { SUPPLIER_OPTIONS } from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { formatCurrency } from '@/utils/currency';
import { formatDateTime } from '@/utils/datetime';
import {
  getRequestEstAmount,
  type ProcurementPriority,
  type ProcurementRequest,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_COLOR: Record<ProcurementPriority, string> = {
  High: '#DC2626',
  Medium: '#D97706',
  Low: '#16A34A',
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

/** Full detail of one procurement request — lazy-loaded (checklist §14).
 * Footer actions change with status: Approve/Reject while Pending Approval,
 * a supplier picker + Mark as Ordered once Approved (the write that creates
 * a real purchase order), or View Purchase Order once Ordered or beyond. */
export function ProcurementRequestDetailModal({
  request,
  onApprove,
  onReject,
  onMarkAsOrdered,
  onViewPurchaseOrder,
  onClose,
}: {
  request: ProcurementRequest;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onMarkAsOrdered: (id: string, supplier: string) => void;
  onViewPurchaseOrder: () => void;
  onClose: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [supplier, setSupplier] = useState('');

  const estAmount = getRequestEstAmount(request);

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
        style={{ maxWidth: 580, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              {request.id}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {request.requestType} · {request.department}
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
            <DetailRow label="Requested By" value={request.requestedBy} />
            <DetailRow
              label="Priority"
              value={request.priority}
              color={PRIORITY_COLOR[request.priority]}
            />
            <DetailRow label="Date Created" value={formatDateTime(request.createdAt)} />
            <DetailRow label="Status" value={request.status} />
            {request.approvedBy && <DetailRow label="Approved By" value={request.approvedBy} />}
            {request.supplier && <DetailRow label="Supplier" value={request.supplier} />}
            {request.poNumber && <DetailRow label="PO Number" value={request.poNumber} />}
            <DetailRow label="Estimated Amount" value={formatCurrency(estAmount)} />
          </div>

          {request.notes && (
            <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
              <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
                Notes:{' '}
              </span>
              {request.notes}
            </p>
          )}

          {request.status === 'Rejected' && request.rejectedReason && (
            <div
              className="mt-3 flex items-start gap-2 rounded-[10px] p-3"
              style={{
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
              }}
            >
              <AlertCircle
                className="mt-0.5 shrink-0"
                style={{ width: 16, height: 16, color: '#DC2626' }}
              />
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
                  Rejection reason:{' '}
                </span>
                {request.rejectedReason}
              </p>
            </div>
          )}

          <p className="mt-4 mb-2 font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Items ({request.items.length})
          </p>
          <div className="flex flex-col gap-2">
            {request.items.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2"
                style={{ background: '#F5FBFD' }}
              >
                <div className="min-w-0 flex-1">
                  <Tooltip content={item.name}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {item.name}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    {formatCurrency(item.unitPrice)} / unit
                  </p>
                </div>
                <p
                  className="shrink-0 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  × {item.quantity.toLocaleString('en-GB')}
                </p>
              </div>
            ))}
          </div>

          {request.status === 'Approved' && (
            <div
              className="mt-4 rounded-[10px] p-3.5"
              style={{
                background: 'rgba(0,180,216,0.06)',
                border: '1px solid rgba(0,180,216,0.25)',
              }}
            >
              <p
                className="mb-1.5 font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Mark as Ordered
              </p>
              <p className="mb-2" style={{ fontSize: 14, color: '#4A7080' }}>
                Choose the supplier fulfilling this request — a real purchase order is created and
                sent straight to Stock Receiving.
              </p>
              <FormSelect
                id="mark-ordered-supplier"
                value={supplier}
                onChange={setSupplier}
                options={SUPPLIER_OPTIONS}
                placeholder="Select supplier"
              />
            </div>
          )}

          {rejecting && (
            <div
              className="mt-4 rounded-[10px] p-3.5"
              style={{
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
              }}
            >
              <label
                htmlFor="reject-reason"
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Reason for rejection *
              </label>
              <input
                id="reject-reason"
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Budget constraints this quarter"
                className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          {request.status === 'Pending Approval' && !rejecting && (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onApprove(request.id)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#16A34A' }}
              >
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                Approve
              </button>
            </>
          )}

          {rejecting && (
            <>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#4A7080', border: '1px solid rgba(0,100,130,0.18)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onReject(request.id, rejectReason.trim())}
                disabled={!rejectReason.trim()}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#DC2626' }}
              >
                Confirm Rejection
              </button>
            </>
          )}

          {request.status === 'Approved' && !rejecting && (
            <button
              type="button"
              onClick={() => onMarkAsOrdered(request.id, supplier)}
              disabled={!supplier}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              Mark as Ordered
            </button>
          )}

          {(request.status === 'Ordered' ||
            request.status === 'Partially Received' ||
            request.status === 'Completed') && (
            <button
              type="button"
              onClick={onViewPurchaseOrder}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              View Purchase Order
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
