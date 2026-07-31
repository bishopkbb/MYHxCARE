'use client';

/**
 * Adverse Drug Reactions — real, shared, reactive state
 * (`useSyncExternalStore`, same pattern as `supplierStore.ts`). Reporting a
 * new ADR writes a real record here that immediately shows up in the ADR
 * Reports table, the severity donut, and the stat cards — not a dead-end
 * toast. Swap out by pointing these actions at real `POST /pharmacy/adr`
 * endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  ADR_REPORTS,
  type ADRCausality,
  type ADRDrugClass,
  type ADRReport,
  type ADRSeverity,
  type ADRStatus,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

let reports: ADRReport[] = [...ADR_REPORTS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ADRReport[] {
  return reports;
}
function getServerSnapshot(): ADRReport[] {
  return ADR_REPORTS;
}

export function useADRReports(): ADRReport[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getADRReport(id: string): ADRReport | null {
  return reports.find((r) => r.id === id) ?? null;
}

let seq = ADR_REPORTS.length;

function nextReportId(): string {
  seq += 1;
  return `ADR-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
}

export type CreateADRReportInput = {
  patientId: string;
  patientName: string;
  mrn: string;
  suspectedDrugs: string[];
  drugClass: ADRDrugClass;
  reaction: string;
  severity: ADRSeverity;
  causality: ADRCausality;
  onsetDate: string;
  actionTaken?: string;
  notes?: string;
};

/** A new report always starts Under Assessment — severity/causality are the
 * reporter's initial clinical judgement, not yet a closed determination. */
export function createADRReport(input: CreateADRReportInput, reportedBy: string): string {
  const id = nextReportId();
  const report: ADRReport = {
    id,
    patientId: input.patientId,
    patientName: input.patientName,
    mrn: input.mrn,
    suspectedDrugs: input.suspectedDrugs,
    drugClass: input.drugClass,
    reaction: input.reaction,
    severity: input.severity,
    causality: input.causality,
    status: 'Under Assessment',
    onsetDate: input.onsetDate,
    reportedAt: new Date().toISOString(),
    reportedBy,
    ...(input.actionTaken ? { actionTaken: input.actionTaken } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };
  reports = [report, ...reports];
  emit();
  return id;
}

export function updateADRStatus(id: string, status: ADRStatus): void {
  reports = reports.map((r) => (r.id === id ? { ...r, status } : r));
  emit();
}
