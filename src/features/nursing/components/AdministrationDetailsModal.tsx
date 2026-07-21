'use client';

import { CheckCircle2, X } from 'lucide-react';

import { formatDateTime } from '@/utils/datetime';
import type { MedicationOrder } from '@/features/nursing/__mocks__/medicationAdministrationFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function AdministrationDetailsModal({
  order,
  patientName,
  onClose,
}: {
  order: MedicationOrder;
  patientName: string;
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
              Administration Details
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              For {patientName}
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
          <div
            className="flex items-center gap-2 rounded-[12px] px-4 py-3"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <CheckCircle2 style={{ width: 18, height: 18, color: '#22C55E' }} />
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#166534' }}>
              Administered
            </p>
          </div>

          <div
            className="mt-4 rounded-[12px] p-4"
            style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              {order.medication}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Dose</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {order.dose}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Route</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {order.route}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Frequency</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {order.frequency}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Time Given</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {order.timeDueLabel ?? formatDateTime(order.timeDue)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Administered By</p>
            <p className="mt-0.5 font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {order.administeredBy ?? '—'}
            </p>
          </div>

          <div className="mt-4">
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Remarks</p>
            <p className="mt-0.5 font-sans" style={{ fontSize: 14, color: '#0D2630' }}>
              {order.remarks ?? '—'}
            </p>
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
