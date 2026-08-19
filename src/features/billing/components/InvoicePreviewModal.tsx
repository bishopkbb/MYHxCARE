'use client';

import { X } from 'lucide-react';

import { formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { InvoiceWithAccount } from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  Draft: { color: '#4A7080', bg: 'rgba(74,112,128,0.1)' },
  Issued: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  'Partially Paid': { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Paid: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Overdue: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  Cancelled: { color: '#8A98A3', bg: 'rgba(138,152,163,0.12)' },
};

export function InvoicePreviewModal({
  invoice,
  onClose,
  onDownload,
}: {
  invoice: InvoiceWithAccount;
  onClose: () => void;
  onDownload: () => void;
}) {
  const cfg = STATUS_CFG[invoice.status] ?? { color: '#4A7080', bg: '#F5FBFD' };
  const balance = Math.max(0, invoice.amount - invoice.paid);

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
        style={{ maxWidth: 480, borderRadius: 16, maxHeight: '85vh' }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
                {invoice.invoiceNumber}
              </h2>
              <span
                className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
              >
                {invoice.status}
              </span>
            </div>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Issued on {formatHumanDate(invoice.date)}, {formatTime(invoice.date)}
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

        <div className="overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {invoice.patientName}
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                {invoice.mrn} · {invoice.department}
              </p>
            </div>
          </div>

          <div
            className="mt-4 flex flex-col gap-2 rounded-[10px] p-3"
            style={{ background: '#F5FBFD' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Service</span>
              <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {invoice.description}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Due Date</span>
              <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {formatHumanDate(invoice.dueDate)}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Amount</p>
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                {formatCurrencyWhole(invoice.amount)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Paid</p>
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#16A34A' }}>
                {formatCurrencyWhole(invoice.paid)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Balance</p>
              <p
                className="font-sans font-semibold"
                style={{ fontSize: 14, color: balance > 0 ? '#DC2626' : '#0D2630' }}
              >
                {formatCurrencyWhole(balance)}
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
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
          <button
            type="button"
            onClick={onDownload}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
