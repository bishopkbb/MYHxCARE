/**
 * Mock fixtures for the Patient Queue screen (nurse workspace).
 * Swap out by pointing hooks to a real nursing-tasks endpoint in Phase 6.
 */

import {
  Bandage,
  BedDouble,
  Clock,
  ClipboardCheck,
  ClipboardList,
  Droplet,
  Eye,
  HeartPulse,
  Pill,
  Syringe,
  Users,
  type LucideIcon,
} from 'lucide-react';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type TrendDirection = 'up' | 'down';

export type QueueStat = {
  id: string;
  label: string;
  value: string;
  subLabel: string;
  direction?: TrendDirection;
  goodDirection?: TrendDirection;
  icon: LucideIcon;
  color: string;
  iconBg: string;
};

export const WARD_OPTIONS = ['Female Ward', 'Male Ward'].map((w) => ({ value: w, label: w }));

export type TaskPriority = 'High' | 'Medium' | 'Low';
export const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export type TaskType =
  | 'Medication Due'
  | 'Vitals Due'
  | 'Dressing Change'
  | 'Observation'
  | 'Admission Assessment'
  | 'IV Review'
  | 'Catheter Care';

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'Medication Due', label: 'Medication Due' },
  { value: 'Vitals Due', label: 'Vitals Due' },
  { value: 'Dressing Change', label: 'Dressing Change' },
  { value: 'Observation', label: 'Observation' },
  { value: 'Admission Assessment', label: 'Admission Assessment' },
  { value: 'IV Review', label: 'IV Review' },
  { value: 'Catheter Care', label: 'Catheter Care' },
];

export const TASK_TYPE_CFG: Record<TaskType, { icon: LucideIcon; color: string; bg: string }> = {
  'Medication Due': { icon: Pill, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  'Vitals Due': { icon: HeartPulse, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  'Dressing Change': { icon: Bandage, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  Observation: { icon: Eye, color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  'Admission Assessment': { icon: ClipboardList, color: '#00B4D8', bg: 'rgba(0,180,216,0.12)' },
  'IV Review': { icon: Droplet, color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)' },
  'Catheter Care': { icon: Syringe, color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
};

export const DOCTOR_OPTIONS = [
  'Dr. Jane Ezeonu',
  'Dr. Samuel A.',
  'Dr. Onyedika Umeh',
  'Dr. Chika Nnamdi',
].map((d) => ({ value: d, label: d }));

const DOCTOR_ROLE: Record<string, string> = {
  'Dr. Jane Ezeonu': 'Consultant Physician',
  'Dr. Samuel A.': 'Medical Officer',
  'Dr. Onyedika Umeh': 'Consultant Physician',
  'Dr. Chika Nnamdi': 'Medical Officer',
};

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
];

export type QueueTask = {
  id: string;
  patientName: string;
  initials: string;
  avatarBg: string;
  mrn: string;
  ward: string;
  bed: string;
  doctorName: string;
  doctorRole: string;
  taskType: TaskType;
  taskDetail: string;
  dueTime: string; // ISO
  dueLabel: string; // 'Overdue' | 'X min left' | 'X hrs left'
  overdue: boolean;
  priority: TaskPriority;
  status: TaskStatus;
};

const CURATED_TASKS: QueueTask[] = [
  {
    id: 'q-001',
    patientName: 'Chidinma Okafor',
    initials: 'CO',
    avatarBg: '#3B82F6',
    mrn: 'MRN-2026-0148',
    ward: 'Female Ward',
    bed: 'Bed 12',
    doctorName: 'Dr. Jane Ezeonu',
    doctorRole: DOCTOR_ROLE['Dr. Jane Ezeonu'] as string,
    taskType: 'Medication Due',
    taskDetail: 'Paracetamol 1g (PO)',
    dueTime: atOffset(0, 8, 30),
    dueLabel: 'Overdue',
    overdue: true,
    priority: 'High',
    status: 'Pending',
  },
  {
    id: 'q-002',
    patientName: 'Ifeanyi Nwosu',
    initials: 'IN',
    avatarBg: '#F59E0B',
    mrn: 'MRN-2026-00987',
    ward: 'Male Ward',
    bed: 'Bed 5',
    doctorName: 'Dr. Samuel A.',
    doctorRole: DOCTOR_ROLE['Dr. Samuel A.'] as string,
    taskType: 'Vitals Due',
    taskDetail: 'Vitals Monitoring',
    dueTime: atOffset(0, 8, 45),
    dueLabel: 'Overdue',
    overdue: true,
    priority: 'High',
    status: 'Pending',
  },
  {
    id: 'q-003',
    patientName: 'Maryam Usman',
    initials: 'MU',
    avatarBg: '#22C55E',
    mrn: 'MRN-2026-00765',
    ward: 'Female Ward',
    bed: 'Bed 3',
    doctorName: 'Dr. Onyedika Umeh',
    doctorRole: DOCTOR_ROLE['Dr. Onyedika Umeh'] as string,
    taskType: 'Dressing Change',
    taskDetail: 'Surgical wound care',
    dueTime: atOffset(0, 9, 0),
    dueLabel: 'Overdue',
    overdue: true,
    priority: 'Medium',
    status: 'Pending',
  },
  {
    id: 'q-004',
    patientName: 'Daniel Eze',
    initials: 'DE',
    avatarBg: '#EF4444',
    mrn: 'MRN-2026-00187',
    ward: 'Male Ward',
    bed: 'Bed 8',
    doctorName: 'Dr. Chika Nnamdi',
    doctorRole: DOCTOR_ROLE['Dr. Chika Nnamdi'] as string,
    taskType: 'Observation',
    taskDetail: 'Post-op observation',
    dueTime: atOffset(0, 9, 15),
    dueLabel: '15 min left',
    overdue: false,
    priority: 'High',
    status: 'Pending',
  },
  {
    id: 'q-005',
    patientName: 'Rita Obi',
    initials: 'RO',
    avatarBg: '#8B5CF6',
    mrn: 'MRN-2026-01654',
    ward: 'Female Ward',
    bed: 'Bed 14',
    doctorName: 'Dr. Jane Ezeonu',
    doctorRole: DOCTOR_ROLE['Dr. Jane Ezeonu'] as string,
    taskType: 'Admission Assessment',
    taskDetail: 'New admission assessment',
    dueTime: atOffset(0, 9, 30),
    dueLabel: '30 min left',
    overdue: false,
    priority: 'Medium',
    status: 'In Progress',
  },
  {
    id: 'q-006',
    patientName: 'Tunde Oladipo',
    initials: 'TO',
    avatarBg: '#00B4D8',
    mrn: 'MRN-2024-00876',
    ward: 'Male Ward',
    bed: 'Bed 2',
    doctorName: 'Dr. Samuel A.',
    doctorRole: DOCTOR_ROLE['Dr. Samuel A.'] as string,
    taskType: 'IV Review',
    taskDetail: 'IV site assessment',
    dueTime: atOffset(0, 10, 0),
    dueLabel: '1 hr 30 min left',
    overdue: false,
    priority: 'Low',
    status: 'Pending',
  },
  {
    id: 'q-007',
    patientName: 'Grace Adebayo',
    initials: 'GA',
    avatarBg: '#8B5CF6',
    mrn: 'MRN-2026-00421',
    ward: 'Female Ward',
    bed: 'Bed 15',
    doctorName: 'Dr. Onyedika Umeh',
    doctorRole: DOCTOR_ROLE['Dr. Onyedika Umeh'] as string,
    taskType: 'Catheter Care',
    taskDetail: 'Foley catheter care',
    dueTime: atOffset(0, 10, 30),
    dueLabel: '2 hrs left',
    overdue: false,
    priority: 'Low',
    status: 'Pending',
  },
  {
    id: 'q-008',
    patientName: 'Aminu Ojo',
    initials: 'AO',
    avatarBg: '#F59E0B',
    mrn: 'MRN-2026-01902',
    ward: 'Male Ward',
    bed: 'Bed 6',
    doctorName: 'Dr. Chika Nnamdi',
    doctorRole: DOCTOR_ROLE['Dr. Chika Nnamdi'] as string,
    taskType: 'Vitals Due',
    taskDetail: 'Vitals Monitoring',
    dueTime: atOffset(0, 11, 0),
    dueLabel: '2 hrs 30 min left',
    overdue: false,
    priority: 'Medium',
    status: 'Pending',
  },
];

const GEN_FIRST_NAMES = [
  'Ngozi',
  'Peter',
  'Blessing',
  'Kelechi',
  'Halima',
  'Ikenna',
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
  'Umeh',
  'Bello',
];
const GEN_TASK_TYPES: TaskType[] = [
  'Medication Due',
  'Vitals Due',
  'Dressing Change',
  'Observation',
  'Admission Assessment',
  'IV Review',
];
const GEN_TASK_DETAIL: Record<TaskType, string> = {
  'Medication Due': 'Amoxicillin 500mg (PO)',
  'Vitals Due': 'Vitals Monitoring',
  'Dressing Change': 'Wound dressing check',
  Observation: 'Routine observation',
  'Admission Assessment': 'Initial nursing assessment',
  'IV Review': 'IV line patency check',
  'Catheter Care': 'Catheter site care',
};
const GEN_PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];
const GEN_WARDS = ['Female Ward', 'Male Ward'];
const GEN_BEDS = ['Bed 1', 'Bed 4', 'Bed 7', 'Bed 9', 'Bed 10', 'Bed 11'];
const GEN_DOCTORS = DOCTOR_OPTIONS.map((d) => d.value);
const GEN_AVATAR_BG = ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#00B4D8', '#EC4899'];

const GENERATED_TASKS: QueueTask[] = Array.from({ length: 6 }, (_, idx) => {
  const i = idx + 9; // q-009 onward
  const firstName = GEN_FIRST_NAMES[i % GEN_FIRST_NAMES.length] as string;
  const lastName = GEN_LAST_NAMES[(i * 3) % GEN_LAST_NAMES.length] as string;
  const taskType = GEN_TASK_TYPES[i % GEN_TASK_TYPES.length] as TaskType;
  const hour = 11 + (i % 6);
  const minute = (i * 11) % 60;
  return {
    id: `q-${String(i).padStart(3, '0')}`,
    patientName: `${firstName} ${lastName}`,
    initials: `${firstName[0]}${lastName[0]}`,
    avatarBg: GEN_AVATAR_BG[i % GEN_AVATAR_BG.length] as string,
    mrn: `MRN-${2023 + (i % 4)}-${String(100 + i * 7).padStart(5, '0')}`,
    ward: GEN_WARDS[i % GEN_WARDS.length] as string,
    bed: GEN_BEDS[i % GEN_BEDS.length] as string,
    doctorName: GEN_DOCTORS[i % GEN_DOCTORS.length] as string,
    doctorRole: DOCTOR_ROLE[GEN_DOCTORS[i % GEN_DOCTORS.length] as string] as string,
    taskType,
    taskDetail: GEN_TASK_DETAIL[taskType],
    dueTime: atOffset(0, hour, minute),
    dueLabel: `${3 + (i % 3)} hrs left`,
    overdue: false,
    priority: GEN_PRIORITIES[i % GEN_PRIORITIES.length] as TaskPriority,
    status: 'Pending',
  };
});

export const QUEUE_TASKS: QueueTask[] = [...CURATED_TASKS, ...GENERATED_TASKS];

export const QUEUE_STATS: QueueStat[] = [
  {
    id: 'total-queue',
    label: 'Total in Queue',
    value: String(QUEUE_TASKS.length),
    subLabel: 'Nursing tasks pending',
    icon: Users,
    color: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'overdue',
    label: 'Overdue Tasks',
    value: String(QUEUE_TASKS.filter((t) => t.overdue).length),
    subLabel: 'Require immediate attention',
    direction: 'up',
    goodDirection: 'down',
    icon: Clock,
    color: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'due-soon',
    label: 'Due Within 30 Min',
    value: '5',
    subLabel: 'Upcoming tasks',
    icon: ClipboardList,
    color: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
  },
  {
    id: 'completed-today',
    label: 'Completed Today',
    value: '28',
    subLabel: 'Tasks completed',
    icon: ClipboardCheck,
    color: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 'my-patients',
    label: 'Patients Under My Care',
    value: '18',
    subLabel: 'Currently assigned',
    icon: BedDouble,
    color: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
  },
];
