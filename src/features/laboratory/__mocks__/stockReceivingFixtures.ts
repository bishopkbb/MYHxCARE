/**
 * Stock Receiving — the current goods-receipt session: delivery details,
 * received line items (each tied to a real Laboratory Inventory item by
 * id), attachments, and an activity log. Completing the GRN calls
 * inventoryStore's `adjustStock()` for every accepted line, so it's a real
 * write into shared inventory data, not a disconnected receiving form.
 */

export type GrnStatus = 'Receiving' | 'Completed';

export type GoodsReceiptNote = {
  id: string;
  supplier: string;
  deliveryNoteNo: string;
  invoiceNo: string;
  invoiceDate: string;
  deliveryDate: string;
  vehicleNo: string;
  driverName: string;
  contactNo: string;
  noOfPackages: number;
  temperatureOnArrival: number;
  remarks: string;
  receivedBy: string;
  department: string;
  status: GrnStatus;
  createdAt: string;
};

export type LineItemStatus = 'Accepted' | 'Partial' | 'Rejected';

export type ReceivedLineItem = {
  id: string;
  itemId: string;
  lotBatchNo: string;
  expiryDate: string;
  uom: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unitCost: number;
};

export type Attachment = {
  id: string;
  fileName: string;
  fileSizeKB: number;
};

export type ActivityLogEntry = {
  id: string;
  label: string;
  actor: string;
  at: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
};

function isoOffset(days: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function nextGrnNumber(): string {
  const now = new Date();
  return `GRN-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-0307`;
}

export const INITIAL_GRN: GoodsReceiptNote = {
  id: nextGrnNumber(),
  supplier: 'Medline Scientific Ltd.',
  deliveryNoteNo: 'DN-62635',
  invoiceNo: 'INV-62635',
  invoiceDate: isoOffset(0),
  deliveryDate: isoOffset(0),
  vehicleNo: 'ABJ 456 XY',
  driverName: 'Ibrahim Musa',
  contactNo: '0803 456 7890',
  noOfPackages: 4,
  temperatureOnArrival: 4.1,
  remarks: 'All items received in good condition.',
  receivedBy: 'Mary Nwankwo',
  department: 'Hematology Lab',
  status: 'Receiving',
  createdAt: isoOffset(0, 9, 5),
};

export const INITIAL_LINE_ITEMS: ReceivedLineItem[] = [
  {
    id: 'rli-0001',
    itemId: 'inv-hero-001',
    lotBatchNo: 'LOT250501',
    expiryDate: isoOffset(95),
    uom: '20 L',
    orderedQty: 2,
    receivedQty: 2,
    acceptedQty: 2,
    rejectedQty: 0,
    unitCost: 85000,
  },
  {
    id: 'rli-0002',
    itemId: 'inv-hero-002',
    lotBatchNo: 'LOT250512',
    expiryDate: isoOffset(55),
    uom: '500 mL',
    orderedQty: 6,
    receivedQty: 6,
    acceptedQty: 6,
    rejectedQty: 0,
    unitCost: 45000,
  },
  {
    id: 'rli-0003',
    itemId: 'inv-hero-003',
    lotBatchNo: 'LOT250601',
    expiryDate: isoOffset(85),
    uom: '5 mL',
    orderedQty: 2,
    receivedQty: 2,
    acceptedQty: 2,
    rejectedQty: 0,
    unitCost: 12000,
  },
  {
    id: 'rli-0004',
    itemId: 'inv-hero-004',
    lotBatchNo: 'LOT250602',
    expiryDate: isoOffset(85),
    uom: '5 mL',
    orderedQty: 2,
    receivedQty: 2,
    acceptedQty: 2,
    rejectedQty: 0,
    unitCost: 12000,
  },
  {
    id: 'rli-0005',
    itemId: 'inv-hero-005',
    lotBatchNo: 'LOT250515',
    expiryDate: isoOffset(75),
    uom: '100 Tests',
    orderedQty: 2,
    receivedQty: 2,
    acceptedQty: 2,
    rejectedQty: 0,
    unitCost: 18000,
  },
  {
    id: 'rli-0006',
    itemId: 'inv-hero-006',
    lotBatchNo: 'LOT250515',
    expiryDate: isoOffset(75),
    uom: '100 Tests',
    orderedQty: 2,
    receivedQty: 2,
    acceptedQty: 2,
    rejectedQty: 0,
    unitCost: 16000,
  },
  {
    id: 'rli-0007',
    itemId: 'inv-hero-007',
    lotBatchNo: 'LOT250516',
    expiryDate: isoOffset(70),
    uom: '100 Tests',
    orderedQty: 2,
    receivedQty: 2,
    acceptedQty: 2,
    rejectedQty: 0,
    unitCost: 20000,
  },
  {
    id: 'rli-0008',
    itemId: 'inv-hero-008',
    lotBatchNo: 'LOT250528',
    expiryDate: isoOffset(12),
    uom: '50 Tests',
    orderedQty: 1,
    receivedQty: 1,
    acceptedQty: 1,
    rejectedQty: 0,
    unitCost: 65000,
  },
  {
    id: 'rli-0009',
    itemId: 'inv-hero-010',
    lotBatchNo: 'LOT250630',
    expiryDate: isoOffset(700),
    uom: '100 pcs',
    orderedQty: 2,
    receivedQty: 2,
    acceptedQty: 2,
    rejectedQty: 0,
    unitCost: 3200,
  },
  {
    id: 'rli-0010',
    itemId: 'inv-hero-011',
    lotBatchNo: 'LOT250631',
    expiryDate: isoOffset(700),
    uom: '100 pcs',
    orderedQty: 2,
    receivedQty: 2,
    acceptedQty: 2,
    rejectedQty: 0,
    unitCost: 3000,
  },
];

export const INITIAL_ATTACHMENTS: Attachment[] = [
  { id: 'att-0001', fileName: 'Delivery_Note_DN-62635.pdf', fileSizeKB: 210 },
  { id: 'att-0002', fileName: 'Invoice_INV-62635.pdf', fileSizeKB: 185 },
  { id: 'att-0003', fileName: 'Packing_List.pdf', fileSizeKB: 120 },
];

export const INITIAL_ACTIVITY_LOG: ActivityLogEntry[] = [
  { id: 'act-0001', label: 'GRN created', actor: 'Mary Nwankwo', at: isoOffset(0, 9, 5) },
  {
    id: 'act-0002',
    label: 'Items verification started',
    actor: 'Mary Nwankwo',
    at: isoOffset(0, 9, 8),
  },
  {
    id: 'act-0003',
    label: 'Receiving in progress',
    actor: 'Mary Nwankwo',
    at: isoOffset(0, 9, 15),
  },
];

export const INITIAL_CHECKLIST: ChecklistItem[] = [
  {
    id: 'chk-0001',
    label: 'Packages received in good condition',
    detail: 'Verified by Mary Nwankwo — no visible damage to any package.',
    checked: true,
  },
  {
    id: 'chk-0002',
    label: 'Items counted and verified',
    detail: 'Received quantities matched the delivery note on all 10 lines.',
    checked: true,
  },
  {
    id: 'chk-0003',
    label: 'Batch/Lot numbers recorded',
    detail: 'Every line item has its lot/batch number logged against this GRN.',
    checked: true,
  },
  {
    id: 'chk-0004',
    label: 'Expiry dates checked',
    detail: 'No item received with less than 10 days of shelf life remaining.',
    checked: true,
  },
  {
    id: 'chk-0005',
    label: 'Documentation received',
    detail: 'Delivery note, invoice, and packing list attached to this GRN.',
    checked: true,
  },
];
