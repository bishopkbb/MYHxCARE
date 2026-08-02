'use client';

import { CheckCircle2, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/utils/currency';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  RETURN_STATUS_COLOR,
  type MedicationReturn,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0" style={{ fontSize: 14, color: '#4A7080' }}>
        {label}
      </span>
      <span
        className="text-right font-sans font-medium"
        style={{ fontSize: 14, color: color ?? '#0D2630' }}
      >
        {value}
      </span>
    </div>
  );
}

/** Full detail of one medication return — lazy-loaded (checklist §14).
 * Footer actions change with status: Reject (with a required reason) /
 * Complete while Pending — Complete is what actually restocks the returned
 * units — or nothing further once the return is closed. */
export function ReturnDetailModal({
  medicationReturn,
  onComplete,
  onReject,
  onClose,
}: {
  medicationReturn: MedicationReturn;
  onComplete: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const statusCfg = RETURN_STATUS_COLOR[medicationReturn.status];

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
              {medicationReturn.id}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {medicationReturn.returnType} · {formatHumanDate(medicationReturn.returnDate)}
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
          <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#F5FBFD] px-3.5 py-2.5">
            <div className="min-w-0">
              <Tooltip content={medicationReturn.patientName}>
                <p
                  className="truncate font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {medicationReturn.patientName}
                </p>
              </Tooltip>
              <p style={{ fontSize: 14, color: '#4A7080' }}>{medicationReturn.mrn}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(ROUTES.patientProfile(medicationReturn.patientId))}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 font-sans font-medium transition-colors duration-150 hover:bg-white ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              <User style={{ width: 14, height: 14 }} />
              View Profile
            </button>
          </div>

          <div className="mt-3 pb-3" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
            <DetailRow
              label="Medication"
              value={`${medicationReturn.medicationName} ${medicationReturn.strength}`}
            />
            <DetailRow label="Qty Returned" value={String(medicationReturn.qtyReturned)} />
            <DetailRow label="Reason" value={medicationReturn.reason} />
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span style={{ fontSize: 14, color: '#4A7080' }}>Status</span>
              <span
                className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                style={{
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.border}`,
                  background: statusCfg.bg,
                }}
              >
                {medicationReturn.status}
              </span>
            </div>
            <DetailRow label="Returned By" value={medicationReturn.returnedBy} />
            <DetailRow
              label="Return Date"
              value={`${formatHumanDate(medicationReturn.returnDate)} · ${formatTime(medicationReturn.returnDate)}`}
            />
            <DetailRow
              label="Refund / Adjustment"
              value={
                medicationReturn.refundType === 'None'
                  ? '—'
                  : `${formatCurrency(medicationReturn.refundAmount)} (${medicationReturn.refundType})`
              }
            />
          </div>

          {medicationReturn.rejectedReason && (
            <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
              <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
                Rejection reason:{' '}
              </span>
              {medicationReturn.rejectedReason}
            </p>
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
                htmlFor="return-reject-reason"
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Reason for rejection *
              </label>
              <input
                id="return-reject-reason"
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Medication not eligible for return"
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
          {medicationReturn.status === 'Pending' && !rejecting && (
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
                onClick={() => onComplete(medicationReturn.id)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#16A34A' }}
              >
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                Complete
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
                onClick={() => onReject(medicationReturn.id, rejectReason.trim())}
                disabled={!rejectReason.trim()}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#DC2626' }}
              >
                Confirm Rejection
              </button>
            </>
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
