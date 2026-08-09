'use client';

/**
 * The Equipment Management store — real, shared, reactive state for lab
 * equipment plus its service/maintenance events, downtime log, and error
 * log. Same `useSyncExternalStore` module-singleton pattern as `qcStore.ts`:
 * adding equipment or logging a service/maintenance event is immediately
 * visible everywhere else that reads this store in the same session —
 * including the Laboratory Dashboard's "Active Equipment" stat card, which
 * reads `getEquipmentSummary()` instead of the old static `EQUIPMENT_STATUS`
 * placeholder in `labDashboardFixtures.ts`.
 *
 * Swap out by pointing these actions at real `POST /lab/equipment` /
 * `POST /lab/equipment/service-events` endpoints once that domain exists on
 * the backend.
 */

import { useSyncExternalStore } from 'react';

import {
  DOWNTIME_LOGS,
  EQUIPMENT_RECORDS,
  ERROR_LOGS,
  SERVICE_EVENTS,
  getCalibrationState,
  type DowntimeLog,
  type EquipmentRecord,
  type EquipmentStatus,
  type EquipmentType,
  type ErrorLog,
  type ServiceEvent,
  type ServiceEventStatus,
  type ServiceEventType,
} from '@/features/laboratory/__mocks__/equipmentFixtures';

let equipment: EquipmentRecord[] = [...EQUIPMENT_RECORDS];
let serviceEvents: ServiceEvent[] = [...SERVICE_EVENTS];
const downtimeLogs: DowntimeLog[] = [...DOWNTIME_LOGS];
const errorLogs: ErrorLog[] = [...ERROR_LOGS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getEquipmentSnapshot(): EquipmentRecord[] {
  return equipment;
}
function getEquipmentServerSnapshot(): EquipmentRecord[] {
  return EQUIPMENT_RECORDS;
}
export function useEquipment(): EquipmentRecord[] {
  return useSyncExternalStore(subscribe, getEquipmentSnapshot, getEquipmentServerSnapshot);
}

function getServiceEventsSnapshot(): ServiceEvent[] {
  return serviceEvents;
}
function getServiceEventsServerSnapshot(): ServiceEvent[] {
  return SERVICE_EVENTS;
}
export function useServiceEvents(): ServiceEvent[] {
  return useSyncExternalStore(subscribe, getServiceEventsSnapshot, getServiceEventsServerSnapshot);
}

function getDowntimeLogsSnapshot(): DowntimeLog[] {
  return downtimeLogs;
}
function getDowntimeLogsServerSnapshot(): DowntimeLog[] {
  return DOWNTIME_LOGS;
}
export function useDowntimeLogs(): DowntimeLog[] {
  return useSyncExternalStore(subscribe, getDowntimeLogsSnapshot, getDowntimeLogsServerSnapshot);
}

function getErrorLogsSnapshot(): ErrorLog[] {
  return errorLogs;
}
function getErrorLogsServerSnapshot(): ErrorLog[] {
  return ERROR_LOGS;
}
export function useErrorLogs(): ErrorLog[] {
  return useSyncExternalStore(subscribe, getErrorLogsSnapshot, getErrorLogsServerSnapshot);
}

export function getEquipmentById(id: string): EquipmentRecord | undefined {
  return equipment.find((e) => e.id === id);
}

// ── Write actions ────────────────────────────────────────────────────────

const ID_PREFIX: Record<string, string> = {
  'Chemical Pathology': 'CHM',
  Hematology: 'HMT',
  Immunology: 'IMM',
  Microbiology: 'MIC',
  'Molecular Lab': 'MOL',
  'Blood Bank': 'BLB',
  Biochemistry: 'BIO',
  'Emergency Lab': 'EMG',
};

function nextEquipmentId(department: string): string {
  const prefix = ID_PREFIX[department] ?? 'EQP';
  const existing = equipment.filter((e) => e.id.startsWith(`EQP-${prefix}-`)).length;
  return `EQP-${prefix}-${String(existing + 1).padStart(3, '0')}`;
}

export type NewEquipmentInput = {
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
};

export function addEquipment(input: NewEquipmentInput): EquipmentRecord {
  const record: EquipmentRecord = {
    ...input,
    id: nextEquipmentId(input.department),
    lastCalibrationAt: null,
    nextCalibrationAt: null,
  };
  equipment = [record, ...equipment];
  emit();
  return record;
}

export type NewServiceEventInput = {
  equipmentId: string;
  type: ServiceEventType;
  status: ServiceEventStatus;
  date: string;
  performedBy: string;
  notes: string;
};

let serviceSeq = serviceEvents.length;

/** Logs a service/maintenance event. "Completed" entries appear in Service
 * History; "Scheduled" entries appear in the Maintenance tab. A completed
 * Calibration event also updates the equipment's own last/next calibration
 * dates, keeping the Calibration tab and stat cards in sync automatically. */
export function logServiceEvent(input: NewServiceEventInput): ServiceEvent {
  serviceSeq += 1;
  const event: ServiceEvent = {
    id: `SVC-${String(serviceSeq).padStart(4, '0')}`,
    ...input,
  };
  serviceEvents = [event, ...serviceEvents];

  if (input.status === 'Completed' && input.type === 'Calibration') {
    const record = equipment.find((e) => e.id === input.equipmentId);
    if (record) {
      const next = new Date(input.date);
      next.setDate(next.getDate() + record.calibrationIntervalDays);
      equipment = equipment.map((e) =>
        e.id === input.equipmentId
          ? { ...e, lastCalibrationAt: input.date, nextCalibrationAt: next.toISOString() }
          : e,
      );
    }
  }

  emit();
  return event;
}

export function updateEquipmentStatus(id: string, status: EquipmentStatus): void {
  equipment = equipment.map((e) => (e.id === id ? { ...e, status } : e));
  emit();
}

// ── Derived selectors ────────────────────────────────────────────────────

export type EquipmentSummary = {
  total: number;
  inUse: number;
  underMaintenance: number;
  outOfService: number;
  available: number;
  dueForCalibration: number;
  overdue: number;
};

/** Live replacement for the Dashboard's static `EQUIPMENT_STATUS` summary —
 * every count is derived from this one equipment array. */
export function getEquipmentSummary(): EquipmentSummary {
  const inUse = equipment.filter((e) => e.status === 'In Use').length;
  const underMaintenance = equipment.filter((e) => e.status === 'Under Maintenance').length;
  const outOfService = equipment.filter((e) => e.status === 'Out of Service').length;
  const available = equipment.filter((e) => e.status === 'Available').length;
  const dueForCalibration = equipment.filter((e) => getCalibrationState(e) === 'Due').length;
  const overdue = equipment.filter((e) => getCalibrationState(e) === 'Overdue').length;
  return {
    total: equipment.length,
    inUse,
    underMaintenance,
    outOfService,
    available,
    dueForCalibration,
    overdue,
  };
}

export function getServiceEventsFor(equipmentId: string): ServiceEvent[] {
  return serviceEvents.filter((s) => s.equipmentId === equipmentId);
}

export function getDowntimeLogsFor(equipmentId: string): DowntimeLog[] {
  return downtimeLogs.filter((d) => d.equipmentId === equipmentId);
}

export function getErrorLogsFor(equipmentId: string): ErrorLog[] {
  return errorLogs.filter((e) => e.equipmentId === equipmentId);
}
