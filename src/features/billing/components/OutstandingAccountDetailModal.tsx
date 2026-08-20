'use client';

import { Bell, UserSearch, Wallet, X } from 'lucide-react';

import { formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import type { InvoiceWithAccount } from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type OutstandingRow = InvoiceWithAccount & { balance: number; daysOutstanding: number };

export function OutstandingAccountDetailModal({
  row,
  bucketLabel,
  onClose,
  onRecordPayment,
  onSendReminder,
  onViewAccount,
}: {
  row: OutstandingRow;
  bucketLabel: string;
  onClose: () => void;
  onRecordPayment: () => void;
  onSendReminder: () => void;
  onViewAccount: () => void;
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
        style={{ maxWidth: 480, borderRadius: 16, maxHeight: '85vh' }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
              {row.patientName}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {row.mrn} · {row.department}
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
          <div className="flex flex-col gap-2 rounded-[10px] p-3" style={{ background: '#F5FBFD' }}>
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Invoice No.</span>
              <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
                {row.invoiceNumber}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Invoice Date</span>
              <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {formatHumanDate(row.date)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Due Date</span>
              <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {formatHumanDate(row.dueDate)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Days Outstanding</span>
              <span
                className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                style={{ fontSize: 14, color: '#DC2626', background: 'rgba(220,38,38,0.1)' }}
              >
                {row.daysOutstanding} days · {bucketLabel}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Original</p>
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                {formatCurrencyWhole(row.amount)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Paid</p>
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#16A34A' }}>
                {formatCurrencyWhole(row.paid)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Balance</p>
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#DC2626' }}>
                {formatCurrencyWhole(row.balance)}
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 flex-col gap-2 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onRecordPayment}
            className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <Wallet style={{ width: 15, height: 15 }} />
            Record Payment
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSendReminder}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Bell style={{ width: 15, height: 15 }} />
              Send Reminder
            </button>
            <button
              type="button"
              onClick={onViewAccount}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <UserSearch style={{ width: 15, height: 15 }} />
              View Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
