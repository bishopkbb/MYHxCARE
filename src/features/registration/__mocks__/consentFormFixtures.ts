/**
 * Mock fixtures for the Consent Forms screen.
 * Swap out by pointing hooks to a real consent-management endpoint in
 * Phase 6.
 */

import {
  Archive,
  Check,
  Edit3,
  FileSignature,
  FileText,
  RefreshCw,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { HOSPITAL_DEPARTMENT_OPTIONS } from '@/constants/departments';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function atDayOffset(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

export type ConsentType =
  | 'Surgery Consent'
  | 'Blood Transfusion'
  | 'Radiology Consent'
  | 'Laboratory Consent'
  | 'General Treatment'
  | 'Anaesthesia Consent'
  | 'Telemedicine Consent'
  | 'Data Privacy Consent';

export type ConsentStatus = 'Pending' | 'Awaiting Patient' | 'Signed' | 'Archived';
export type SignatureState = 'Pending' | 'Signed';
export type SignerRole = 'Patient / Guardian' | 'Doctor' | 'Witness';

export const CONSENT_TYPE_OPTIONS: { value: ConsentType; label: string }[] = [
  { value: 'Surgery Consent', label: 'Surgery Consent' },
  { value: 'Blood Transfusion', label: 'Blood Transfusion' },
  { value: 'Radiology Consent', label: 'Radiology Consent' },
  { value: 'Laboratory Consent', label: 'Laboratory Consent' },
  { value: 'General Treatment', label: 'General Treatment' },
  { value: 'Anaesthesia Consent', label: 'Anaesthesia Consent' },
  { value: 'Telemedicine Consent', label: 'Telemedicine Consent' },
  { value: 'Data Privacy Consent', label: 'Data Privacy Consent' },
];

export const CONSENT_DEPARTMENT_OPTIONS = HOSPITAL_DEPARTMENT_OPTIONS;

export const CONSENT_STATUS_OPTIONS: { value: ConsentStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Awaiting Patient', label: 'Awaiting Patient' },
  { value: 'Signed', label: 'Signed' },
];

export const CONSENT_DOCTOR_OPTIONS = [
  'Dr. Samuel A.',
  'Dr. Jane Ezeonu (GP)',
  'Dr. Onyedika Umeh',
  'Dr. Ifeanyi Okafor',
].map((d) => ({ value: d, label: d }));

export const PROCEDURE_TYPE_OPTIONS = [
  'Appendectomy',
  'Blood Transfusion',
  'X-Ray Imaging',
  'Laboratory Test',
  'General Consultation',
  'Anaesthesia Administration',
  'Video Consultation',
  'Data Sharing',
].map((p) => ({ value: p, label: p }));

const CONSENT_TYPE_TO_PROCEDURE: Record<ConsentType, string> = {
  'Surgery Consent': 'Appendectomy',
  'Blood Transfusion': 'Blood Transfusion',
  'Radiology Consent': 'X-Ray Imaging',
  'Laboratory Consent': 'Laboratory Test',
  'General Treatment': 'General Consultation',
  'Anaesthesia Consent': 'Anaesthesia Administration',
  'Telemedicine Consent': 'Video Consultation',
  'Data Privacy Consent': 'Data Sharing',
};

const CONSENT_TYPE_TO_DEPARTMENT: Record<ConsentType, string> = {
  'Surgery Consent': 'Surgery',
  'Blood Transfusion': 'Emergency Department',
  'Radiology Consent': 'Radiology',
  'Laboratory Consent': 'Laboratory',
  'General Treatment': 'General Outpatient Clinic',
  'Anaesthesia Consent': 'Surgery',
  'Telemedicine Consent': 'Telemedicine',
  'Data Privacy Consent': 'General Outpatient Clinic',
};

const CONSENT_TYPE_DESCRIPTIONS: Record<ConsentType, string> = {
  'Surgery Consent': 'Consent for appendectomy procedure under general anaesthesia.',
  'Blood Transfusion': 'Consent to receive blood or blood products during treatment.',
  'Radiology Consent': 'Consent for diagnostic imaging and associated contrast use.',
  'Laboratory Consent': 'Consent for laboratory sample collection and testing.',
  'General Treatment': 'Consent for general outpatient treatment and examination.',
  'Anaesthesia Consent': 'Consent for administration of anaesthesia during a procedure.',
  'Telemedicine Consent': 'Consent to receive care via a video consultation.',
  'Data Privacy Consent': 'Consent to the collection and sharing of personal health data.',
};

export type SignatureRow = {
  role: SignerRole;
  status: SignatureState;
  signedOn?: string;
};

export type ConsentTimelineEntry = {
  id: string;
  label: string;
  dateTime: string;
  icon: LucideIcon;
  color: string;
  bg: string;
};

export type ConsentAuditEntry = {
  id: string;
  action: string;
  actor: string;
  dateTime: string;
};

export type ConsentForm = {
  id: string;
  patientName: string;
  mrn: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  consentType: ConsentType;
  department: string;
  procedure: string;
  doctor: string;
  dateIssued: string; // ISO
  expiryDate: string; // YYYY-MM-DD
  status: ConsentStatus;
  description: string;
  signatures: SignatureRow[];
  timeline: ConsentTimelineEntry[];
  audit: ConsentAuditEntry[];
};

function deriveStatus(signatures: SignatureRow[]): ConsentStatus {
  if (signatures.every((s) => s.status === 'Signed')) return 'Signed';
  const patientSig = signatures.find((s) => s.role === 'Patient / Guardian');
  if (patientSig && patientSig.status === 'Pending') return 'Awaiting Patient';
  return 'Pending';
}

// ─── Curated rows — match the reference design exactly ─────────────────────
const CURATED_CONSENTS: ConsentForm[] = [
  {
    id: 'CON-2026-0148',
    patientName: 'Chidinma Okafor',
    mrn: 'MRN-2025-00124',
    gender: 'Female',
    dateOfBirth: '2004-05-10',
    phone: '0803 456 7890',
    email: 'chidinma.okafor@email.com',
    address: 'No. 12 Nnamdi Azikiwe Street, Awka, Anambra State.',
    consentType: 'Surgery Consent',
    department: 'Surgery',
    procedure: 'Appendectomy',
    doctor: 'Dr. Samuel A.',
    dateIssued: atOffset(0, 9, 45),
    expiryDate: atDayOffset(30),
    status: 'Pending',
    description: CONSENT_TYPE_DESCRIPTIONS['Surgery Consent'],
    signatures: [
      { role: 'Patient / Guardian', status: 'Pending' },
      { role: 'Doctor', status: 'Signed', signedOn: atOffset(0, 9, 46) },
      { role: 'Witness', status: 'Pending' },
    ],
    timeline: [],
    audit: [],
  },
  {
    id: 'CON-2026-0147',
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    gender: 'Male',
    dateOfBirth: '1996-11-02',
    phone: '0806 234 5671',
    email: 'ifeanyi.nwosu@email.com',
    address: 'No. 8 Zik Avenue, Awka, Anambra State.',
    consentType: 'Blood Transfusion',
    department: 'Emergency Department',
    procedure: 'Blood Transfusion',
    doctor: 'Dr. Jane Ezeonu (GP)',
    dateIssued: atOffset(0, 9, 20),
    expiryDate: atDayOffset(7),
    status: 'Awaiting Patient',
    description: CONSENT_TYPE_DESCRIPTIONS['Blood Transfusion'],
    signatures: [
      { role: 'Patient / Guardian', status: 'Pending' },
      { role: 'Doctor', status: 'Signed', signedOn: atOffset(0, 9, 21) },
      { role: 'Witness', status: 'Signed', signedOn: atOffset(0, 9, 21) },
    ],
    timeline: [],
    audit: [],
  },
  {
    id: 'CON-2026-0146',
    patientName: 'Maryam Usman',
    mrn: 'MRN-2024-00765',
    gender: 'Female',
    dateOfBirth: '1990-03-18',
    phone: '0807 345 1234',
    email: 'maryam.usman@email.com',
    address: 'No. 21 Enugu Road, Awka, Anambra State.',
    consentType: 'Radiology Consent',
    department: 'Radiology',
    procedure: 'X-Ray Imaging',
    doctor: 'Dr. Onyedika Umeh',
    dateIssued: atOffset(-1, 16, 15),
    expiryDate: atDayOffset(-1),
    status: 'Signed',
    description: CONSENT_TYPE_DESCRIPTIONS['Radiology Consent'],
    signatures: [
      { role: 'Patient / Guardian', status: 'Signed', signedOn: atOffset(-1, 16, 16) },
      { role: 'Doctor', status: 'Signed', signedOn: atOffset(-1, 16, 20) },
      { role: 'Witness', status: 'Signed', signedOn: atOffset(-1, 16, 20) },
    ],
    timeline: [],
    audit: [],
  },
  {
    id: 'CON-2026-0145',
    patientName: 'Emeka Obi',
    mrn: 'MRN-2023-00543',
    gender: 'Male',
    dateOfBirth: '1985-07-24',
    phone: '0803 987 6543',
    email: 'emeka.obi@email.com',
    address: 'No. 5 Aroma Junction, Awka, Anambra State.',
    consentType: 'Laboratory Consent',
    department: 'Laboratory',
    procedure: 'Laboratory Test',
    doctor: 'Dr. Ifeanyi Okafor',
    dateIssued: atOffset(-1, 15, 22),
    expiryDate: atDayOffset(60),
    status: 'Signed',
    description: CONSENT_TYPE_DESCRIPTIONS['Laboratory Consent'],
    signatures: [
      { role: 'Patient / Guardian', status: 'Signed', signedOn: atOffset(-1, 15, 23) },
      { role: 'Doctor', status: 'Signed', signedOn: atOffset(-1, 15, 25) },
      { role: 'Witness', status: 'Signed', signedOn: atOffset(-1, 15, 25) },
    ],
    timeline: [],
    audit: [],
  },
  {
    id: 'CON-2026-0144',
    patientName: 'Grace Adebayo',
    mrn: 'MRN-2023-00421',
    gender: 'Female',
    dateOfBirth: '1992-01-30',
    phone: '0805 678 4321',
    email: 'grace.adebayo@email.com',
    address: 'No. 30 Amansea Road, Awka, Anambra State.',
    consentType: 'General Treatment',
    department: 'General Outpatient Clinic',
    procedure: 'General Consultation',
    doctor: 'Dr. Jane Ezeonu (GP)',
    dateIssued: atOffset(-1, 11, 30),
    expiryDate: atDayOffset(90),
    status: 'Pending',
    description: CONSENT_TYPE_DESCRIPTIONS['General Treatment'],
    signatures: [
      { role: 'Patient / Guardian', status: 'Pending' },
      { role: 'Doctor', status: 'Pending' },
      { role: 'Witness', status: 'Pending' },
    ],
    timeline: [],
    audit: [],
  },
  {
    id: 'CON-2026-0143',
    patientName: 'Seyi Adewale',
    mrn: 'MRN-2023-00311',
    gender: 'Male',
    dateOfBirth: '1978-09-12',
    phone: '0802 111 2233',
    email: 'seyi.adewale@email.com',
    address: 'No. 14 Onitsha Road, Awka, Anambra State.',
    consentType: 'Anaesthesia Consent',
    department: 'Surgery',
    procedure: 'Anaesthesia Administration',
    doctor: 'Dr. Samuel A.',
    dateIssued: atOffset(-2, 14, 45),
    expiryDate: atDayOffset(14),
    status: 'Signed',
    description: CONSENT_TYPE_DESCRIPTIONS['Anaesthesia Consent'],
    signatures: [
      { role: 'Patient / Guardian', status: 'Signed', signedOn: atOffset(-2, 14, 46) },
      { role: 'Doctor', status: 'Signed', signedOn: atOffset(-2, 14, 50) },
      { role: 'Witness', status: 'Signed', signedOn: atOffset(-2, 14, 50) },
    ],
    timeline: [],
    audit: [],
  },
  {
    id: 'CON-2026-0142',
    patientName: 'Favour Bassey',
    mrn: 'MRN-2024-01002',
    gender: 'Female',
    dateOfBirth: '1999-04-05',
    phone: '0809 222 3344',
    email: 'favour.bassey@email.com',
    address: 'No. 3 Unizik Road, Awka, Anambra State.',
    consentType: 'Telemedicine Consent',
    department: 'Telemedicine',
    procedure: 'Video Consultation',
    doctor: 'Dr. Jane Ezeonu (GP)',
    dateIssued: atOffset(-2, 10, 12),
    expiryDate: atDayOffset(180),
    status: 'Awaiting Patient',
    description: CONSENT_TYPE_DESCRIPTIONS['Telemedicine Consent'],
    signatures: [
      { role: 'Patient / Guardian', status: 'Pending' },
      { role: 'Doctor', status: 'Signed', signedOn: atOffset(-2, 10, 13) },
      { role: 'Witness', status: 'Signed', signedOn: atOffset(-2, 10, 13) },
    ],
    timeline: [],
    audit: [],
  },
  {
    id: 'CON-2026-0141',
    patientName: 'Daniel Eze',
    mrn: 'MRN-2023-00187',
    gender: 'Male',
    dateOfBirth: '1988-12-21',
    phone: '0801 555 6677',
    email: 'daniel.eze@email.com',
    address: 'No. 19 Zik Avenue, Awka, Anambra State.',
    consentType: 'Data Privacy Consent',
    department: 'General Outpatient Clinic',
    procedure: 'Data Sharing',
    doctor: 'Dr. Ifeanyi Okafor',
    dateIssued: atOffset(-3, 16, 10),
    expiryDate: atDayOffset(365),
    status: 'Signed',
    description: CONSENT_TYPE_DESCRIPTIONS['Data Privacy Consent'],
    signatures: [
      { role: 'Patient / Guardian', status: 'Signed', signedOn: atOffset(-3, 16, 11) },
      { role: 'Doctor', status: 'Signed', signedOn: atOffset(-3, 16, 15) },
      { role: 'Witness', status: 'Signed', signedOn: atOffset(-3, 16, 15) },
    ],
    timeline: [],
    audit: [],
  },
];

// ─── Generated rows — fill out to a realistic 24-row dataset ───────────────
const GEN_FIRST_NAMES = [
  'Ngozi',
  'Tunde',
  'Aisha',
  'Peter',
  'Victoria',
  'Chukwuemeka',
  'Musa',
  'Blessing',
  'Kelechi',
  'Halima',
  'Chinedu',
  'Grace',
  'Ikenna',
  'Ronke',
  'Segun',
  'Patience',
];
const GEN_LAST_NAMES = [
  'Nwachukwu',
  'Balogun',
  'Suleiman',
  'Achike',
  'Bassey',
  'Etim',
  'Idika',
  'Aliyu',
  'Okoro',
  'Ibe',
  'Effiong',
  'Nwankwo',
  'Umeh',
  'Adewale',
  'Bello',
  'Okoye',
];
const CONSENT_TYPES = CONSENT_TYPE_OPTIONS.map((c) => c.value);
const GEN_DOCTORS = CONSENT_DOCTOR_OPTIONS.map((d) => d.value);

function buildTimelineAndAudit(c: {
  id: string;
  dateIssued: string;
  status: ConsentStatus;
  doctor: string;
}): { timeline: ConsentTimelineEntry[]; audit: ConsentAuditEntry[] } {
  const timeline: ConsentTimelineEntry[] = [
    {
      id: `${c.id}-tl-1`,
      label: 'Consent form created',
      dateTime: c.dateIssued,
      icon: FileText,
      color: '#00B4D8',
      bg: 'rgba(0,180,216,0.12)',
    },
  ];
  if (c.status !== 'Pending') {
    timeline.push({
      id: `${c.id}-tl-2`,
      label: `Signed by ${c.doctor}`,
      dateTime: c.dateIssued,
      icon: Check,
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.12)',
    });
  }
  if (c.status === 'Signed') {
    timeline.push({
      id: `${c.id}-tl-3`,
      label: 'All required signatures collected',
      dateTime: c.dateIssued,
      icon: FileSignature,
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.12)',
    });
  }
  const audit: ConsentAuditEntry[] = [
    { id: `${c.id}-au-1`, action: 'Created', actor: 'Adaobi Nwankwo', dateTime: c.dateIssued },
  ];
  return { timeline, audit };
}

CURATED_CONSENTS.forEach((c) => {
  const built = buildTimelineAndAudit(c);
  c.timeline = built.timeline;
  c.audit = built.audit;
});

const GENERATED_CONSENTS: ConsentForm[] = Array.from({ length: 16 }, (_, idx) => {
  const i = idx + 1; // CON-2026-0001 .. CON-2026-0016
  const consentType = CONSENT_TYPES[i % CONSENT_TYPES.length] as ConsentType;
  const dayOffset = -(4 + (16 - i));
  const hour = 8 + (i % 9);
  const minute = (i * 11) % 60;
  const dateIssued = atOffset(dayOffset, hour, minute);
  const doctor = GEN_DOCTORS[i % GEN_DOCTORS.length] as string;

  const signatures: SignatureRow[] =
    i % 4 === 0
      ? [
          { role: 'Patient / Guardian', status: 'Pending' },
          { role: 'Doctor', status: 'Pending' },
          { role: 'Witness', status: 'Pending' },
        ]
      : i % 3 === 0
        ? [
            { role: 'Patient / Guardian', status: 'Pending' },
            { role: 'Doctor', status: 'Signed', signedOn: dateIssued },
            { role: 'Witness', status: 'Signed', signedOn: dateIssued },
          ]
        : [
            { role: 'Patient / Guardian', status: 'Signed', signedOn: dateIssued },
            { role: 'Doctor', status: 'Signed', signedOn: dateIssued },
            { role: 'Witness', status: 'Signed', signedOn: dateIssued },
          ];

  const consent: ConsentForm = {
    id: `CON-2026-${String(i).padStart(4, '0')}`,
    patientName: `${GEN_FIRST_NAMES[i % GEN_FIRST_NAMES.length]} ${GEN_LAST_NAMES[(i * 3) % GEN_LAST_NAMES.length]}`,
    mrn: `MRN-${2020 + (i % 7)}-${String(100 + i * 3).padStart(5, '0')}`,
    gender: i % 2 === 0 ? 'Female' : 'Male',
    dateOfBirth: `${1975 + (i % 30)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`,
    phone: `080${3 + (i % 6)} ${String(100 + i * 7).padStart(3, '0')} ${String(1000 + i * 13).padStart(4, '0')}`,
    email: `patient${i}@email.com`,
    address: `No. ${20 + i} Zik Avenue, Awka, Anambra State.`,
    consentType,
    department: CONSENT_TYPE_TO_DEPARTMENT[consentType],
    procedure: CONSENT_TYPE_TO_PROCEDURE[consentType],
    doctor,
    dateIssued,
    expiryDate: atDayOffset(30 + i),
    status: deriveStatus(signatures),
    description: CONSENT_TYPE_DESCRIPTIONS[consentType],
    signatures,
    timeline: [],
    audit: [],
  };
  const built = buildTimelineAndAudit(consent);
  consent.timeline = built.timeline;
  consent.audit = built.audit;
  return consent;
});

export const CONSENT_FORMS: ConsentForm[] = [...CURATED_CONSENTS, ...GENERATED_CONSENTS];

// ─── Stat cards ──────────────────────────────────────────────────────────────
export const CONSENT_STATS: {
  id: string;
  label: string;
  value: string;
  trendLabel: string;
  trendPercent: number;
  trendDirection: 'up' | 'down';
  icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
  {
    id: 'pending',
    label: 'Pending Consents',
    value: '24',
    trendLabel: 'from yesterday',
    trendPercent: 12,
    trendDirection: 'up',
    icon: FileText,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
  },
  {
    id: 'signed-today',
    label: 'Signed Today',
    value: '18',
    trendLabel: 'from yesterday',
    trendPercent: 8,
    trendDirection: 'up',
    icon: Check,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 'expired',
    label: 'Expired Consents',
    value: '6',
    trendLabel: 'from yesterday',
    trendPercent: 2,
    trendDirection: 'down',
    icon: RefreshCw,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'procedure',
    label: 'Procedure Consents',
    value: '42',
    trendLabel: 'from yesterday',
    trendPercent: 15,
    trendDirection: 'up',
    icon: RefreshCw,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'digital-signatures',
    label: 'Digital Signatures',
    value: '68%',
    trendLabel: 'Success rate',
    trendPercent: 0,
    trendDirection: 'up',
    icon: FileSignature,
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.12)',
  },
  {
    id: 'awaiting-patient',
    label: 'Awaiting Patient',
    value: '15',
    trendLabel: 'from yesterday',
    trendPercent: 11,
    trendDirection: 'up',
    icon: FileSignature,
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.12)',
  },
];

export type ConsentQuickActionId =
  'new' | 'generate' | 'request-signature' | 'print' | 'upload' | 'archive';

export const CONSENT_QUICK_ACTIONS: {
  id: ConsentQuickActionId;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
  {
    id: 'new',
    label: 'New Consent Form',
    icon: FileText,
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.12)',
  },
  {
    id: 'generate',
    label: 'Generate Consent',
    icon: RefreshCw,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
  },
  {
    id: 'request-signature',
    label: 'Request Digital Signature',
    icon: FileSignature,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
  },
  {
    id: 'print',
    label: 'Print Consent',
    icon: Edit3,
    color: '#4A7080',
    bg: 'rgba(74,112,128,0.12)',
  },
  {
    id: 'upload',
    label: 'Upload Signed Copy',
    icon: Upload,
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.12)',
  },
  {
    id: 'archive',
    label: 'Archive Consent',
    icon: Archive,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
];
