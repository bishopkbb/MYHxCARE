'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/utils/currency';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { ProcurementRequest } from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { PRIORITY_CFG, STATUS_CFG } from '@/features/pharmacy/__mocks__/procurementReportFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span style={{ fontSize: 14, color: '#4A7080' }}>{label}</span>
      <span className="text-right font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value}
      </span>
    </div>
  );
}

function totalValue(request: ProcurementRequest): number {
  return request.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

/** Read-only snapshot of one real procurement request — lazy-loaded
 * (checklist §14). "Go to Procurement Requests" is the genuine link for
 * anyone who wants to actually approve, reject, or mark it ordered; this
 * report stays read-only. */
export function ProcurementReportDetailModal({
  request,
  onClose,
}: {
  request: ProcurementRequest;
  onClose: () => void;
}) {
  const router = useRouter();
  const statusCfg = STATUS_CFG[request.status];
  const priorityCfg = PRIORITY_CFG[request.priority] ?? PRIORITY_CFG['Medium']!;

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
              {request.id}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {formatHumanDate(request.createdAt)} · {formatTime(request.createdAt)}
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-3">
          <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#F5FBFD] px-3.5 py-2.5">
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{
                fontSize: 14,
                whiteSpace: 'nowrap',
                color: statusCfg.color,
                border: `1px solid ${statusCfg.border}`,
                background: statusCfg.bg,
              }}
            >
              {request.status}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{
                fontSize: 14,
                whiteSpace: 'nowrap',
                color: priorityCfg.color,
                border: `1px solid ${priorityCfg.border}`,
                background: priorityCfg.bg,
              }}
            >
              {request.priority} Priority
            </span>
          </div>

          <div className="mt-1 divide-y" style={{ borderColor: 'rgba(0,100,130,0.08)' }}>
            <DetailRow label="Type" value={request.requestType} />
            <DetailRow label="Department" value={request.department} />
            <DetailRow label="Requested By" value={request.requestedBy} />
            <DetailRow label="Items" value={String(request.items.length)} />
            <DetailRow label="Total Value" value={formatCurrency(totalValue(request))} />
            {request.approvedBy && <DetailRow label="Approved By" value={request.approvedBy} />}
            {request.supplier && <DetailRow label="Supplier" value={request.supplier} />}
            {request.poNumber && <DetailRow label="PO Number" value={request.poNumber} />}
            {request.rejectedReason && (
              <DetailRow label="Rejected Reason" value={request.rejectedReason} />
            )}
          </div>

          <div className="mt-3">
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Items
            </p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {request.items.map((item, i) => (
                <div
                  key={`${item.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-[8px] bg-[#F5FBFD] px-3 py-2"
                >
                  <span style={{ fontSize: 14, color: '#4A7080' }}>
                    {item.name} × {item.quantity}
                  </span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacyProcurementRequests)}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
          >
            Go to Procurement Requests
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#0F766E' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
