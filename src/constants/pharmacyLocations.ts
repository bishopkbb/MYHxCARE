// UNIZIK/NAUTH pharmacy outlets — grounded in the university's real campus
// geography: NAUTH (the teaching hospital) sits on the Nnewi campus, with
// Central/Emergency/Ward/Surgical as its real internal dispensing points;
// Awka is the university's main/administrative campus, and Agulu is home to
// the Faculty of Pharmaceutical Sciences — both real UNIZIK campuses, each
// running its own campus health centre with its own outpatient pharmacy.
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
    id: 'loc_central',
    name: 'NAUTH Central Pharmacy',
    shortName: 'NAUTH Central',
    building: 'Main Block, Ground Floor — NAUTH, Nnewi Campus',
    openingHours: '07:00 – 21:00',
    is24h: false,
    dispensingTypes: ['OUTPATIENT', 'INPATIENT', 'ONCOLOGY'] as const,
  },
  {
    id: 'loc_opd',
    name: 'Awka Campus Health Centre',
    shortName: 'Awka Campus',
    building: 'University Health Centre — Awka Campus (Main Campus)',
    openingHours: '07:00 – 18:00',
    is24h: false,
    dispensingTypes: ['OUTPATIENT'] as const,
  },
  {
    id: 'loc_emergency',
    name: 'NAUTH Emergency Pharmacy',
    shortName: 'NAUTH Emergency',
    building: 'A&E Block, Ground Floor — NAUTH, Nnewi Campus',
    openingHours: '24 hours',
    is24h: true,
    dispensingTypes: ['EMERGENCY', 'INPATIENT'] as const,
  },
  {
    id: 'loc_ward',
    name: 'NAUTH Ward Pharmacy',
    shortName: 'NAUTH Ward',
    building: 'Inpatient Block, Floor 1 — NAUTH, Nnewi Campus',
    openingHours: '07:00 – 21:00',
    is24h: false,
    dispensingTypes: ['INPATIENT'] as const,
  },
  {
    id: 'loc_surgical',
    name: 'NAUTH Surgical Pharmacy',
    shortName: 'NAUTH Surgical',
    building: 'Theatre Block, Floor 2 — NAUTH, Nnewi Campus',
    openingHours: '06:00 – 22:00',
    is24h: false,
    dispensingTypes: ['SURGICAL', 'INPATIENT'] as const,
  },
  {
    id: 'loc_agulu',
    name: 'Agulu Campus Health Centre',
    shortName: 'Agulu Campus',
    building: 'University Health Centre — Agulu Campus (Faculty of Pharmaceutical Sciences)',
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
