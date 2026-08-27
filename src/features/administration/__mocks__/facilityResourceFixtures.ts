/**
 * Mock fixtures for Facility & Resource Overview (`/admin/facilities`).
 *
 * Two resource domains genuinely have a real reactive store scoped to match
 * what the mockup asks for, and are deliberately NOT seeded here: Laboratory
 * Resources and the top Equipment Status card both read
 * `getEquipmentSummary()` / `useEquipment()` from
 * `src/features/laboratory/store/equipmentStore.ts` (28 real records), and
 * Pharmacy & Supplies reads `useInventoryBatches()` +
 * `getInventoryRowStatus()` from `src/features/pharmacy/store/
 * inventoryStore.ts`, computed live in the workspace component. Their
 * on-screen counts genuinely differ from the mockup's own numbers (28, not
 * 124) because they're real, not because of an error, real live data wins
 * over exact mockup-digit matching per this session's standing convention.
 *
 * Everything in this file has no real backing anywhere in the codebase,
 * confirmed by research: Bed Occupancy (the one real bed store is scoped to
 * two Nursing wards, not hospital capacity), Rooms (no room-inventory model
 * exists at all), Facility Capacity (no such aggregate concept exists), the
 * "Medical Equipment" category (hospital-wide across every department,
 * which nothing aggregates, lab's real 28 records are Laboratory Resources'
 * job specifically, not this card's), Utilities & Infrastructure / IT &
 * Connectivity / Safety & Security (nothing in the codebase models
 * generators, network uptime, or fire-safety equipment), Resource Alerts,
 * and Recent Maintenance (its field names echo the real `ServiceEvent`
 * type/notes/date vocabulary from `equipmentFixtures.ts` for realism, but
 * its rows are hospital-wide illustrative, not sourced from the lab-only
 * store). Swap out by pointing hooks to real facilities/utilities/security
 * endpoints in Phase 6.
 */

import {
  Beaker,
  BedDouble,
  DoorOpen,
  FlaskConical,
  Gauge,
  Pill,
  ShieldCheck,
  Wifi,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FacilityOverviewCard = {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  percent: number;
  percentLabel: string;
  rows: { label: string; value: string }[];
  detailsLabel: string;
  detailsRoute: string;
};

export const FACILITY_OVERVIEW: FacilityOverviewCard[] = [
  {
    id: 'fac-beds',
    icon: BedDouble,
    iconColor: '#2563EB',
    iconBg: 'rgba(37,99,235,0.1)',
    title: 'Bed Occupancy',
    percent: 72,
    percentLabel: 'Occupied',
    rows: [
      { label: 'Occupied Beds', value: '86' },
      { label: 'Available Beds', value: '34' },
      { label: 'Total Beds', value: '120' },
    ],
    detailsLabel: 'View Ward Details',
    detailsRoute: '/nurse/ward-census',
  },
  {
    id: 'fac-rooms',
    icon: DoorOpen,
    iconColor: '#16A34A',
    iconBg: 'rgba(22,163,74,0.1)',
    title: 'Rooms',
    percent: 85,
    percentLabel: 'Utilization',
    rows: [
      { label: 'In Use', value: '34' },
      { label: 'Available', value: '6' },
      { label: 'Total Rooms', value: '40' },
    ],
    detailsLabel: 'View Room Details',
    detailsRoute: '/admin/facilities',
  },
  {
    id: 'fac-capacity',
    icon: Gauge,
    iconColor: '#D97706',
    iconBg: 'rgba(217,119,6,0.1)',
    title: 'Facility Capacity',
    percent: 68,
    percentLabel: 'Utilized',
    rows: [
      { label: 'Utilized Capacity', value: '68%' },
      { label: 'Available Capacity', value: '32%' },
      { label: 'Total Capacity', value: '100%' },
    ],
    detailsLabel: 'View Capacity Details',
    detailsRoute: '/admin/facilities',
  },
];

export type ResourceCategory = {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  total: number;
  totalLabel: string;
  rows: { label: string; value: number; percent: number; color: string }[];
  detailsRoute: string;
};

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: 'res-medical-equipment',
    icon: FlaskConical,
    iconColor: '#2563EB',
    iconBg: 'rgba(37,99,235,0.1)',
    title: 'Medical Equipment',
    total: 128,
    totalLabel: 'Total Equipment',
    rows: [
      { label: 'Operational', value: 110, percent: 86, color: '#16A34A' },
      { label: 'Maintenance', value: 12, percent: 9, color: '#D97706' },
      { label: 'Out of Service', value: 6, percent: 5, color: '#DC2626' },
    ],
    detailsRoute: '/laboratory/equipment-management',
  },
  {
    id: 'res-utilities',
    icon: Zap,
    iconColor: '#D97706',
    iconBg: 'rgba(217,119,6,0.1)',
    title: 'Utilities & Infrastructure',
    total: 12,
    totalLabel: 'Systems Monitored',
    rows: [
      { label: 'Operational', value: 11, percent: 92, color: '#16A34A' },
      { label: 'Partial Issue', value: 1, percent: 8, color: '#D97706' },
      { label: 'Down', value: 0, percent: 0, color: '#DC2626' },
    ],
    detailsRoute: '/admin/facilities',
  },
  {
    id: 'res-it',
    icon: Wifi,
    iconColor: '#2563EB',
    iconBg: 'rgba(37,99,235,0.1)',
    title: 'IT & Connectivity',
    total: 15,
    totalLabel: 'Systems Monitored',
    rows: [
      { label: 'Operational', value: 13, percent: 87, color: '#16A34A' },
      { label: 'Partial Issue', value: 2, percent: 13, color: '#D97706' },
      { label: 'Down', value: 0, percent: 0, color: '#DC2626' },
    ],
    detailsRoute: '/admin/facilities',
  },
  {
    id: 'res-safety',
    icon: ShieldCheck,
    iconColor: '#16A34A',
    iconBg: 'rgba(22,163,74,0.1)',
    title: 'Safety & Security',
    total: 18,
    totalLabel: 'Systems Monitored',
    rows: [
      { label: 'Operational', value: 17, percent: 94, color: '#16A34A' },
      { label: 'Requires Attention', value: 1, percent: 6, color: '#D97706' },
      { label: 'Down', value: 0, percent: 0, color: '#DC2626' },
    ],
    detailsRoute: '/admin/facilities',
  },
];

export const PHARMACY_ICON = Pill;
export const LABORATORY_ICON = Beaker;

export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Info';

export type ResourceAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  department: string;
  detail: string;
  timeLabel: string;
};

export const SEVERITY_COLOR: Record<AlertSeverity, { color: string; bg: string }> = {
  Critical: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  High: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Medium: { color: '#CA8A04', bg: 'rgba(202,138,4,0.1)' },
  Info: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
};

export const RESOURCE_ALERTS: ResourceAlert[] = [
  {
    id: 'ra-1',
    severity: 'Critical',
    title: 'Backup Generator (Main)',
    department: 'Emergency Unit',
    detail: 'Maintenance required',
    timeLabel: '10 min ago',
  },
  {
    id: 'ra-2',
    severity: 'High',
    title: 'X-Ray Machine',
    department: 'Radiology',
    detail: 'Calibration due',
    timeLabel: '25 min ago',
  },
  {
    id: 'ra-3',
    severity: 'High',
    title: 'Ventilator - VENT-02',
    department: 'ICU',
    detail: 'Service due in 3 days',
    timeLabel: '1 hr ago',
  },
  {
    id: 'ra-4',
    severity: 'Medium',
    title: 'Lab Refrigerator (2)',
    department: 'Laboratory',
    detail: 'Temperature fluctuation',
    timeLabel: '2 hrs ago',
  },
  {
    id: 'ra-5',
    severity: 'Info',
    title: 'Fire Extinguisher (Ward A)',
    department: 'Nursing / Wards',
    detail: 'Inspection due next week',
    timeLabel: '5 hrs ago',
  },
];

export type MaintenanceEntry = {
  id: string;
  title: string;
  detail: string;
  dateLabel: string;
};

export const RECENT_MAINTENANCE: MaintenanceEntry[] = [
  {
    id: 'rm-1',
    title: 'ECG Machine - ECG-03',
    detail: 'Preventive maintenance completed',
    dateLabel: 'Aug 20, 2026 09:45 AM',
  },
  {
    id: 'rm-2',
    title: 'Air Conditioner (Pharmacy)',
    detail: 'Filter replacement completed',
    dateLabel: 'Aug 20, 2026 08:30 AM',
  },
  {
    id: 'rm-3',
    title: 'Autoclave - AUTO-01',
    detail: 'Calibration completed',
    dateLabel: 'Aug 19, 2026 02:15 PM',
  },
  {
    id: 'rm-4',
    title: 'UPS System (Server Room)',
    detail: 'Battery backup tested',
    dateLabel: 'Aug 19, 2026 11:20 AM',
  },
  {
    id: 'rm-5',
    title: 'Water Pump (Main)',
    detail: 'Routine inspection completed',
    dateLabel: 'Aug 18, 2026 04:00 PM',
  },
];
