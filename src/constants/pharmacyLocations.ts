// The four real NAU Medical Centre pharmacy outlets — one per campus: Awka
// (Main Campus, the flagship centre), Nnewi, Mbaukwu, and Ifite-Ogwari.
// These IDs must match the values returned by GET /api/v1/pharmacy/locations.

export type PharmacyDispenseType =
  'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'SURGICAL' | 'ONCOLOGY';

export type PharmacyLocation = {
  id: string;
  name: string;
  shortName: string; // used in space-constrained UI (badges, tables)
  building: string;
  openingHours: string;
  is24h: boolean;
  dispensingTypes: readonly PharmacyDispenseType[];
};

export const PHARMACY_LOCATIONS = [
  {
    id: 'loc_awka',
    name: 'Awka Medical Centre Pharmacy',
    shortName: 'Awka Campus',
    building: 'University Medical Centre — Awka Campus (Main Campus)',
    openingHours: '24 hours',
    is24h: true,
    dispensingTypes: ['OUTPATIENT', 'EMERGENCY', 'INPATIENT'] as const,
  },
  {
    id: 'loc_nnewi',
    name: 'Nnewi Medical Centre Pharmacy',
    shortName: 'Nnewi Campus',
    building: 'University Medical Centre — Nnewi Campus',
    openingHours: '07:00 – 21:00',
    is24h: false,
    dispensingTypes: ['OUTPATIENT'] as const,
  },
  {
    id: 'loc_mbaukwu',
    name: 'Mbaukwu Medical Centre Pharmacy',
    shortName: 'Mbaukwu Campus',
    building: 'University Medical Centre — Mbaukwu Campus',
    openingHours: '08:00 – 18:00',
    is24h: false,
    dispensingTypes: ['OUTPATIENT'] as const,
  },
  {
    id: 'loc_ifite_ogwari',
    name: 'Ifite-Ogwari Medical Centre Pharmacy',
    shortName: 'Ifite-Ogwari Campus',
    building: 'University Medical Centre — Ifite-Ogwari Campus',
    openingHours: '08:00 – 18:00',
    is24h: false,
    dispensingTypes: ['OUTPATIENT'] as const,
  },
] as const satisfies readonly PharmacyLocation[];

export type PharmacyLocationId = (typeof PHARMACY_LOCATIONS)[number]['id'];

export function getPharmacyLocation(id: PharmacyLocationId): PharmacyLocation {
  const loc = PHARMACY_LOCATIONS.find((l) => l.id === id);
  // id is constrained to PharmacyLocationId so this will always resolve
  if (!loc) throw new Error(`Unknown pharmacy location: ${id}`);
  return loc;
}

export function getLocationsByDispenseType(type: PharmacyDispenseType): PharmacyLocation[] {
  return PHARMACY_LOCATIONS.filter((l) => (l.dispensingTypes as readonly string[]).includes(type));
}
