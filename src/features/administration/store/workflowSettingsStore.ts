'use client';

/**
 * Workflow Settings as live, shared state (`/admin/workflow-settings`).
 * Six slices sharing one listener set, same convention as
 * `servicePricingStore.ts`'s two-slice pattern extended further. Every edit
 * (stage reorder, toggle, rename, per-tab setting) commits immediately, the
 * same immediate-write convention as Roles & Permissions / Departments /
 * Service & Pricing — there is no separate hidden draft layer. `Save
 * Changes` in the header is an additional, real action: it stamps
 * `lastSavedAt`/`lastSavedBy`, which the header's own "Last Updated" stat
 * card displays, an explicit "mark configuration reviewed" checkpoint on
 * top of already-live state.
 *
 * Swap out by pointing hooks to a real workflow-configuration endpoint in
 * Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  WORKFLOW_DEFINITIONS,
  type DepartmentWorkflow,
  type StageRequirement,
  type WorkflowSettingsFlags,
} from '@/features/administration/__mocks__/workflowSettingsFixtures';
import {
  DEFAULT_APPOINTMENT_SETTINGS,
  DEFAULT_APPROVAL_WORKFLOW_TYPES,
  DEFAULT_ESCALATION_RULES,
  DEFAULT_NOTIFICATION_RULES,
  DEFAULT_QUEUE_SETTINGS,
  type AppointmentSettings,
  type ApprovalWorkflowType,
  type EscalationMinutes,
  type EscalationRule,
  type NotificationRule,
  type NotificationRuleId,
  type QueueSettings,
} from '@/features/administration/__mocks__/workflowOperationsFixtures';

type State = {
  workflows: DepartmentWorkflow[];
  queueSettings: QueueSettings;
  appointmentSettings: AppointmentSettings;
  notificationRules: NotificationRule[];
  escalationRules: EscalationRule[];
  approvalWorkflowTypes: ApprovalWorkflowType[];
  lastSaved: { lastSavedAt: string; lastSavedBy: string };
};

let state: State = {
  workflows: WORKFLOW_DEFINITIONS.map((w) => ({ ...w, stages: w.stages.map((s) => ({ ...s })) })),
  queueSettings: { ...DEFAULT_QUEUE_SETTINGS },
  appointmentSettings: { ...DEFAULT_APPOINTMENT_SETTINGS },
  notificationRules: DEFAULT_NOTIFICATION_RULES.map((r) => ({ ...r })),
  escalationRules: DEFAULT_ESCALATION_RULES.map((r) => ({ ...r })),
  approvalWorkflowTypes: DEFAULT_APPROVAL_WORKFLOW_TYPES.map((a) => ({ ...a })),
  lastSaved: { lastSavedAt: '2026-05-18T09:45:00+01:00', lastSavedBy: 'Admin User' },
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot(): State {
  return state;
}

function touchWorkflow(id: string, mutate: (w: DepartmentWorkflow) => DepartmentWorkflow): void {
  state = {
    ...state,
    workflows: state.workflows.map((w) =>
      w.id === id
        ? { ...mutate(w), updatedAt: new Date().toISOString(), updatedBy: 'Admin User' }
        : w,
    ),
  };
  emit();
}

// ─── Department Workflows ───────────────────────────────────────────────

export function useDepartmentWorkflows(): DepartmentWorkflow[] {
  return useSyncExternalStore(
    subscribe,
    () => state.workflows,
    () => getServerSnapshot().workflows,
  );
}

export function addWorkflow(workflow: DepartmentWorkflow): void {
  state = { ...state, workflows: [...state.workflows, workflow] };
  emit();
}

export function renameWorkflow(id: string, name: string): void {
  touchWorkflow(id, (w) => ({ ...w, name }));
}

export function setWorkflowStatus(id: string, status: DepartmentWorkflow['status']): void {
  touchWorkflow(id, (w) => ({ ...w, status }));
}

export function updateWorkflowSettings(id: string, partial: Partial<WorkflowSettingsFlags>): void {
  touchWorkflow(id, (w) => ({ ...w, settings: { ...w.settings, ...partial } }));
}

export function addStage(id: string, stage: DepartmentWorkflow['stages'][number]): void {
  touchWorkflow(id, (w) => ({
    ...w,
    stages: [...w.stages, { ...stage, order: w.stages.length + 1 }],
  }));
}

export function updateStage(
  workflowId: string,
  stageId: string,
  partial: Partial<{
    title: string;
    description: string;
    icon: DepartmentWorkflow['stages'][number]['icon'];
    requirement: StageRequirement;
    autoComplete: boolean;
  }>,
): void {
  touchWorkflow(workflowId, (w) => ({
    ...w,
    stages: w.stages.map((s) => (s.id === stageId ? { ...s, ...partial } : s)),
  }));
}

export function deleteStage(workflowId: string, stageId: string): void {
  touchWorkflow(workflowId, (w) => {
    if (w.stages.length <= 1) return w;
    const remaining = w.stages.filter((s) => s.id !== stageId);
    return { ...w, stages: remaining.map((s, i) => ({ ...s, order: i + 1 })) };
  });
}

export function duplicateStage(workflowId: string, stageId: string): void {
  touchWorkflow(workflowId, (w) => {
    const source = w.stages.find((s) => s.id === stageId);
    if (!source) return w;
    const copy = {
      ...source,
      id: `${source.id}-copy-${Date.now()}`,
      title: `${source.title} (Copy)`,
    };
    const index = w.stages.findIndex((s) => s.id === stageId);
    const stages = [...w.stages.slice(0, index + 1), copy, ...w.stages.slice(index + 1)];
    return { ...w, stages: stages.map((s, i) => ({ ...s, order: i + 1 })) };
  });
}

export function reorderStage(workflowId: string, stageId: string, direction: 'up' | 'down'): void {
  touchWorkflow(workflowId, (w) => {
    const index = w.stages.findIndex((s) => s.id === stageId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= w.stages.length) return w;
    const stages = [...w.stages];
    const [moved] = stages.splice(index, 1);
    if (!moved) return w;
    stages.splice(targetIndex, 0, moved);
    return { ...w, stages: stages.map((s, i) => ({ ...s, order: i + 1 })) };
  });
}

// ─── Queue Settings ──────────────────────────────────────────────────────

export function useQueueSettings(): QueueSettings {
  return useSyncExternalStore(
    subscribe,
    () => state.queueSettings,
    () => getServerSnapshot().queueSettings,
  );
}

export function updateQueueSettings(partial: Partial<QueueSettings>): void {
  state = { ...state, queueSettings: { ...state.queueSettings, ...partial } };
  emit();
}

// ─── Appointment Settings ────────────────────────────────────────────────

export function useAppointmentSettings(): AppointmentSettings {
  return useSyncExternalStore(
    subscribe,
    () => state.appointmentSettings,
    () => getServerSnapshot().appointmentSettings,
  );
}

export function updateAppointmentSettings(partial: Partial<AppointmentSettings>): void {
  state = { ...state, appointmentSettings: { ...state.appointmentSettings, ...partial } };
  emit();
}

// ─── Notification Rules ──────────────────────────────────────────────────

export function useNotificationRules(): NotificationRule[] {
  return useSyncExternalStore(
    subscribe,
    () => state.notificationRules,
    () => getServerSnapshot().notificationRules,
  );
}

export function updateNotificationRule(
  id: NotificationRuleId,
  partial: Partial<NotificationRule>,
): void {
  state = {
    ...state,
    notificationRules: state.notificationRules.map((r) => (r.id === id ? { ...r, ...partial } : r)),
  };
  emit();
}

// ─── Escalation Settings ─────────────────────────────────────────────────

export function useEscalationRules(): EscalationRule[] {
  return useSyncExternalStore(
    subscribe,
    () => state.escalationRules,
    () => getServerSnapshot().escalationRules,
  );
}

export function updateEscalationRule(
  id: string,
  partial: Partial<{ acknowledgmentRequired: boolean; escalateAfterMinutes: EscalationMinutes }>,
): void {
  state = {
    ...state,
    escalationRules: state.escalationRules.map((r) => (r.id === id ? { ...r, ...partial } : r)),
  };
  emit();
}

// ─── Approval Workflows ───────────────────────────────────────────────────

export function useApprovalWorkflowTypes(): ApprovalWorkflowType[] {
  return useSyncExternalStore(
    subscribe,
    () => state.approvalWorkflowTypes,
    () => getServerSnapshot().approvalWorkflowTypes,
  );
}

export function updateApprovalWorkflowType(id: string, approverRole: string): void {
  state = {
    ...state,
    approvalWorkflowTypes: state.approvalWorkflowTypes.map((a) =>
      a.id === id ? { ...a, approverRole } : a,
    ),
  };
  emit();
}

// ─── Save Changes ─────────────────────────────────────────────────────────

export function useLastSaved(): { lastSavedAt: string; lastSavedBy: string } {
  return useSyncExternalStore(
    subscribe,
    () => state.lastSaved,
    () => getServerSnapshot().lastSaved,
  );
}

export function markAllSaved(savedBy = 'Admin User'): void {
  state = { ...state, lastSaved: { lastSavedAt: new Date().toISOString(), lastSavedBy: savedBy } };
  emit();
}
