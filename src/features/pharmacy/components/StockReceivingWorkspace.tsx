'use client';

import {
  Banknote,
  CheckCircle2,
  ClipboardList,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  ScanLine,
  Trash2,
  Truck,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { StatCard } from '@components/shared/StatCard';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import { formatDate } from '@/utils/datetime';
import {
  getCatalogEntry,
  getSupplierInfo,
  INVENTORY_LOCATION_OPTIONS,
  type StockReceiptItem,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  getPurchaseOrder,
  submitReceipt,
  useOpenPurchaseOrders,
  usePurchaseOrders,
  useReceipts,
} from '@/features/pharmacy/store/stockReceivingStore';
import type { PharmacyLocationId } from '@/constants/pharmacyLocations';

const AddReceivingItemModal = dynamic(
  () =>
    import('@/features/pharmacy/components/AddReceivingItemModal').then(
      (m) => m.AddReceivingItemModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const PurchaseOrdersModal = dynamic(
  () =>
    import('@/features/pharmacy/components/PurchaseOrdersModal').then((m) => m.PurchaseOrdersModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ReceivingHistoryModal = dynamic(
  () =>
    import('@/features/pharmacy/components/ReceivingHistoryModal').then(
      (m) => m.ReceivingHistoryModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
};
const FIELD_INPUT_DISABLED_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#4A7080',
  background: '#F5FBFD',
};

type ModalState = 'add-item' | 'purchase-orders' | 'history' | null;

function isToday(iso: string): boolean {
  const wat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' });
  return wat.format(new Date(iso)) === wat.format(new Date());
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function todayDateInputValue(): string {
  const wat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' });
  return wat.format(new Date());
}

export function StockReceivingWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const openPOs = useOpenPurchaseOrders();
  const allPOs = usePurchaseOrders();
  const receipts = useReceipts();

  // Live, not the static PO_OPTIONS snapshot — a purchase order created just
  // now (e.g. Procurement Requests marking a request "Ordered") must be
  // selectable here immediately, not only after a reload.
  const poOptions = useMemo(
    () =>
      openPOs
        .filter((po) => po.status === 'Pending')
        .map((po) => ({ value: po.poNumber, label: po.poNumber })),
    [openPOs],
  );

  const [selectedPoNumber, setSelectedPoNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [warehouseLocationId, setWarehouseLocationId] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [receivedDate, setReceivedDate] = useState(() => todayDateInputValue());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<StockReceiptItem[]>([]);
  const [modal, setModal] = useState<ModalState>(null);

  const todayReceipts = useMemo(() => receipts.filter((r) => isToday(r.receivedAt)), [receipts]);
  const itemsReceivingToday = useMemo(
    () => todayReceipts.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.receivedQty, 0), 0),
    [todayReceipts],
  );
  const posToday = useMemo(
    () => new Set(todayReceipts.map((r) => r.poNumber)).size,
    [todayReceipts],
  );

  const thisMonthReceipts = useMemo(
    () => receipts.filter((r) => isThisMonth(r.receivedAt)),
    [receipts],
  );
  const totalItemsThisMonth = useMemo(
    () =>
      thisMonthReceipts.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.receivedQty, 0), 0),
    [thisMonthReceipts],
  );
  const totalValueThisMonth = useMemo(
    () => thisMonthReceipts.reduce((sum, r) => sum + r.totalValueInclTax, 0),
    [thisMonthReceipts],
  );

  const totalQtyReceived = items.reduce((sum, i) => sum + i.receivedQty, 0);
  const totalValueExclTax = items.reduce((sum, i) => sum + i.receivedQty * i.unitPrice, 0);
  const tax = Math.round(totalValueExclTax * 0.075);
  const totalValueInclTax = totalValueExclTax + tax;

  const recentReceipts = useMemo(
    () =>
      [...receipts]
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
        .slice(0, 3),
    [receipts],
  );

  const supplierInfo = getSupplierInfo(supplier);

  const canSubmit =
    selectedPoNumber !== '' &&
    warehouseLocationId !== '' &&
    receivedDate !== '' &&
    items.length > 0 &&
    items.some((i) => i.receivedQty > 0) &&
    items.every((i) => i.receivedQty >= 0);

  function handlePoSelect(poNumber: string) {
    const po = getPurchaseOrder(poNumber);
    if (!po) return;
    setSelectedPoNumber(poNumber);
    setSupplier(po.supplier);
    setWarehouseLocationId('loc_awka');
    setItems(
      po.items.map((line) => {
        const entry = getCatalogEntry(line.medicationName)!;
        return {
          medicationName: entry.name,
          strength: entry.strength,
          form: entry.form,
          unit: entry.unit,
          category: entry.category,
          batchNo: line.batchNo,
          expiryDate: line.expiryDate,
          orderedQty: line.orderedQty,
          receivedQty: line.orderedQty,
          unitPrice: entry.unitPrice,
          reorderLevel: entry.reorderLevel,
          ...(entry.controlledSchedule ? { controlledSchedule: entry.controlledSchedule } : {}),
        };
      }),
    );
    setDeliveryNote(`INV-${po.supplier.slice(0, 3).toUpperCase()}-${poNumber.slice(-4)}`);
    setReferenceNo(`REF-${poNumber.slice(3)}`);
  }

  function resetForm() {
    setSelectedPoNumber('');
    setSupplier('');
    setWarehouseLocationId('');
    setDeliveryNote('');
    setReferenceNo('');
    setReceivedDate(todayDateInputValue());
    setNotes('');
    setItems([]);
  }

  function updateItem(index: number, patch: Partial<StockReceiptItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleScanBarcode() {
    toast.info(
      'Scanner unavailable',
      'Barcode scanning needs camera/hardware access not available in this environment — use Add Item instead.',
    );
  }

  function handleConfirm() {
    if (!canSubmit) {
      toast.error(
        'Missing information',
        'Select a purchase order, warehouse, and at least one item.',
      );
      return;
    }
    const receivedAtIso = new Date(`${receivedDate}T12:00:00`).toISOString();
    const receiptId = submitReceipt({
      poNumber: selectedPoNumber,
      supplier,
      warehouseLocationId: warehouseLocationId as PharmacyLocationId,
      deliveryNote,
      referenceNo,
      receivedBy: actorName,
      receivedAt: receivedAtIso,
      notes,
      items,
    });
    toast.success('Receipt saved', `${receiptId} confirmed — Drug Inventory updated.`);
    resetForm();
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacy)}
            className={`transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#8A98A3' }}
          >
            Home
          </button>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Inventory Management</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Stock Receiving
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Stock Receiving
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Receive stock from suppliers and update inventory levels.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setModal('purchase-orders')}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <ClipboardList style={{ width: 15, height: 15 }} />
              View Purchase Orders
            </button>
            <button
              type="button"
              onClick={resetForm}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              New Receiving
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4 xl:gap-4">
          <StatCard
            icon={Truck}
            label="Pending Receipts"
            value={openPOs.length}
            info="POs awaiting receipt"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
          />
          <StatCard
            icon={ClipboardList}
            label="Items Receiving Today"
            value={itemsReceivingToday}
            info={`Across ${posToday} PO${posToday === 1 ? '' : 's'}`}
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
          />
          <StatCard
            icon={CheckCircle2}
            label="Total Items Received"
            value={totalItemsThisMonth}
            info="This month"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
          />
          <StatCard
            icon={Banknote}
            label="Total Value Received"
            value={formatCurrencyCompact(totalValueThisMonth)}
            info="This month"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
          {/* Main column */}
          <div className="min-w-0 flex-1">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Receiving Information
              </h2>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label
                    htmlFor="sr-po"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Purchase Order *
                  </label>
                  <FormSelect
                    id="sr-po"
                    value={selectedPoNumber}
                    onChange={handlePoSelect}
                    options={poOptions}
                    placeholder="Select purchase order"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sr-supplier"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Supplier *
                  </label>
                  <input
                    id="sr-supplier"
                    type="text"
                    value={supplier}
                    disabled
                    placeholder="Set by purchase order"
                    className={`${FIELD_INPUT_CLASS} disabled:cursor-not-allowed`}
                    style={FIELD_INPUT_DISABLED_STYLE}
                  />
                </div>
                <div>
                  <label
                    htmlFor="sr-invoice"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Delivery Note / Invoice No.
                  </label>
                  <input
                    id="sr-invoice"
                    type="text"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="e.g. INV-MPL-0626-1834"
                    className={FIELD_INPUT_CLASS}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label
                    htmlFor="sr-date"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Received Date *
                  </label>
                  <input
                    id="sr-date"
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className={FIELD_INPUT_CLASS}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label
                    htmlFor="sr-ref"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Reference No.
                  </label>
                  <input
                    id="sr-ref"
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. REF-2026-0630-001"
                    className={FIELD_INPUT_CLASS}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label
                    htmlFor="sr-warehouse"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Warehouse / Location *
                  </label>
                  <FormSelect
                    id="sr-warehouse"
                    value={warehouseLocationId}
                    onChange={setWarehouseLocationId}
                    options={INVENTORY_LOCATION_OPTIONS}
                    placeholder="Select location"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sr-receivedby"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Received By
                  </label>
                  <input
                    id="sr-receivedby"
                    type="text"
                    value={actorName}
                    disabled
                    className={`${FIELD_INPUT_CLASS} disabled:cursor-not-allowed`}
                    style={FIELD_INPUT_DISABLED_STYLE}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="sr-notes"
                    className="mb-1.5 block font-sans font-medium"
                    style={FIELD_LABEL}
                  >
                    Notes
                  </label>
                  <input
                    id="sr-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Delivery made in good condition."
                    className={FIELD_INPUT_CLASS}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
              </div>
            </div>

            <div
              className="mt-4 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Items to Receive ({items.length})
                </h2>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleScanBarcode}
                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#4A7080',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  >
                    <ScanLine style={{ width: 15, height: 15 }} />
                    Scan Barcode
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal('add-item')}
                    disabled={!selectedPoNumber}
                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <Plus style={{ width: 15, height: 15 }} />
                    Add Item
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Package style={{ width: 24, height: 24, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                    Select a purchase order to load its items
                  </p>
                </div>
              ) : (
                <ScrollableTable minWidth={1100} maxHeight={640} className="mt-3">
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{
                      background: TABLE_HEADER_BG,
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="w-10 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        #
                      </span>
                    </div>
                    <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Medication
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Batch No.
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Expiry Date
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 text-right">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Ordered
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2 text-right">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Received
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2 text-right">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Unit Price
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2 text-right">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Total Price
                      </span>
                    </div>
                    <div className="w-16 shrink-0 py-2.5 pr-3 text-right">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Actions
                      </span>
                    </div>
                  </div>

                  {items.map((item, index) => (
                    <div
                      key={`${item.medicationName}-${item.batchNo}-${index}`}
                      className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="w-10 shrink-0 py-3 pr-2 pl-3">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{index + 1}</p>
                      </div>
                      <div className="min-w-[160px] flex-1 py-3 pr-2">
                        <Tooltip content={`${item.medicationName} ${item.strength}`}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {item.medicationName} {item.strength}
                          </p>
                        </Tooltip>
                        <Tooltip content={item.form}>
                          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {item.form}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-32 shrink-0 py-2 pr-2">
                        <input
                          type="text"
                          value={item.batchNo}
                          onChange={(e) => updateItem(index, { batchNo: e.target.value })}
                          className={`h-9 w-full rounded-[8px] px-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        />
                      </div>
                      <div className="w-36 shrink-0 py-2 pr-2">
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => updateItem(index, { expiryDate: e.target.value })}
                          className={`h-9 w-full rounded-[8px] px-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        />
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-2 text-right">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          {item.orderedQty.toLocaleString('en-GB')}
                        </p>
                      </div>
                      <div className="w-28 shrink-0 py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={item.receivedQty}
                          onChange={(e) =>
                            updateItem(index, {
                              receivedQty: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className={`h-9 w-full rounded-[8px] px-2.5 text-right font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        />
                      </div>
                      <div className="w-28 shrink-0 py-3 pr-2 text-right">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <div className="w-32 shrink-0 py-3 pr-2 text-right">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {formatCurrency(item.receivedQty * item.unitPrice)}
                        </p>
                      </div>
                      <div className="flex w-16 shrink-0 items-center justify-end py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          aria-label={`Remove ${item.medicationName}`}
                          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(220,38,38,0.08)] ${FOCUS_RING}`}
                        >
                          <Trash2 style={{ width: 15, height: 15, color: '#DC2626' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </ScrollableTable>
              )}
            </div>

            {/* Footer note + actions */}
            <div
              className="mt-4 flex flex-col gap-3 rounded-[12px] p-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                background: 'rgba(0,180,216,0.06)',
                border: '1px solid rgba(0,180,216,0.25)',
              }}
            >
              <p style={{ fontSize: 14, color: '#0D2630' }}>
                Verify all items, quantities, batch numbers, and expiry dates before confirming
                receipt.
              </p>
              <div className="flex shrink-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#4A7080',
                    border: '1px solid rgba(0,100,130,0.18)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#16A34A' }}
                >
                  Confirm & Save Receipt
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Receiving Summary
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Total Items</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Total Qty Received</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {totalQtyReceived.toLocaleString('en-GB')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Total Value (Excl. Tax)</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {formatCurrency(totalValueExclTax)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Tax (7.5%)</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {formatCurrency(tax)}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between gap-2 pt-2.5"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.1)' }}
                >
                  <span
                    className="font-sans font-semibold"
                    style={{ fontSize: 14, color: '#16A34A' }}
                  >
                    Total Value (Incl. Tax)
                  </span>
                  <span className="font-sans font-bold" style={{ fontSize: 14, color: '#16A34A' }}>
                    {formatCurrency(totalValueInclTax)}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Supplier Information
              </h2>
              {supplierInfo ? (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {supplierInfo.name}
                  </p>
                  <div className="flex items-start gap-2">
                    <MapPin
                      className="mt-0.5 shrink-0"
                      style={{ width: 14, height: 14, color: '#8A98A3' }}
                    />
                    <span style={{ fontSize: 14, color: '#4A7080' }}>{supplierInfo.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone
                      className="shrink-0"
                      style={{ width: 14, height: 14, color: '#8A98A3' }}
                    />
                    <span style={{ fontSize: 14, color: '#4A7080' }}>{supplierInfo.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail
                      className="shrink-0"
                      style={{ width: 14, height: 14, color: '#8A98A3' }}
                    />
                    <Tooltip content={supplierInfo.email}>
                      <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        {supplierInfo.email}
                      </span>
                    </Tooltip>
                  </div>
                  <span
                    className="mt-1 inline-block w-fit rounded-full px-2.5 py-0.5 font-sans"
                    style={{ fontSize: 14, color: '#4A7080', background: 'rgba(226,237,241,0.6)' }}
                  >
                    Supplier Code: {supplierInfo.code}
                  </span>
                </div>
              ) : (
                <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Select a purchase order to see supplier details.
                </p>
              )}
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Recent Receipts
                </h2>
                <button
                  type="button"
                  onClick={() => setModal('history')}
                  className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {recentReceipts.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Tooltip content={r.id}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {r.id}
                        </p>
                      </Tooltip>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatDate(r.receivedAt)}</p>
                      <p style={{ fontSize: 14, color: '#0D2630' }}>
                        {formatCurrency(r.totalValueInclTax)}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                        color: r.status === 'Completed' ? '#16A34A' : '#D97706',
                        border: `1px solid ${r.status === 'Completed' ? 'rgba(22,163,74,0.35)' : 'rgba(217,119,6,0.35)'}`,
                        background:
                          r.status === 'Completed'
                            ? 'rgba(22,163,74,0.08)'
                            : 'rgba(217,119,6,0.08)',
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-4" />
      </div>

      {modal === 'add-item' && (
        <AddReceivingItemModal
          excludeNames={items.map((i) => i.medicationName)}
          onAdd={(item) => {
            setItems((prev) => [...prev, item]);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'purchase-orders' && (
        <PurchaseOrdersModal
          purchaseOrders={allPOs}
          onSelect={(poNumber) => {
            handlePoSelect(poNumber);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'history' && (
        <ReceivingHistoryModal
          receipts={[...receipts].sort(
            (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
          )}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
