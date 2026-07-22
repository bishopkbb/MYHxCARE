import { STATIC_WARD_BEDS } from './wardCensusFixtures';

export type BedStatus =
  'Occupied' | 'Available' | 'Reserved' | 'Cleaning Required' | 'Out of Service';

export const BED_STATUS_CFG: Record<BedStatus, { color: string; border: string; bg: string }> = {
  Occupied: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.1)' },
  Available: { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.1)' },
  Reserved: { color: '#8B5CF6', border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.1)' },
  'Cleaning Required': {
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.1)',
  },
  'Out of Service': { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.1)' },
};

export type BedSlot = {
  bedCode: string;
  room: string;
  isIsolation?: boolean;
  /** When true, this slot's occupancy comes from the live nursing roster
   * (see buildWardBeds in BedManagementWorkspace) rather than the fields below. */
  rosterSlot?: boolean;
  status: BedStatus;
  patientName?: string;
  mrn?: string;
  diagnosis?: string;
  doctorName?: string;
  admittedAt?: string; // ISO — only present when Occupied
};

export type WardLayout = {
  id: string;
  name: string;
  floor: string;
  nurseInCharge: string;
  nurseInChargeId: string;
  /** The matching NursePatient.ward value this layout's rosterSlot beds pull from. */
  rosterWardName?: string;
  beds: BedSlot[];
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function fromCensusBeds(wardId: string, room: string): BedSlot[] {
  const beds = STATIC_WARD_BEDS[wardId] ?? [];
  return beds.map((b) => ({
    bedCode: b.bedNumber,
    room,
    status: b.status === 'Cleaning' ? 'Cleaning Required' : (b.status as BedStatus),
    ...(b.patientName ? { patientName: b.patientName } : {}),
    ...(b.mrn ? { mrn: b.mrn } : {}),
    ...(b.doctorName ? { doctorName: b.doctorName } : {}),
    ...(b.admittedAt ? { admittedAt: b.admittedAt } : {}),
  }));
}

export const WARD_LAYOUTS: WardLayout[] = [
  {
    id: 'ward-female',
    name: 'Female Medical Ward',
    floor: '4th Floor',
    nurseInCharge: 'Nurse Grace E.',
    nurseInChargeId: 'NUR-0248',
    rosterWardName: 'Female Ward',
    beds: [
      { bedCode: 'A-01', room: 'Room A', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'A-02', room: 'Room A', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'A-03', room: 'Room A', status: 'Available' },
      { bedCode: 'A-04', room: 'Room A', status: 'Cleaning Required' },
      { bedCode: 'A-05', room: 'Room A', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'A-06', room: 'Room A', status: 'Reserved' },
      { bedCode: 'A-07', room: 'Room A', status: 'Out of Service' },
      { bedCode: 'B-01', room: 'Room B', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'B-02', room: 'Room B', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'B-03', room: 'Room B', status: 'Available' },
      { bedCode: 'B-04', room: 'Room B', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'B-05', room: 'Room B', status: 'Available' },
      { bedCode: 'B-06', room: 'Room B', status: 'Cleaning Required' },
      { bedCode: 'C-01', room: 'Room C', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'C-02', room: 'Room C', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'C-03', room: 'Room C', status: 'Available' },
      { bedCode: 'C-04', room: 'Room C', status: 'Available' },
      { bedCode: 'C-05', room: 'Room C', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'C-06', room: 'Room C', status: 'Reserved' },
      { bedCode: 'C-07', room: 'Room C', status: 'Cleaning Required' },
      {
        bedCode: 'ISO-01',
        room: 'Isolation Room',
        isIsolation: true,
        status: 'Occupied',
        patientName: 'Aisha Ibrahim',
        mrn: 'MRN-2026-00821',
        diagnosis: 'Suspected Tuberculosis',
        doctorName: 'Dr. Amina Yusuf',
        admittedAt: atOffset(-2, 8, 0),
      },
      {
        bedCode: 'ISO-02',
        room: 'Isolation Room',
        isIsolation: true,
        status: 'Occupied',
        patientName: 'Comfort Adeyemi',
        mrn: 'MRN-2026-00830',
        diagnosis: 'Chickenpox',
        doctorName: 'Dr. Onyedika Umeh',
        admittedAt: atOffset(-1, 10, 0),
      },
      { bedCode: 'ISO-03', room: 'Isolation Room', isIsolation: true, status: 'Available' },
      { bedCode: 'ISO-04', room: 'Isolation Room', isIsolation: true, status: 'Reserved' },
    ],
  },
  {
    id: 'ward-male',
    name: 'Male Medical Ward',
    floor: '3rd Floor',
    nurseInCharge: 'Nurse Clara M.',
    nurseInChargeId: 'NUR-0193',
    rosterWardName: 'Male Ward',
    beds: [
      { bedCode: 'A-01', room: 'Room A', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'A-02', room: 'Room A', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'A-03', room: 'Room A', status: 'Available' },
      { bedCode: 'A-04', room: 'Room A', status: 'Reserved' },
      { bedCode: 'A-05', room: 'Room A', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'A-06', room: 'Room A', status: 'Cleaning Required' },
      { bedCode: 'A-07', room: 'Room A', status: 'Available' },
      { bedCode: 'B-01', room: 'Room B', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'B-02', room: 'Room B', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'B-03', room: 'Room B', status: 'Available' },
      { bedCode: 'B-04', room: 'Room B', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'B-05', room: 'Room B', status: 'Cleaning Required' },
      { bedCode: 'B-06', room: 'Room B', status: 'Available' },
      { bedCode: 'C-01', room: 'Room C', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'C-02', room: 'Room C', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'C-03', room: 'Room C', status: 'Reserved' },
      { bedCode: 'C-04', room: 'Room C', status: 'Available' },
      { bedCode: 'C-05', room: 'Room C', rosterSlot: true, status: 'Occupied' },
      { bedCode: 'C-06', room: 'Room C', status: 'Available' },
      { bedCode: 'C-07', room: 'Room C', status: 'Out of Service' },
      {
        bedCode: 'ISO-01',
        room: 'Isolation Room',
        isIsolation: true,
        status: 'Occupied',
        patientName: 'Yusuf Adamu',
        mrn: 'MRN-2026-00841',
        diagnosis: 'Suspected Meningitis',
        doctorName: 'Dr. Tunde Stephen',
        admittedAt: atOffset(-1, 6, 0),
      },
      { bedCode: 'ISO-02', room: 'Isolation Room', isIsolation: true, status: 'Available' },
      { bedCode: 'ISO-03', room: 'Isolation Room', isIsolation: true, status: 'Reserved' },
      {
        bedCode: 'ISO-04',
        room: 'Isolation Room',
        isIsolation: true,
        status: 'Occupied',
        patientName: 'Ibrahim Musa',
        mrn: 'MRN-2026-00848',
        diagnosis: 'Suspected Tuberculosis',
        doctorName: 'Dr. Samuel A.',
        admittedAt: atOffset(-3, 14, 0),
      },
    ],
  },
  {
    id: 'ward-icu',
    name: 'ICU',
    floor: '2nd Floor',
    nurseInCharge: 'Nurse Ifeoma K.',
    nurseInChargeId: 'NUR-0157',
    beds: fromCensusBeds('ward-icu', 'ICU Bay'),
  },
  {
    id: 'ward-maternity',
    name: 'Maternity Ward',
    floor: '5th Floor',
    nurseInCharge: 'Nurse Blessing O.',
    nurseInChargeId: 'NUR-0212',
    beds: fromCensusBeds('ward-maternity', 'Maternity Bay'),
  },
  {
    id: 'ward-pediatric',
    name: 'Pediatric Ward',
    floor: '1st Floor',
    nurseInCharge: 'Nurse Ngozi A.',
    nurseInChargeId: 'NUR-0176',
    beds: fromCensusBeds('ward-pediatric', 'Pediatric Bay'),
  },
];
