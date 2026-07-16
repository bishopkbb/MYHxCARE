import { FlaskConical, Pill, Share2, Stethoscope, type LucideIcon } from 'lucide-react';

import type {
  RecordStatus,
  RecordType,
} from '@/features/medical-records/__mocks__/medicalRecordFixtures';
import { MOCK_PATIENTS } from '@/features/patients/__mocks__/patientFixtures';

// Shared between the record list (page.tsx) and the drill-down modal — kept
// here so both can import it without either owning the other's definitions.

export type RecordTypeCfg = {
  label: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
};

export type StatusCfg = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

export const RECORD_TYPE_CFG: Record<RecordType, RecordTypeCfg> = {
  consultation: {
    label: 'CONSULTATION',
    icon: Stethoscope,
    iconBg: 'rgba(0,180,216,0.12)',
    iconColor: '#00B4D8',
    badgeColor: '#00B4D8',
    badgeBorder: 'rgba(0,180,216,0.30)',
    badgeBg: 'rgba(0,180,216,0.06)',
  },
  laboratory: {
    label: 'LABORATORY',
    icon: FlaskConical,
    iconBg: 'rgba(59,130,246,0.12)',
    iconColor: '#3B82F6',
    badgeColor: '#3B82F6',
    badgeBorder: 'rgba(59,130,246,0.30)',
    badgeBg: 'rgba(59,130,246,0.06)',
  },
  prescription: {
    label: 'PRESCRIPTION',
    icon: Pill,
    iconBg: 'rgba(139,92,246,0.12)',
    iconColor: '#8B5CF6',
    badgeColor: '#8B5CF6',
    badgeBorder: 'rgba(139,92,246,0.30)',
    badgeBg: 'rgba(139,92,246,0.06)',
  },
  referral: {
    label: 'REFERRAL',
    icon: Share2,
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#F59E0B',
    badgeColor: '#F59E0B',
    badgeBorder: 'rgba(245,158,11,0.30)',
    badgeBg: 'rgba(245,158,11,0.06)',
  },
};

export const STATUS_CFG: Record<RecordStatus, StatusCfg> = {
  active: { label: 'Active', color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
  critical: {
    label: 'Critical',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
  completed: {
    label: 'Completed',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  dispensed: {
    label: 'Dispensed',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  accepted: {
    label: 'Accepted',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  verified: {
    label: 'Verified',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  'in-progress': {
    label: 'In Progress',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.40)',
    bg: 'rgba(245,158,11,0.06)',
  },
  emergency: {
    label: 'Emergency',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
};

// MRN → patient page ID, built from the shared patients fixture
export const MRN_TO_PATIENT_ID: Record<string, string> = Object.fromEntries(
  MOCK_PATIENTS.map((p) => [p.mrn, p.id]),
);
