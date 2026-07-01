// UniZik NAUTH pharmacy campus locations.
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
    name: 'Central Pharmacy',
    shortName: 'Central',
    building: 'Main Block — Ground Floor',
    openingHours: '07:00 – 21:00',
    is24h: false,
    dispensingTypes: ['OUTPATIENT', 'INPATIENT', 'ONCOLOGY'] as const,
  },
  {
    id: 'loc_opd',
    name: 'OPD Pharmacy',
    shortName: 'OPD',
    building: 'Outpatient Block — Block B',
    openingHours: '07:00 – 18:00',
    is24h: false,
    dispensingTypes: ['OUTPATIENT'] as const,
  },
  {
    id: 'loc_emergency',
    name: 'Emergency Pharmacy',
    shortName: 'Emergency',
    building: 'A&E Block — Ground Floor',
    openingHours: '24 hours',
    is24h: true,
    dispensingTypes: ['EMERGENCY', 'INPATIENT'] as const,
  },
  {
    id: 'loc_ward',
    name: 'Ward Pharmacy',
    shortName: 'Ward',
    building: 'Inpatient Block — Floor 1',
    openingHours: '07:00 – 21:00',
    is24h: false,
    dispensingTypes: ['INPATIENT'] as const,
  },
  {
    id: 'loc_surgical',
    name: 'Surgical Suite Pharmacy',
    shortName: 'Surgical',
    building: 'Theatre Block — Floor 2',
    openingHours: '06:00 – 22:00',
    is24h: false,
    dispensingTypes: ['SURGICAL', 'INPATIENT'] as const,
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
