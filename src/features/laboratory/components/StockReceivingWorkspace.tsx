'use client';

import {
  CheckCircle2,
  ChevronDown,
  Download,
  Info,
  Package,
  Plus,
  Printer,
  ScanLine,
  Thermometer,
  Trash2,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FormDateInput } from '@components/shared/FormDateInput';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/utils/currency';
import { formatHumanDate, formatTime, toWATDateInput } from '@/utils/datetime';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { getInventoryItemById } from '@/features/laboratory/store/inventoryStore';
import {
  INITIAL_CHECKLIST,
  type ReceivedLineItem,
} from '@/features/laboratory/__mocks__/stockReceivingFixtures';
import {
  completeReceiving,
  getGrnSummary,
  getLineItemStatus,
  removeLineItem,
  startNewReceiving,
  updateDeliveryInfo,
  updateLineItem,
  useActivityLog,
  useAttachments,
  useGrn,
  useLineItems,
} from '@/features/laboratory/store/stockReceivingStore';

const AddReceivedItemModal = dynamic(
  () => import('./AddReceivedItemModal').then((m) => m.AddReceivedItemModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
} as const;
// Reserves a fixed two-line-tall box for every field label, bottom-aligned,
// so a label that happens to wrap (e.g. "Delivery Note No. *" at narrower
// widths) never pushes its own input out of alignment with its row-mates.
const FIELD_LABEL_CLASS = 'mb-1.5 flex min-h-10 items-end font-sans font-medium';
const FIELD_LABEL_STYLE = { fontSize: 14, color: '#0D2630' } as const;
const QTY_INPUT_CLASS = `h-9 w-16 rounded-[8px] px-2 text-center font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`;

const LINE_STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Accepted: { color: '#16A34A', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.35)' },
  Partial: { color: '#B45309', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)' },
  Rejected: { color: '#DC2626', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.35)' },
};

function InfoCard({
  icon: Icon,
  label,
  value,
  subLabel,
  subValue,
  subValueNode,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subLabel: string;
  subValue?: string;
  subValueNode?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: 'rgba(0,180,216,0.1)' }}
        >
          <Icon style={{ width: 15, height: 15, color: '#00B4D8' }} />
        </div>
        <span style={{ fontSize: 14, color: '#4A7080' }}>{label}</span>
      </div>
      <p className="font-display truncate font-bold" style={{ fontSize: 18, color: '#0D2630' }}>
        {value}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span style={{ fontSize: 14, color: '#8A98A3' }}>{subLabel}</span>
        {subValueNode ?? (
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionNumber({ n }: { n: number }) {
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans font-bold text-white"
      style={{ fontSize: 14, background: '#00B4D8' }}
    >
      {n}
    </span>
  );
}

function LineRow({
  index,
  line,
  locked,
  onRemove,
}: {
  index: number;
  line: ReceivedLineItem;
  locked: boolean;
  onRemove: () => void;
}) {
  const item = getInventoryItemById(line.itemId);
  const status = getLineItemStatus(line);
  const cfg = LINE_STATUS_CFG[status]!;
  const totalCost = line.acceptedQty * line.unitCost;

  return (
    <div className="flex items-center" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
      <div className="w-10 shrink-0 py-3 pr-2 pl-3 text-center">
        <p style={{ fontSize: 14, color: '#8A98A3' }}>{index + 1}</p>
      </div>
      <div className="min-w-[180px] flex-1 py-3 pr-2 text-center">
        <Tooltip content={item?.name ?? line.itemId}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {item?.name ?? 'Unknown item'}
          </p>
        </Tooltip>
      </div>
      <div className="w-32 shrink-0 py-3 pr-2 text-center">
        <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
          {item?.catalogNo ?? '—'}
        </p>
      </div>
      <div className="w-32 shrink-0 py-3 pr-2 text-center">
        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
          {line.lotBatchNo}
        </p>
      </div>
      <div className="w-32 shrink-0 py-3 pr-2 text-center">
        <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
          {formatHumanDate(line.expiryDate)}
        </p>
      </div>
      <div className="w-20 shrink-0 py-3 pr-2 text-center">
        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
          {line.uom}
        </p>
      </div>
      <div className="w-24 shrink-0 py-3 pr-2 text-center">
        <p style={{ fontSize: 14, color: '#4A7080' }}>{line.orderedQty}</p>
      </div>
      <div className="w-24 shrink-0 py-3 pr-2 text-center">
        <input
          type="number"
          min={0}
          value={line.receivedQty}
          disabled={locked}
          onChange={(e) => updateLineItem(line.id, { receivedQty: Number(e.target.value) })}
          className={QTY_INPUT_CLASS}
          style={FIELD_INPUT_STYLE}
        />
      </div>
      <div className="w-24 shrink-0 py-3 pr-2 text-center">
        <input
          type="number"
          min={0}
          value={line.acceptedQty}
          disabled={locked}
          onChange={(e) => updateLineItem(line.id, { acceptedQty: Number(e.target.value) })}
          className={QTY_INPUT_CLASS}
          style={FIELD_INPUT_STYLE}
        />
      </div>
      <div className="w-24 shrink-0 py-3 pr-2 text-center">
        <input
          type="number"
          min={0}
          value={line.rejectedQty}
          disabled={locked}
          onChange={(e) => updateLineItem(line.id, { rejectedQty: Number(e.target.value) })}
          className={QTY_INPUT_CLASS}
          style={FIELD_INPUT_STYLE}
        />
      </div>
      <div className="w-28 shrink-0 py-3 pr-2 text-center">
        <input
          type="number"
          min={0}
          value={line.unitCost}
          disabled={locked}
          onChange={(e) => updateLineItem(line.id, { unitCost: Number(e.target.value) })}
          className={`${QTY_INPUT_CLASS} w-24`}
          style={FIELD_INPUT_STYLE}
        />
      </div>
      <div className="w-28 shrink-0 py-3 pr-2 text-center">
        <p
          className="font-sans font-medium whitespace-nowrap"
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          {formatCurrency(totalCost)}
        </p>
      </div>
      <div className="w-28 shrink-0 py-3 pr-2 text-center">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
          style={{
            fontSize: 14,
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {status}
        </span>
      </div>
      <div className="flex w-16 shrink-0 items-center justify-center py-3 pr-3">
        <PermissionGate permission={PERMISSIONS.LAB_INVENTORY_WRITE}>
          <button
            type="button"
            onClick={onRemove}
            disabled={locked}
            aria-label={`Remove ${item?.name ?? 'item'} from GRN`}
            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
          >
            <Trash2 style={{ width: 15, height: 15, color: '#DC2626' }} />
          </button>
        </PermissionGate>
      </div>
    </div>
  );
}

export function StockReceivingWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Lab Scientist';

  const grnRecord = useGrn();
  const lineItems = useLineItems();
  const attachments = useAttachments();
  const activityLog = useActivityLog();
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const remarksRef = useRef<HTMLTextAreaElement>(null);

  const locked = grnRecord.status === 'Completed';
  const summary = getGrnSummary();
  const inRange = grnRecord.temperatureOnArrival >= 2 && grnRecord.temperatureOnArrival <= 8;

  function handlePrint() {
    const rows = lineItems
      .map((l, i) => {
        const item = getInventoryItemById(l.itemId);
        return `<tr><td>${i + 1}</td><td>${escapeHtml(item?.name ?? '—')}</td><td>${escapeHtml(item?.catalogNo ?? '—')}</td><td>${escapeHtml(l.lotBatchNo)}</td><td>${l.receivedQty}</td><td>${l.acceptedQty}</td><td>${l.rejectedQty}</td><td>${escapeHtml(formatCurrency(l.acceptedQty * l.unitCost))}</td></tr>`;
      })
      .join('');
    downloadPDF(
      grnRecord.id,
      `<h1>${escapeHtml(grnRecord.id)}</h1>
       <p>Supplier: ${escapeHtml(grnRecord.supplier)} &middot; Delivery Note: ${escapeHtml(grnRecord.deliveryNoteNo)}</p>
       <p>Received By: ${escapeHtml(grnRecord.receivedBy)} &middot; ${escapeHtml(formatHumanDate(grnRecord.deliveryDate))}</p>
       <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
         <thead><tr><th>#</th><th>Item</th><th>Catalog No.</th><th>Lot/Batch</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>Total Cost</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>
       <p>Total Amount: ${escapeHtml(formatCurrency(summary.totalAmount))}</p>`,
    );
  }

  function handleComplete() {
    if (lineItems.length === 0) {
      toast.error('Nothing to receive', 'Add at least one received item before completing.');
      return;
    }
    completeReceiving(actorName);
    toast.success(
      'Receiving completed',
      `${grnRecord.id} stock has been added to Laboratory Inventory.`,
    );
  }

  function handleStartNew() {
    startNewReceiving();
    toast.info('New GRN started', 'A fresh receiving session is ready.');
  }

  function handleDownloadAttachment(fileName: string) {
    const blob = new Blob([`Placeholder content for ${fileName}\nAttached to ${grnRecord.id}.`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.laboratory)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Home
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span style={{ color: '#4A7080' }}>Inventory</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Stock Receiving
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Stock Receiving
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Receive delivered items and update inventory stock.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print GRN
              </button>
              <PermissionGate permission={PERMISSIONS.LAB_INVENTORY_WRITE}>
                {locked ? (
                  <button
                    type="button"
                    onClick={handleStartNew}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <Plus style={{ width: 15, height: 15 }} />
                    Start New Receiving
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleComplete}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <CheckCircle2 style={{ width: 15, height: 15 }} />
                    Complete Receiving
                  </button>
                )}
              </PermissionGate>
            </div>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <InfoCard
              icon={Package}
              label="GRN Number"
              value={grnRecord.id}
              subLabel={grnRecord.linkedRequestId ? 'Linked Request' : 'Receiving Date'}
              subValue={
                grnRecord.linkedRequestId
                  ? grnRecord.linkedRequestId
                  : formatHumanDate(grnRecord.deliveryDate)
              }
            />
            <InfoCard
              icon={Truck}
              label="Supplier"
              value={grnRecord.supplier}
              subLabel="Delivery Note"
              subValue={grnRecord.deliveryNoteNo}
            />
            <InfoCard
              icon={Package}
              label="Total Items"
              value={String(summary.totalItems)}
              subLabel="Total Packages"
              subValue={String(summary.totalPackages)}
            />
            <InfoCard
              icon={Package}
              label="Total Quantity"
              value={String(summary.totalQuantity)}
              subLabel="Units"
              subValue=" "
            />
            <InfoCard
              icon={Wallet}
              label="Total Amount"
              value={formatCurrency(summary.totalAmount)}
              subLabel="Status"
              subValueNode={
                <span
                  className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: locked ? '#16A34A' : '#B45309',
                    background: locked ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  }}
                >
                  {grnRecord.status}
                </span>
              }
            />
            <InfoCard
              icon={User}
              label="Received By"
              value={grnRecord.receivedBy}
              subLabel="Department"
              subValue={grnRecord.department}
            />
          </div>

          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
            {/* ── Left column ─────────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {/* Delivery Information */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-2.5">
                  <SectionNumber n={1} />
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 18, color: '#0D2630' }}
                  >
                    Delivery Information
                  </h2>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
                  {[
                    {
                      label: 'Supplier',
                      value: grnRecord.supplier,
                      key: 'supplier' as const,
                      required: true,
                    },
                    {
                      label: 'Delivery Note No.',
                      value: grnRecord.deliveryNoteNo,
                      key: 'deliveryNoteNo' as const,
                      required: true,
                    },
                    { label: 'Invoice No.', value: grnRecord.invoiceNo, key: 'invoiceNo' as const },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL_STYLE}>
                        {f.label}
                        {f.required && <span style={{ color: '#DC2626' }}> *</span>}
                      </label>
                      <input
                        type="text"
                        value={f.value}
                        disabled={locked}
                        onChange={(e) => updateDeliveryInfo({ [f.key]: e.target.value })}
                        className={FIELD_INPUT_CLASS}
                        style={FIELD_INPUT_STYLE}
                      />
                    </div>
                  ))}
                  <div>
                    <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL_STYLE}>
                      Invoice Date
                    </label>
                    <FormDateInput
                      value={toWATDateInput(grnRecord.invoiceDate)}
                      disabled={locked}
                      onChange={(e) =>
                        updateDeliveryInfo({
                          invoiceDate: new Date(e.target.value).toISOString(),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL_STYLE}>
                      Delivery Date<span style={{ color: '#DC2626' }}> *</span>
                    </label>
                    <FormDateInput
                      value={toWATDateInput(grnRecord.deliveryDate)}
                      disabled={locked}
                      onChange={(e) =>
                        updateDeliveryInfo({
                          deliveryDate: new Date(e.target.value).toISOString(),
                        })
                      }
                    />
                  </div>
                  {[
                    { label: 'Vehicle No.', value: grnRecord.vehicleNo, key: 'vehicleNo' as const },
                    {
                      label: 'Driver Name',
                      value: grnRecord.driverName,
                      key: 'driverName' as const,
                    },
                    { label: 'Contact No.', value: grnRecord.contactNo, key: 'contactNo' as const },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL_STYLE}>
                        {f.label}
                      </label>
                      <input
                        type="text"
                        value={f.value}
                        disabled={locked}
                        onChange={(e) => updateDeliveryInfo({ [f.key]: e.target.value })}
                        className={FIELD_INPUT_CLASS}
                        style={FIELD_INPUT_STYLE}
                      />
                    </div>
                  ))}
                  <div>
                    <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL_STYLE}>
                      No. of Packages
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={grnRecord.noOfPackages}
                      disabled={locked}
                      onChange={(e) => updateDeliveryInfo({ noOfPackages: Number(e.target.value) })}
                      className={FIELD_INPUT_CLASS}
                      style={FIELD_INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <div className={`${FIELD_LABEL_CLASS} gap-1`}>
                      <span style={FIELD_LABEL_STYLE}>Temperature on Arrival</span>
                      <Tooltip content="Cold-chain reagents must arrive between 2°C and 8°C.">
                        <Info style={{ width: 13, height: 13, color: '#8A98A3' }} />
                      </Tooltip>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={grnRecord.temperatureOnArrival}
                        disabled={locked}
                        onChange={(e) =>
                          updateDeliveryInfo({ temperatureOnArrival: Number(e.target.value) })
                        }
                        className={FIELD_INPUT_CLASS}
                        style={{ ...FIELD_INPUT_STYLE, paddingRight: 32 }}
                      />
                      <Thermometer
                        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                        style={{ width: 14, height: 14, color: '#8A98A3' }}
                      />
                    </div>
                    <span
                      className="mt-1.5 inline-block rounded-full px-2.5 py-1 font-sans font-medium whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: inRange ? '#16A34A' : '#DC2626',
                        background: inRange ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      }}
                    >
                      {inRange ? 'Within Range' : 'Out of Range'}
                    </span>
                  </div>
                  <div className="sm:col-span-3 xl:col-span-5">
                    <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL_STYLE}>
                      Remarks / Notes
                    </label>
                    <textarea
                      ref={remarksRef}
                      rows={2}
                      value={grnRecord.remarks}
                      disabled={locked}
                      onChange={(e) => updateDeliveryInfo({ remarks: e.target.value })}
                      className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                      style={FIELD_INPUT_STYLE}
                    />
                  </div>
                </div>
              </div>

              {/* Received Items */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <SectionNumber n={2} />
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 18, color: '#0D2630' }}
                    >
                      Received Items
                    </h2>
                  </div>
                  <PermissionGate permission={PERMISSIONS.LAB_INVENTORY_WRITE}>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAddItemOpen(true)}
                        disabled={locked}
                        className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        <ScanLine style={{ width: 15, height: 15 }} />
                        Scan Barcode
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddItemOpen(true)}
                        disabled={locked}
                        className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        <Plus style={{ width: 15, height: 15 }} />
                        Add Item
                      </button>
                    </div>
                  </PermissionGate>
                </div>

                <div className="mt-4">
                  <ScrollableTable minWidth={1480} maxHeight={520}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['#', 'w-10'],
                        ['Item / Reagent', 'min-w-[180px] flex-1'],
                        ['Catalog No.', 'w-32'],
                        ['Lot/Batch No.', 'w-32'],
                        ['Expiry Date', 'w-32'],
                        ['UOM', 'w-20'],
                        ['Ordered', 'w-24'],
                        ['Received', 'w-24'],
                        ['Accepted', 'w-24'],
                        ['Rejected', 'w-24'],
                        ['Unit Cost', 'w-28'],
                        ['Total Cost', 'w-28'],
                        ['Status', 'w-28'],
                      ].map(([label, width]) => (
                        <div
                          key={label}
                          className={`${width} shrink-0 py-2.5 pr-2 pl-3 text-center`}
                        >
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                      <div className="w-16 shrink-0 py-2.5 pr-3 text-center">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                    </div>
                    {lineItems.map((line, i) => (
                      <LineRow
                        key={line.id}
                        index={i}
                        line={line}
                        locked={locked}
                        onRemove={() => removeLineItem(line.id)}
                      />
                    ))}
                  </ScrollableTable>
                </div>

                <div
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                  style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                >
                  <span
                    className="font-sans font-semibold"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Total
                  </span>
                  <span
                    className="font-sans font-semibold"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {lineItems.reduce((s, l) => s + l.receivedQty, 0)} received ·{' '}
                    {summary.totalQuantity} accepted ·{' '}
                    {lineItems.reduce((s, l) => s + l.rejectedQty, 0)} rejected ·{' '}
                    {formatCurrency(summary.subTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Right column ────────────────────────────────────────────── */}
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  GRN Summary
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {[
                    ['Sub Total', formatCurrency(summary.subTotal)],
                    ['Discount', formatCurrency(0)],
                    [`Tax (${(summary.taxRate * 100).toFixed(1)}%)`, formatCurrency(summary.tax)],
                    ['Shipping / Handling', formatCurrency(0)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{label}</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                  <div
                    className="mt-1 flex items-center justify-between gap-2 border-t pt-2.5"
                    style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                  >
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Total Amount
                    </span>
                    <span
                      className="font-display font-bold"
                      style={{ fontSize: 16, color: '#00B4D8' }}
                    >
                      {formatCurrency(summary.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Receiving Checklist
                </h2>
                <div className="mt-3 flex flex-col">
                  {INITIAL_CHECKLIST.map((c) => {
                    const expanded = expandedChecklist === c.id;
                    return (
                      <div key={c.id} style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
                        <button
                          type="button"
                          onClick={() => setExpandedChecklist(expanded ? null : c.id)}
                          className={`flex w-full items-center justify-between gap-2 py-2.5 text-left transition-colors duration-150 hover:opacity-80 ${FOCUS_RING}`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <CheckCircle2
                              style={{ width: 16, height: 16, color: '#16A34A', flexShrink: 0 }}
                            />
                            <span className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                              {c.label}
                            </span>
                          </div>
                          <ChevronDown
                            style={{
                              width: 15,
                              height: 15,
                              color: '#8A98A3',
                              flexShrink: 0,
                              transition: 'transform 150ms',
                              transform: expanded ? 'rotate(180deg)' : 'none',
                            }}
                          />
                        </button>
                        {expanded && (
                          <p
                            className="animate-in fade-in-0 pb-2.5 duration-150"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {c.detail}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Attachments
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Tooltip content={a.fileName}>
                          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                            {a.fileName}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{a.fileSizeKB} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(a.fileName)}
                        aria-label={`Download ${a.fileName}`}
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                      >
                        <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Activity Log
                </h2>
                <div className="mt-3 flex flex-col gap-3">
                  {activityLog.map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p style={{ fontSize: 14, color: '#0D2630' }}>{entry.label}</p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{entry.actor}</p>
                      </div>
                      <p
                        className="shrink-0 whitespace-nowrap"
                        style={{ fontSize: 14, color: '#8A98A3' }}
                      >
                        {formatTime(entry.at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {addItemOpen && (
        <AddReceivedItemModal
          existingItemIds={lineItems.map((l) => l.itemId)}
          onClose={() => setAddItemOpen(false)}
          onSubmit={(line) => {
            setAddItemOpen(false);
            const item = getInventoryItemById(line.itemId);
            toast.success('Item added to GRN', `${item?.name ?? 'Item'} added to ${grnRecord.id}.`);
          }}
        />
      )}
    </div>
  );
}
