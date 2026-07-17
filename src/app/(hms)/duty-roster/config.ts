import type { ShiftStatus, ShiftType } from '@/features/workforce/__mocks__/workforceFixtures';

// Shared between the roster table (page.tsx) and the shift modals — kept
// here so both can import it without either owning the other's definitions.

export type ShiftTypeCfg = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

export type StatusCfg = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

export const SHIFT_TYPE_CFG: Record<ShiftType, ShiftTypeCfg> = {
  EMERGENCY: {
    label: 'EMERGENCY',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.06)',
  },
  NIGHT: {
    label: 'NIGHT',
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.35)',
    bg: 'rgba(139,92,246,0.06)',
  },
  ON_CALL: {
    label: 'ON CALL',
    color: '#EC4899',
    border: 'rgba(236,72,153,0.35)',
    bg: 'rgba(236,72,153,0.06)',
  },
  MORNING: {
    label: 'MORNING',
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.35)',
    bg: 'rgba(59,130,246,0.06)',
  },
  AFTERNOON: {
    label: 'AFTERNOON',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.06)',
  },
};

export const STATUS_CFG: Record<ShiftStatus, StatusCfg> = {
  ON_DUTY: {
    label: 'ON DUTY',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  SCHEDULED: {
    label: 'SCHEDULED',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  ON_CALL: {
    label: 'ON CALL',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
  COMPLETED: {
    label: 'COMPLETED',
    color: '#6B7280',
    border: 'rgba(107,114,128,0.40)',
    bg: 'transparent',
  },
};

export const SHIFT_TYPE_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'ON_CALL', label: 'On Call' },
];

export const STATUS_OPTIONS: { value: ShiftStatus; label: string }[] = [
  { value: 'ON_DUTY', label: 'On Duty' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ON_CALL', label: 'On Call' },
  { value: 'COMPLETED', label: 'Completed' },
];

export const WARD_OPTIONS = [
  'General OPD',
  'Emergency',
  'Family Clinic',
  'Surgical Ward',
  'Cardiology Clinic',
  'Radiology',
  'Psychiatry Unit',
  'Maternity Ward',
  'Paediatric Ward',
];
