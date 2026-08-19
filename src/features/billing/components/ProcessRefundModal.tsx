'use client';

import { X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { formatCurrencyWhole } from '@/utils/currency';
import {
  buildAllPayments,
  REFUND_REASONS,
  type RefundWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

function buildRefund(
  invoice: ReturnType<typeof buildAllPayments>[number],
  amount: number,
  reason: string,
): RefundWithAccount {
  const seq = 1000 + Math.floor(Math.random() * 8999);
  return {
    id: `ref-new-${Date.now()}`,
    refundNumber: `REF-2026-${String(seq).padStart(4, '0')}`,
    date: new Date().toISOString(),
    amount,
    reason,
    status: 'Pending',
    invoiceNumber: invoice.invoiceNumber,
    requestedBy: 'Accountant (Finance)',
    patientName: invoice.patientName,
    mrn: invoice.mrn,
    secondaryId: invoice.secondaryId,
    department: invoice.department,
  };
}

export function ProcessRefundModal({
  defaultMrn,
  onClose,
  onCreate,
}: {
  defaultMrn?: string | undefined;
  onClose: () => void;
  onCreate: (refund: RefundWithAccount) => void;
}) {
  const paidInvoices = useMemo(() => {
    const payments = buildAllPayments().filter((p) => p.invoicePaid > 0);
    const byInvoice = new Map(payments.map((p) => [p.invoiceNumber, p]));
    return Array.from(byInvoice.values());
  }, []);

  const patientOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const inv of paidInvoices) seen.set(inv.mrn, `${inv.patientName} (${inv.mrn})`);
    return Array.from(seen.entries()).map(([mrn, label]) => ({ value: mrn, label }));
  }, [paidInvoices]);

  const [mrn, setMrn] = useState(
    () =>
      patientOptions.find((p) => p.value === defaultMrn)?.value ?? patientOptions[0]?.value ?? '',
  );
  const invoicesForPatient = paidInvoices.filter((inv) => inv.mrn === mrn);
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => invoicesForPatient[0]?.invoiceNumber ?? '',
  );
  const selectedInvoice = paidInvoices.find((inv) => inv.invoiceNumber === invoiceNumber);

  const [amount, setAmount] = useState(() => String(selectedInvoice?.invoicePaid ?? ''));
  const [reason, setReason] = useState(REFUND_REASONS[0] ?? 'Duplicate Payment');

  function handlePatientChange(nextMrn: string) {
    setMrn(nextMrn);
    const firstInvoice = paidInvoices.find((inv) => inv.mrn === nextMrn);
    setInvoiceNumber(firstInvoice?.invoiceNumber ?? '');
    setAmount(firstInvoice ? String(firstInvoice.invoicePaid) : '');
  }

  function handleInvoiceChange(nextInvoiceNumber: string) {
    setInvoiceNumber(nextInvoiceNumber);
    const inv = paidInvoices.find((i) => i.invoiceNumber === nextInvoiceNumber);
    setAmount(inv ? String(inv.invoicePaid) : '');
  }

  const numericAmount = Number(amount);
  const canSubmit =
    !!selectedInvoice && numericAmount > 0 && numericAmount <= selectedInvoice.invoicePaid;

  function handleSubmit() {
    if (!selectedInvoice || !canSubmit) return;
    onCreate(buildRefund(selectedInvoice, numericAmount, reason));
  }

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
        style={{ maxWidth: 460, borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
            Process Refund
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        {patientOptions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p style={{ fontSize: 14, color: '#4A7080' }}>
              No paid invoices are available to process a refund against.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 px-6 py-5">
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Patient
              </label>
              <FormSelect
                id="process-refund-patient"
                value={mrn}
                onChange={handlePatientChange}
                options={patientOptions}
                placeholder="Select patient"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Invoice
              </label>
              <FormSelect
                id="process-refund-invoice"
                value={invoiceNumber}
                onChange={handleInvoiceChange}
                options={invoicesForPatient.map((inv) => ({
                  value: inv.invoiceNumber,
                  label: `${inv.invoiceNumber} — Paid ${formatCurrencyWhole(inv.invoicePaid)}`,
                }))}
                placeholder="Select invoice"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Refund Amount (₦)
              </label>
              <input
                type="number"
                min={1}
                max={selectedInvoice?.invoicePaid}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
              {selectedInvoice && numericAmount > selectedInvoice.invoicePaid && (
                <p className="mt-1" style={{ fontSize: 14, color: '#DC2626' }}>
                  Cannot exceed the amount paid of{' '}
                  {formatCurrencyWhole(selectedInvoice.invoicePaid)}.
                </p>
              )}
            </div>
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Reason
              </label>
              <FormSelect
                id="process-refund-reason"
                value={reason}
                onChange={setReason}
                options={REFUND_REASONS.map((r) => ({ value: r, label: r }))}
                placeholder="Select reason"
              />
            </div>
          </div>
        )}

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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 ${canSubmit ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'} ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Submit Refund Request
          </button>
        </div>
      </div>
    </div>
  );
}
