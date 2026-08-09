/**
 * Laboratory Inventory — every reagent, kit, consumable, and supply
 * tracked across departments, plus batch receipts, reorder requests, and
 * a stock-movement history log. Status (In Stock / Low Stock / Expiring
 * Soon / Expired / Out of Stock) is always derived from stock level and
 * expiry date via `getInventoryStatus()` (in inventoryStore.ts), never
 * stored directly — so it can never drift out of sync with the numbers
 * that produced it.
 */

import { DEPARTMENT_OPTIONS } from '@/features/laboratory/__mocks__/equipmentFixtures';

export type InventoryCategory =
  'Reagent' | 'Control Material' | 'Test Kit' | 'Consumable' | 'Kit' | 'Supply';

export type InventoryStatus =
  'In Stock' | 'Low Stock' | 'Expiring Soon' | 'Expired' | 'Out of Stock';

export type InventoryItem = {
  id: string;
  name: string;
  catalogNo: string;
  category: InventoryCategory;
  department: string;
  lotBatchNo: string;
  expiryDate: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  manufacturer: string;
  packSize: string;
  receivedDate: string;
  storageCondition: string;
  location: string;
  description: string;
};

function isoOffset(days: number): string {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Deterministic pseudo-random generator so the 700+ bulk-generated rows
 * below render identically on the server and after client hydration —
 * never `Math.random()`, which would produce a hydration mismatch. */
function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEPARTMENT_STORE_SUFFIX: Record<string, string> = {
  'Chemical Pathology': 'Chem Path Store',
  Hematology: 'Hematology Store',
  Immunology: 'Immunology Store',
  Microbiology: 'Micro Store',
  'Molecular Lab': 'Molecular Store',
  'Blood Bank': 'Blood Bank Store',
  Biochemistry: 'Biochemistry Store',
  'Emergency Lab': 'Emergency Store',
};

export const CATEGORY_OPTIONS: InventoryCategory[] = [
  'Reagent',
  'Control Material',
  'Test Kit',
  'Consumable',
  'Kit',
  'Supply',
];

export const LOCATION_OPTIONS = [
  'Hematology Store',
  'Chem Path Store',
  'Immunology Store',
  'Micro Store',
  'Molecular Store',
  'Blood Bank Store',
  'Biochemistry Store',
  'Emergency Store',
  'Phlebotomy Store',
];

// ── Named "hero" items — the exact rows shown in the reference design ──────

const HERO_ITEMS: InventoryItem[] = [
  {
    id: 'inv-hero-001',
    name: 'RBC Diluent',
    catalogNo: 'DIL-RBC-20L',
    category: 'Reagent',
    department: 'Hematology',
    lotBatchNo: 'LOT250501',
    expiryDate: isoOffset(95),
    unit: '20 L',
    currentStock: 12,
    minStock: 5,
    unitPrice: 45000,
    manufacturer: 'Mindray Bio-Medical Electronics',
    packSize: '20 L',
    receivedDate: isoOffset(-40),
    storageCondition: '2 - 25°C',
    location: 'Hematology Store - Shelf 2',
    description: 'Diluent for automated hematology analyzer.',
  },
  {
    id: 'inv-hero-002',
    name: 'Lyse Reagent',
    catalogNo: 'LYSE-500ML',
    category: 'Reagent',
    department: 'Hematology',
    lotBatchNo: 'LOT250512',
    expiryDate: isoOffset(55),
    unit: '500 mL',
    currentStock: 6,
    minStock: 2,
    unitPrice: 28500,
    manufacturer: 'Mindray Bio-Medical Electronics',
    packSize: '500 mL',
    receivedDate: isoOffset(-32),
    storageCondition: '2 - 25°C',
    location: 'Hematology Store',
    description: 'Lysing reagent for WBC differential.',
  },
  {
    id: 'inv-hero-003',
    name: 'Control Level 1',
    catalogNo: 'CTRL-L1-5ML',
    category: 'Control Material',
    department: 'Chemical Pathology',
    lotBatchNo: 'LOT250601',
    expiryDate: isoOffset(85),
    unit: '5 mL',
    currentStock: 1,
    minStock: 2,
    unitPrice: 62000,
    manufacturer: 'Roche Diagnostics',
    packSize: '5 mL x 6',
    receivedDate: isoOffset(-60),
    storageCondition: '2 - 8°C',
    location: 'Chem Path Store',
    description: 'Level 1 control serum for chemistry QC.',
  },
  {
    id: 'inv-hero-004',
    name: 'Control Level 2',
    catalogNo: 'CTRL-L2-5ML',
    category: 'Control Material',
    department: 'Chemical Pathology',
    lotBatchNo: 'LOT250602',
    expiryDate: isoOffset(85),
    unit: '5 mL',
    currentStock: 1,
    minStock: 2,
    unitPrice: 62000,
    manufacturer: 'Roche Diagnostics',
    packSize: '5 mL x 6',
    receivedDate: isoOffset(-60),
    storageCondition: '2 - 8°C',
    location: 'Chem Path Store',
    description: 'Level 2 control serum for chemistry QC.',
  },
  {
    id: 'inv-hero-005',
    name: 'Glucose Reagent',
    catalogNo: 'GLUC-100T',
    category: 'Reagent',
    department: 'Chemical Pathology',
    lotBatchNo: 'LOT250515',
    expiryDate: isoOffset(75),
    unit: '100 Tests',
    currentStock: 24,
    minStock: 20,
    unitPrice: 18500,
    manufacturer: 'Roche Diagnostics',
    packSize: '100 Tests',
    receivedDate: isoOffset(-48),
    storageCondition: '2 - 8°C',
    location: 'Chem Path Store',
    description: 'Enzymatic glucose reagent kit.',
  },
  {
    id: 'inv-hero-006',
    name: 'Urea Reagent',
    catalogNo: 'UREA-100T',
    category: 'Reagent',
    department: 'Chemical Pathology',
    lotBatchNo: 'LOT250515',
    expiryDate: isoOffset(75),
    unit: '100 Tests',
    currentStock: 14,
    minStock: 20,
    unitPrice: 17200,
    manufacturer: 'Roche Diagnostics',
    packSize: '100 Tests',
    receivedDate: isoOffset(-48),
    storageCondition: '2 - 8°C',
    location: 'Chem Path Store',
    description: 'Kinetic urease reagent kit.',
  },
  {
    id: 'inv-hero-007',
    name: 'Creatinine Reagent',
    catalogNo: 'CREA-100T',
    category: 'Reagent',
    department: 'Chemical Pathology',
    lotBatchNo: 'LOT250516',
    expiryDate: isoOffset(70),
    unit: '100 Tests',
    currentStock: 8,
    minStock: 20,
    unitPrice: 19800,
    manufacturer: 'Roche Diagnostics',
    packSize: '100 Tests',
    receivedDate: isoOffset(-50),
    storageCondition: '2 - 8°C',
    location: 'Chem Path Store',
    description: 'Jaffe-method creatinine reagent kit.',
  },
  {
    id: 'inv-hero-008',
    name: 'HIV 1/2 Rapid Test',
    catalogNo: 'HIV12-50T',
    category: 'Test Kit',
    department: 'Immunology',
    lotBatchNo: 'LOT250528',
    expiryDate: isoOffset(12),
    unit: '50 Tests',
    currentStock: 6,
    minStock: 10,
    unitPrice: 32000,
    manufacturer: 'Abbott',
    packSize: '50 Tests',
    receivedDate: isoOffset(-25),
    storageCondition: '2 - 30°C',
    location: 'Immunology Store',
    description: 'HIV 1/2 antibody rapid test cassette.',
  },
  {
    id: 'inv-hero-009',
    name: 'HBsAg Rapid Test',
    catalogNo: 'HBsAG-50T',
    category: 'Test Kit',
    department: 'Immunology',
    lotBatchNo: 'LOT250528',
    expiryDate: isoOffset(10),
    unit: '50 Tests',
    currentStock: 3,
    minStock: 10,
    unitPrice: 29500,
    manufacturer: 'Abbott',
    packSize: '50 Tests',
    receivedDate: isoOffset(-25),
    storageCondition: '2 - 30°C',
    location: 'Immunology Store',
    description: 'Hepatitis B surface antigen rapid test cassette.',
  },
  {
    id: 'inv-hero-010',
    name: 'Blood Collection Tube (EDTA)',
    catalogNo: 'VAC-EDTA-100',
    category: 'Consumable',
    department: 'Hematology',
    lotBatchNo: 'LOT250630',
    expiryDate: isoOffset(700),
    unit: '100 pcs',
    currentStock: 300,
    minStock: 200,
    unitPrice: 8500,
    manufacturer: 'BD Vacutainer',
    packSize: '100 pcs',
    receivedDate: isoOffset(-5),
    storageCondition: 'Room Temperature',
    location: 'Phlebotomy Store',
    description: 'EDTA vacuum blood collection tubes, 4 mL.',
  },
  {
    id: 'inv-hero-011',
    name: 'Plain Tube (Red Top)',
    catalogNo: 'VAC-PLAIN-100',
    category: 'Consumable',
    department: 'Hematology',
    lotBatchNo: 'LOT250631',
    expiryDate: isoOffset(700),
    unit: '100 pcs',
    currentStock: 250,
    minStock: 150,
    unitPrice: 3000,
    manufacturer: 'BD Vacutainer',
    packSize: '100 pcs',
    receivedDate: isoOffset(-5),
    storageCondition: 'Room Temperature',
    location: 'Phlebotomy Store',
    description: 'Plain (no additive) vacuum blood collection tubes for serum samples.',
  },
];

// ── Bulk-generated remainder — deterministic, reaches the app's standing
// 732-item / 532 In Stock / 84 Low Stock / 68 Expiring Soon / 8 Expired /
// 40 Out of Stock total (10 of those come from the named items above). ────

type NameTemplate = { name: string; category: InventoryCategory; unit: string; basePrice: number };

const NAME_TEMPLATES: NameTemplate[] = [
  { name: 'Sodium Chloride Reagent', category: 'Reagent', unit: '500 mL', basePrice: 12000 },
  { name: 'Potassium Reagent', category: 'Reagent', unit: '500 mL', basePrice: 13500 },
  { name: 'Chloride Reagent', category: 'Reagent', unit: '500 mL', basePrice: 12500 },
  { name: 'ALT Reagent', category: 'Reagent', unit: '100 Tests', basePrice: 21000 },
  { name: 'AST Reagent', category: 'Reagent', unit: '100 Tests', basePrice: 21000 },
  { name: 'Total Bilirubin Reagent', category: 'Reagent', unit: '100 Tests', basePrice: 19500 },
  { name: 'Total Protein Reagent', category: 'Reagent', unit: '100 Tests', basePrice: 18000 },
  { name: 'Albumin Reagent', category: 'Reagent', unit: '100 Tests', basePrice: 18500 },
  { name: 'Cholesterol Reagent', category: 'Reagent', unit: '100 Tests', basePrice: 20500 },
  { name: 'Triglycerides Reagent', category: 'Reagent', unit: '100 Tests', basePrice: 20500 },
  { name: 'HDL Cholesterol Reagent', category: 'Reagent', unit: '100 Tests', basePrice: 24000 },
  { name: 'Amylase Reagent', category: 'Reagent', unit: '100 Tests', basePrice: 26000 },
  { name: 'CRP Reagent', category: 'Reagent', unit: '50 Tests', basePrice: 34000 },
  { name: 'Coagulation PT Reagent', category: 'Reagent', unit: '5 mL', basePrice: 42000 },
  { name: 'Coagulation APTT Reagent', category: 'Reagent', unit: '5 mL', basePrice: 42000 },
  { name: 'Gram Stain Kit', category: 'Kit', unit: '1 Kit', basePrice: 15500 },
  { name: 'Blood Culture Bottle (Aerobic)', category: 'Consumable', unit: '1 pc', basePrice: 4200 },
  {
    name: 'Blood Culture Bottle (Anaerobic)',
    category: 'Consumable',
    unit: '1 pc',
    basePrice: 4200,
  },
  { name: 'Culture Media - Blood Agar', category: 'Supply', unit: '1 Plate', basePrice: 1800 },
  { name: 'Culture Media - MacConkey Agar', category: 'Supply', unit: '1 Plate', basePrice: 1800 },
  { name: 'Culture Media - Chocolate Agar', category: 'Supply', unit: '1 Plate', basePrice: 2100 },
  { name: 'Malaria Rapid Test', category: 'Test Kit', unit: '25 Tests', basePrice: 18500 },
  { name: 'Widal Test Kit', category: 'Test Kit', unit: '50 Tests', basePrice: 15000 },
  { name: 'Pregnancy Rapid Test (hCG)', category: 'Test Kit', unit: '50 Tests', basePrice: 9500 },
  { name: 'Hepatitis C Rapid Test', category: 'Test Kit', unit: '50 Tests', basePrice: 31000 },
  { name: 'Syphilis (RPR) Test Kit', category: 'Test Kit', unit: '50 Tests', basePrice: 21000 },
  { name: 'Blood Group Antisera (Anti-A)', category: 'Reagent', unit: '10 mL', basePrice: 16500 },
  { name: 'Blood Group Antisera (Anti-B)', category: 'Reagent', unit: '10 mL', basePrice: 16500 },
  { name: 'Blood Group Antisera (Anti-D)', category: 'Reagent', unit: '10 mL', basePrice: 17500 },
  { name: 'Cross-Match Gel Cards', category: 'Consumable', unit: '1 Card', basePrice: 2600 },
  { name: 'Coombs Serum', category: 'Reagent', unit: '10 mL', basePrice: 22000 },
  { name: 'PCR Master Mix', category: 'Reagent', unit: '100 Rxn', basePrice: 85000 },
  { name: 'DNA Extraction Kit', category: 'Kit', unit: '50 Rxn', basePrice: 95000 },
  { name: 'RNA Extraction Kit', category: 'Kit', unit: '50 Rxn', basePrice: 98000 },
  { name: 'Nasopharyngeal Swab', category: 'Consumable', unit: '1 pc', basePrice: 350 },
  { name: 'Serum Separator Tube', category: 'Consumable', unit: '100 pcs', basePrice: 8200 },
  { name: 'Plain Vacutainer Tube', category: 'Consumable', unit: '100 pcs', basePrice: 6800 },
  { name: 'Sodium Citrate Tube', category: 'Consumable', unit: '100 pcs', basePrice: 7400 },
  { name: 'Fluoride Oxalate Tube', category: 'Consumable', unit: '100 pcs', basePrice: 7600 },
  {
    name: 'Micropipette Tips (10-100µL)',
    category: 'Consumable',
    unit: '1000 pcs',
    basePrice: 5200,
  },
  {
    name: 'Micropipette Tips (100-1000µL)',
    category: 'Consumable',
    unit: '1000 pcs',
    basePrice: 5600,
  },
  { name: 'Microscope Slides', category: 'Consumable', unit: '50 pcs', basePrice: 2400 },
  { name: 'Cover Slips', category: 'Consumable', unit: '100 pcs', basePrice: 1600 },
  { name: 'Nitrile Examination Gloves (M)', category: 'Supply', unit: '100 pcs', basePrice: 3800 },
  { name: 'Nitrile Examination Gloves (L)', category: 'Supply', unit: '100 pcs', basePrice: 3800 },
  { name: 'Face Masks (Surgical)', category: 'Supply', unit: '50 pcs', basePrice: 2200 },
  { name: 'Alcohol Swabs', category: 'Supply', unit: '100 pcs', basePrice: 1200 },
  { name: 'Sharps Disposal Container', category: 'Supply', unit: '1 pc', basePrice: 3200 },
  { name: 'Biohazard Bags', category: 'Supply', unit: '100 pcs', basePrice: 2800 },
  { name: 'Urine Dipstick Test Strips', category: 'Test Kit', unit: '100 Strips', basePrice: 6500 },
  { name: 'Pregnancy Test Cassette', category: 'Test Kit', unit: '25 Tests', basePrice: 8200 },
];

const DEPARTMENT_LIST = [...DEPARTMENT_OPTIONS];

const BULK_TOTAL = 721;
const BULK_STATUS_PLAN: { status: InventoryStatus; count: number }[] = [
  { status: 'In Stock', count: 527 },
  { status: 'Low Stock', count: 80 },
  { status: 'Expiring Soon', count: 66 },
  { status: 'Expired', count: 8 },
  { status: 'Out of Stock', count: 40 },
];

function buildStatusSequence(): InventoryStatus[] {
  const seq: InventoryStatus[] = [];
  for (const { status, count } of BULK_STATUS_PLAN) {
    for (let i = 0; i < count; i++) seq.push(status);
  }
  return seq;
}

function generateBulkItems(): InventoryItem[] {
  const statusSeq = buildStatusSequence();
  const items: InventoryItem[] = [];

  for (let i = 0; i < BULK_TOTAL; i++) {
    const template = NAME_TEMPLATES[i % NAME_TEMPLATES.length]!;
    const department = DEPARTMENT_LIST[i % DEPARTMENT_LIST.length]!;
    const status = statusSeq[i]!;
    const seedKey = `${template.name}-${department}-${i}`;
    const rand = mulberry32(hashSeed(seedKey));

    const batchIndex = Math.floor(i / NAME_TEMPLATES.length) + 1;
    const catalogNo = `${template.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 5)}-${String(1000 + i)}`;

    const minStock = 5 + Math.floor(rand() * 30);
    let currentStock: number;
    let expiryDate: string | null;

    switch (status) {
      case 'Expired':
        currentStock = minStock + Math.floor(rand() * minStock);
        expiryDate = isoOffset(-1 - Math.floor(rand() * 90));
        break;
      case 'Out of Stock':
        currentStock = 0;
        expiryDate = isoOffset(90 + Math.floor(rand() * 250));
        break;
      case 'Expiring Soon':
        currentStock = minStock + 1 + Math.floor(rand() * minStock);
        expiryDate = isoOffset(1 + Math.floor(rand() * 29));
        break;
      case 'Low Stock':
        currentStock = 1 + Math.floor(rand() * minStock);
        expiryDate = isoOffset(90 + Math.floor(rand() * 250));
        break;
      case 'In Stock':
      default:
        currentStock = minStock + 1 + Math.floor(rand() * minStock * 4);
        expiryDate = rand() > 0.15 ? isoOffset(60 + Math.floor(rand() * 400)) : null;
        break;
    }

    const unitPrice = Math.round((template.basePrice * (0.85 + rand() * 0.3)) / 100) * 100;
    const store = DEPARTMENT_STORE_SUFFIX[department] ?? 'Central Store';

    items.push({
      id: `inv-gen-${String(i + 1).padStart(4, '0')}`,
      name: template.name,
      catalogNo,
      category: template.category,
      department,
      lotBatchNo: `LOT${25_0000 + batchIndex * 7 + i}`,
      expiryDate,
      unit: template.unit,
      currentStock,
      minStock,
      unitPrice,
      manufacturer: 'MYHxCare Approved Supplier',
      packSize: template.unit,
      receivedDate: isoOffset(-(5 + Math.floor(rand() * 180))),
      storageCondition:
        template.category === 'Reagent' || template.category === 'Control Material'
          ? '2 - 8°C'
          : 'Room Temperature',
      location: store,
      description: `${template.name} for routine ${department.toLowerCase()} testing.`,
    });
  }

  return items;
}

export const INVENTORY_ITEMS: InventoryItem[] = [...HERO_ITEMS, ...generateBulkItems()];

export function getInventoryItem(id: string): InventoryItem | undefined {
  return INVENTORY_ITEMS.find((i) => i.id === id);
}

// ── Batch receipts — feeds the Batch Tracking tab ───────────────────────────

export type BatchReceipt = {
  id: string;
  itemId: string;
  lotBatchNo: string;
  quantityReceived: number;
  quantityRemaining: number;
  supplier: string;
  receivedDate: string;
  receivedBy: string;
};

export const BATCH_RECEIPTS: BatchReceipt[] = HERO_ITEMS.map((item, i) => ({
  id: `BATCH-${String(i + 1).padStart(4, '0')}`,
  itemId: item.id,
  lotBatchNo: item.lotBatchNo,
  quantityReceived: item.currentStock + Math.floor(item.currentStock * 0.6),
  quantityRemaining: item.currentStock,
  supplier: item.manufacturer,
  receivedDate: item.receivedDate,
  receivedBy: 'Chinedu Obi',
}));

// ── Reorder requests — Create Reorder Request (Stock Alerts) writes here ───

export type ReorderStatus = 'Pending' | 'Ordered' | 'Received' | 'Cancelled';

export type ReorderRequest = {
  id: string;
  itemId: string;
  quantityRequested: number;
  status: ReorderStatus;
  requestedBy: string;
  requestedAt: string;
  notes: string;
};

export const REORDER_REQUESTS: ReorderRequest[] = [
  {
    id: 'RRQ-0001',
    itemId: 'inv-hero-003',
    quantityRequested: 12,
    status: 'Ordered',
    requestedBy: 'John Okafor',
    requestedAt: isoOffset(-3),
    notes: 'Control Level 1 running low across two instruments.',
  },
  {
    id: 'RRQ-0002',
    itemId: 'inv-hero-006',
    quantityRequested: 40,
    status: 'Pending',
    requestedBy: 'John Okafor',
    requestedAt: isoOffset(-1),
    notes: 'Urea Reagent below minimum, high test volume this week.',
  },
];

// ── Inventory history — read-only stock movement log ────────────────────────

export type MovementType = 'Received' | 'Consumed' | 'Adjusted' | 'Disposed';

export type InventoryMovement = {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  date: string;
  performedBy: string;
  notes: string;
};

export const INVENTORY_MOVEMENTS: InventoryMovement[] = [
  {
    id: 'MOV-0001',
    itemId: 'inv-hero-001',
    type: 'Received',
    quantity: 20,
    date: isoOffset(-40),
    performedBy: 'Chinedu Obi',
    notes: 'Routine restock from Roche Diagnostics.',
  },
  {
    id: 'MOV-0002',
    itemId: 'inv-hero-008',
    type: 'Consumed',
    quantity: 4,
    date: isoOffset(-6),
    performedBy: 'Adaora Ugwu',
    notes: 'Used for outpatient screening panel.',
  },
  {
    id: 'MOV-0003',
    itemId: 'inv-hero-010',
    type: 'Received',
    quantity: 100,
    date: isoOffset(-5),
    performedBy: 'Chinedu Obi',
    notes: 'Monthly consumables restock.',
  },
  {
    id: 'MOV-0004',
    itemId: 'inv-hero-005',
    type: 'Adjusted',
    quantity: -2,
    date: isoOffset(-10),
    performedBy: 'Adaora Ugwu',
    notes: 'Stock count correction after physical audit.',
  },
  {
    id: 'MOV-0005',
    itemId: 'inv-hero-003',
    type: 'Consumed',
    quantity: 1,
    date: isoOffset(-8),
    performedBy: 'John Okafor',
    notes: 'Used for daily QC run.',
  },
  {
    id: 'MOV-0006',
    itemId: 'inv-hero-002',
    type: 'Disposed',
    quantity: 1,
    date: isoOffset(-15),
    performedBy: 'Chinedu Obi',
    notes: 'Damaged bottle discarded per SOP.',
  },
];
