'use client';

import {
  AlertCircle,
  ChevronLeft,
  Download,
  FilePlus2,
  FileText,
  ReceiptText,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PermissionGate } from '@components/shared/PermissionGate';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  BILLING_ACCOUNTS,
  deriveOutstanding,
  deriveStatus,
  type AccountStatus,
} from '@/features/billing/__mocks__/billingAccountsFixtures';
import { buildAccountDetail } from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<AccountStatus, { color: string; border: string; bg: string }> = {
  Paid: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Partial: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Overdue: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
};

const INVOICE_STATUS_CFG: Record<string, { color: string; bg: string }> = {
  Paid: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Partial: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Unpaid: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};
const REFUND_STATUS_CFG: Record<string, { color: string; bg: string }> = {
  Pending: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Approved: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Completed: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
};

type TabKey = 'summary' | 'invoices' | 'payments' | 'adjustments' | 'refunds' | 'documents';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{ fontSize: 14, color, background: bg }}
    >
      {label}
    </span>
  );
}

export function BillingAccountDetailWorkspace({ mrn }: { mrn: string }) {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  const account = BILLING_ACCOUNTS.find((a) => a.mrn.toLowerCase() === mrn.toLowerCase());

  if (!account) {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No billing account found for {mrn}
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            It may have been removed, or the MRN in the link is incorrect.
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.billingAccounts)}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <ChevronLeft style={{ width: 15, height: 15 }} />
            Back to Billing Accounts
          </button>
        </div>
      </main>
    );
  }

  // Narrowed past the not-found guard above — used instead of `account`
  // directly so closures below don't lose TS's narrowing to `| undefined`.
  const acct = account;

  const detail = buildAccountDetail(acct);
  const outstanding = deriveOutstanding(acct);
  const status = deriveStatus(acct);
  const statusCfg = STATUS_CFG[status];

  function goToInvoices() {
    router.push(`${ROUTES.billingInvoices}?mrn=${encodeURIComponent(acct.mrn)}`);
  }
  function goToPayments() {
    router.push(`${ROUTES.billingPayments}?mrn=${encodeURIComponent(acct.mrn)}`);
  }

  function handleExportInvoices() {
    downloadCSV(`${acct.mrn}-invoices`, [
      ['Invoice #', 'Date', 'Description', 'Amount', 'Status'],
      ...detail.invoices.map((i) => [
        i.invoiceNumber,
        `${formatHumanDate(i.date)} ${formatTime(i.date)}`,
        i.description,
        String(i.amount),
        i.status,
      ]),
    ]);
    toast.success('Export ready', `${detail.invoices.length} invoices exported as CSV.`);
  }
  function handleExportPayments() {
    downloadCSV(`${acct.mrn}-payments`, [
      ['Date', 'Amount', 'Method', 'Reference', 'Invoice #'],
      ...detail.payments.map((p) => [
        `${formatHumanDate(p.date)} ${formatTime(p.date)}`,
        String(p.amount),
        p.method,
        p.reference,
        p.invoiceNumber,
      ]),
    ]);
    toast.success('Export ready', `${detail.payments.length} payments exported as CSV.`);
  }
  function handleDownloadDocument(name: string) {
    downloadPDF(
      name.replace(/\.pdf$/i, ''),
      `<h1>${escapeHtml(name)}</h1><p class="meta">${escapeHtml(acct.patientName)} · ${escapeHtml(acct.mrn)}</p><hr><p>This is a placeholder document — real document storage is on the way.</p>`,
    );
    toast.success('Download ready', `${name} has been downloaded.`);
  }

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'summary', label: 'Account Summary' },
    { key: 'invoices', label: 'Invoice History', count: detail.invoices.length },
    { key: 'payments', label: 'Payment History', count: detail.payments.length },
    { key: 'adjustments', label: 'Adjustments', count: detail.adjustments.length },
    { key: 'refunds', label: 'Refunds', count: detail.refunds.length },
    { key: 'documents', label: 'Documents', count: detail.documents.length },
  ];

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
        <button
          type="button"
          onClick={() => router.push(ROUTES.billingAccounts)}
          className={`flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#4A7080' }}
        >
          <ChevronLeft style={{ width: 15, height: 15 }} />
          Back to Billing Accounts
        </button>

        {/* Header */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="font-display flex size-14 shrink-0 items-center justify-center rounded-full font-semibold text-white"
              style={{ fontSize: 18, background: '#2563EB' }}
            >
              {initialsOf(account.patientName)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display font-bold" style={{ fontSize: 22, color: '#0D2630' }}>
                  {account.patientName}
                </h1>
                <StatusBadge
                  label={account.active ? 'Active' : 'Inactive'}
                  color={account.active ? '#16A34A' : '#8A98A3'}
                  bg={account.active ? 'rgba(22,163,74,0.1)' : 'rgba(138,152,163,0.12)'}
                />
                <StatusBadge label={status} color={statusCfg.color} bg={statusCfg.bg} />
              </div>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                {account.mrn} {account.secondaryId ? `· ${account.secondaryId}` : ''} ·{' '}
                {account.department} · {account.phone} · {account.email}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
              <button
                type="button"
                onClick={goToInvoices}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <FilePlus2 style={{ width: 15, height: 15 }} />
                Create Invoice
              </button>
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
              <button
                type="button"
                onClick={goToPayments}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Wallet style={{ width: 15, height: 15 }} />
                Post Payment
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div
            className="rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Total Billed</p>
            <p className="font-display font-bold" style={{ fontSize: 22, color: '#0D2630' }}>
              {formatCurrencyWhole(account.totalBilled)}
            </p>
          </div>
          <div
            className="rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Total Paid</p>
            <p className="font-display font-bold" style={{ fontSize: 22, color: '#16A34A' }}>
              {formatCurrencyWhole(account.totalPaid)}
            </p>
          </div>
          <div
            className="rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Outstanding Balance</p>
            <p
              className="font-display font-bold"
              style={{ fontSize: 22, color: outstanding > 0 ? '#DC2626' : '#0D2630' }}
            >
              {formatCurrencyWhole(outstanding)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="mt-4 flex flex-wrap items-center gap-1 border-b"
          style={{ borderColor: 'rgba(0,100,130,0.12)' }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
              style={{
                fontSize: 14,
                color: activeTab === t.key ? '#00B4D8' : '#4A7080',
                borderBottom: activeTab === t.key ? '2px solid #00B4D8' : '2px solid transparent',
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className="flex size-5 items-center justify-center rounded-full font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: activeTab === t.key ? '#00B4D8' : '#8A98A3',
                    background: activeTab === t.key ? 'rgba(0,180,216,0.1)' : '#F5FBFD',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          {activeTab === 'summary' && (
            <div className="flex flex-col gap-3">
              {[
                ['Department', account.department],
                ['MRN', account.mrn],
                ['Secondary ID', account.secondaryId ?? '—'],
                ['Phone', account.phone],
                ['Email', account.email],
                ['Account Status', account.active ? 'Active' : 'Inactive'],
                ['Balance Status', status],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                  <span
                    className="text-right font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div>
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Invoice History
                </p>
                <button
                  type="button"
                  onClick={handleExportInvoices}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  Export
                </button>
              </div>
              {detail.invoices.length === 0 ? (
                <p className="py-8 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No invoices yet.
                </p>
              ) : (
                <div className="mt-3 flex flex-col">
                  <div
                    className="flex items-center pb-2"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    {['Invoice #', 'Date', 'Description', 'Amount', 'Status'].map((h, i) => (
                      <span
                        key={h}
                        className={`font-sans font-bold tracking-wider uppercase ${i === 2 ? 'min-w-[140px] flex-1' : i === 3 ? 'w-28 text-right' : i === 4 ? 'w-24 text-center' : 'w-32'}`}
                        style={{ fontSize: 14, color: '#8A98A3' }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {detail.invoices.map((inv) => {
                    const cfg = INVOICE_STATUS_CFG[inv.status]!;
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center py-2.5"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <span className="w-32" style={{ fontSize: 14, color: '#00B4D8' }}>
                          {inv.invoiceNumber}
                        </span>
                        <span className="w-32" style={{ fontSize: 14, color: '#4A7080' }}>
                          {formatHumanDate(inv.date)}
                        </span>
                        <Tooltip content={inv.description}>
                          <span
                            className="min-w-[140px] flex-1 truncate"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {inv.description}
                          </span>
                        </Tooltip>
                        <span
                          className="w-28 text-right font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {formatCurrencyWhole(inv.amount)}
                        </span>
                        <span className="w-24 text-center">
                          <StatusBadge label={inv.status} color={cfg.color} bg={cfg.bg} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Payment History
                </p>
                <button
                  type="button"
                  onClick={handleExportPayments}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  Export
                </button>
              </div>
              {detail.payments.length === 0 ? (
                <p className="py-8 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No payments recorded yet.
                </p>
              ) : (
                <div className="mt-3 flex flex-col">
                  <div
                    className="flex items-center pb-2"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    {['Date', 'Amount', 'Method', 'Reference', 'Invoice #'].map((h, i) => (
                      <span
                        key={h}
                        className={`font-sans font-bold tracking-wider uppercase ${i === 1 ? 'w-28 text-right' : i === 3 ? 'min-w-[120px] flex-1' : 'w-32'}`}
                        style={{ fontSize: 14, color: '#8A98A3' }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {detail.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center py-2.5"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <span className="w-32" style={{ fontSize: 14, color: '#4A7080' }}>
                        {formatHumanDate(p.date)}
                      </span>
                      <span
                        className="w-28 text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#16A34A' }}
                      >
                        {formatCurrencyWhole(p.amount)}
                      </span>
                      <span className="w-32" style={{ fontSize: 14, color: '#0D2630' }}>
                        {p.method}
                      </span>
                      <span
                        className="min-w-[120px] flex-1"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        {p.reference}
                      </span>
                      <span className="w-32" style={{ fontSize: 14, color: '#00B4D8' }}>
                        {p.invoiceNumber}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'adjustments' && (
            <div>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Adjustments
              </p>
              {detail.adjustments.length === 0 ? (
                <p className="py-8 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No adjustments recorded.
                </p>
              ) : (
                <div className="mt-3 flex flex-col">
                  {detail.adjustments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 py-2.5"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="min-w-0">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.type} · {a.invoiceNumber}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {formatHumanDate(a.date)} · {a.reason}
                        </p>
                      </div>
                      <span
                        className="shrink-0 font-sans font-medium whitespace-nowrap"
                        style={{ fontSize: 14, color: '#D97706' }}
                      >
                        -{formatCurrencyWhole(a.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'refunds' && (
            <div>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Refunds
              </p>
              {detail.refunds.length === 0 ? (
                <p className="py-8 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No refunds recorded.
                </p>
              ) : (
                <div className="mt-3 flex flex-col">
                  {detail.refunds.map((r) => {
                    const cfg = REFUND_STATUS_CFG[r.status]!;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 py-2.5"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-0">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {formatCurrencyWhole(r.amount)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatHumanDate(r.date)} · {r.reason}
                          </p>
                        </div>
                        <StatusBadge label={r.status} color={cfg.color} bg={cfg.bg} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Documents
              </p>
              {detail.documents.length === 0 ? (
                <p className="py-8 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No documents on file.
                </p>
              ) : (
                <div className="mt-3 flex flex-col">
                  {detail.documents.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 py-2.5"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: 'rgba(37,99,235,0.1)' }}
                      >
                        <FileText style={{ width: 16, height: 16, color: '#2563EB' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Tooltip content={d.name}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {d.name}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {formatHumanDate(d.uploadedAt)} · {d.sizeKb} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(d.name)}
                        aria-label={`Download ${d.name}`}
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      >
                        <Download style={{ width: 16, height: 16, color: '#4A7080' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="mt-4 flex items-start gap-2.5 rounded-[12px] p-4"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
        >
          <ReceiptText
            style={{ width: 16, height: 16, color: '#00B4D8' }}
            className="mt-0.5 shrink-0"
          />
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            This account&apos;s transaction history is generated from its billing summary. Real
            invoice, payment, adjustment, refund, and document records will replace it here in a
            future update.
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
