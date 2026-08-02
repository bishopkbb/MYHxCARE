'use client';

/**
 * Dispensing Audit Trail — real, shared, reactive state
 * (`useSyncExternalStore`, same pattern as `adrReportStore.ts`). Bridged live
 * to `pharmacyDispensingStore.ts`: on module init it subscribes to that
 * store's writes, so a real dispense a pharmacist completes on Dispense
 * Medication / Prescription Queue / Prescription Details mid-session appears
 * here as a new "Dispense" audit row immediately — not a separate, isolated
 * mock log. Swap out by pointing these actions at a real
 * `GET /pharmacy/audit-trail` (append-only) endpoint in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import {
  AUDIT_TRAIL_EVENTS,
  DISPENSING_ACTIVITY_SEED,
  type AuditTrailEvent,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  getRecentDispensingActivitySnapshot,
  subscribe as subscribeToDispensing,
} from '@/features/pharmacy/store/pharmacyDispensingStore';

let events: AuditTrailEvent[] = [...AUDIT_TRAIL_EVENTS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AuditTrailEvent[] {
  return events;
}
function getServerSnapshot(): AuditTrailEvent[] {
  return AUDIT_TRAIL_EVENTS;
}

export function useAuditTrailEvents(): AuditTrailEvent[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

let seq = AUDIT_TRAIL_EVENTS.length;

function nextEventId(): string {
  seq += 1;
  return `evt-${String(seq).padStart(6, '0')}`;
}

// ── Settings — real, shared state (checklist §16), not local component
// state that resets on navigation ──────────────────────────────────────────

export type AuditTrailSettings = {
  logAccessEvents: boolean;
  requireVoidDeleteReason: boolean;
  autoExportMonthly: boolean;
};

let settings: AuditTrailSettings = {
  logAccessEvents: true,
  requireVoidDeleteReason: true,
  autoExportMonthly: false,
};

function settingsGetSnapshot(): AuditTrailSettings {
  return settings;
}

export function useAuditTrailSettings(): AuditTrailSettings {
  return useSyncExternalStore(subscribe, settingsGetSnapshot, settingsGetSnapshot);
}

export function updateAuditTrailSettings(patch: Partial<AuditTrailSettings>): void {
  settings = { ...settings, ...patch };
  emit();
}

// ── Live bridge to pharmacyDispensingStore.ts ───────────────────────────────

// Primed with the OTHER store's own static seed IDs, not its live snapshot —
// `pharmacyDispensingStore.ts` (and its verifyAndDispense() writes) can
// happen on any pharmacy page, most of which load before a user ever visits
// this audit trail page for the first time in a session. Priming from the
// live snapshot would wrongly treat those pre-visit dispenses as "already
// accounted for" even though they were never added to `events`. Mirrors the
// same lesson already applied in pharmacyDispensingStore.ts's own bridge to
// prescriptionStore.ts.
const ingestedActivityIds = new Set<string>(DISPENSING_ACTIVITY_SEED.map((a) => a.id));

function ingestNewDispensingActivity() {
  const activity = getRecentDispensingActivitySnapshot();
  const newRows: AuditTrailEvent[] = [];
  for (const a of activity) {
    if (ingestedActivityIds.has(a.id)) continue;
    ingestedActivityIds.add(a.id);
    const patient = getPatientDetail(a.patientId);
    newRows.push({
      id: nextEventId(),
      timestamp: a.dispensedAt,
      userName: a.dispensedBy ?? 'Pharmacist',
      userRole: 'Pharmacist',
      ipAddress: '192.168.1.45',
      action: 'Dispense',
      outcome: 'Success',
      patientId: a.patientId,
      patientName: patient.name,
      mrn: patient.mrn,
      medicationName: `${a.medicationName} ${a.dose}`,
      details: `Dispensed ${a.qty} ${a.unit.toLowerCase()}${a.qty === 1 ? '' : 's'} | Rx ${a.rxNo} | Qty: ${a.qty}`,
      module: 'Dispensing',
    });
  }
  if (newRows.length > 0) {
    events = [...newRows, ...events];
    emit();
  }
}

// Run once immediately (catches a dispense that already happened before this
// module ever loaded), then on every future write.
ingestNewDispensingActivity();
subscribeToDispensing(ingestNewDispensingActivity);
