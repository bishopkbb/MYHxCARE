/**
 * Suppliers — the vendor directory for laboratory reagents, kits, equipment,
 * and consumables. "Preferred" is an independent flag layered on top of an
 * Active supplier (not its own lifecycle state), so the Active and Preferred
 * stat counts overlap by design — a supplier can be both at once.
 */

export type SupplierStatus = 'Active' | 'Pending Evaluation' | 'Blacklisted' | 'Inactive';

export type SupplierCategory =
  | 'Reagents & Kits'
  | 'Equipment'
  | 'Consumables'
  | 'Hematology'
  | 'Laboratory Supplies'
  | 'Chemicals';

export type SupplierOrder = {
  id: string;
  date: string;
  amount: number;
};

export type Supplier = {
  id: string;
  name: string;
  category: SupplierCategory;
  contactPerson: string;
  contactRole: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  status: SupplierStatus;
  isPreferred: boolean;
  rating: number;
  reviewCount: number;
  lastOrderDate: string | null;
  ytdSpend: number;
  paymentTerms: string;
  creditLimit: number;
  dateAdded: string;
  notes: string;
  onTimeDeliveryPct: number;
  qualityRating: number;
  /** The full YTD order count — `recentOrders` below is only the latest
   * few for display, not the complete history. */
  totalOrdersYTD: number;
  recentOrders: SupplierOrder[];
};

function isoOffset(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

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

export const SUPPLIER_CATEGORY_OPTIONS: SupplierCategory[] = [
  'Reagents & Kits',
  'Equipment',
  'Consumables',
  'Hematology',
  'Laboratory Supplies',
  'Chemicals',
];

export const SUPPLIER_LOCATION_OPTIONS = [
  'Lagos, Nigeria',
  'Abuja, Nigeria',
  'Port Harcourt, Nigeria',
  'Kano, Nigeria',
  'Enugu, Nigeria',
  'Ibadan, Nigeria',
  'Warri, Nigeria',
  'Kaduna, Nigeria',
  'Onitsha, Nigeria',
  'Benin City, Nigeria',
  'Jos, Nigeria',
  'Abeokuta, Nigeria',
];

export const SUPPLIER_RATING_OPTIONS = [
  { value: '4.5', label: '4.5+ Stars' },
  { value: '4', label: '4+ Stars' },
  { value: '3', label: '3+ Stars' },
  { value: '0', label: 'Below 3 Stars' },
];

function getInitials(name: string): string {
  const words = name.split(' ').filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
}

const AVATAR_PALETTE = [
  '#00B4D8',
  '#DC2626',
  '#7C3AED',
  '#2563EB',
  '#D97706',
  '#16A34A',
  '#EC4899',
  '#0D9488',
];

export function supplierInitials(name: string): string {
  return getInitials(name);
}
export function supplierAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash]!;
}

// ── Named "hero" suppliers — the exact rows shown in the reference design ──

type HeroDef = {
  id: string;
  name: string;
  category: SupplierCategory;
  contactPerson: string;
  contactRole: string;
  phone: string;
  altPhone: string;
  email: string;
  city: string;
  status: SupplierStatus;
  isPreferred: boolean;
  rating: number;
  reviewCount: number;
  lastOrderOffset: number | null;
  ytdSpend: number;
  paymentTerms: string;
  creditLimit: number;
  dateAddedOffset: number;
  notes: string;
  onTimeDeliveryPct: number;
  totalOrdersYTD: number;
};

const HERO_DEFS: HeroDef[] = [
  {
    id: 'SUP-0001',
    name: 'Medline Scientific Ltd.',
    category: 'Reagents & Kits',
    contactPerson: 'John Adeyemi',
    contactRole: 'Sales Manager',
    phone: '0803 456 7890',
    altPhone: '0901 234 5678',
    email: 'john.adeyemi@medline.com',
    city: 'Lagos, Nigeria',
    status: 'Active',
    isPreferred: true,
    rating: 4.8,
    reviewCount: 32,
    lastOrderOffset: -12,
    ytdSpend: 6750200,
    paymentTerms: '30 Days',
    creditLimit: 5000000,
    dateAddedOffset: -935,
    notes: 'Reliable supplier with timely deliveries.',
    onTimeDeliveryPct: 94,
    totalOrdersYTD: 18,
  },
  {
    id: 'SUP-0002',
    name: 'Roche Diagnostics',
    category: 'Equipment',
    contactPerson: 'Michael Tan',
    contactRole: 'Account Executive',
    phone: '0901 234 5678',
    altPhone: '0803 111 2233',
    email: 'michael.tan@roche.com',
    city: 'Abuja, Nigeria',
    status: 'Active',
    isPreferred: false,
    rating: 4.7,
    reviewCount: 27,
    lastOrderOffset: -15,
    ytdSpend: 4250000,
    paymentTerms: '45 Days',
    creditLimit: 6000000,
    dateAddedOffset: -1210,
    notes: 'Primary source for analyzer service parts and reagent kits.',
    onTimeDeliveryPct: 91,
    totalOrdersYTD: 11,
  },
  {
    id: 'SUP-0003',
    name: 'BioQuest Solutions',
    category: 'Consumables',
    contactPerson: 'Chioma Okafor',
    contactRole: 'Sales Representative',
    phone: '0706 789 4321',
    altPhone: '0810 456 7788',
    email: 'chioma.okafor@bioquest.ng',
    city: 'Port Harcourt, Nigeria',
    status: 'Active',
    isPreferred: false,
    rating: 4.5,
    reviewCount: 19,
    lastOrderOffset: -19,
    ytdSpend: 2850750,
    paymentTerms: '30 Days',
    creditLimit: 2500000,
    dateAddedOffset: -620,
    notes: 'Good pricing on consumables; occasional delays on bulk orders.',
    onTimeDeliveryPct: 87,
    totalOrdersYTD: 22,
  },
  {
    id: 'SUP-0004',
    name: 'Haematek Nigeria Ltd.',
    category: 'Hematology',
    contactPerson: 'Ahmed Musa',
    contactRole: 'Regional Manager',
    phone: '0802 112 2233',
    altPhone: '0906 334 5566',
    email: 'ahmed.musa@haematek.ng',
    city: 'Kano, Nigeria',
    status: 'Active',
    isPreferred: false,
    rating: 4.3,
    reviewCount: 14,
    lastOrderOffset: -21,
    ytdSpend: 1950000,
    paymentTerms: '30 Days',
    creditLimit: 2000000,
    dateAddedOffset: -540,
    notes: 'Specialist hematology reagent supplier.',
    onTimeDeliveryPct: 89,
    totalOrdersYTD: 9,
  },
  {
    id: 'SUP-0005',
    name: 'Labtech Supplies Co.',
    category: 'Laboratory Supplies',
    contactPerson: 'Blessing Udo',
    contactRole: 'Sales Officer',
    phone: '0807 654 3210',
    altPhone: '0813 220 9911',
    email: 'blessing.udo@labtech.ng',
    city: 'Enugu, Nigeria',
    status: 'Active',
    isPreferred: false,
    rating: 4.2,
    reviewCount: 16,
    lastOrderOffset: -24,
    ytdSpend: 1350500,
    paymentTerms: '15 Days',
    creditLimit: 1500000,
    dateAddedOffset: -410,
    notes: 'General lab supplies — glassware, PPE, disposables.',
    onTimeDeliveryPct: 85,
    totalOrdersYTD: 15,
  },
  {
    id: 'SUP-0006',
    name: 'Thermo Fisher Scientific',
    category: 'Equipment',
    contactPerson: 'David Wilson',
    contactRole: 'Key Account Manager',
    phone: '0909 876 5432',
    altPhone: '0802 998 7766',
    email: 'david.wilson@thermofisher.com',
    city: 'Lagos, Nigeria',
    status: 'Active',
    isPreferred: true,
    rating: 4.9,
    reviewCount: 41,
    lastOrderOffset: -28,
    ytdSpend: 5100000,
    paymentTerms: '45 Days',
    creditLimit: 7000000,
    dateAddedOffset: -1460,
    notes: 'Long-standing equipment and calibration partner.',
    onTimeDeliveryPct: 96,
    totalOrdersYTD: 13,
  },
  {
    id: 'SUP-0007',
    name: 'Sigma-Aldrich',
    category: 'Reagents & Kits',
    contactPerson: 'Peter Obi',
    contactRole: 'Territory Manager',
    phone: '0810 300 5566',
    altPhone: '0703 445 8899',
    email: 'peter.obi@sial.com',
    city: 'Ibadan, Nigeria',
    status: 'Active',
    isPreferred: false,
    rating: 4.4,
    reviewCount: 22,
    lastOrderOffset: -30,
    ytdSpend: 1680000,
    paymentTerms: '30 Days',
    creditLimit: 2000000,
    dateAddedOffset: -790,
    notes: 'Specialty chemical and reagent catalogue.',
    onTimeDeliveryPct: 90,
    totalOrdersYTD: 10,
  },
  {
    id: 'SUP-0008',
    name: 'Premier Medical Ltd.',
    category: 'Consumables',
    contactPerson: 'Victoria Eze',
    contactRole: 'Sales Manager',
    phone: '0805 321 7890',
    altPhone: '0812 667 3344',
    email: 'victoria.eze@premiermed.ng',
    city: 'Warri, Nigeria',
    status: 'Pending Evaluation',
    isPreferred: false,
    rating: 3.8,
    reviewCount: 6,
    lastOrderOffset: -35,
    ytdSpend: 420000,
    paymentTerms: '15 Days',
    creditLimit: 500000,
    dateAddedOffset: -60,
    notes: 'Under evaluation after a recent late-delivery incident.',
    onTimeDeliveryPct: 68,
    totalOrdersYTD: 3,
  },
  {
    id: 'SUP-0009',
    name: 'Global Lab Solutions',
    category: 'Equipment',
    contactPerson: 'Samuel Lee',
    contactRole: 'Business Development',
    phone: '0903 222 1144',
    altPhone: '0701 556 9922',
    email: 'samuel.lee@globallab.com',
    city: 'Lagos, Nigeria',
    status: 'Active',
    isPreferred: false,
    rating: 4.1,
    reviewCount: 12,
    lastOrderOffset: -38,
    ytdSpend: 1200000,
    paymentTerms: '30 Days',
    creditLimit: 1500000,
    dateAddedOffset: -300,
    notes: 'Newer relationship — mid-tier equipment and spares.',
    onTimeDeliveryPct: 82,
    totalOrdersYTD: 6,
  },
  {
    id: 'SUP-0010',
    name: 'Chemico Nigeria Ltd.',
    category: 'Chemicals',
    contactPerson: 'Ibrahim Bello',
    contactRole: 'Sales Rep.',
    phone: '0804 667 8899',
    altPhone: '0906 112 3344',
    email: 'ibrahim.bello@chemico.ng',
    city: 'Kaduna, Nigeria',
    status: 'Blacklisted',
    isPreferred: false,
    rating: 2.1,
    reviewCount: 9,
    lastOrderOffset: null,
    ytdSpend: 0,
    paymentTerms: '15 Days',
    creditLimit: 0,
    dateAddedOffset: -900,
    notes: 'Blacklisted after repeated substandard chemical shipments.',
    onTimeDeliveryPct: 41,
    totalOrdersYTD: 0,
  },
];

function recentOrdersFor(supplierIndex: number, def: HeroDef): SupplierOrder[] {
  if (def.totalOrdersYTD === 0 || def.lastOrderOffset === null) return [];
  const count = Math.min(3, def.totalOrdersYTD);
  const orders: SupplierOrder[] = [];
  for (let i = 0; i < count; i++) {
    const offset = def.lastOrderOffset - i * 13;
    const amount = Math.round((def.ytdSpend / def.totalOrdersYTD) * (1 + (i === 0 ? 0.15 : -0.05)));
    orders.push({
      id: `PO-2026-${String(542 - supplierIndex * 3 - i).padStart(4, '0')}`,
      date: isoOffset(offset),
      amount,
    });
  }
  return orders;
}

const HERO_SUPPLIERS: Supplier[] = HERO_DEFS.map((d, i) => ({
  id: d.id,
  name: d.name,
  category: d.category,
  contactPerson: d.contactPerson,
  contactRole: d.contactRole,
  phone: d.phone,
  altPhone: d.altPhone,
  email: d.email,
  address: `${12 + i * 4} Medical Close, ${d.city.split(',')[0]}, Nigeria`,
  city: d.city,
  country: 'Nigeria',
  status: d.status,
  isPreferred: d.isPreferred,
  rating: d.rating,
  reviewCount: d.reviewCount,
  lastOrderDate: d.lastOrderOffset !== null ? isoOffset(d.lastOrderOffset) : null,
  ytdSpend: d.ytdSpend,
  paymentTerms: d.paymentTerms,
  creditLimit: d.creditLimit,
  dateAdded: isoOffset(d.dateAddedOffset),
  notes: d.notes,
  onTimeDeliveryPct: d.onTimeDeliveryPct,
  qualityRating: d.rating,
  totalOrdersYTD: d.totalOrdersYTD,
  recentOrders: recentOrdersFor(i, d),
}));

// ── Bulk-generated suppliers — fill out the remaining count exactly ────────

const GEN_TOTAL = 32;
/** Active(incl. preferred) / Preferred(subset) / Pending / Blacklisted / Inactive,
 * chosen so hero(10) + bulk(32) = 42 total, matching the reference design's
 * stat cards exactly: 36 Active / 14 Preferred / 3 Pending / 1 Blacklisted. */
const GEN_ACTIVE = 28; // + hero's 8 active = 36
const GEN_PREFERRED = 12; // + hero's 2 preferred = 14 (subset of active)
const GEN_PENDING = 2; // + hero's 1 = 3
const GEN_BLACKLISTED = 0; // hero already supplies the 1
const GEN_INACTIVE = GEN_TOTAL - GEN_ACTIVE - GEN_PENDING - GEN_BLACKLISTED; // 2

const NAME_PREFIX = [
  'Apex',
  'Zenith',
  'Prime',
  'Metro',
  'Capital',
  'National',
  'United',
  'Delta',
  'Continental',
  'Precision',
  'Vantage',
  'Summit',
  'Horizon',
  'Crown',
  'Alpha',
  'Pioneer',
  'Sterling',
  'Meridian',
  'Vertex',
  'Trustline',
  'Novagen',
  'Bluewave',
  'Ironclad',
  'Redcliff',
  'Goldstar',
  'Cedarwood',
  'Fortress',
  'Brightline',
  'Emerald',
  'Falcon',
  'Ridgeway',
  'Silverline',
];
const NAME_SUFFIX_BY_CATEGORY: Record<SupplierCategory, string[]> = {
  'Reagents & Kits': ['Reagents Ltd.', 'Diagnostics Co.', 'Biosciences Ltd.'],
  Equipment: ['Instruments Ltd.', 'Equipment Co.', 'MedTech Ltd.'],
  Consumables: ['Medical Supplies Ltd.', 'Consumables Co.', 'Healthcare Supplies Ltd.'],
  Hematology: ['Hematology Ltd.', 'Blood Systems Co.', 'Hemodiagnostics Ltd.'],
  'Laboratory Supplies': ['Lab Supplies Co.', 'Laboratory Ltd.', 'Labware Co.'],
  Chemicals: ['Chemicals Ltd.', 'Chemical Industries Co.', 'Industrial Chemicals Ltd.'],
};

const FIRST_NAMES = [
  'Ngozi',
  'Tunde',
  'Fatima',
  'Emeka',
  'Amaka',
  'Yusuf',
  'Chidinma',
  'Bashir',
  'Grace',
  'Obinna',
  'Halima',
  'Kelechi',
  'Aisha',
  'Chukwuma',
  'Funmilayo',
  'Suleiman',
  'Adaeze',
  'Ifeanyi',
  'Zainab',
  'Uche',
];
const LAST_NAMES = [
  'Balogun',
  'Chukwu',
  'Adekunle',
  'Okonkwo',
  'Suleiman',
  'Eze',
  'Ibrahim',
  'Nwosu',
  'Yakubu',
  'Onyeka',
  'Abubakar',
  'Okafor',
  'Adamu',
  'Nnamdi',
  'Musa',
  'Igwe',
  'Danjuma',
  'Anyanwu',
  'Lawal',
  'Umeh',
];
const CONTACT_ROLES = [
  'Sales Manager',
  'Account Executive',
  'Sales Representative',
  'Regional Manager',
  'Sales Officer',
  'Key Account Manager',
  'Territory Manager',
  'Business Development',
  'Client Relations Manager',
];

function generateBulkSuppliers(): Supplier[] {
  const list: Supplier[] = [];
  const statusPlan: SupplierStatus[] = [
    ...Array<SupplierStatus>(GEN_ACTIVE).fill('Active'),
    ...Array<SupplierStatus>(GEN_PENDING).fill('Pending Evaluation'),
    ...Array<SupplierStatus>(GEN_BLACKLISTED).fill('Blacklisted'),
    ...Array<SupplierStatus>(GEN_INACTIVE).fill('Inactive'),
  ];

  for (let i = 0; i < GEN_TOTAL; i++) {
    const seed = hashSeed(`supplier-${i}`);
    const rand = mulberry32(seed);
    const category =
      SUPPLIER_CATEGORY_OPTIONS[Math.floor(rand() * SUPPLIER_CATEGORY_OPTIONS.length)]!;
    const city = SUPPLIER_LOCATION_OPTIONS[Math.floor(rand() * SUPPLIER_LOCATION_OPTIONS.length)]!;
    const status = statusPlan[i]!;
    const isPreferred = status === 'Active' && i < GEN_PREFERRED;
    const firstName = FIRST_NAMES[(i * 3) % FIRST_NAMES.length]!;
    const lastName = LAST_NAMES[(i * 7 + 2) % LAST_NAMES.length]!;
    const suffixes = NAME_SUFFIX_BY_CATEGORY[category];
    const name = `${NAME_PREFIX[i % NAME_PREFIX.length]} ${suffixes[i % suffixes.length]}`;
    const rating =
      status === 'Blacklisted'
        ? 1.5 + rand()
        : status === 'Pending Evaluation'
          ? 3 + rand()
          : 3.5 + rand() * 1.5;
    const ytdSpend =
      status === 'Blacklisted'
        ? 0
        : status === 'Inactive'
          ? 0
          : Math.round((150000 + rand() * 2200000) / 1000) * 1000;
    const lastOrderOffset = ytdSpend > 0 ? -(10 + Math.floor(rand() * 90)) : null;
    const totalOrdersYTD = ytdSpend > 0 ? 2 + Math.floor(rand() * 20) : 0;
    const onTimeDeliveryPct = Math.round(
      status === 'Blacklisted' ? 30 + rand() * 25 : 75 + rand() * 22,
    );
    const dateAddedOffset = -(120 + Math.floor(rand() * 1400));

    const bulkIndex = 10 + i;
    const def: HeroDef = {
      id: `SUP-${String(bulkIndex + 1).padStart(4, '0')}`,
      name,
      category,
      contactPerson: `${firstName} ${lastName}`,
      contactRole: CONTACT_ROLES[i % CONTACT_ROLES.length]!,
      phone: `08${String(10 + (i % 89)).padStart(2, '0')} ${String(100 + i).padStart(3, '0')} ${String(1000 + i * 7).padStart(4, '0')}`,
      altPhone: `07${String(10 + ((i + 4) % 89)).padStart(2, '0')} ${String(200 + i).padStart(3, '0')} ${String(2000 + i * 5).padStart(4, '0')}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${name.split(' ')[0]!.toLowerCase()}.ng`,
      city,
      status,
      isPreferred,
      rating: Math.round(Math.min(5, rating) * 10) / 10,
      reviewCount: Math.floor(rand() * 30),
      lastOrderOffset,
      ytdSpend,
      paymentTerms: ['15 Days', '30 Days', '45 Days'][i % 3]!,
      creditLimit: ytdSpend > 0 ? Math.round(ytdSpend * (1.2 + rand())) : 0,
      dateAddedOffset,
      notes:
        status === 'Blacklisted'
          ? 'Blacklisted — quality or delivery issues on record.'
          : status === 'Pending Evaluation'
            ? 'Awaiting evaluation before approval for regular orders.'
            : status === 'Inactive'
              ? 'No recent activity; not currently placing orders.'
              : 'Standard vendor on the approved supplier list.',
      onTimeDeliveryPct,
      totalOrdersYTD,
    };

    list.push({
      id: def.id,
      name: def.name,
      category: def.category,
      contactPerson: def.contactPerson,
      contactRole: def.contactRole,
      phone: def.phone,
      altPhone: def.altPhone,
      email: def.email,
      address: `${20 + i * 3} Industrial Avenue, ${city.split(',')[0]}, Nigeria`,
      city: def.city,
      country: 'Nigeria',
      status: def.status,
      isPreferred: def.isPreferred,
      rating: def.rating,
      reviewCount: def.reviewCount,
      lastOrderDate: def.lastOrderOffset !== null ? isoOffset(def.lastOrderOffset) : null,
      ytdSpend: def.ytdSpend,
      paymentTerms: def.paymentTerms,
      creditLimit: def.creditLimit,
      dateAdded: isoOffset(def.dateAddedOffset),
      notes: def.notes,
      onTimeDeliveryPct: def.onTimeDeliveryPct,
      qualityRating: def.rating,
      totalOrdersYTD: def.totalOrdersYTD,
      recentOrders: recentOrdersFor(bulkIndex, def),
    });
  }
  return list;
}

export const SUPPLIERS: Supplier[] = [...HERO_SUPPLIERS, ...generateBulkSuppliers()];

export function nextSupplierId(existing: Supplier[]): string {
  const max = existing.reduce((m, s) => {
    const n = Number(s.id.replace('SUP-', ''));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `SUP-${String(max + 1).padStart(4, '0')}`;
}
