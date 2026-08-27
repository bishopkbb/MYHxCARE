'use client';

import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ExternalLink,
  GripVertical,
  History,
  Lightbulb,
  ListChecks,
  MoreVertical,
  PenLine,
  Save,
  Search,
  Settings2,
  Workflow,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PreferenceToggle } from '@components/shared/PreferenceToggle';
import { FormSelect } from '@components/shared/FormSelect';
import { FormField } from '@components/shared/FormField';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatDateTime, formatHumanDate } from '@/utils/datetime';
import {
  computeWorkflowStats,
  type DepartmentWorkflow,
  type WorkflowStage,
} from '@/features/administration/__mocks__/workflowSettingsFixtures';
import {
  ACTIVE_QUEUES,
  APPROVER_ROLE_OPTIONS,
  AUTO_REFRESH_OPTIONS,
  BOOKING_WINDOW_OPTIONS,
  BUFFER_OPTIONS,
  CANCELLATION_NOTICE_OPTIONS,
  DURATION_OPTIONS,
  ESCALATION_MINUTES_OPTIONS,
  NOTIFY_ROLE_OPTIONS,
  SORT_ORDER_OPTIONS,
  type ApprovalWorkflowType,
  type EscalationRule,
  type NotificationRule,
  type QueueSortOrder,
} from '@/features/administration/__mocks__/workflowOperationsFixtures';
import {
  deleteStage,
  duplicateStage,
  markAllSaved,
  reorderStage,
  setWorkflowStatus,
  updateApprovalWorkflowType,
  updateAppointmentSettings,
  updateEscalationRule,
  updateNotificationRule,
  updateQueueSettings,
  updateWorkflowSettings,
  useAppointmentSettings,
  useApprovalWorkflowTypes,
  useDepartmentWorkflows,
  useEscalationRules,
  useLastSaved,
  useNotificationRules,
  useQueueSettings,
} from '@/features/administration/store/workflowSettingsStore';
import { useDepartmentSettings } from '@/features/administration/store/departmentSettingsStore';
import { usePermissionSettings } from '@/features/administration/store/permissionSettingsStore';

const AddWorkflowModal = dynamic(
  () => import('./AddWorkflowModal').then((m) => m.AddWorkflowModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const EditWorkflowNameModal = dynamic(
  () => import('./EditWorkflowNameModal').then((m) => m.EditWorkflowNameModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const AddStageModal = dynamic(() => import('./AddStageModal').then((m) => m.AddStageModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});
const EditStageModal = dynamic(() => import('./EditStageModal').then((m) => m.EditStageModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type MainTabKey =
  'department-workflows' | 'queue' | 'appointment' | 'notification' | 'escalation' | 'approval';

const MAIN_TABS: { key: MainTabKey; label: string }[] = [
  { key: 'department-workflows', label: 'Department Workflows' },
  { key: 'queue', label: 'Queue Settings' },
  { key: 'appointment', label: 'Appointment Settings' },
  { key: 'notification', label: 'Notification Rules' },
  { key: 'escalation', label: 'Escalation Settings' },
  { key: 'approval', label: 'Approval Workflows' },
];

function WorkflowStatusPill({ status }: { status: DepartmentWorkflow['status'] }) {
  const active = status === 'Active';
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{
        fontSize: 14,
        color: active ? '#16A34A' : '#D97706',
        border: `1px solid ${active ? 'rgba(22,163,74,0.35)' : 'rgba(217,119,6,0.35)'}`,
        background: active ? 'rgba(22,163,74,0.08)' : 'rgba(217,119,6,0.08)',
      }}
    >
      {status}
    </span>
  );
}

function SettingsToggleRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-start justify-between gap-3 rounded-[10px] p-3.5"
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {label}
        </p>
        <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
          {hint}
        </p>
      </div>
      <PreferenceToggle on={on} onToggle={onToggle} ariaLabel={label} />
    </div>
  );
}

function StageRow({
  workflowId,
  stage,
  index,
  total,
  onEdit,
}: {
  workflowId: string;
  stage: WorkflowStage;
  index: number;
  total: number;
  onEdit: () => void;
}) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const Icon = stage.icon;

  return (
    <div
      className="flex flex-wrap items-start gap-3 rounded-[10px] p-3.5"
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <GripVertical
        aria-hidden="true"
        style={{ width: 16, height: 16, color: '#C7D3D8', flexShrink: 0, marginTop: 4 }}
      />
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div
          className="flex size-7 items-center justify-center rounded-full font-sans font-semibold"
          style={{ background: '#E6F8FD', color: '#00B4D8', fontSize: 14 }}
        >
          {stage.order}
        </div>
        <div className="flex flex-col">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => reorderStage(workflowId, stage.id, 'up')}
            aria-label={`Move ${stage.title} up`}
            className={`flex size-6 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:opacity-30 ${FOCUS_RING}`}
          >
            <ChevronUp style={{ width: 13, height: 13, color: '#4A7080' }} />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => reorderStage(workflowId, stage.id, 'down')}
            aria-label={`Move ${stage.title} down`}
            className={`flex size-6 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:opacity-30 ${FOCUS_RING}`}
          >
            <ChevronDown style={{ width: 13, height: 13, color: '#4A7080' }} />
          </button>
        </div>
      </div>

      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: 'rgba(0,180,216,0.1)' }}
      >
        <Icon style={{ width: 17, height: 17, color: '#00B4D8' }} />
      </div>

      <div className="min-w-[140px] flex-1">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {stage.title}
        </p>
        <p style={{ fontSize: 14, color: '#8A98A3' }}>{stage.description}</p>
      </div>

      <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
          style={{
            fontSize: 14,
            color: stage.requirement === 'required' ? '#2563EB' : '#4A7080',
            border: `1px solid ${stage.requirement === 'required' ? 'rgba(37,99,235,0.35)' : 'rgba(0,100,130,0.2)'}`,
            background: stage.requirement === 'required' ? 'rgba(37,99,235,0.08)' : 'transparent',
          }}
        >
          {stage.requirement === 'required' ? 'Required' : 'Optional'}
        </span>
        {stage.autoComplete && (
          <span
            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
            style={{
              fontSize: 14,
              color: '#16A34A',
              border: '1px solid rgba(22,163,74,0.35)',
              background: 'rgba(22,163,74,0.08)',
            }}
          >
            Auto-complete
          </span>
        )}
        <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${stage.title}`}
            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
          >
            <Settings2 style={{ width: 15, height: 15, color: '#4A7080' }} />
          </button>
        </PermissionGate>
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`More actions for ${stage.title}`}
            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
          >
            <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
          </button>
          <RowMenuPortal
            open={menuOpen}
            anchorRef={buttonRef}
            onClose={() => setMenuOpen(false)}
            width={180}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              Edit Stage
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                duplicateStage(workflowId, stage.id);
                toast.success('Stage duplicated', `A copy of "${stage.title}" has been added.`);
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              Duplicate Stage
            </button>
            <button
              type="button"
              disabled={total <= 1}
              onClick={() => {
                setMenuOpen(false);
                if (total <= 1) return;
                deleteStage(workflowId, stage.id);
                toast.success('Stage removed', `"${stage.title}" has been removed.`);
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              Delete Stage
            </button>
          </RowMenuPortal>
        </div>
      </div>
    </div>
  );
}

function DepartmentWorkflowsTab() {
  const router = useRouter();
  const toast = useToast();
  const workflows = useDepartmentWorkflows();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(workflows[0]?.id ?? null);
  const [addWorkflowOpen, setAddWorkflowOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) => w.name.toLowerCase().includes(q) || w.department.toLowerCase().includes(q),
    );
  }, [workflows, search]);

  const selected = workflows.find((w) => w.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div
          className="flex w-full shrink-0 flex-col overflow-hidden xl:w-[280px]"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,100,130,0.12)',
            borderRadius: 12,
          }}
        >
          <div className="p-4">
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Workflows by Department
            </p>
            <div className="relative mt-3">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                style={{ width: 15, height: 15, color: '#8A98A3' }}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workflows..."
                className={`h-10 w-full rounded-[10px] pr-3 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>
          </div>
          <div className="flex max-h-[520px] flex-col overflow-y-auto scroll-smooth px-2 pb-2">
            {visible.length === 0 ? (
              <p className="px-2 py-6 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                No workflows match your search.
              </p>
            ) : (
              visible.map((w) => {
                const isSelected = w.id === selectedId;
                const Icon = w.stages[0]?.icon ?? Workflow;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    className={`mb-1 flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      background: isSelected ? '#E6F8FD' : 'transparent',
                      border: isSelected ? '1px solid #00B4D8' : '1px solid transparent',
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        style={{
                          width: 18,
                          height: 18,
                          color: isSelected ? '#00B4D8' : '#8A98A3',
                          flexShrink: 0,
                        }}
                      />
                      <div className="min-w-0">
                        <Tooltip content={w.department}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {w.department}
                          </p>
                        </Tooltip>
                        <Tooltip content={w.name}>
                          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {w.name}
                          </p>
                        </Tooltip>
                      </div>
                    </div>
                    <WorkflowStatusPill status={w.status} />
                  </button>
                );
              })
            )}
          </div>
          <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
            <div className="p-3" style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}>
              <button
                type="button"
                onClick={() => setAddWorkflowOpen(true)}
                className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
              >
                + Add New Workflow
              </button>
            </div>
          </PermissionGate>
        </div>

        {!selected ? (
          <div
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-[12px] px-4 py-16 text-center"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-14 items-center justify-center rounded-full"
              style={{ background: 'rgba(226,237,241,0.6)' }}
            >
              <Workflow style={{ width: 28, height: 28, color: '#8A98A3' }} />
            </div>
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Select a workflow to get started
            </p>
            <p style={{ fontSize: 14, color: '#4A7080' }}>
              Choose a workflow from the list on the left to configure its stages and settings.
            </p>
          </div>
        ) : (
          <div
            className="min-w-0 flex-1 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 18, color: '#0D2630' }}
                  >
                    {selected.name}
                  </p>
                  <WorkflowStatusPill status={selected.status} />
                </div>
                <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                  {selected.description}
                </p>
              </div>
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <button
                  type="button"
                  onClick={() => setEditNameOpen(true)}
                  className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <PenLine style={{ width: 14, height: 14 }} />
                  Edit Workflow Name
                </button>
              </PermissionGate>
            </div>

            <div className="mt-5">
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Workflow Stages
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                Define the sequence of steps in this workflow.
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {selected.stages.map((stage, i) => (
                  <StageRow
                    key={stage.id}
                    workflowId={selected.id}
                    stage={stage}
                    index={i}
                    total={selected.stages.length}
                    onEdit={() => setEditingStage(stage)}
                  />
                ))}
              </div>
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <button
                  type="button"
                  onClick={() => setAddStageOpen(true)}
                  className={`mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#00B4D8',
                    border: '1px dashed rgba(0,180,216,0.4)',
                  }}
                >
                  + Add Stage
                </button>
              </PermissionGate>
            </div>

            <div className="mt-6">
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Workflow Settings
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <SettingsToggleRow
                  label="Allow stage reversion"
                  hint="Users can move back to previous stages"
                  on={selected.settings.allowStageReversion}
                  onToggle={() => {
                    updateWorkflowSettings(selected.id, {
                      allowStageReversion: !selected.settings.allowStageReversion,
                    });
                    toast.success(
                      'Setting updated',
                      `Allow stage reversion is now ${!selected.settings.allowStageReversion ? 'on' : 'off'}.`,
                    );
                  }}
                />
                <SettingsToggleRow
                  label="Require completion in order"
                  hint="Stages must be completed in sequence"
                  on={selected.settings.requireCompletionInOrder}
                  onToggle={() => {
                    updateWorkflowSettings(selected.id, {
                      requireCompletionInOrder: !selected.settings.requireCompletionInOrder,
                    });
                    toast.success(
                      'Setting updated',
                      `Require completion in order is now ${!selected.settings.requireCompletionInOrder ? 'on' : 'off'}.`,
                    );
                  }}
                />
                <SettingsToggleRow
                  label="Allow draft save"
                  hint="Users can save progress as draft"
                  on={selected.settings.allowDraftSave}
                  onToggle={() => {
                    updateWorkflowSettings(selected.id, {
                      allowDraftSave: !selected.settings.allowDraftSave,
                    });
                    toast.success(
                      'Setting updated',
                      `Allow draft save is now ${!selected.settings.allowDraftSave ? 'on' : 'off'}.`,
                    );
                  }}
                />
                <SettingsToggleRow
                  label="Auto-assign next stage"
                  hint="Automatically move to next stage"
                  on={selected.settings.autoAssignNextStage}
                  onToggle={() => {
                    updateWorkflowSettings(selected.id, {
                      autoAssignNextStage: !selected.settings.autoAssignNextStage,
                    });
                    toast.success(
                      'Setting updated',
                      `Auto-assign next stage is now ${!selected.settings.autoAssignNextStage ? 'on' : 'off'}.`,
                    );
                  }}
                />
              </div>
            </div>

            <div className="mt-6">
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Workflow Status
              </p>
              <div
                className="mt-3 flex items-center justify-between gap-3 rounded-[10px] p-3.5"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p style={{ fontSize: 14, color: '#0D2630' }}>
                  This workflow is active and available for use.
                </p>
                <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                  <PreferenceToggle
                    on={selected.status === 'Active'}
                    onToggle={() => {
                      const next = selected.status === 'Active' ? 'Inactive' : 'Active';
                      setWorkflowStatus(selected.id, next);
                      toast.success('Workflow status updated', `${selected.name} is now ${next}.`);
                    }}
                    ariaLabel="Workflow status"
                  />
                </PermissionGate>
              </div>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div
            className="rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              About This Workflow
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {[
                ['Department', selected.department],
                ['Workflow Type', selected.workflowType],
                ['Created By', selected.createdBy],
                ['Created On', formatDateTime(selected.createdAt)],
                ['Last Updated', formatDateTime(selected.updatedAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Workflow Performance (This Month)
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Executions</span>
                <span
                  className="font-sans font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {selected.performance.totalExecutions}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Completed</span>
                <span
                  className="font-sans font-semibold"
                  style={{ fontSize: 14, color: '#16A34A' }}
                >
                  {selected.performance.completed} (
                  {selected.performance.totalExecutions
                    ? Math.round(
                        (selected.performance.completed / selected.performance.totalExecutions) *
                          1000,
                      ) / 10
                    : 0}
                  %)
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>In Progress</span>
                <span
                  className="font-sans font-semibold"
                  style={{ fontSize: 14, color: '#D97706' }}
                >
                  {selected.performance.inProgress} (
                  {selected.performance.totalExecutions
                    ? Math.round(
                        (selected.performance.inProgress / selected.performance.totalExecutions) *
                          1000,
                      ) / 10
                    : 0}
                  %)
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Cancelled</span>
                <span
                  className="font-sans font-semibold"
                  style={{ fontSize: 14, color: '#DC2626' }}
                >
                  {selected.performance.cancelled} (
                  {selected.performance.totalExecutions
                    ? Math.round(
                        (selected.performance.cancelled / selected.performance.totalExecutions) *
                          1000,
                      ) / 10
                    : 0}
                  %)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(ROUTES.adminReports)}
              className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
            >
              View Performance Report
            </button>
          </div>

          <div
            className="rounded-[12px] p-4"
            style={{
              background: 'rgba(0,180,216,0.06)',
              border: '1px solid rgba(0,180,216,0.25)',
            }}
          >
            <div className="flex items-center gap-2">
              <Lightbulb style={{ width: 16, height: 16, color: '#00B4D8' }} />
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Tips
              </p>
            </div>
            <p className="mt-2" style={{ fontSize: 14, color: '#4A7080' }}>
              Configure workflows to match your operational processes. Changes will apply to new
              cases only.
            </p>
          </div>
        </div>
      )}

      {addWorkflowOpen && (
        <AddWorkflowModal
          onClose={() => setAddWorkflowOpen(false)}
          onSubmit={(w) => {
            setAddWorkflowOpen(false);
            setSelectedId(w.id);
          }}
        />
      )}
      {editNameOpen && selected && (
        <EditWorkflowNameModal workflow={selected} onClose={() => setEditNameOpen(false)} />
      )}
      {addStageOpen && selected && (
        <AddStageModal workflowId={selected.id} onClose={() => setAddStageOpen(false)} />
      )}
      {editingStage && selected && (
        <EditStageModal
          workflowId={selected.id}
          stage={editingStage}
          onClose={() => setEditingStage(null)}
        />
      )}
    </div>
  );
}

function QueueSettingsTab() {
  const settings = useQueueSettings();
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
          General Queue Behavior
        </p>
        <p style={{ fontSize: 14, color: '#4A7080' }}>
          Defaults applied across every department queue in the application.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Auto-Refresh Interval" htmlFor="queue-auto-refresh">
            <FormSelect
              id="queue-auto-refresh"
              value={String(settings.autoRefreshInterval)}
              onChange={(v) =>
                updateQueueSettings({ autoRefreshInterval: Number(v) as 15 | 30 | 60 | 0 })
              }
              options={AUTO_REFRESH_OPTIONS}
              placeholder="Select interval"
            />
          </FormField>
          <FormField label="Default Sort Order" htmlFor="queue-sort-order">
            <FormSelect
              id="queue-sort-order"
              value={settings.defaultSortOrder}
              onChange={(v) => updateQueueSettings({ defaultSortOrder: v as QueueSortOrder })}
              options={SORT_ORDER_OPTIONS}
              placeholder="Select sort order"
            />
          </FormField>
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          <SettingsToggleRow
            label="Show cancelled entries in queue"
            hint="Cancelled entries remain visible instead of being hidden"
            on={settings.showCancelledEntries}
            onToggle={() => {
              updateQueueSettings({ showCancelledEntries: !settings.showCancelledEntries });
              toast.success(
                'Setting updated',
                `Show cancelled entries in queue is now ${!settings.showCancelledEntries ? 'on' : 'off'}.`,
              );
            }}
          />
          <SettingsToggleRow
            label="Highlight allergy-flagged patients"
            hint="Rows for patients with recorded allergies are visually flagged"
            on={settings.highlightAllergyFlagged}
            onToggle={() => {
              updateQueueSettings({ highlightAllergyFlagged: !settings.highlightAllergyFlagged });
              toast.success(
                'Setting updated',
                `Highlight allergy-flagged patients is now ${!settings.highlightAllergyFlagged ? 'on' : 'off'}.`,
              );
            }}
          />
        </div>
      </div>

      <div>
        <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
          Active Queues
        </p>
        <p style={{ fontSize: 14, color: '#4A7080' }}>
          Department queues that currently follow these defaults.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {ACTIVE_QUEUES.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {q.name}
              </p>
              <button
                type="button"
                onClick={() => router.push(q.route)}
                className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
              >
                Open Queue
                <ExternalLink style={{ width: 13, height: 13 }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppointmentSettingsTab() {
  const settings = useAppointmentSettings();
  const toast = useToast();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
          Scheduling Defaults
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Default Appointment Duration" htmlFor="appt-duration">
            <FormSelect
              id="appt-duration"
              value={String(settings.defaultDurationMinutes)}
              onChange={(v) =>
                updateAppointmentSettings({
                  defaultDurationMinutes: Number(v) as 15 | 20 | 30 | 45 | 60,
                })
              }
              options={DURATION_OPTIONS}
              placeholder="Select duration"
            />
          </FormField>
          <FormField label="Buffer Time Between Appointments" htmlFor="appt-buffer">
            <FormSelect
              id="appt-buffer"
              value={String(settings.bufferMinutes)}
              onChange={(v) =>
                updateAppointmentSettings({ bufferMinutes: Number(v) as 0 | 5 | 10 | 15 })
              }
              options={BUFFER_OPTIONS}
              placeholder="Select buffer"
            />
          </FormField>
          <FormField label="Booking Window" htmlFor="appt-window">
            <FormSelect
              id="appt-window"
              value={String(settings.bookingWindowDays)}
              onChange={(v) =>
                updateAppointmentSettings({ bookingWindowDays: Number(v) as 7 | 14 | 30 | 60 })
              }
              options={BOOKING_WINDOW_OPTIONS}
              placeholder="Select booking window"
            />
          </FormField>
        </div>
        <div className="mt-3">
          <SettingsToggleRow
            label="Allow same-day booking"
            hint="Patients can book an appointment for the current day"
            on={settings.allowSameDayBooking}
            onToggle={() => {
              updateAppointmentSettings({ allowSameDayBooking: !settings.allowSameDayBooking });
              toast.success(
                'Setting updated',
                `Allow same-day booking is now ${!settings.allowSameDayBooking ? 'on' : 'off'}.`,
              );
            }}
          />
        </div>
      </div>

      <div>
        <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
          Cancellation Policy
        </p>
        <div className="mt-3">
          <FormField label="Minimum Notice for Cancellation" htmlFor="appt-cancel-notice">
            <FormSelect
              id="appt-cancel-notice"
              value={String(settings.cancellationNoticeHours)}
              onChange={(v) =>
                updateAppointmentSettings({ cancellationNoticeHours: Number(v) as 1 | 2 | 6 | 24 })
              }
              options={CANCELLATION_NOTICE_OPTIONS}
              placeholder="Select notice period"
            />
          </FormField>
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          <SettingsToggleRow
            label="Require reason for cancellation"
            hint="A cancellation reason must be entered before it is confirmed"
            on={settings.requireCancellationReason}
            onToggle={() => {
              updateAppointmentSettings({
                requireCancellationReason: !settings.requireCancellationReason,
              });
              toast.success(
                'Setting updated',
                `Require reason for cancellation is now ${!settings.requireCancellationReason ? 'on' : 'off'}.`,
              );
            }}
          />
          <SettingsToggleRow
            label="Auto-release slot on cancellation"
            hint="A cancelled slot immediately becomes available for booking again"
            on={settings.autoReleaseSlotOnCancellation}
            onToggle={() => {
              updateAppointmentSettings({
                autoReleaseSlotOnCancellation: !settings.autoReleaseSlotOnCancellation,
              });
              toast.success(
                'Setting updated',
                `Auto-release slot on cancellation is now ${!settings.autoReleaseSlotOnCancellation ? 'on' : 'off'}.`,
              );
            }}
          />
        </div>
      </div>

      <div>
        <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
          Reminders
        </p>
        <p style={{ fontSize: 14, color: '#4A7080' }}>Email and in-app only.</p>
        <div className="mt-3 flex flex-col gap-2.5">
          <SettingsToggleRow
            label="Send reminder 24 hours before appointment"
            hint="Email and in-app notification"
            on={settings.reminder24HoursBefore}
            onToggle={() => {
              updateAppointmentSettings({
                reminder24HoursBefore: !settings.reminder24HoursBefore,
              });
              toast.success(
                'Setting updated',
                `Send reminder 24 hours before appointment is now ${!settings.reminder24HoursBefore ? 'on' : 'off'}.`,
              );
            }}
          />
          <SettingsToggleRow
            label="Send reminder on the day of appointment"
            hint="Email and in-app notification"
            on={settings.reminderSameDay}
            onToggle={() => {
              updateAppointmentSettings({ reminderSameDay: !settings.reminderSameDay });
              toast.success(
                'Setting updated',
                `Send reminder on the day of appointment is now ${!settings.reminderSameDay ? 'on' : 'off'}.`,
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ChannelChip({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-8 items-center gap-1 rounded-full px-3 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
      style={{
        fontSize: 14,
        color: active ? '#00B4D8' : '#8A98A3',
        border: `1px solid ${active ? '#00B4D8' : 'rgba(0,100,130,0.2)'}`,
        background: active ? 'rgba(0,180,216,0.08)' : 'transparent',
      }}
    >
      {active && <CheckCircle2 style={{ width: 12, height: 12 }} />}
      {label}
    </button>
  );
}

function NotificationRuleRow({ rule }: { rule: NotificationRule }) {
  const toast = useToast();
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-[10px] p-3.5"
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="min-w-[180px] flex-1">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {rule.event}
        </p>
      </div>
      <div className="w-[200px] shrink-0">
        <FormSelect
          id={`notify-role-${rule.id}`}
          value={rule.notifyRole}
          onChange={(v) => updateNotificationRule(rule.id, { notifyRole: v })}
          options={NOTIFY_ROLE_OPTIONS}
          placeholder="Select role"
        />
      </div>
      <div className="flex shrink-0 gap-1.5">
        <ChannelChip
          active={rule.email}
          label="Email"
          onToggle={() => updateNotificationRule(rule.id, { email: !rule.email })}
        />
        <ChannelChip
          active={rule.inApp}
          label="In-App"
          onToggle={() => updateNotificationRule(rule.id, { inApp: !rule.inApp })}
        />
      </div>
      <PreferenceToggle
        on={rule.enabled}
        onToggle={() => {
          updateNotificationRule(rule.id, { enabled: !rule.enabled });
          toast.success(
            'Notification rule updated',
            `${rule.event} is now ${!rule.enabled ? 'enabled' : 'disabled'}.`,
          );
        }}
        ariaLabel={`Enable ${rule.event}`}
      />
    </div>
  );
}

function NotificationRulesTab() {
  const router = useRouter();
  const rules = useNotificationRules();
  const departmentSettings = useDepartmentSettings();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
          Notification Rules
        </p>
        <p style={{ fontSize: 14, color: '#4A7080' }}>
          Choose who is notified when each event happens, and by which channel. Email and in-app
          only, never SMS.
        </p>
        <div className="mt-3 flex flex-col gap-2.5">
          {rules.map((r) => (
            <NotificationRuleRow key={r.id} rule={r} />
          ))}
        </div>
      </div>

      <div>
        <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
          Linked Notifications
        </p>
        <p style={{ fontSize: 14, color: '#4A7080' }}>
          Configured elsewhere, shown here for visibility.
        </p>
        <div
          className="mt-3 flex items-center justify-between gap-3 rounded-[10px] p-3.5"
          style={{ border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Staff Reassignment
            </p>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>
              Notify department head when staff move in or out.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
              style={{
                fontSize: 14,
                color: departmentSettings.notifyHeadOnStaffReassignment ? '#16A34A' : '#8A98A3',
                border: `1px solid ${departmentSettings.notifyHeadOnStaffReassignment ? 'rgba(22,163,74,0.35)' : 'rgba(0,100,130,0.2)'}`,
                background: departmentSettings.notifyHeadOnStaffReassignment
                  ? 'rgba(22,163,74,0.08)'
                  : 'transparent',
              }}
            >
              {departmentSettings.notifyHeadOnStaffReassignment ? 'On' : 'Off'}
            </span>
            <button
              type="button"
              onClick={() => router.push(ROUTES.adminDepartments)}
              className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
            >
              Manage in Departments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EscalationRuleCard({ rule }: { rule: EscalationRule }) {
  const toast = useToast();
  return (
    <div className="rounded-[10px] p-3.5" style={{ border: '1px solid rgba(0,100,130,0.12)' }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            {rule.title}
          </p>
          <span
            className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
            style={{ fontSize: 14, color: '#4A7080', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            {rule.department}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span style={{ fontSize: 14, color: '#8A98A3' }}>Notifies:</span>
        {rule.notifies.map((n) => (
          <span
            key={n}
            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
            style={{
              fontSize: 14,
              color: '#00B4D8',
              border: '1px solid rgba(0,180,216,0.3)',
              background: 'rgba(0,180,216,0.06)',
            }}
          >
            {n}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span style={{ fontSize: 14, color: '#4A7080' }}>Acknowledgment required</span>
          <PreferenceToggle
            on={rule.acknowledgmentRequired}
            onToggle={() => {
              updateEscalationRule(rule.id, {
                acknowledgmentRequired: !rule.acknowledgmentRequired,
              });
              toast.success(
                'Escalation rule updated',
                `Acknowledgment required for ${rule.title} is now ${!rule.acknowledgmentRequired ? 'on' : 'off'}.`,
              );
            }}
            ariaLabel={`Acknowledgment required for ${rule.title}`}
          />
        </div>
        <div className="w-[180px]">
          <FormSelect
            id={`escalate-after-${rule.id}`}
            value={String(rule.escalateAfterMinutes)}
            onChange={(v) =>
              updateEscalationRule(rule.id, {
                escalateAfterMinutes: Number(v) as EscalationRule['escalateAfterMinutes'],
              })
            }
            options={ESCALATION_MINUTES_OPTIONS}
            placeholder="Select time"
          />
        </div>
      </div>
    </div>
  );
}

function EscalationSettingsTab() {
  const rules = useEscalationRules();
  return (
    <div>
      <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
        Escalation Settings
      </p>
      <p style={{ fontSize: 14, color: '#4A7080' }}>
        Configure who is notified and when an unacknowledged event escalates further.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rules.map((r) => (
          <EscalationRuleCard key={r.id} rule={r} />
        ))}
      </div>
    </div>
  );
}

function ApprovalWorkflowCard({ type }: { type: ApprovalWorkflowType }) {
  const router = useRouter();
  const departmentSettings = useDepartmentSettings();
  const permissionSettings = usePermissionSettings();

  const linkedValue =
    type.kind === 'linked-department'
      ? departmentSettings.requireApprovalForStatusChange
      : type.kind === 'linked-permissions'
        ? permissionSettings.requireApprovalForAdminAssignment
        : null;

  return (
    <div className="rounded-[10px] p-3.5" style={{ border: '1px solid rgba(0,100,130,0.12)' }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            {type.name}
          </p>
          <p style={{ fontSize: 14, color: '#8A98A3' }}>{type.description}</p>
        </div>
        {type.alwaysRequiresApproval && (
          <span
            className="inline-block shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
            style={{
              fontSize: 14,
              color: '#16A34A',
              border: '1px solid rgba(22,163,74,0.35)',
              background: 'rgba(22,163,74,0.08)',
            }}
          >
            Always requires approval
          </span>
        )}
      </div>

      {linkedValue !== null ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span
            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
            style={{
              fontSize: 14,
              color: linkedValue ? '#16A34A' : '#8A98A3',
              border: `1px solid ${linkedValue ? 'rgba(22,163,74,0.35)' : 'rgba(0,100,130,0.2)'}`,
              background: linkedValue ? 'rgba(22,163,74,0.08)' : 'transparent',
            }}
          >
            Approval required: {linkedValue ? 'On' : 'Off'}
          </span>
          <button
            type="button"
            onClick={() =>
              router.push(
                type.kind === 'linked-department'
                  ? ROUTES.adminDepartments
                  : ROUTES.adminRolesPermissions,
              )
            }
            className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
          >
            {type.kind === 'linked-department'
              ? 'Manage in Departments'
              : 'Manage in Roles & Permissions'}
          </button>
        </div>
      ) : (
        <div className="mt-3 w-[220px]">
          <FormField label="Approver Role" htmlFor={`approver-role-${type.id}`}>
            <FormSelect
              id={`approver-role-${type.id}`}
              value={type.approverRole}
              onChange={(v) => updateApprovalWorkflowType(type.id, v)}
              options={APPROVER_ROLE_OPTIONS}
              placeholder="Select approver role"
            />
          </FormField>
        </div>
      )}
    </div>
  );
}

function ApprovalWorkflowsTab() {
  const types = useApprovalWorkflowTypes();
  return (
    <div>
      <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
        Approval Workflows
      </p>
      <p style={{ fontSize: 14, color: '#4A7080' }}>
        Every flow below already requires approval before taking effect elsewhere in the
        application.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {types.map((t) => (
          <ApprovalWorkflowCard key={t.id} type={t} />
        ))}
      </div>
    </div>
  );
}

export function WorkflowSettingsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const workflows = useDepartmentWorkflows();
  const approvalTypes = useApprovalWorkflowTypes();
  const { lastSavedAt, lastSavedBy } = useLastSaved();
  const [activeTab, setActiveTab] = useState<MainTabKey>('department-workflows');

  const stats = computeWorkflowStats(workflows, approvalTypes.length);

  function handleSaveChanges() {
    markAllSaved('Admin User');
    toast.success(
      'Workflow settings saved',
      'All workflow configuration has been marked as reviewed.',
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.admin)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Home
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span style={{ color: '#4A7080' }}>Configuration</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Workflow Settings
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Workflow Settings
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Configure and manage operational workflows and approval processes across the medical
                centre.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => router.push(ROUTES.adminAuditLog)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <History style={{ width: 15, height: 15 }} />
                Audit Trail
              </button>
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Save style={{ width: 15, height: 15 }} />
                  Save Changes
                </button>
              </PermissionGate>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            <StatCard
              icon={Workflow}
              label="Total Workflows"
              value={stats.total}
              info="Across all departments"
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={ListChecks}
              label="Active Workflows"
              value={stats.active}
              info="Currently in use"
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Approval Workflows"
              value={stats.approvalWorkflowCount}
              info="Require approval"
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
              onClick={() => setActiveTab('approval')}
            />
            <StatCard
              icon={ArrowUpDown}
              label="Automated Rules"
              value={stats.automatedRules}
              info="System automation rules"
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
            />
            <StatCard
              icon={Calendar}
              label="Last Updated"
              value={formatHumanDate(lastSavedAt)}
              info={`by ${lastSavedBy}`}
              accent="#00B4D8"
              iconBg="rgba(0,180,216,0.1)"
            />
          </div>

          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="overflow-x-auto scroll-smooth">
              <div
                className="flex gap-1"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
              >
                {MAIN_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: activeTab === tab.key ? '#00B4D8' : '#4A7080',
                      borderBottom:
                        activeTab === tab.key ? '2px solid #00B4D8' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              {activeTab === 'department-workflows' && <DepartmentWorkflowsTab />}
              {activeTab === 'queue' && <QueueSettingsTab />}
              {activeTab === 'appointment' && <AppointmentSettingsTab />}
              {activeTab === 'notification' && <NotificationRulesTab />}
              {activeTab === 'escalation' && <EscalationSettingsTab />}
              {activeTab === 'approval' && <ApprovalWorkflowsTab />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
