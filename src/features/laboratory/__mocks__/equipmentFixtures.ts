/**
 * Equipment Management — every analyzer, instrument, and lab appliance
 * tracked across departments, plus its service/maintenance history,
 * downtime incidents, and error log. Counts and calibration due/overdue
 * flags are always derived from this one array (via equipmentStore.ts),
 * never a second, independently-invented number.
 */

export type EquipmentStatus = 'In Use' | 'Under Maintenance' | 'Out of Service' | 'Available';

export type EquipmentType =
  | 'Analyzer'
  | 'Incubator'
  | 'Centrifuge'
  | 'Microscope'
  | 'Reader'
  | 'Refrigeration'
  | 'Sterilizer'
  | 'Instrument';

export type EquipmentRecord = {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  department: string;
  equipmentType: EquipmentType;
  location: string;
  status: EquipmentStatus;
  manufacturer: string;
  installationDate: string;
  warrantyExpiry: string;
  description: string;
  calibrationIntervalDays: number;
  lastCalibrationAt: string | null;
  nextCalibrationAt: string | null;
};

function isoOffset(days: number): string {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function fixedIso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day, 9, 0, 0)).toISOString();
}

/** Equipment whose next calibration falls within this many days (and isn't
 * already overdue) counts toward "Due for Calibration". */
export const CALIBRATION_DUE_WINDOW_DAYS = 21;

export const DEPARTMENT_OPTIONS = [
  'Chemical Pathology',
  'Hematology',
  'Immunology',
  'Microbiology',
  'Molecular Lab',
  'Blood Bank',
  'Biochemistry',
  'Emergency Lab',
] as const;

export const EQUIPMENT_TYPE_OPTIONS: EquipmentType[] = [
  'Analyzer',
  'Incubator',
  'Centrifuge',
  'Microscope',
  'Reader',
  'Refrigeration',
  'Sterilizer',
  'Instrument',
];

export const EQUIPMENT_RECORDS: EquipmentRecord[] = [
  {
    id: 'EQP-CHM-001',
    name: 'Chemistry Analyzer',
    model: 'Cobas c311',
    serialNumber: 'SN-C311-2391',
    department: 'Chemical Pathology',
    equipmentType: 'Analyzer',
    location: 'Main Lab - Room 1',
    status: 'In Use',
    manufacturer: 'Roche Diagnostics',
    installationDate: fixedIso(2025, 1, 10),
    warrantyExpiry: fixedIso(2028, 1, 9),
    description: 'Fully automated clinical chemistry analyzer.',
    calibrationIntervalDays: 30,
    lastCalibrationAt: isoOffset(-15),
    nextCalibrationAt: isoOffset(15),
  },
  {
    id: 'EQP-HMT-002',
    name: 'Hematology Analyzer',
    model: 'Sysmex XN-1000',
    serialNumber: 'SN-XN1000-5562',
    department: 'Hematology',
    equipmentType: 'Analyzer',
    location: 'Hematology Lab',
    status: 'In Use',
    manufacturer: 'Sysmex Corporation',
    installationDate: fixedIso(2025, 2, 15),
    warrantyExpiry: fixedIso(2028, 2, 14),
    description: 'Automated hematology analyzer for full blood count and differential.',
    calibrationIntervalDays: 30,
    lastCalibrationAt: isoOffset(-20),
    nextCalibrationAt: isoOffset(10),
  },
  {
    id: 'EQP-IMM-003',
    name: 'Immuno Analyzer',
    model: 'Architect i2000SR',
    serialNumber: 'SN-I2000-7781',
    department: 'Immunology',
    equipmentType: 'Analyzer',
    location: 'Immunology Lab',
    status: 'In Use',
    manufacturer: 'Abbott',
    installationDate: fixedIso(2025, 3, 1),
    warrantyExpiry: fixedIso(2028, 2, 28),
    description: 'Chemiluminescent immunoassay analyzer.',
    calibrationIntervalDays: 30,
    lastCalibrationAt: isoOffset(-18),
    nextCalibrationAt: isoOffset(12),
  },
  {
    id: 'EQP-MIC-004',
    name: 'Microbiology Incubator',
    model: 'Memmert IN110',
    serialNumber: 'SN-IN110-3345',
    department: 'Microbiology',
    equipmentType: 'Incubator',
    location: 'Micro Lab - Room 2',
    status: 'Under Maintenance',
    manufacturer: 'Memmert GmbH',
    installationDate: fixedIso(2024, 4, 20),
    warrantyExpiry: fixedIso(2027, 4, 19),
    description: 'Temperature-controlled incubator for culture growth.',
    calibrationIntervalDays: 90,
    lastCalibrationAt: isoOffset(-100),
    nextCalibrationAt: isoOffset(-10),
  },
  {
    id: 'EQP-ELT-005',
    name: 'Electrolyte Analyzer',
    model: 'Roche EasyLyte',
    serialNumber: 'SN-ELYT-8820',
    department: 'Chemical Pathology',
    equipmentType: 'Analyzer',
    location: 'Main Lab - Room 1',
    status: 'In Use',
    manufacturer: 'Roche Diagnostics',
    installationDate: fixedIso(2025, 5, 5),
    warrantyExpiry: fixedIso(2028, 5, 4),
    description: 'Ion-selective electrode analyzer for Na/K/Cl.',
    calibrationIntervalDays: 60,
    lastCalibrationAt: isoOffset(-42),
    nextCalibrationAt: isoOffset(18),
  },
  {
    id: 'EQP-BGA-006',
    name: 'Blood Gas Analyzer',
    model: 'Radiometer ABL90',
    serialNumber: 'SN-ABL90-6719',
    department: 'Chemical Pathology',
    equipmentType: 'Analyzer',
    location: 'Emergency Lab',
    status: 'Out of Service',
    manufacturer: 'Radiometer Medical',
    installationDate: fixedIso(2023, 6, 12),
    warrantyExpiry: fixedIso(2026, 6, 11),
    description: 'Point-of-care blood gas and electrolyte analyzer.',
    calibrationIntervalDays: 60,
    lastCalibrationAt: isoOffset(-85),
    nextCalibrationAt: isoOffset(-25),
  },
  {
    id: 'EQP-PCR-007',
    name: 'PCR Machine',
    model: 'BioRad CFX96',
    serialNumber: 'SN-CFX96-1290',
    department: 'Molecular Lab',
    equipmentType: 'Instrument',
    location: 'Molecular Lab',
    status: 'In Use',
    manufacturer: 'Bio-Rad Laboratories',
    installationDate: fixedIso(2025, 7, 18),
    warrantyExpiry: fixedIso(2028, 7, 17),
    description: 'Real-time PCR thermal cycler.',
    calibrationIntervalDays: 90,
    lastCalibrationAt: isoOffset(-60),
    nextCalibrationAt: isoOffset(30),
  },
  {
    id: 'EQP-CEN-008',
    name: 'Centrifuge (Refrigerated)',
    model: 'Eppendorf 5810R',
    serialNumber: 'SN-5810R-4482',
    department: 'Hematology',
    equipmentType: 'Centrifuge',
    location: 'Sample Prep Room',
    status: 'In Use',
    manufacturer: 'Eppendorf',
    installationDate: fixedIso(2024, 8, 22),
    warrantyExpiry: fixedIso(2027, 8, 21),
    description: 'Refrigerated benchtop centrifuge for sample processing.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-175),
    nextCalibrationAt: isoOffset(5),
  },
  {
    id: 'EQP-PLT-009',
    name: 'Platelet Agitator',
    model: 'Helmer PA-1',
    serialNumber: 'SN-PA1-2293',
    department: 'Blood Bank',
    equipmentType: 'Instrument',
    location: 'Blood Bank Lab',
    status: 'In Use',
    manufacturer: 'Helmer Scientific',
    installationDate: fixedIso(2024, 9, 30),
    warrantyExpiry: fixedIso(2027, 9, 29),
    description: 'Continuous agitator for platelet concentrate storage.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-168),
    nextCalibrationAt: isoOffset(12),
  },
  {
    id: 'EQP-SPE-010',
    name: 'Spectrophotometer',
    model: 'Thermo Genesys 20',
    serialNumber: 'SN-G20-7731',
    department: 'Biochemistry',
    equipmentType: 'Instrument',
    location: 'Main Lab - Room 2',
    status: 'In Use',
    manufacturer: 'Thermo Fisher Scientific',
    installationDate: fixedIso(2024, 10, 8),
    warrantyExpiry: fixedIso(2027, 10, 7),
    description: 'UV-Vis spectrophotometer for colorimetric assays.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-179),
    nextCalibrationAt: isoOffset(1),
  },
  {
    id: 'EQP-MSC-011',
    name: 'Microscope',
    model: 'Olympus CX23',
    serialNumber: 'SN-CX23-1123',
    department: 'Hematology',
    equipmentType: 'Microscope',
    location: 'Hematology Lab',
    status: 'In Use',
    manufacturer: 'Olympus',
    installationDate: fixedIso(2023, 11, 15),
    warrantyExpiry: fixedIso(2026, 11, 14),
    description: 'Binocular light microscope for blood film review.',
    calibrationIntervalDays: 365,
    lastCalibrationAt: isoOffset(-200),
    nextCalibrationAt: isoOffset(165),
  },
  {
    id: 'EQP-COA-012',
    name: 'Coagulation Analyzer',
    model: 'Stago STA Compact',
    serialNumber: 'SN-STA-4471',
    department: 'Hematology',
    equipmentType: 'Analyzer',
    location: 'Hematology Lab',
    status: 'In Use',
    manufacturer: 'Stago',
    installationDate: fixedIso(2024, 12, 3),
    warrantyExpiry: fixedIso(2027, 12, 2),
    description: 'Automated coagulation analyzer for PT/APTT/fibrinogen.',
    calibrationIntervalDays: 90,
    lastCalibrationAt: isoOffset(-50),
    nextCalibrationAt: isoOffset(40),
  },
  {
    id: 'EQP-MIR-013',
    name: 'Microbiology Reader',
    model: 'VITEK 2 Compact',
    serialNumber: 'SN-VTK2-9012',
    department: 'Microbiology',
    equipmentType: 'Reader',
    location: 'Micro Lab - Room 2',
    status: 'In Use',
    manufacturer: 'bioMérieux',
    installationDate: fixedIso(2025, 1, 19),
    warrantyExpiry: fixedIso(2028, 1, 18),
    description: 'Automated ID/AST system for microbial identification.',
    calibrationIntervalDays: 90,
    lastCalibrationAt: isoOffset(-55),
    nextCalibrationAt: isoOffset(35),
  },
  {
    id: 'EQP-ELI-014',
    name: 'ELISA Reader',
    model: 'BioTek ELx800',
    serialNumber: 'SN-ELX8-3345',
    department: 'Immunology',
    equipmentType: 'Reader',
    location: 'Immunology Lab',
    status: 'In Use',
    manufacturer: 'Agilent BioTek',
    installationDate: fixedIso(2024, 2, 27),
    warrantyExpiry: fixedIso(2027, 2, 26),
    description: 'Microplate absorbance reader for ELISA assays.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-90),
    nextCalibrationAt: isoOffset(90),
  },
  {
    id: 'EQP-AUT-015',
    name: 'Autoclave',
    model: 'Tuttnauer 3870EA',
    serialNumber: 'SN-3870-6690',
    department: 'Microbiology',
    equipmentType: 'Sterilizer',
    location: 'Micro Lab - Room 2',
    status: 'In Use',
    manufacturer: 'Tuttnauer',
    installationDate: fixedIso(2023, 3, 9),
    warrantyExpiry: fixedIso(2026, 3, 8),
    description: 'Steam sterilizer for lab glassware and media.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-70),
    nextCalibrationAt: isoOffset(110),
  },
  {
    id: 'EQP-WTB-016',
    name: 'Water Bath',
    model: 'Memmert WNB14',
    serialNumber: 'SN-WNB14-2201',
    department: 'Chemical Pathology',
    equipmentType: 'Instrument',
    location: 'Main Lab - Room 1',
    status: 'In Use',
    manufacturer: 'Memmert GmbH',
    installationDate: fixedIso(2024, 4, 14),
    warrantyExpiry: fixedIso(2027, 4, 13),
    description: 'Thermostatic water bath for reagent and sample warming.',
    calibrationIntervalDays: 365,
    lastCalibrationAt: isoOffset(-140),
    nextCalibrationAt: isoOffset(225),
  },
  {
    id: 'EQP-RCE-017',
    name: 'Refrigerated Centrifuge',
    model: 'Beckman Allegra X-30R',
    serialNumber: 'SN-X30R-8834',
    department: 'Blood Bank',
    equipmentType: 'Centrifuge',
    location: 'Blood Bank Lab',
    status: 'In Use',
    manufacturer: 'Beckman Coulter',
    installationDate: fixedIso(2024, 5, 21),
    warrantyExpiry: fixedIso(2027, 5, 20),
    description: 'High-capacity refrigerated centrifuge for blood component prep.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-95),
    nextCalibrationAt: isoOffset(85),
  },
  {
    id: 'EQP-URI-018',
    name: 'Urinalysis Analyzer',
    model: 'Siemens Clinitek Advantus',
    serialNumber: 'SN-CLNT-5567',
    department: 'Chemical Pathology',
    equipmentType: 'Analyzer',
    location: 'Main Lab - Room 2',
    status: 'In Use',
    manufacturer: 'Siemens Healthineers',
    installationDate: fixedIso(2025, 6, 6),
    warrantyExpiry: fixedIso(2028, 6, 5),
    description: 'Automated urine chemistry strip reader.',
    calibrationIntervalDays: 90,
    lastCalibrationAt: isoOffset(-40),
    nextCalibrationAt: isoOffset(50),
  },
  {
    id: 'EQP-FCM-019',
    name: 'Flow Cytometer',
    model: 'BD FACSLyric',
    serialNumber: 'SN-FACL-7729',
    department: 'Immunology',
    equipmentType: 'Analyzer',
    location: 'Immunology Lab',
    status: 'In Use',
    manufacturer: 'BD Biosciences',
    installationDate: fixedIso(2024, 7, 11),
    warrantyExpiry: fixedIso(2027, 7, 10),
    description: 'Multi-color flow cytometer for immunophenotyping.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-110),
    nextCalibrationAt: isoOffset(70),
  },
  {
    id: 'EQP-BBR-020',
    name: 'Blood Bank Refrigerator',
    model: 'Helmer iQ5',
    serialNumber: 'SN-IQ5-3391',
    department: 'Blood Bank',
    equipmentType: 'Refrigeration',
    location: 'Blood Bank Lab',
    status: 'In Use',
    manufacturer: 'Helmer Scientific',
    installationDate: fixedIso(2023, 8, 25),
    warrantyExpiry: fixedIso(2026, 8, 24),
    description: 'Blood component storage refrigerator with alarm monitoring.',
    calibrationIntervalDays: 365,
    lastCalibrationAt: isoOffset(-180),
    nextCalibrationAt: isoOffset(185),
  },
  {
    id: 'EQP-SLS-021',
    name: 'Slide Stainer',
    model: 'Sysmex SP-10',
    serialNumber: 'SN-SP10-9987',
    department: 'Hematology',
    equipmentType: 'Instrument',
    location: 'Hematology Lab',
    status: 'In Use',
    manufacturer: 'Sysmex Corporation',
    installationDate: fixedIso(2024, 9, 2),
    warrantyExpiry: fixedIso(2027, 9, 1),
    description: 'Automated blood film slide maker and stainer.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-120),
    nextCalibrationAt: isoOffset(60),
  },
  {
    id: 'EQP-FRZ-022',
    name: 'Backup Freezer (-80°C)',
    model: 'Thermo TSX Series',
    serialNumber: 'SN-TSX8-1145',
    department: 'Molecular Lab',
    equipmentType: 'Refrigeration',
    location: 'Molecular Lab',
    status: 'In Use',
    manufacturer: 'Thermo Fisher Scientific',
    installationDate: fixedIso(2023, 10, 17),
    warrantyExpiry: fixedIso(2026, 10, 16),
    description: 'Ultra-low temperature freezer for specimen archiving.',
    calibrationIntervalDays: 365,
    lastCalibrationAt: isoOffset(-160),
    nextCalibrationAt: isoOffset(205),
  },
  {
    id: 'EQP-INC-023',
    name: 'CO2 Incubator',
    model: 'Panasonic MCO-170AIC',
    serialNumber: 'SN-MCO1-6623',
    department: 'Microbiology',
    equipmentType: 'Incubator',
    location: 'Micro Lab - Room 2',
    status: 'In Use',
    manufacturer: 'Panasonic Healthcare',
    installationDate: fixedIso(2024, 11, 29),
    warrantyExpiry: fixedIso(2027, 11, 28),
    description: 'CO2-controlled incubator for cell culture.',
    calibrationIntervalDays: 90,
    lastCalibrationAt: isoOffset(-65),
    nextCalibrationAt: isoOffset(25),
  },
  {
    id: 'EQP-CEN-024',
    name: 'Centrifuge (Bench-top)',
    model: 'Hettich EBA 200',
    serialNumber: 'SN-EBA2-4478',
    department: 'Biochemistry',
    equipmentType: 'Centrifuge',
    location: 'Biochemistry Lab',
    status: 'In Use',
    manufacturer: 'Hettich',
    installationDate: fixedIso(2024, 12, 5),
    warrantyExpiry: fixedIso(2027, 12, 4),
    description: 'General-purpose benchtop centrifuge.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-100),
    nextCalibrationAt: isoOffset(80),
  },
  {
    id: 'EQP-OSM-025',
    name: 'Osmometer',
    model: 'Advanced Instruments Model 3320',
    serialNumber: 'SN-AI33-2298',
    department: 'Chemical Pathology',
    equipmentType: 'Instrument',
    location: 'Main Lab - Room 1',
    status: 'Under Maintenance',
    manufacturer: 'Advanced Instruments',
    installationDate: fixedIso(2024, 1, 13),
    warrantyExpiry: fixedIso(2027, 1, 12),
    description: 'Freezing-point depression osmometer.',
    calibrationIntervalDays: 180,
    lastCalibrationAt: isoOffset(-90),
    nextCalibrationAt: isoOffset(90),
  },
  {
    id: 'EQP-HPL-026',
    name: 'HPLC System',
    model: 'Agilent 1260 Infinity II',
    serialNumber: 'SN-AG12-7756',
    department: 'Molecular Lab',
    equipmentType: 'Instrument',
    location: 'Molecular Lab',
    status: 'Available',
    manufacturer: 'Agilent Technologies',
    installationDate: fixedIso(2025, 2, 20),
    warrantyExpiry: fixedIso(2028, 2, 19),
    description: 'Standby high-performance liquid chromatography system.',
    calibrationIntervalDays: 90,
    lastCalibrationAt: isoOffset(-45),
    nextCalibrationAt: isoOffset(45),
  },
  {
    id: 'EQP-GLU-027',
    name: 'Point-of-Care Glucometer Station',
    model: 'Roche Cobas Pulse',
    serialNumber: 'SN-CBPL-3320',
    department: 'Emergency Lab',
    equipmentType: 'Instrument',
    location: 'Emergency Lab',
    status: 'Available',
    manufacturer: 'Roche Diagnostics',
    installationDate: fixedIso(2025, 3, 8),
    warrantyExpiry: fixedIso(2028, 3, 7),
    description: 'Backup point-of-care glucose testing station.',
    calibrationIntervalDays: 90,
    lastCalibrationAt: isoOffset(-30),
    nextCalibrationAt: isoOffset(60),
  },
  {
    id: 'EQP-VRT-028',
    name: 'Vortex Mixer Station',
    model: 'IKA Vortex 3',
    serialNumber: 'SN-IKAV-1187',
    department: 'Biochemistry',
    equipmentType: 'Instrument',
    location: 'Biochemistry Lab',
    status: 'Available',
    manufacturer: 'IKA',
    installationDate: fixedIso(2025, 4, 15),
    warrantyExpiry: fixedIso(2028, 4, 14),
    description: 'Standby bench mixer for reagent preparation.',
    calibrationIntervalDays: 365,
    lastCalibrationAt: isoOffset(-90),
    nextCalibrationAt: isoOffset(275),
  },
];

// ── Service / maintenance events — Add Service / Maintenance writes here;
// "Scheduled" entries drive the Maintenance tab, "Completed" drive Service
// History, so logging one action shows up in exactly the right place. ──────

export type ServiceEventType =
  'Preventive Maintenance' | 'Corrective Maintenance' | 'Calibration' | 'Repair' | 'Inspection';

export type ServiceEventStatus = 'Scheduled' | 'Completed';

export type ServiceEvent = {
  id: string;
  equipmentId: string;
  type: ServiceEventType;
  status: ServiceEventStatus;
  date: string;
  performedBy: string;
  notes: string;
};

export const SERVICE_EVENTS: ServiceEvent[] = [
  {
    id: 'SVC-0001',
    equipmentId: 'EQP-MIC-004',
    type: 'Corrective Maintenance',
    status: 'Scheduled',
    date: isoOffset(2),
    performedBy: 'Field Engineer — Memmert GmbH',
    notes: 'Temperature sensor drift reported; replacement part on order.',
  },
  {
    id: 'SVC-0002',
    equipmentId: 'EQP-OSM-025',
    type: 'Corrective Maintenance',
    status: 'Scheduled',
    date: isoOffset(4),
    performedBy: 'Adaeze Nwankwo',
    notes: 'Freezing bath not reaching set point; awaiting diagnostic visit.',
  },
  {
    id: 'SVC-0003',
    equipmentId: 'EQP-BGA-006',
    type: 'Repair',
    status: 'Scheduled',
    date: isoOffset(7),
    performedBy: 'Field Engineer — Radiometer Medical',
    notes: 'Gas module fault code E-42; engineer dispatched.',
  },
  {
    id: 'SVC-0004',
    equipmentId: 'EQP-CHM-001',
    type: 'Preventive Maintenance',
    status: 'Completed',
    date: isoOffset(-30),
    performedBy: 'Chinedu Obi',
    notes: 'Quarterly PM — pipette flush, light source check. All within spec.',
  },
  {
    id: 'SVC-0005',
    equipmentId: 'EQP-HMT-002',
    type: 'Calibration',
    status: 'Completed',
    date: isoOffset(-20),
    performedBy: 'Chinedu Obi',
    notes: 'Full calibration against manufacturer reference cells. Passed.',
  },
  {
    id: 'SVC-0006',
    equipmentId: 'EQP-AUT-015',
    type: 'Inspection',
    status: 'Completed',
    date: isoOffset(-14),
    performedBy: 'Adaeze Nwankwo',
    notes: 'Pressure vessel safety inspection — passed, certificate filed.',
  },
  {
    id: 'SVC-0007',
    equipmentId: 'EQP-PCR-007',
    type: 'Preventive Maintenance',
    status: 'Completed',
    date: isoOffset(-9),
    performedBy: 'Chinedu Obi',
    notes: 'Block uniformity test and lid gasket replacement.',
  },
  {
    id: 'SVC-0008',
    equipmentId: 'EQP-FCM-019',
    type: 'Repair',
    status: 'Completed',
    date: isoOffset(-6),
    performedBy: 'Field Engineer — BD Biosciences',
    notes: 'Replaced laser alignment module after fluidics warning.',
  },
];

export type DowntimeLog = {
  id: string;
  equipmentId: string;
  startAt: string;
  endAt: string | null;
  reason: string;
  reportedBy: string;
};

export const DOWNTIME_LOGS: DowntimeLog[] = [
  {
    id: 'DWN-0001',
    equipmentId: 'EQP-BGA-006',
    startAt: isoOffset(-28),
    endAt: null,
    reason: 'Gas module fault — out of service pending repair.',
    reportedBy: 'Ifeoma Chukwu',
  },
  {
    id: 'DWN-0002',
    equipmentId: 'EQP-MIC-004',
    startAt: isoOffset(-3),
    endAt: null,
    reason: 'Temperature sensor drift outside acceptable range.',
    reportedBy: 'Chinedu Obi',
  },
  {
    id: 'DWN-0003',
    equipmentId: 'EQP-OSM-025',
    startAt: isoOffset(-5),
    endAt: null,
    reason: 'Freezing bath not reaching set point.',
    reportedBy: 'Adaeze Nwankwo',
  },
  {
    id: 'DWN-0004',
    equipmentId: 'EQP-FCM-019',
    startAt: isoOffset(-8),
    endAt: isoOffset(-6),
    reason: 'Fluidics warning — laser alignment fault.',
    reportedBy: 'John Okafor',
  },
  {
    id: 'DWN-0005',
    equipmentId: 'EQP-COA-012',
    startAt: isoOffset(-45),
    endAt: isoOffset(-45),
    reason: 'Reagent probe clog — cleared same day.',
    reportedBy: 'John Okafor',
  },
];

export type ErrorLogSeverity = 'Critical' | 'Warning' | 'Info';

export type ErrorLog = {
  id: string;
  equipmentId: string;
  occurredAt: string;
  errorCode: string;
  description: string;
  severity: ErrorLogSeverity;
  resolved: boolean;
};

export const ERROR_LOGS: ErrorLog[] = [
  {
    id: 'ERR-0001',
    equipmentId: 'EQP-BGA-006',
    occurredAt: isoOffset(-28),
    errorCode: 'E-42',
    description: 'Gas module pressure fault.',
    severity: 'Critical',
    resolved: false,
  },
  {
    id: 'ERR-0002',
    equipmentId: 'EQP-MIC-004',
    occurredAt: isoOffset(-3),
    errorCode: 'T-07',
    description: 'Chamber temperature sensor out of range.',
    severity: 'Critical',
    resolved: false,
  },
  {
    id: 'ERR-0003',
    equipmentId: 'EQP-FCM-019',
    occurredAt: isoOffset(-8),
    errorCode: 'FL-19',
    description: 'Fluidics laser alignment warning.',
    severity: 'Warning',
    resolved: true,
  },
  {
    id: 'ERR-0004',
    equipmentId: 'EQP-COA-012',
    occurredAt: isoOffset(-45),
    errorCode: 'P-03',
    description: 'Reagent probe clog detected.',
    severity: 'Warning',
    resolved: true,
  },
  {
    id: 'ERR-0005',
    equipmentId: 'EQP-CHM-001',
    occurredAt: isoOffset(-30),
    errorCode: 'L-11',
    description: 'Light source intensity below threshold — auto-recalibrated.',
    severity: 'Info',
    resolved: true,
  },
  {
    id: 'ERR-0006',
    equipmentId: 'EQP-OSM-025',
    occurredAt: isoOffset(-5),
    errorCode: 'B-24',
    description: 'Freezing bath set-point not reached within tolerance.',
    severity: 'Critical',
    resolved: false,
  },
];

export function getEquipment(id: string): EquipmentRecord | undefined {
  return EQUIPMENT_RECORDS.find((e) => e.id === id);
}

export type CalibrationState = 'OK' | 'Due' | 'Overdue' | 'Not Tracked';

/** The "due soon" window scales with each instrument's own calibration
 * interval (20% of it) rather than a flat day count, capped at
 * `CALIBRATION_DUE_WINDOW_DAYS` — otherwise a 30-day-interval analyzer
 * halfway through its cycle would falsely read as "due" under a window
 * sized for 180+ day instruments. */
function dueWindowFor(equipment: EquipmentRecord): number {
  return Math.min(CALIBRATION_DUE_WINDOW_DAYS, Math.round(equipment.calibrationIntervalDays * 0.2));
}

export function getCalibrationState(equipment: EquipmentRecord): CalibrationState {
  if (!equipment.nextCalibrationAt) return 'Not Tracked';
  const daysUntil = Math.round(
    (new Date(equipment.nextCalibrationAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntil < 0) return 'Overdue';
  if (daysUntil <= dueWindowFor(equipment)) return 'Due';
  return 'OK';
}
