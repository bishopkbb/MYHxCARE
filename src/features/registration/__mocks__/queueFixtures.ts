/**
 * Mock fixtures for the Queue Management screen. The first 8 entries match
 * the reference design's exact patients/times; the rest are generated to
 * reach a realistic 42-patient queue for pagination.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import { getDoctorByName } from '@/features/shared/__mocks__/doctorDirectory';
import { TODAY_ON_CALL } from '@/features/workforce/__mocks__/workforceFixtures';

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
  /** Foreign key into `shared/__mocks__/doctorDirectory`'s `DOCTORS` — undefined
   * when `attendingDoctor` doesn't (yet) resolve to a roster entry. */
  doctorId?: string | undefined;
  /** True only for a patient who has never been seen at this facility before —
   * everyone else ("returning") already has a real vitals history even before
   * today's triage. Nursing's Vital Signs screen keys off this (via
   * `NursePatient.isNewPatient`) to decide whether to show an empty
   * first-capture state or the patient's existing trend. */
  isNewPatient?: boolean;
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

const ON_CALL_LEVEL_RANK: Record<string, number> = { PRIMARY: 0, SECONDARY: 1, CONSULTANT: 2 };
const ON_CALL_STATUS_RANK: Record<string, number> = { AVAILABLE: 0, BUSY: 1, UNAVAILABLE: 2 };

/** Whoever's actually on duty for a given Workforce/Duty-Roster department
 * right now — prefers an AVAILABLE doctor over a BUSY/UNAVAILABLE one, then
 * PRIMARY over SECONDARY/CONSULTANT. Returns undefined when that department
 * has no on-call coverage at all (e.g. routine GP/specialty clinics aren't
 * "on-call", they're scheduled) — callers fall back to a fixed clinic doctor. */
function getOnDutyDoctor(
  workforceDepartment: string,
): { name: string; doctorId?: string | undefined } | undefined {
  const onDuty = TODAY_ON_CALL.filter((a) => a.department === workforceDepartment)
    .slice()
    .sort((a, b) => {
      const statusDelta =
        (ON_CALL_STATUS_RANK[a.status] ?? 9) - (ON_CALL_STATUS_RANK[b.status] ?? 9);
      if (statusDelta !== 0) return statusDelta;
      return (ON_CALL_LEVEL_RANK[a.level] ?? 9) - (ON_CALL_LEVEL_RANK[b.level] ?? 9);
    })[0];
  if (!onDuty) return undefined;
  return { name: onDuty.doctorName, doctorId: getDoctorByName(onDuty.doctorName)?.id };
}

const surgeryOnDuty = getOnDutyDoctor('Surgery');
const paediatricsOnDuty = getOnDutyDoctor('Paediatrics');
export const emergencyOnDuty = getOnDutyDoctor('Emergency Medicine');

// Room 2 of General Outpatient is deliberately staffed by the default demo
// login (Dr. Adaeze Okonkwo, usr_001) rather than an invented GP, so a nurse
// who triages a walk-in here and a doctor logging in with the default account
// see the same patient — the reference case for the registration -> nurse ->
// doctor bridge (see Phase 3 of the cross-system patient flow plan). Surgery
// and Paediatrics are staffed by whoever's actually on duty today per the
// Workforce/Duty Roster on-call schedule (see getOnDutyDoctor above) rather
// than a fixed room doctor — General Outpatient/Dental/Laboratory/Pharmacy/
// Radiology/Physiotherapy aren't on-call specialties, so they keep a fixed
// clinic doctor.
export const CLINICS_BY_DEPARTMENT: Record<
  string,
  { clinic: string; doctor: string; doctorId?: string }[]
> = {
  'General Outpatient': [
    { clinic: 'Room 1', doctor: 'Dr. Jane Ezeonu (GP)', doctorId: 'doc-jane' },
    { clinic: 'Room 2', doctor: 'Dr. Adaeze Okonkwo', doctorId: 'usr_001' },
  ],
  Surgery: [
    {
      clinic: 'Surgical Clinic 1',
      doctor: surgeryOnDuty?.name ?? 'Dr. Chinedu A.',
      doctorId: surgeryOnDuty?.doctorId ?? 'doc-chinedu',
    },
  ],
  Paediatrics: [
    {
      clinic: 'Room 2',
      doctor: paediatricsOnDuty?.name ?? 'Dr. Michael Obi',
      doctorId: paediatricsOnDuty?.doctorId ?? 'doc-michael',
    },
  ],
  Dental: [{ clinic: 'Dental Clinic', doctor: 'Dr. Ifeanyi Okafor', doctorId: 'doc-ifeanyi' }],
  Laboratory: [{ clinic: 'Lab Collection Unit', doctor: 'Mr. Tunde S.' }],
  Pharmacy: [{ clinic: 'Pharmacy Counter 1', doctor: 'Mrs. Amaka Eze' }],
  Radiology: [{ clinic: 'Radiology Suite', doctor: 'Dr. Chika Nnamdi', doctorId: 'doc-chika' }],
  Physiotherapy: [{ clinic: 'Physio Room 1', doctor: 'Mrs. Ngozi A.', doctorId: 'doc-ngozi' }],
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
    doctorId: 'doc-jane',
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
    attendingDoctor: paediatricsOnDuty?.name ?? 'Dr. Michael Obi',
    doctorId: paediatricsOnDuty?.doctorId ?? 'doc-michael',
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
    doctorId: 'doc-jane',
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
    attendingDoctor: surgeryOnDuty?.name ?? 'Dr. Chinedu A.',
    doctorId: surgeryOnDuty?.doctorId ?? 'doc-chinedu',
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
    attendingDoctor: emergencyOnDuty?.name ?? 'Dr. On Duty',
    doctorId: emergencyOnDuty?.doctorId,
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
    doctorId: 'doc-ifeanyi',
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
    doctorId: 'doc-ngozi',
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
  // Clinic choice within a department cycles by lap (how many times we've gone
  // through the full department list), not by `i` directly — `i % options.length`
  // would always land on the same option for a department whose index shares a
  // factor with DEPARTMENTS.length (e.g. General Outpatient at index 0 with a
  // 2-option roster), never reaching the second clinic/doctor.
  const lap = Math.floor(i / DEPARTMENTS.length);
  const assignment = options[lap % options.length] ?? {
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
    doctorId: assignment.doctorId,
    // Roughly 1 in 6 walk-ins is a genuinely first-time patient — everyone
    // else is "returning" and already has a real vitals history.
    isNewPatient: i % 6 === 0,
    arrivalTime: minutesAgo(arrivalMinutesAgo),
    status: isEmergency ? 'Emergency' : (EXTRA_STATUSES[i % EXTRA_STATUSES.length] as QueueStatus),
    history: pastHistory(arrivalMinutesAgo, isEmergency),
  };
});

export const QUEUE_ENTRIES: QueueEntry[] = [...FEATURED_ENTRIES, ...EXTRA_ENTRIES];

/** The first (primary) clinic/doctor on duty for a given queue department —
 * the same assignment rule `EXTRA_ENTRIES` above was generated with. Reused
 * by `registrationQueueStore.addQueueEntry()` so a check-in-created entry is
 * assigned exactly the way this file's own generated entries are, rather
 * than duplicating a second assignment table. */
export function pickClinicForDepartment(
  department: string,
): { clinic: string; doctor: string; doctorId?: string } | undefined {
  return CLINICS_BY_DEPARTMENT[department]?.[0];
}

export const CHECKED_IN_TODAY = 86;
export const CHECKED_IN_TREND_PERCENT = 12;
export const PATIENTS_SERVED_TODAY = 64;
export const PATIENTS_SERVED_TREND_PERCENT = 15;
