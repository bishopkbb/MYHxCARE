'use client';

/**
 * The Procurement Requests store — the one canonical "we need to buy this"
 * pipeline for the Laboratory module. Same `useSyncExternalStore`
 * module-singleton pattern as `inventoryStore.ts`/`equipmentStore.ts`.
 * Laboratory Inventory's Stock Alerts "Create Reorder Request" writes here
 * too (via `createProcurementRequest`) — a quick reorder and a formal
 * multi-item request are the same underlying record, not two disconnected
 * "please buy this" systems.
 *
 * Swap out by pointing these actions at real `POST /lab/procurement-requests`
 * endpoints once that domain exists on the backend.
 */

import { useSyncExternalStore } from 'react';

import {
  APPROVAL_ROLES,
  PROCUREMENT_REQUESTS,
  type ApprovalStep,
  type ProcurementLineItem,
  type ProcurementOrigin,
  type ProcurementPriority,
  type ProcurementRequest,
  type ProcurementStatus,
} from '@/features/laboratory/__mocks__/procurementFixtures';

let requests: ProcurementRequest[] = [...PROCUREMENT_REQUESTS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getRequestsSnapshot(): ProcurementRequest[] {
  return requests;
}
function getRequestsServerSnapshot(): ProcurementRequest[] {
  return PROCUREMENT_REQUESTS;
}
export function useProcurementRequests(): ProcurementRequest[] {
  return useSyncExternalStore(subscribe, getRequestsSnapshot, getRequestsServerSnapshot);
}

export function getProcurementRequestById(id: string): ProcurementRequest | undefined {
  return requests.find((r) => r.id === id);
}

// ── Write actions ────────────────────────────────────────────────────────

let seqCounter = requests.length;
function nextId(): string {
  seqCounter += 1;
  const now = new Date();
  return `PR-${now.getFullYear()}-${String(seqCounter).padStart(5, '0')}`;
}

function freshApprovalSteps(): ApprovalStep[] {
  return APPROVAL_ROLES.map((role) => ({ role, status: 'Pending' as const }));
}

export type NewProcurementRequestInput = {
  department: string;
  requestedBy: string;
  priority: ProcurementPriority;
  lineItems: Omit<ProcurementLineItem, 'id'>[];
  estimatedAmount: number;
  notes: string;
  origin?: ProcurementOrigin;
};

export function createProcurementRequest(input: NewProcurementRequestInput): ProcurementRequest {
  const request: ProcurementRequest = {
    id: nextId(),
    requestDate: new Date().toISOString(),
    department: input.department,
    requestedBy: input.requestedBy,
    priority: input.priority,
    lineItems: input.lineItems.map((li, i) => ({ ...li, id: `li-${i + 1}` })),
    estimatedAmount: input.estimatedAmount,
    status: 'Pending Approval',
    lastUpdated: new Date().toISOString(),
    estimatedDeliveryDate: null,
    approvalSteps: freshApprovalSteps(),
    origin: input.origin ?? 'Manual',
    notes: input.notes,
  };
  requests = [request, ...requests];
  emit();
  return request;
}

/** Approves the next Pending step in the workflow. Approving the final step
 * (Procurement Officer) advances the whole request to Approved. */
export function approveNextStep(requestId: string, actorName: string): void {
  const request = requests.find((r) => r.id === requestId);
  if (!request || request.status !== 'Pending Approval') return;
  const nextIdx = request.approvalSteps.findIndex((s) => s.status === 'Pending');
  if (nextIdx === -1) return;
  const now = new Date().toISOString();
  const updatedSteps = request.approvalSteps.map((s, i) =>
    i === nextIdx ? { ...s, status: 'Approved' as const, actor: actorName, at: now } : s,
  );
  const isLastStep = nextIdx === updatedSteps.length - 1;
  requests = requests.map((r) =>
    r.id === requestId
      ? {
          ...r,
          approvalSteps: updatedSteps,
          status: isLastStep ? 'Approved' : r.status,
          lastUpdated: now,
        }
      : r,
  );
  emit();
}

export function rejectRequest(requestId: string, actorName: string, reason: string): void {
  const request = requests.find((r) => r.id === requestId);
  if (!request || request.status !== 'Pending Approval') return;
  const now = new Date().toISOString();
  const nextIdx = request.approvalSteps.findIndex((s) => s.status === 'Pending');
  const updatedSteps = request.approvalSteps.map((s, i) =>
    i === nextIdx ? { ...s, status: 'Rejected' as const, actor: actorName, at: now } : s,
  );
  requests = requests.map((r) =>
    r.id === requestId
      ? {
          ...r,
          approvalSteps: updatedSteps,
          status: 'Rejected',
          lastUpdated: now,
          notes: reason || r.notes,
        }
      : r,
  );
  emit();
}

export function cancelRequest(requestId: string, actorName: string): void {
  const now = new Date().toISOString();
  requests = requests.map((r) =>
    r.id === requestId
      ? {
          ...r,
          status: 'Cancelled',
          lastUpdated: now,
          approvalSteps: r.approvalSteps.map((s) =>
            s.status === 'Pending' ? { ...s, status: 'Skipped' as const } : s,
          ),
          notes: r.notes || `Cancelled by ${actorName}.`,
        }
      : r,
  );
  emit();
}

/** Advances an already-Approved request through In Procurement → Received —
 * a simple linear progression, unlike the per-role approval workflow. */
export function advanceStatus(requestId: string, nextStatus: ProcurementStatus): void {
  requests = requests.map((r) =>
    r.id === requestId ? { ...r, status: nextStatus, lastUpdated: new Date().toISOString() } : r,
  );
  emit();
}

// ── Derived selectors ────────────────────────────────────────────────────

export type ProcurementSummary = {
  total: number;
  approved: number;
  pendingApproval: number;
  inProcurement: number;
  received: number;
  rejectedCancelled: number;
};

export function getProcurementSummary(): ProcurementSummary {
  const count = (status: ProcurementStatus) => requests.filter((r) => r.status === status).length;
  return {
    total: requests.length,
    approved: count('Approved'),
    pendingApproval: count('Pending Approval'),
    inProcurement: count('In Procurement'),
    received: count('Received'),
    rejectedCancelled: count('Rejected') + count('Cancelled'),
  };
}
