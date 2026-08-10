'use client';

import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  MoreVertical,
  Package,
  Plus,
  Truck,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FormDateInput } from '@components/shared/FormDateInput';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/utils/currency';
import { formatDateTime, formatHumanDate } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import { DEPARTMENT_OPTIONS } from '@/features/laboratory/__mocks__/equipmentFixtures';
import {
  categoryBreakdown,
  type ApprovalStep,
  type ProcurementPriority,
  type ProcurementRequest,
  type ProcurementStatus,
} from '@/features/laboratory/__mocks__/procurementFixtures';
import { startReceivingForRequest } from '@/features/laboratory/store/stockReceivingStore';
import {
  advanceStatus,
  approveNextStep,
  cancelRequest,
  getProcurementSummary,
  rejectRequest,
  useProcurementRequests,
} from '@/features/laboratory/store/procurementStore';

const NewProcurementRequestModal = dynamic(
  () => import('./NewProcurementRequestModal').then((m) => m.NewProcurementRequestModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ProcurementRequestDetailModal = dynamic(
  () => import('./ProcurementRequestDetailModal').then((m) => m.ProcurementRequestDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

type TabKey = 'all' | 'pending' | 'approved' | 'procurement' | 'received' | 'rejected';

const TABS: { key: TabKey; label: string; statuses: ProcurementStatus[] | null }[] = [
  { key: 'all', label: 'All Requests', statuses: null },
  { key: 'pending', label: 'Pending Approval', statuses: ['Pending Approval'] },
  { key: 'approved', label: 'Approved', statuses: ['Approved'] },
  { key: 'procurement', label: 'In Procurement', statuses: ['In Procurement'] },
  { key: 'received', label: 'Received', statuses: ['Received'] },
  { key: 'rejected', label: 'Rejected / Cancelled', statuses: ['Rejected', 'Cancelled'] },
];

const STATUS_CFG: Record<ProcurementStatus, { color: string; bg: string; border: string }> = {
  'Pending Approval': {
    color: '#B45309',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.35)',
  },
  Approved: { color: '#16A34A', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)' },
  'In Procurement': { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.35)' },
  Received: { color: '#0D9488', bg: 'rgba(13,148,136,0.1)', border: 'rgba(13,148,136,0.35)' },
  Rejected: { color: '#DC2626', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' },
  Cancelled: { color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.35)' },
};

const PRIORITY_CFG: Record<ProcurementPriority, { color: string; bg: string }> = {
  High: { color: '#DC2626', bg: 'rgba(239,68,68,0.08)' },
  Medium: { color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  Low: { color: '#16A34A', bg: 'rgba(34,197,94,0.08)' },
};

function StatusBadge({ status }: { status: ProcurementStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{
        fontSize: 14,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ProcurementPriority }) {
  const cfg = PRIORITY_CFG[priority];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
    >
      {priority}
    </span>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(226,237,241,0.6)' }}
      >
        <FileText style={{ width: 28, height: 28, color: '#8A98A3' }} />
      </div>
      <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
        {message}
      </p>
      <p style={{ fontSize: 14, color: '#4A7080' }}>{hint}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  labelColor,
  value,
  info,
  infoColor,
  onClick,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  labelColor?: string;
  value: number;
  info: string;
  infoColor: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p
        className="font-sans"
        style={{ fontSize: 14, lineHeight: '20px', color: labelColor ?? '#4A7080' }}
      >
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
        <p
          className="font-display font-bold"
          style={{ fontSize: 24, lineHeight: '30px', color: '#0D2630' }}
        >
          {value}
        </p>
      </div>
      <p
        className="mt-1.5 font-sans font-medium"
        style={{ fontSize: 14, lineHeight: '20px', color: infoColor }}
      >
        {info}
      </p>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex flex-col rounded-[12px] p-4 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        {content}
      </button>
    );
  }
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      {content}
    </div>
  );
}

const APPROVAL_STEP_ICON: Record<
  string,
  { circleBg: string; circleBorder: string; textColor: string }
> = {
  Approved: { circleBg: '#16A34A', circleBorder: '#16A34A', textColor: '#16A34A' },
  Rejected: { circleBg: '#DC2626', circleBorder: '#DC2626', textColor: '#DC2626' },
  Skipped: { circleBg: '#E2EDF1', circleBorder: 'rgba(0,100,130,0.2)', textColor: '#8A98A3' },
  Pending: { circleBg: '#FFFFFF', circleBorder: 'rgba(0,100,130,0.2)', textColor: '#8A98A3' },
};

function ApprovalWorkflow({ steps }: { steps: ApprovalStep[] }) {
  const nextPendingIdx = steps.findIndex((s) => s.status === 'Pending');
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const isCurrent = i === nextPendingIdx;
        const cfg = APPROVAL_STEP_ICON[step.status]!;
        return (
          <div key={step.role} className="relative flex items-start gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <div
                className="absolute top-5 left-[9px] w-px"
                style={{ height: 'calc(100% - 20px)', background: 'rgba(0,100,130,0.15)' }}
              />
            )}
            <div
              className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full"
              style={{
                background: cfg.circleBg,
                border: `2px solid ${isCurrent ? '#F59E0B' : cfg.circleBorder}`,
              }}
            >
              {step.status === 'Approved' && (
                <Check style={{ width: 11, height: 11, color: '#FFFFFF' }} />
              )}
              {step.status === 'Rejected' && (
                <X style={{ width: 11, height: 11, color: '#FFFFFF' }} />
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pt-0.5">
              <div className="min-w-0">
                <p
                  className="truncate font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {step.role}
                </p>
                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                  {step.actor ?? '—'}
                </p>
              </div>
              <span
                className="shrink-0 font-sans font-medium"
                style={{ fontSize: 14, color: cfg.textColor }}
              >
                {step.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RowMenu({
  request,
  onView,
  onApprove,
  onReject,
  onAdvance,
  onCancel,
  canWrite,
}: {
  request: ProcurementRequest;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onAdvance: () => void;
  onCancel: () => void;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${request.id}`}
        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={200}>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onView();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          View Full Details
        </button>
        {canWrite && request.status === 'Pending Approval' && (
          <>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onApprove();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#16A34A' }}
            >
              Approve Next Step
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReject();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)]"
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              Reject Request
            </button>
          </>
        )}
        {canWrite && request.status === 'Approved' && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAdvance();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            Move to Procurement
          </button>
        )}
        {canWrite && request.status === 'In Procurement' && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAdvance();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            Receive Stock
          </button>
        )}
        {canWrite && (request.status === 'Approved' || request.status === 'In Procurement') && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCancel();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)]"
            style={{ fontSize: 14, color: '#DC2626' }}
          >
            Cancel Request
          </button>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function ProcurementRequestsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Lab Scientist';
  const canWrite = !!user?.permissions?.includes(PERMISSIONS.LAB_PROCUREMENT_WRITE);

  const allRequests = useProcurementRequests();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openFilter, setOpenFilter] = useState<'department' | 'status' | 'priority' | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ROWS_PER_PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [detailFor, setDetailFor] = useState<ProcurementRequest | null>(null);

  const summary = getProcurementSummary();

  const FILTER_DEFS: { key: 'department' | 'status' | 'priority'; def: FilterDef }[] = [
    {
      key: 'department',
      def: {
        key: 'department',
        defaultLabel: 'All Departments',
        options: DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d })),
      },
    },
    {
      key: 'status',
      def: {
        key: 'status',
        defaultLabel: 'All Status',
        options: (
          [
            'Pending Approval',
            'Approved',
            'In Procurement',
            'Received',
            'Rejected',
            'Cancelled',
          ] as const
        ).map((s) => ({ value: s, label: s })),
      },
    },
    {
      key: 'priority',
      def: {
        key: 'priority',
        defaultLabel: 'All Priority',
        options: (['High', 'Medium', 'Low'] as const).map((p) => ({ value: p, label: p })),
      },
    },
  ];
  const filterValue: Record<string, string> = { department, status, priority };
  const filterSetter: Record<string, (v: string) => void> = {
    department: setDepartment,
    status: setStatus,
    priority: setPriority,
  };

  const hasActiveFilters =
    department !== 'ALL' ||
    status !== 'ALL' ||
    priority !== 'ALL' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    search.trim() !== '';

  function resetFilters() {
    setDepartment('ALL');
    setStatus('ALL');
    setPriority('ALL');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  }

  const tabStatuses = TABS.find((t) => t.key === activeTab)!.statuses;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRequests.filter((r) => {
      if (tabStatuses && !tabStatuses.includes(r.status)) return false;
      if (department !== 'ALL' && r.department !== department) return false;
      if (status !== 'ALL' && r.status !== status) return false;
      if (priority !== 'ALL' && r.priority !== priority) return false;
      if (dateFrom && r.requestDate.slice(0, 10) < dateFrom) return false;
      if (dateTo && r.requestDate.slice(0, 10) > dateTo) return false;
      if (
        q &&
        !r.id.toLowerCase().includes(q) &&
        !r.requestedBy.toLowerCase().includes(q) &&
        !r.department.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [allRequests, tabStatuses, department, status, priority, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);
  const selected = selectedId ? allRequests.find((r) => r.id === selectedId) : undefined;

  function handleExport() {
    downloadCSV('procurement-requests', [
      [
        'Request No.',
        'Request Date',
        'Department',
        'Requested By',
        'Priority',
        'Total Items',
        'Est. Amount',
        'Status',
        'Last Updated',
      ],
      ...filtered.map((r) => [
        r.id,
        formatHumanDate(r.requestDate),
        r.department,
        r.requestedBy,
        r.priority,
        String(r.lineItems.length),
        String(r.estimatedAmount),
        r.status,
        formatDateTime(r.lastUpdated),
      ]),
    ]);
    toast.success(
      'Report exported',
      `${filtered.length} request${filtered.length !== 1 ? 's' : ''} exported to CSV.`,
    );
  }

  function handleApprove(request: ProcurementRequest) {
    approveNextStep(request.id, actorName);
    toast.success('Step approved', `${request.id} moved forward in the approval workflow.`);
  }
  function handleReject(request: ProcurementRequest) {
    rejectRequest(request.id, actorName, `Rejected by ${actorName}.`);
    toast.info('Request rejected', `${request.id} has been rejected.`);
  }
  function handleAdvance(request: ProcurementRequest) {
    if (request.status === 'Approved') {
      advanceStatus(request.id, 'In Procurement');
      toast.success('Status updated', `${request.id} is now In Procurement.`);
      return;
    }
    // 'In Procurement' → real receiving session, not a direct status flip
    // (G-LAB-01) — completeReceiving() advances the request to 'Received'
    // once the goods are actually logged in, not before.
    startReceivingForRequest(request, actorName);
    toast.info('Receiving started', `A GRN linked to ${request.id} is ready in Stock Receiving.`);
    router.push(ROUTES.laboratoryStockReceiving);
  }
  function handleCancel(request: ProcurementRequest) {
    cancelRequest(request.id, actorName);
    toast.info('Request cancelled', `${request.id} has been cancelled.`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.laboratory)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Home
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span style={{ color: '#4A7080' }}>Inventory</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Procurement Requests
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Procurement Requests
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Create, track and manage procurement requests for laboratory items and supplies.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export Report
              </button>
              <PermissionGate permission={PERMISSIONS.LAB_PROCUREMENT_WRITE}>
                <button
                  type="button"
                  onClick={() => setNewRequestOpen(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Plus style={{ width: 15, height: 15 }} />
                  New Procurement Request
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MiniStat
              icon={FileText}
              iconColor="#0D9488"
              iconBg="rgba(13,148,136,0.12)"
              label="Total Requests"
              value={summary.total}
              info="All time"
              infoColor="#4A7080"
              onClick={() => setActiveTab('all')}
            />
            <MiniStat
              icon={CheckCircle2}
              iconColor="#16A34A"
              iconBg="rgba(34,197,94,0.12)"
              label="Approved"
              value={summary.approved}
              info={`${Math.round((summary.approved / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#16A34A"
              onClick={() => setActiveTab('approved')}
            />
            <MiniStat
              icon={Clock}
              iconColor="#D97706"
              iconBg="rgba(245,158,11,0.12)"
              label="Pending Approval"
              value={summary.pendingApproval}
              info={`${Math.round((summary.pendingApproval / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#D97706"
              onClick={() => setActiveTab('pending')}
            />
            <MiniStat
              icon={Truck}
              iconColor="#7C3AED"
              iconBg="rgba(124,58,237,0.12)"
              label="In Procurement"
              value={summary.inProcurement}
              info={`${Math.round((summary.inProcurement / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#7C3AED"
              onClick={() => setActiveTab('procurement')}
            />
            <MiniStat
              icon={Package}
              iconColor="#0D9488"
              iconBg="rgba(13,148,136,0.12)"
              label="Received"
              value={summary.received}
              info={`${Math.round((summary.received / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#0D9488"
              onClick={() => setActiveTab('received')}
            />
            <MiniStat
              icon={XCircle}
              iconColor="#DC2626"
              iconBg="rgba(239,68,68,0.12)"
              label="Rejected / Cancelled"
              value={summary.rejectedCancelled}
              info={`${Math.round((summary.rejectedCancelled / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#DC2626"
              onClick={() => setActiveTab('rejected')}
            />
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div
            className="mt-5 flex gap-1 overflow-x-auto scroll-smooth rounded-t-[12px] px-3 pt-3"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,100,130,0.12)',
              borderBottom: 'none',
            }}
          >
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(t.key);
                    setPage(1);
                  }}
                  className={`shrink-0 px-3.5 pb-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: active ? '#00B4D8' : '#4A7080',
                    borderBottom: active ? '2px solid #00B4D8' : '2px solid transparent',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div
            className="rounded-b-[12px] p-4 sm:p-5"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,100,130,0.12)',
              borderTop: 'none',
            }}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px] flex-1">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search requests..."
                  className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
              {FILTER_DEFS.map(({ key, def }) => (
                <FilterDropdown
                  key={key}
                  def={def}
                  value={filterValue[key]!}
                  isOpen={openFilter === key}
                  onToggle={() => setOpenFilter(openFilter === key ? null : key)}
                  onSelect={(v) => {
                    filterSetter[key]!(v);
                    setPage(1);
                    setOpenFilter(null);
                  }}
                />
              ))}
              <div
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-2"
                style={{ border: '1px solid rgba(0,100,130,0.18)' }}
              >
                <FormDateInput
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="!h-9 !border-none !px-1"
                  style={{ fontSize: 14, border: 'none' }}
                />
                <span style={{ color: '#8A98A3' }}>–</span>
                <FormDateInput
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="!h-9 !border-none !px-1"
                  style={{ fontSize: 14, border: 'none' }}
                />
              </div>
            </div>
            <div className="mt-2.5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setPage(1)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                Apply Filters
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="min-w-0 flex-1">
                {pageRows.length === 0 ? (
                  <EmptyState
                    message="No requests match these filters"
                    hint="Try widening your search or clearing filters."
                  />
                ) : (
                  <ScrollableTable minWidth={1200} maxHeight={640}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Request No.', 'w-32'],
                        ['Request Date', 'w-28'],
                        ['Department', 'w-32'],
                        ['Requested By', 'w-32'],
                        ['Priority', 'w-24'],
                        ['Total Items', 'w-24'],
                        ['Est. Amount', 'w-32'],
                        ['Status', 'w-36'],
                        ['Last Updated', 'w-36'],
                      ].map(([label, width]) => (
                        <div
                          key={label}
                          className={`${width} shrink-0 py-2.5 pr-2 pl-3 text-center`}
                        >
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                      <div className="w-20 shrink-0 py-2.5 pr-3 text-center">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                    </div>
                    {pageRows.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: '1px solid rgba(0,100,130,0.08)',
                          background: selectedId === r.id ? '#E6F8FD' : 'transparent',
                        }}
                      >
                        <div className="flex w-32 shrink-0 items-center gap-1 py-3 pr-2 pl-3 text-center">
                          <ChevronRight
                            style={{
                              width: 13,
                              height: 13,
                              color: '#8A98A3',
                              flexShrink: 0,
                              transform: selectedId === r.id ? 'rotate(90deg)' : 'none',
                              transition: 'transform 150ms',
                            }}
                          />
                          <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                            {r.id}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(r.requestDate)}
                          </p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2 text-center">
                          <Tooltip content={r.department}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.department}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2 text-center">
                          <Tooltip content={r.requestedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.requestedBy}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2 text-center">
                          <PriorityBadge priority={r.priority} />
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>{r.lineItems.length}</p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2 text-center">
                          <p
                            className="font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {formatCurrency(r.estimatedAmount)}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2 text-center">
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2 text-center">
                          <p
                            className="whitespace-nowrap"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {formatDateTime(r.lastUpdated)}
                          </p>
                        </div>
                        <div
                          className="flex w-20 shrink-0 items-center justify-center gap-1 py-3 pr-3"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setDetailFor(r)}
                            aria-label={`View ${r.id}`}
                            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          >
                            <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <RowMenu
                            request={r}
                            canWrite={canWrite}
                            onView={() => setDetailFor(r)}
                            onApprove={() => handleApprove(r)}
                            onReject={() => handleReject(r)}
                            onAdvance={() => handleAdvance(r)}
                            onCancel={() => handleCancel(r)}
                          />
                        </div>
                      </div>
                    ))}
                  </ScrollableTable>
                )}
                {filtered.length > 0 && (
                  <Pagination
                    page={safePage}
                    pageSize={pageSize}
                    totalItems={filtered.length}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setPage(1);
                    }}
                    itemLabel="requests"
                    pageSizeOptions={[10, 25, 50]}
                  />
                )}
              </div>

              {/* ── Docked Request Details panel ────────────────────────── */}
              {selected && (
                <div
                  className="flex w-full shrink-0 flex-col overflow-hidden rounded-[12px] xl:w-[340px]"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Request Details
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDetailFor(selected)}
                        aria-label="Open full details"
                        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                      >
                        <ExternalLink style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        aria-label="Close"
                        className={`flex size-9 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      >
                        <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                      </button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-5 sm:px-5">
                    <div className="flex items-center gap-2">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 18, color: '#0D2630' }}
                      >
                        {selected.id}
                      </p>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                      {[
                        ['Request Date', formatHumanDate(selected.requestDate)],
                        ['Department', selected.department],
                        ['Requested By', selected.requestedBy],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                          <span
                            className="text-right font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Priority</span>
                        <PriorityBadge priority={selected.priority} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Items</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selected.lineItems.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Estimated Amount</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {formatCurrency(selected.estimatedAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Status</span>
                        <StatusBadge status={selected.status} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Last Updated</span>
                        <span
                          className="text-right font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {formatDateTime(selected.lastUpdated)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Request Summary
                      </p>
                      <div className="mt-3 flex flex-col gap-2.5">
                        {categoryBreakdown(selected.lineItems).map((c) => (
                          <div key={c.category} className="flex items-center justify-between gap-2">
                            <span style={{ fontSize: 14, color: '#4A7080' }}>{c.category}</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {c.count} item{c.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                        <div
                          className="flex items-center justify-between gap-2 border-t pt-2.5"
                          style={{ borderColor: 'rgba(0,100,130,0.1)' }}
                        >
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Total Items
                          </span>
                          <span
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {selected.lineItems.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span style={{ fontSize: 14, color: '#4A7080' }}>Estimated Delivery</span>
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {selected.estimatedDeliveryDate
                              ? formatHumanDate(selected.estimatedDeliveryDate)
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Approval Workflow
                      </p>
                      <div className="mt-3">
                        <ApprovalWorkflow steps={selected.approvalSteps} />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pt-0 sm:p-5 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => setDetailFor(selected)}
                      className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <FileText style={{ width: 15, height: 15 }} />
                      View Full Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {newRequestOpen && (
        <NewProcurementRequestModal
          onClose={() => setNewRequestOpen(false)}
          onSubmit={(request) => {
            setNewRequestOpen(false);
            toast.success('Request submitted', `${request.id} is now Pending Approval.`);
          }}
        />
      )}

      {detailFor && (
        <ProcurementRequestDetailModal request={detailFor} onClose={() => setDetailFor(null)} />
      )}
    </div>
  );
}
