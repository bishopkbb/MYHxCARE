/**
 * Fixtures for the ADR Report screen.
 *
 * Same live-snapshot convention as Inventory/Expiry/Procurement Report —
 * reads adrReportStore.ts's real reports (the same 128-report seed plus
 * anything filed this session) through the same ADR_SEVERITY_COLOR /
 * ADR_CAUSALITY_COLOR / ADR_STATUS_COLOR maps Adverse Drug Reactions
 * already uses, rather than inventing a parallel dataset or palette. Only
 * each stat card's "vs May 2026" delta is decorative narrative.
 */

import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Pill, Send } from 'lucide-react';

export type ReportStatInfo = { percent: number; direction: 'up' | 'down'; comparedTo: string };

export type ReportStatMeta = {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  info: ReportStatInfo;
};

// Values are filled in live by the workspace (real counts from
// useADRReports()) — this only carries the icon/color/delta shell.
export const ADR_REPORT_STAT_META: ReportStatMeta[] = [
  {
    id: 'total-reports',
    label: 'Total ADR Reports',
    icon: ClipboardList,
    accent: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    info: { percent: 7.6, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'under-assessment',
    label: 'Under Assessment',
    icon: Clock,
    accent: '#D97706',
    iconBg: 'rgba(217,119,6,0.12)',
    info: { percent: 4.3, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'resolved',
    label: 'Resolved',
    icon: CheckCircle2,
    accent: '#16A34A',
    iconBg: 'rgba(22,163,74,0.12)',
    info: { percent: 9.2, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'reported-npc',
    label: 'Reported to NPC',
    icon: Send,
    accent: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.12)',
    info: { percent: 5.8, direction: 'up', comparedTo: 'May 2026' },
  },
  {
    id: 'serious',
    label: 'Serious Reactions (Severe)',
    icon: AlertTriangle,
    accent: '#DC2626',
    iconBg: 'rgba(220,38,38,0.12)',
    info: { percent: 2.1, direction: 'down', comparedTo: 'May 2026' },
  },
  {
    id: 'unique-drugs',
    label: 'Unique Suspected Drugs',
    icon: Pill,
    accent: '#EC4899',
    iconBg: 'rgba(236,72,153,0.12)',
    info: { percent: 6.4, direction: 'up', comparedTo: 'May 2026' },
  },
];
