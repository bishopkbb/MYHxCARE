/**
 * Mock fixtures for the Queue Management screen. The first 8 entries match
 * the reference design's exact patients/times; the rest are generated to
 * reach a realistic 42-patient queue for pagination.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

export type QueueStatus =
  'New Arrival' | 'Waiting' | 'Calling Next' | 'In Consultation' | 'Emergency' | 'Completed';

export type QueueHistoryEntry = {
  time: string | null;
  label: string;
  by?: string;
  pending?: boolean;
};

export type QueueEntry = {
  id: string;
  queueNumber: string;
  isEmergency: boolean;
  patientName: string;
  mrn: string;
  gender: 'Male' | 'Female';
  age: number;
  department: string;
  assignedClinic: string;
  attendingDoctor: string;
  arrivalTime: string; // ISO
  status: QueueStatus;
  history: QueueHistoryEntry[];
};

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

export const DEPARTMENTS = [
  'General Outpatient',
  'Surgery',
  'Paediatrics',
  'Dental',
  'Laboratory',
  'Pharmacy',
  'Radiology',
  'Physiotherapy',
] as const;

const CLINICS_BY_DEPARTMENT: Record<string, { clinic: string; doctor: string }[]> = {
  'General Outpatient': [
    { clinic: 'Room 1', doctor: 'Dr. Jane Ezeonu (GP)' },
    { clinic: 'Room 2', doctor: 'Dr. Ada Chukwu (GP)' },
  ],
  Surgery: [{ clinic: 'Surgical Clinic 1', doctor: 'Dr. Chinedu A.' }],
  Paediatrics: [{ clinic: 'Room 2', doctor: 'Dr. Michael Obi' }],
  Dental: [{ clinic: 'Dental Clinic', doctor: 'Dr. Ifeanyi Okafor' }],
  Laboratory: [{ clinic: 'Lab Collection Unit', doctor: 'Mr. Tunde S.' }],
  Pharmacy: [{ clinic: 'Pharmacy Counter 1', doctor: 'Mrs. Amaka Eze' }],
  Radiology: [{ clinic: 'Radiology Suite', doctor: 'Dr. Chika Nnamdi' }],
  Physiotherapy: [{ clinic: 'Physio Room 1', doctor: 'Mrs. Ngozi A.' }],
};

function pastHistory(arrivalMinutesAgo: number, emergency: boolean): QueueHistoryEntry[] {
  const base: QueueHistoryEntry[] = [
    { time: minutesAgo(arrivalMinutesAgo), label: 'Added to queue', by: 'Adaobi Nwankwo' },
  ];
  if (emergency) {
    base.push({
      time: minutesAgo(Math.max(arrivalMinutesAgo - 0.5, 0)),
      label: 'Marked as Emergency Priority',
      by: 'Adaobi Nwankwo',
    });
    base.push({ time: null, label: 'Seen by Triage Nurse', pending: true });
  }
  return base;
}

// The 8 patients matching the reference design exactly.
const FEATURED_ENTRIES: QueueEntry[] = [
  {
    id: 'q-001',
    queueNumber: '001',
    isEmergency: false,
    patientName: 'Uchenna Collins',
    mrn: 'MRN-2026-00450',
    gender: 'Male',
    age: 23,
    department: 'General Outpatient',
    assignedClinic: 'Room 1',
    attendingDoctor: 'Dr. Jane Ezeonu (GP)',
    arrivalTime: minutesAgo(37),
    status: 'In Consultation',
    history: pastHistory(37, false),
  },
  {
    id: 'q-002',
    queueNumber: '002',
    isEmergency: false,
    patientName: 'Fatima Kabir',
    mrn: 'MRN-2026-00449',
    gender: 'Female',
    age: 24,
    department: 'Paediatrics',
    assignedClinic: 'Room 2',
    attendingDoctor: 'Dr. Michael Obi',
    arrivalTime: minutesAgo(32),
    status: 'Calling Next',
    history: pastHistory(32, false),
  },
  {
    id: 'q-003',
    queueNumber: '003',
    isEmergency: false,
    patientName: 'David Osei',
    mrn: 'MRN-2026-00448',
    gender: 'Male',
    age: 22,
    department: 'General Outpatient',
    assignedClinic: 'Room 1',
    attendingDoctor: 'Dr. Jane Ezeonu (GP)',
    arrivalTime: minutesAgo(17),
    status: 'Waiting',
    history: pastHistory(17, false),
  },
  {
    id: 'q-004',
    queueNumber: '004',
    isEmergency: false,
    patientName: 'Ibrahim Kalu',
    mrn: 'MRN-2026-00446',
    gender: 'Male',
    age: 20,
    department: 'Surgery',
    assignedClinic: 'Surgical Clinic 1',
    attendingDoctor: 'Dr. Chinedu A.',
    arrivalTime: minutesAgo(12),
    status: 'Waiting',
    history: pastHistory(12, false),
  },
  {
    id: 'q-e001',
    queueNumber: 'E001',
    isEmergency: true,
    patientName: 'Esther Chinedu',
    mrn: 'MRN-2026-00444',
    gender: 'Female',
    age: 28,
    department: 'General Outpatient',
    assignedClinic: 'Emergency Room',
    attendingDoctor: 'Dr. On Duty',
    arrivalTime: minutesAgo(7),
    status: 'Emergency',
    history: pastHistory(7, true),
  },
  {
    id: 'q-005',
    queueNumber: '005',
    isEmergency: false,
    patientName: 'Amaka Nwosu',
    mrn: 'MRN-2026-00447',
    gender: 'Female',
    age: 19,
    department: 'Dental',
    assignedClinic: 'Dental Clinic',
    attendingDoctor: 'Dr. Ifeanyi Okafor',
    arrivalTime: minutesAgo(2),
    status: 'New Arrival',
    history: pastHistory(2, false),
  },
  {
    id: 'q-006',
    queueNumber: '006',
    isEmergency: false,
    patientName: 'Michael Otori',
    mrn: 'MRN-2026-00443',
    gender: 'Male',
    age: 26,
    department: 'Laboratory',
    assignedClinic: 'Lab Collection Unit',
    attendingDoctor: 'Mr. Tunde S.',
    arrivalTime: minutesAgo(1),
    status: 'New Arrival',
    history: pastHistory(1, false),
  },
  {
    id: 'q-007',
    queueNumber: '007',
    isEmergency: false,
    patientName: 'Sandra Okafor',
    mrn: 'MRN-2026-00442',
    gender: 'Female',
    age: 20,
    department: 'Physiotherapy',
    assignedClinic: 'Physio Room 1',
    attendingDoctor: 'Mrs. Ngozi A.',
    arrivalTime: minutesAgo(0),
    status: 'New Arrival',
    history: pastHistory(0, false),
  },
];

const EXTRA_FIRST_NAMES = [
  'Kelechi',
  'Halima',
  'Chinedu',
  'Oluwaseun',
  'Grace',
  'Ikenna',
  'Aisha',
  'Peter',
  'Victoria',
  'Chukwuemeka',
  'Ronke',
  'Musa',
  'Ijeoma',
  'Segun',
  'Patience',
  'Chukwudi',
  'Rita',
  'Ahmed',
  'Nkechi',
  'Femi',
  'Comfort',
  'Obinna',
  'Zainab',
  'Folasade',
  'Emmanuel',
  'Blessing',
  'Tunde',
  'Ngozi',
  'Yusuf',
  'Chiamaka',
  'Kemi',
  'Uzoma',
  'Bashir',
  'Ada',
];

const EXTRA_LAST_NAMES = [
  'Nnaji',
  'Suleiman',
  'Anyanwu',
  'Adeleke',
  'Umeh',
  'Onwuka',
  'Bello',
  'Nwachukwu',
  'Obi',
  'Adebayo',
  'Danladi',
  'Okoro',
  'Alabi',
  'Udo',
  'Eneh',
  'Nwankwo',
  'Igwe',
  'Ogunleye',
  'James',
  'Chukwu',
  'Yusuf',
  'Balogun',
  'Ibekwe',
  'Ekwueme',
  'Oyelaran',
  'Nnoli',
  'Ahmadu',
  'Ogundipe',
  'Uzoma',
  'Effiong',
  'Okonjo',
  'Madu',
  'Garba',
  'Onyekwere',
];

const EXTRA_STATUSES: QueueStatus[] = [
  'Waiting',
  'Waiting',
  'New Arrival',
  'In Consultation',
  'Waiting',
];

const TOTAL_QUEUE_SIZE = 42;
const EXTRA_COUNT = TOTAL_QUEUE_SIZE - FEATURED_ENTRIES.length;
// Two more emergency patients live deeper in the queue (stat card says 3 total).
const EXTRA_EMERGENCY_INDEXES = new Set([5, 16]);

const EXTRA_ENTRIES: QueueEntry[] = Array.from({ length: EXTRA_COUNT }, (_, i) => {
  const first = EXTRA_FIRST_NAMES[i % EXTRA_FIRST_NAMES.length] as string;
  const last = EXTRA_LAST_NAMES[i % EXTRA_LAST_NAMES.length] as string;
  const department = DEPARTMENTS[i % DEPARTMENTS.length] as string;
  const options =
    CLINICS_BY_DEPARTMENT[department] ?? CLINICS_BY_DEPARTMENT['General Outpatient'] ?? [];
  const assignment = options[i % options.length] ?? {
    clinic: 'Room 1',
    doctor: 'Dr. Jane Ezeonu (GP)',
  };
  const isEmergency = EXTRA_EMERGENCY_INDEXES.has(i);
  const emergencyNumber = i === 5 ? 'E002' : 'E003';
  const arrivalMinutesAgo = 5 + (i % 8) * 5;
  const num = i + 8;

  return {
    id: `q-extra-${i}`,
    queueNumber: isEmergency ? emergencyNumber : String(num).padStart(3, '0'),
    isEmergency,
    patientName: `${first} ${last}`,
    mrn: `MRN-2026-${String(441 - i).padStart(5, '0')}`,
    gender: i % 2 === 0 ? 'Female' : 'Male',
    age: 18 + (i % 45),
    department,
    assignedClinic: assignment.clinic,
    attendingDoctor: assignment.doctor,
    arrivalTime: minutesAgo(arrivalMinutesAgo),
    status: isEmergency ? 'Emergency' : (EXTRA_STATUSES[i % EXTRA_STATUSES.length] as QueueStatus),
    history: pastHistory(arrivalMinutesAgo, isEmergency),
  };
});

export const QUEUE_ENTRIES: QueueEntry[] = [...FEATURED_ENTRIES, ...EXTRA_ENTRIES];

export const CHECKED_IN_TODAY = 86;
export const CHECKED_IN_TREND_PERCENT = 12;
export const PATIENTS_SERVED_TODAY = 64;
export const PATIENTS_SERVED_TREND_PERCENT = 15;
