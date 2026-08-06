'use client';

import {
  Archive,
  CheckCircle2,
  Clock,
  FlaskConical,
  Hourglass,
  MoreVertical,
  Printer,
  Settings,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';

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
import { useToast } from '@/hooks/useToast';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatDate, formatDateTime, formatTime } from '@/utils/datetime';
import {
  getActiveLotsInUse,
  getNextQcDue,
  getQcTodaySummary,
  updateCorrectiveAction,
  updateQcLot,
  useCorrectiveActions,
  useQcLots,
  useQcRuns,
} from '@/features/laboratory/store/qcStore';
import {
  QC_INSTRUMENTS,
  getInstrument,
  type CorrectiveAction,
  type CorrectiveActionStatus,
  type QcLevel,
  type QcLot,
  type QcLotStatus,
  type QcRun,
  type QcRunStatus,
} from '@/features/laboratory/__mocks__/qcFixtures';
import type { LabDepartment } from '@/features/laboratory/__mocks__/labResultFixtures';

const NewQcRunModal = dynamic(() => import('./NewQcRunModal').then((m) => m.NewQcRunModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});
const QcSetupModal = dynamic(() => import('./QcSetupModal').then((m) => m.QcSetupModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabKey = 'runs' | 'levey-jennings' | 'westgard' | 'lots' | 'corrective-actions';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'runs', label: 'QC Runs' },
  { key: 'levey-jennings', label: 'Levey-Jennings Charts' },
  { key: 'westgard', label: 'Westgard Rules' },
  { key: 'lots', label: 'QC Lots' },
  { key: 'corrective-actions', label: 'Corrective Actions' },
];

// ── Status badges ─────────────────────────────────────────────────────────────

const RUN_STATUS_CFG: Record<QcRunStatus, { color: string; border: string; bg: string }> = {
  Passed: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  Failed: { color: '#DC2626', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  'In Progress': { color: '#B45309', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
};

const LOT_STATUS_CFG: Record<QcLotStatus, { color: string; border: string; bg: string }> = {
  Active: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  'Expiring Soon': {
    color: '#B45309',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
  },
  Expired: { color: '#DC2626', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Depleted: { color: '#4A7080', border: 'rgba(74,112,128,0.3)', bg: 'rgba(74,112,128,0.08)' },
};

const CA_STATUS_CFG: Record<CorrectiveActionStatus, { color: string; border: string; bg: string }> =
  {
    Open: { color: '#DC2626', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
    'In Progress': {
      color: '#B45309',
      border: 'rgba(245,158,11,0.4)',
      bg: 'rgba(245,158,11,0.08)',
    },
    Resolved: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  };

function StatusBadge({
  status,
  cfg,
}: {
  status: string;
  cfg: { color: string; border: string; bg: string };
}) {
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 font-sans font-medium"
      style={{
        fontSize: 14,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

const DEPARTMENTS: LabDepartment[] = Array.from(new Set(QC_INSTRUMENTS.map((i) => i.department)));
const TEST_GROUPS = Array.from(new Set(QC_INSTRUMENTS.map((i) => i.testGroup)));

type FilterKey = 'dateRange' | 'department' | 'instrument' | 'testGroup' | 'qcType' | 'status';
type FilterState = {
  dateRange: string;
  department: string;
  instrument: string;
  testGroup: string;
  qcType: string;
  status: string;
};
const FILTER_DEFAULTS: FilterState = {
  dateRange: 'ALL',
  department: 'ALL',
  instrument: 'ALL',
  testGroup: 'ALL',
  qcType: 'ALL',
  status: 'ALL',
};

const FILTER_DEFS: { key: FilterKey; def: FilterDef }[] = [
  {
    key: 'dateRange',
    def: {
      key: 'dateRange',
      defaultLabel: 'All Time',
      options: [
        { value: 'TODAY', label: 'Today' },
        { value: 'YESTERDAY', label: 'Yesterday' },
        { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
        { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
      ],
    },
  },
  {
    key: 'department',
    def: {
      key: 'department',
      defaultLabel: 'All Departments',
      options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
    },
  },
  {
    key: 'instrument',
    def: {
      key: 'instrument',
      defaultLabel: 'All Instruments',
      options: QC_INSTRUMENTS.map((i) => ({ value: i.id, label: i.name })),
    },
  },
  {
    key: 'testGroup',
    def: {
      key: 'testGroup',
      defaultLabel: 'All Test Groups',
      options: TEST_GROUPS.map((g) => ({ value: g, label: g })),
    },
  },
  {
    key: 'qcType',
    def: {
      key: 'qcType',
      defaultLabel: 'All Types',
      options: [
        { value: 'Internal', label: 'Internal' },
        { value: 'External', label: 'External' },
      ],
    },
  },
  {
    key: 'status',
    def: {
      key: 'status',
      defaultLabel: 'All Status',
      options: [
        { value: 'Passed', label: 'Passed' },
        { value: 'Failed', label: 'Failed' },
        { value: 'In Progress', label: 'In Progress' },
      ],
    },
  },
];

function dateRangeCutoff(range: string): number | null {
  const now = new Date();
  if (range === 'TODAY')
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (range === 'YESTERDAY') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  }
  if (range === 'LAST_7_DAYS') return now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (range === 'LAST_30_DAYS') return now.getTime() - 30 * 24 * 60 * 60 * 1000;
  return null;
}

// ── Small shared pieces ────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  iconBg,
  deltaPct,
  deltaGoodDirection = 'up',
}: {
  icon: typeof FlaskConical;
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
  deltaPct?: number | null;
  deltaGoodDirection?: 'up' | 'down';
}) {
  const isGood = deltaPct != null && (deltaGoodDirection === 'up' ? deltaPct >= 0 : deltaPct <= 0);
  return (
    <div
      className="flex flex-col gap-2.5 rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 16, height: 16, color: iconColor }} />
        </div>
        <Tooltip content={label}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {label}
          </p>
        </Tooltip>
      </div>
      <p className="font-display font-bold" style={{ fontSize: 26, color: '#0D2630' }}>
        {value}
      </p>
      {deltaPct != null ? (
        <p style={{ fontSize: 14, color: isGood ? '#16A34A' : '#DC2626' }}>
          {deltaPct >= 0 ? '↑' : '↓'} {Math.abs(deltaPct)}% vs yesterday
        </p>
      ) : (
        <p style={{ fontSize: 14, color: '#8A98A3' }}>&nbsp;</p>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
      <Tooltip content={value}>
        <p
          className="min-w-0 truncate text-right font-sans font-medium"
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          {value}
        </p>
      </Tooltip>
    </div>
  );
}

function EmptyState({
  message,
  hint,
  onClear,
}: {
  message: string;
  hint: string;
  onClear?: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(226,237,241,0.6)' }}
      >
        <FlaskConical style={{ width: 28, height: 28, color: '#8A98A3' }} />
      </div>
      <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
        {message}
      </p>
      <p style={{ fontSize: 14, color: '#4A7080' }}>{hint}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className={`mt-1 font-sans font-semibold transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#00B4D8' }}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ── Levey-Jennings chart (hand-rolled SVG, same technique as
// DailyAttendanceWorkspace.tsx's own path/circle chart) ─────────────────────

function LeveyJenningsChart({
  points,
  mean,
  sd,
}: {
  points: { runAt: string; observed: number; rule?: string }[];
  mean: number;
  sd: number;
}) {
  const W = 900;
  const H = 260;
  const lowBound = mean - 3.5 * sd;
  const highBound = mean + 3.5 * sd;
  const range = highBound - lowBound || 1;

  const yFor = (v: number) => H - ((v - lowBound) / range) * H;
  const stepX = points.length > 1 ? W / (points.length - 1) : 0;

  const bands = [
    { label: '+3SD', v: mean + 3 * sd },
    { label: '+2SD', v: mean + 2 * sd },
    { label: '+1SD', v: mean + sd },
    { label: 'Mean', v: mean },
    { label: '-1SD', v: mean - sd },
    { label: '-2SD', v: mean - 2 * sd },
    { label: '-3SD', v: mean - 3 * sd },
  ];

  const coords = points.map((p, i) => ({
    x: points.length > 1 ? i * stepX : W / 2,
    y: yFor(p.observed),
    ...p,
  }));
  const pathD = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  function pointColor(observed: number) {
    const dev = Math.abs(observed - mean) / sd;
    if (dev > 3) return '#DC2626';
    if (dev > 2) return '#D97706';
    return '#16A34A';
  }

  if (points.length === 0) {
    return (
      <EmptyState
        message="No control results yet for this combination"
        hint="Log a QC run for this instrument, test, and level to start charting."
      />
    );
  }

  return (
    <div className="mt-2 flex gap-3" style={{ height: 320 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 52 }}>
        {[...bands].map((b) => (
          <span key={b.label} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {b.label}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1 overflow-x-auto scroll-smooth">
        <div style={{ minWidth: 700, height: '100%' }}>
          <div
            className="absolute inset-x-0 top-0 flex flex-col justify-between"
            style={{ height: 'calc(100% - 24px)', width: '100%' }}
          >
            {bands.map((b) => (
              <div
                key={b.label}
                style={{
                  borderTop:
                    b.label === 'Mean'
                      ? '1.5px solid rgba(0,100,130,0.35)'
                      : '1px dashed rgba(0,100,130,0.15)',
                }}
              />
            ))}
          </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-0"
            style={{ height: 'calc(100% - 24px)', width: '100%' }}
          >
            <path
              d={pathD}
              fill="none"
              stroke="#00B4D8"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            {coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={4.5}
                fill={pointColor(c.observed)}
                stroke="#FFFFFF"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex" style={{ height: 24 }}>
            {coords.map((c, i) => (
              <span
                key={i}
                className="absolute font-sans"
                style={{
                  fontSize: 14,
                  color: '#8A98A3',
                  left: `${(c.x / W) * 100}%`,
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatDate(c.runAt)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main workspace ────────────────────────────────────────────────────────────

export function QualityControlWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const runs = useQcRuns();
  const lots = useQcLots();
  const correctiveActions = useCorrectiveActions();

  const [tab, setTab] = useState<TabKey>('runs');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runs[0]?.id ?? null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [showNewRun, setShowNewRun] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const [ljInstrumentId, setLjInstrumentId] = useState(QC_INSTRUMENTS[0]!.id);
  const [ljTest, setLjTest] = useState(QC_INSTRUMENTS[0]!.tests[0]!.name);
  const [ljLevel, setLjLevel] = useState<QcLevel>('Level 1');

  const [caRootCause, setCaRootCause] = useState('');
  const [caActionTaken, setCaActionTaken] = useState('');
  const [caStatus, setCaStatus] = useState<CorrectiveActionStatus>('Open');
  const [caDirtyId, setCaDirtyId] = useState<string | null>(null);

  const todaySummary = getQcTodaySummary();
  const activeLotsInUse = getActiveLotsInUse();
  const nextDue = getNextQcDue();

  const filteredRuns = useMemo(() => {
    const cutoff = dateRangeCutoff(filters.dateRange);
    return runs.filter((r) => {
      const instrument = getInstrument(r.instrumentId)!;
      if (filters.department !== 'ALL' && instrument.department !== filters.department)
        return false;
      if (filters.instrument !== 'ALL' && r.instrumentId !== filters.instrument) return false;
      if (filters.testGroup !== 'ALL' && instrument.testGroup !== filters.testGroup) return false;
      if (filters.qcType !== 'ALL' && r.qcType !== filters.qcType) return false;
      if (filters.status !== 'ALL' && r.status !== filters.status) return false;
      if (cutoff !== null && new Date(r.runAt).getTime() < cutoff) return false;
      return true;
    });
  }, [runs, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginatedRuns = filteredRuns.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const rowMenuRefs = useMemo(() => {
    const map = new Map<string, RefObject<HTMLButtonElement | null>>();
    for (const r of paginatedRuns) map.set(r.id, { current: null });
    for (const a of correctiveActions) map.set(a.id, { current: null });
    for (const l of lots) map.set(l.id, { current: null });
    return map;
  }, [paginatedRuns, correctiveActions, lots]);
  function getMenuRef(id: string) {
    return rowMenuRefs.get(id) ?? { current: null };
  }

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;
  const selectedAction = correctiveActions.find((a) => a.id === selectedActionId) ?? null;

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => v !== FILTER_DEFAULTS[k as FilterKey],
  );

  function resetFilters() {
    setFilters(FILTER_DEFAULTS);
    setPage(1);
  }
  function setFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenFilter(null);
    setPage(1);
  }

  function openCorrectiveAction(action: CorrectiveAction) {
    setSelectedActionId(action.id);
    setCaStatus(action.status);
    setCaRootCause(action.rootCause ?? '');
    setCaActionTaken(action.actionTaken ?? '');
    setCaDirtyId(null);
  }

  function saveCorrectiveAction() {
    if (!selectedAction) return;
    updateCorrectiveAction(selectedAction.id, {
      status: caStatus,
      ...(caRootCause.trim() ? { rootCause: caRootCause.trim() } : {}),
      ...(caActionTaken.trim() ? { actionTaken: caActionTaken.trim() } : {}),
    });
    toast.success(
      'Corrective action updated',
      `${selectedAction.instrumentName} — ${selectedAction.test}`,
    );
    setCaDirtyId(null);
  }

  function jumpToChart(run: QcRun) {
    setLjInstrumentId(run.instrumentId);
    setLjLevel(run.level);
    const firstTest = run.results[0]?.test;
    if (firstTest) setLjTest(firstTest);
    setTab('levey-jennings');
  }

  function printRun(run: QcRun) {
    const inst = getInstrument(run.instrumentId)!;
    const rows = run.results
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.test)}</td><td>${escapeHtml(run.level)}</td><td>${r.targetLow}–${r.targetHigh}</td><td>${r.observed ?? '—'}</td><td>${escapeHtml(r.unit)}</td><td>${escapeHtml(r.status)}</td></tr>`,
      )
      .join('');
    downloadPDF(
      run.id,
      `<h1>QC Run ${escapeHtml(run.id)}</h1><p class="meta">${escapeHtml(inst.name)} — ${escapeHtml(formatDateTime(run.runAt))}</p><hr/><table><thead><tr><th>Test</th><th>Level</th><th>Target Range</th><th>Observed</th><th>Unit</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
    toast.success('Preparing report', 'Run report opened in a new tab.');
  }

  function retireLot(lot: QcLot) {
    updateQcLot(lot.id, { status: 'Depleted' });
    toast.success('Lot retired', `${lot.id} marked as depleted.`);
  }

  const ljInstrument = getInstrument(ljInstrumentId)!;
  const ljTestDef = ljInstrument.tests.find((t) => t.name === ljTest) ?? ljInstrument.tests[0]!;
  const ljRange = ljTestDef.levels[ljLevel];
  const ljPoints = useMemo(() => {
    return runs
      .filter((r) => r.instrumentId === ljInstrumentId && r.level === ljLevel)
      .flatMap((r) =>
        r.results
          .filter((res) => res.test === ljTest && res.observed !== null)
          .map((res) => ({
            runAt: r.runAt,
            observed: res.observed as number,
            ...(res.rule ? { rule: res.rule } : {}),
          })),
      )
      .sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime());
  }, [runs, ljInstrumentId, ljLevel, ljTest]);

  const westgardRows = useMemo(() => {
    return runs
      .flatMap((r) => r.results.filter((res) => res.rule).map((res) => ({ run: r, result: res })))
      .sort((a, b) => new Date(b.run.runAt).getTime() - new Date(a.run.runAt).getTime());
  }, [runs]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
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
            <span style={{ color: '#4A7080' }}>Quality Management</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Quality Control (QC)
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Quality Control (QC)
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Monitor, review and manage quality control activities and results.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowSetup(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Settings style={{ width: 15, height: 15 }} />
                QC Setup
              </button>
              <button
                type="button"
                onClick={() => router.push(ROUTES.laboratoryQcReports)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Archive style={{ width: 15, height: 15 }} />
                QC Reports
              </button>
              <PermissionGate permission={PERMISSIONS.LAB_QC_WRITE}>
                <button
                  type="button"
                  onClick={() => setShowNewRun(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  + New QC Run
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard
              icon={FlaskConical}
              label="QC Runs Today"
              value={todaySummary.runsToday}
              iconColor="#8B5CF6"
              iconBg="rgba(139,92,246,0.12)"
              deltaPct={todaySummary.runsTodayDeltaPct}
            />
            <StatCard
              icon={CheckCircle2}
              label="Passed"
              value={todaySummary.passed}
              iconColor="#16A34A"
              iconBg="rgba(34,197,94,0.12)"
              deltaPct={todaySummary.passedDeltaPct}
            />
            <StatCard
              icon={XCircle}
              label="Failed"
              value={todaySummary.failed}
              iconColor="#DC2626"
              iconBg="rgba(239,68,68,0.12)"
              deltaPct={todaySummary.failedDeltaPct}
              deltaGoodDirection="down"
            />
            <StatCard
              icon={Hourglass}
              label="In Progress"
              value={todaySummary.inProgress}
              iconColor="#D97706"
              iconBg="rgba(245,158,11,0.12)"
              deltaPct={todaySummary.inProgressDeltaPct}
              deltaGoodDirection="down"
            />
            <StatCard
              icon={Archive}
              label="QC Lots In Use"
              value={activeLotsInUse}
              iconColor="#3B82F6"
              iconBg="rgba(59,130,246,0.12)"
            />
            <StatCard
              icon={Clock}
              label="Next QC Due"
              value={nextDue ? formatTime(nextDue.at) : '—'}
              iconColor="#00B4D8"
              iconBg="rgba(0,180,216,0.12)"
            />
          </div>
          {nextDue && (
            <p className="mt-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
              Next due: {nextDue.instrumentName}
            </p>
          )}

          {/* ── Filters ─────────────────────────────────────────────────── */}
          <div
            className="mt-5 flex flex-wrap items-center gap-2.5 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            {FILTER_DEFS.map(({ key, def }) => (
              <FilterDropdown
                key={key}
                def={def}
                value={filters[key]}
                isOpen={openFilter === key}
                onToggle={() => setOpenFilter(openFilter === key ? null : key)}
                onSelect={(v) => setFilter(key, v)}
              />
            ))}
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
              className={`ml-auto flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              Apply Filters
            </button>
          </div>

          {/* ── Tab strip ───────────────────────────────────────────────── */}
          <div
            className="mt-5 flex items-center gap-1 overflow-x-auto scroll-smooth rounded-t-[12px] px-3 pt-3"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,100,130,0.12)',
              borderBottom: 'none',
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
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

          {/* ── QC Runs tab ─────────────────────────────────────────────── */}
          {tab === 'runs' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
              <div
                className="min-w-0 rounded-b-[12px] pb-2"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.12)',
                  borderTop: 'none',
                }}
              >
                {filteredRuns.length === 0 ? (
                  <EmptyState
                    message="No QC runs match these filters"
                    hint="Try widening the date range or clearing filters."
                    onClear={hasActiveFilters ? resetFilters : undefined}
                  />
                ) : (
                  <>
                    <ScrollableTable minWidth={480} maxHeight={560}>
                      <div
                        className={`flex px-3 py-3 ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{
                          background: TABLE_HEADER_BG,
                          borderBottom: '1px solid #0064821F',
                        }}
                      >
                        {[
                          ['Run ID', 'w-[18%]'],
                          ['Date & Time', 'w-[22%]'],
                          ['Instrument', 'min-w-0 flex-1'],
                          ['Status', 'w-28 shrink-0'],
                          ['Actions', 'w-12 shrink-0'],
                        ].map(([label, width]) => (
                          <Tooltip key={label} content={label!}>
                            <span
                              className={`${width} truncate pr-3 font-sans font-bold tracking-wider uppercase`}
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              {label}
                            </span>
                          </Tooltip>
                        ))}
                      </div>

                      {paginatedRuns.map((run) => {
                        const inst = getInstrument(run.instrumentId)!;
                        const cfg = RUN_STATUS_CFG[run.status];
                        const menuOpen = openRowMenuId === run.id;
                        const active = selectedRunId === run.id;
                        return (
                          <div
                            key={run.id}
                            onClick={() => setSelectedRunId(run.id)}
                            className={`flex cursor-pointer items-center px-3 py-3 transition-colors duration-150 ${active ? '' : 'hover:bg-[#F5FBFD]'}`}
                            style={{
                              borderBottom: '1px solid rgba(0,100,130,0.08)',
                              background: active ? 'rgba(0,180,216,0.06)' : undefined,
                            }}
                          >
                            <Tooltip content={run.id}>
                              <span
                                className="w-[18%] truncate pr-3 font-sans font-medium"
                                style={{ fontSize: 14, color: '#00B4D8' }}
                              >
                                {run.id}
                              </span>
                            </Tooltip>
                            <Tooltip content={formatDateTime(run.runAt)}>
                              <span
                                className="w-[22%] truncate pr-3"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {formatDateTime(run.runAt)}
                              </span>
                            </Tooltip>
                            <Tooltip
                              content={`${inst.name} — ${inst.testGroup} · ${run.qcType} · ${run.lotId} · Reviewed by ${run.reviewedBy ?? '—'}`}
                            >
                              <span
                                className="min-w-0 flex-1 truncate pr-3"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {inst.name}
                                <span style={{ color: '#8A98A3' }}>
                                  {' '}
                                  · {run.level === 'Level 1' ? 'L1' : 'L2'}
                                </span>
                              </span>
                            </Tooltip>
                            <span className="w-28 shrink-0 pr-3">
                              <StatusBadge status={run.status} cfg={cfg} />
                            </span>
                            <span
                              className="flex w-12 shrink-0 items-center justify-end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="relative shrink-0">
                                <button
                                  ref={getMenuRef(run.id)}
                                  type="button"
                                  onClick={() => setOpenRowMenuId(menuOpen ? null : run.id)}
                                  aria-label="More actions"
                                  className={`flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] ${FOCUS_RING}`}
                                >
                                  <MoreVertical
                                    style={{ width: 15, height: 15, color: '#4A7080' }}
                                  />
                                </button>
                                <RowMenuPortal
                                  open={menuOpen}
                                  anchorRef={getMenuRef(run.id)}
                                  onClose={() => setOpenRowMenuId(null)}
                                  width={180}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRunId(run.id);
                                      setOpenRowMenuId(null);
                                    }}
                                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] ${FOCUS_RING}`}
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    View Details
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      printRun(run);
                                      setOpenRowMenuId(null);
                                    }}
                                    className={`flex w-full items-center gap-2 px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] ${FOCUS_RING}`}
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    <Printer style={{ width: 14, height: 14 }} />
                                    Print
                                  </button>
                                </RowMenuPortal>
                              </div>
                            </span>
                          </div>
                        );
                      })}
                    </ScrollableTable>

                    <div className="px-3">
                      <Pagination
                        page={clampedPage}
                        pageSize={pageSize}
                        totalItems={filteredRuns.length}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                          setPageSize(size);
                          setPage(1);
                        }}
                        itemLabel="results"
                        pageSizeOptions={[10, 25, 50]}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Docked QC Run Details panel */}
              <div className="flex flex-col gap-4">
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {!selectedRun ? (
                    <EmptyState
                      message="No run selected"
                      hint="Select a run to view its details."
                    />
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <h2
                          className="font-display font-semibold"
                          style={{ fontSize: 18, color: '#0D2630' }}
                        >
                          QC Run Details
                        </h2>
                        <button
                          type="button"
                          onClick={() => setSelectedRunId(null)}
                          aria-label="Close details"
                          className={`flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] ${FOCUS_RING}`}
                        >
                          <X style={{ width: 16, height: 16, color: '#4A7080' }} />
                        </button>
                      </div>
                      <div className="mt-2">
                        <StatusBadge
                          status={selectedRun.status}
                          cfg={RUN_STATUS_CFG[selectedRun.status]}
                        />
                      </div>
                      <p
                        className="mt-2 font-sans font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        {selectedRun.id}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{selectedRun.qcType} QC Run</p>

                      <div className="mt-4 flex flex-col gap-2.5">
                        <DetailField
                          label="Instrument"
                          value={getInstrument(selectedRun.instrumentId)!.name}
                        />
                        <DetailField
                          label="Run Date & Time"
                          value={formatDateTime(selectedRun.runAt)}
                        />
                        <DetailField
                          label="Test Group"
                          value={getInstrument(selectedRun.instrumentId)!.testGroup}
                        />
                        <DetailField label="Level" value={selectedRun.level} />
                        <DetailField label="Control Lot" value={selectedRun.lotId} />
                        <DetailField label="Reviewed By" value={selectedRun.reviewedBy ?? '—'} />
                        <DetailField
                          label="Reviewed On"
                          value={
                            selectedRun.reviewedAt ? formatDateTime(selectedRun.reviewedAt) : '—'
                          }
                        />
                      </div>

                      {selectedRun.comments && (
                        <div className="mt-3">
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>Comments</p>
                          <p className="mt-0.5" style={{ fontSize: 14, color: '#0D2630' }}>
                            {selectedRun.comments}
                          </p>
                        </div>
                      )}

                      <h3
                        className="font-display mt-5 font-semibold"
                        style={{ fontSize: 15, color: '#0D2630' }}
                      >
                        Control Results
                      </h3>
                      <div className="mt-2">
                        <ScrollableTable minWidth={380}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}>
                                {['Test', 'Target Range', 'Observed', 'Status'].map((h) => (
                                  <th
                                    key={h}
                                    className={`py-2 pr-2 text-left font-sans font-bold tracking-wider uppercase ${TABLE_HEADER_STICKY_CLASS}`}
                                    style={{
                                      fontSize: 14,
                                      color: '#4A7080',
                                      background: TABLE_HEADER_BG,
                                    }}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRun.results.map((r) => (
                                <tr
                                  key={r.test}
                                  style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
                                >
                                  <td
                                    className="py-2 pr-2"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    <Tooltip content={r.test}>
                                      <span className="block max-w-[110px] truncate">{r.test}</span>
                                    </Tooltip>
                                  </td>
                                  <td
                                    className="py-2 pr-2 whitespace-nowrap"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {r.targetLow}–{r.targetHigh} {r.unit}
                                  </td>
                                  <td
                                    className="py-2 pr-2"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {r.observed ?? '—'}
                                  </td>
                                  <td className="py-2 pr-2">
                                    <StatusBadge
                                      status={r.status}
                                      cfg={
                                        r.status === 'Passed'
                                          ? RUN_STATUS_CFG.Passed
                                          : r.status === 'Failed'
                                            ? RUN_STATUS_CFG.Failed
                                            : RUN_STATUS_CFG['In Progress']
                                      }
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollableTable>
                      </div>

                      <div className="mt-5 flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => jumpToChart(selectedRun)}
                          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          View Chart
                        </button>
                        <button
                          type="button"
                          onClick={() => printRun(selectedRun)}
                          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          <Printer style={{ width: 15, height: 15 }} />
                          Print
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Levey-Jennings Charts tab ───────────────────────────────── */}
          {tab === 'levey-jennings' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={ljInstrumentId}
                  onChange={(e) => {
                    const inst = getInstrument(e.target.value)!;
                    setLjInstrumentId(inst.id);
                    setLjTest(inst.tests[0]!.name);
                  }}
                  className={`h-11 rounded-[10px] px-3.5 font-sans ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                >
                  {QC_INSTRUMENTS.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <select
                  value={ljTest}
                  onChange={(e) => setLjTest(e.target.value)}
                  className={`h-11 rounded-[10px] px-3.5 font-sans ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                >
                  {ljInstrument.tests.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={ljLevel}
                  onChange={(e) => setLjLevel(e.target.value as QcLevel)}
                  className={`h-11 rounded-[10px] px-3.5 font-sans ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                >
                  <option value="Level 1">Level 1</option>
                  <option value="Level 2">Level 2</option>
                </select>
              </div>

              <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
                {ljInstrument.name} — {ljTest} ({ljLevel}) — mean {ljRange.mean} {ljTestDef.unit},
                SD {ljRange.sd}
              </p>

              <LeveyJenningsChart points={ljPoints} mean={ljRange.mean} sd={ljRange.sd} />
            </div>
          )}

          {/* ── Westgard Rules tab ──────────────────────────────────────── */}
          {tab === 'westgard' && (
            <div
              className="rounded-b-[12px] pb-2"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              {westgardRows.length === 0 ? (
                <EmptyState
                  message="No Westgard rule violations"
                  hint="Flagged control results (warnings or rejects) will appear here."
                />
              ) : (
                <ScrollableTable minWidth={1080} maxHeight={560}>
                  <div
                    className={`flex px-3 py-3 ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{
                      background: TABLE_HEADER_BG,
                      borderBottom: '1px solid #0064821F',
                    }}
                  >
                    {[
                      ['Run ID', 'w-[13%]'],
                      ['Instrument', 'w-[16%]'],
                      ['Test', 'w-[14%]'],
                      ['Level', 'w-[8%]'],
                      ['Rule', 'w-[10%]'],
                      ['Observed', 'w-[12%]'],
                      ['Target Range', 'w-[13%]'],
                      ['Date', 'min-w-0 flex-1'],
                    ].map(([label, width]) => (
                      <Tooltip key={label} content={label!}>
                        <span
                          className={`${width} truncate pr-3 font-sans font-bold tracking-wider uppercase`}
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {label}
                        </span>
                      </Tooltip>
                    ))}
                  </div>
                  {westgardRows.map(({ run, result }) => {
                    const inst = getInstrument(run.instrumentId)!;
                    const ruleColor =
                      result.rule === '1-3s' || result.rule === '2-2s' ? '#DC2626' : '#D97706';
                    return (
                      <div
                        key={`${run.id}-${result.test}`}
                        className="flex items-center px-3 py-3 transition-colors duration-150 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <Tooltip content={run.id}>
                          <span
                            className="w-[13%] truncate pr-3 font-sans font-medium"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            {run.id}
                          </span>
                        </Tooltip>
                        <Tooltip content={inst.name}>
                          <span
                            className="w-[16%] truncate pr-3"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {inst.name}
                          </span>
                        </Tooltip>
                        <Tooltip content={result.test}>
                          <span
                            className="w-[14%] truncate pr-3"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {result.test}
                          </span>
                        </Tooltip>
                        <span
                          className="w-[8%] truncate pr-3"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {run.level}
                        </span>
                        <span className="w-[10%] shrink-0 pr-3">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: ruleColor,
                              border: `1px solid ${ruleColor}66`,
                              background: `${ruleColor}14`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <ShieldAlert style={{ width: 12, height: 12 }} />
                            {result.rule}
                          </span>
                        </span>
                        <span
                          className="w-[12%] truncate pr-3"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {result.observed} {result.unit}
                        </span>
                        <span
                          className="w-[13%] truncate pr-3"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {result.targetLow}–{result.targetHigh}
                        </span>
                        <Tooltip content={formatDateTime(run.runAt)}>
                          <span
                            className="min-w-0 flex-1 truncate pr-3"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {formatDateTime(run.runAt)}
                          </span>
                        </Tooltip>
                      </div>
                    );
                  })}
                </ScrollableTable>
              )}
            </div>
          )}

          {/* ── QC Lots tab ─────────────────────────────────────────────── */}
          {tab === 'lots' && (
            <div
              className="rounded-b-[12px] pb-2"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              {lots.length === 0 ? (
                <EmptyState
                  message="No control lots"
                  hint="Add a control lot from QC Setup to get started."
                />
              ) : (
                <ScrollableTable minWidth={960} maxHeight={560}>
                  <div
                    className={`flex px-3 py-3 ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{
                      background: TABLE_HEADER_BG,
                      borderBottom: '1px solid #0064821F',
                    }}
                  >
                    {[
                      ['Lot ID', 'w-[13%]'],
                      ['Instrument', 'w-[14%]'],
                      ['Levels', 'w-[9%]'],
                      ['Manufacturer', 'min-w-0 flex-1'],
                      ['Opened', 'w-[10%]'],
                      ['Expires', 'w-[10%]'],
                      ['Runs', 'w-[6%]'],
                      ['Status', 'w-28 shrink-0'],
                      ['Actions', 'w-32 shrink-0'],
                    ].map(([label, width]) => (
                      <Tooltip key={label} content={label!}>
                        <span
                          className={`${width} truncate pr-3 font-sans font-bold tracking-wider uppercase`}
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {label}
                        </span>
                      </Tooltip>
                    ))}
                  </div>
                  {lots.map((lot) => {
                    const inst = getInstrument(lot.instrumentId)!;
                    const runsCount = runs.filter((r) => r.lotId === lot.id).length;
                    return (
                      <div
                        key={lot.id}
                        className="flex items-center px-3 py-3 transition-colors duration-150 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <Tooltip content={lot.id}>
                          <span
                            className="w-[13%] truncate pr-3 font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {lot.id}
                          </span>
                        </Tooltip>
                        <Tooltip content={inst.name}>
                          <span
                            className="w-[14%] truncate pr-3"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {inst.name}
                          </span>
                        </Tooltip>
                        <span
                          className="w-[9%] truncate pr-3"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {lot.levels.join(', ')}
                        </span>
                        <Tooltip content={lot.manufacturer}>
                          <span
                            className="min-w-0 flex-1 truncate pr-3"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {lot.manufacturer}
                          </span>
                        </Tooltip>
                        <span
                          className="w-[10%] truncate pr-3"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {formatDate(lot.openedAt)}
                        </span>
                        <span
                          className="w-[10%] truncate pr-3"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {formatDate(lot.expiresAt)}
                        </span>
                        <span
                          className="w-[6%] truncate pr-3"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {runsCount}
                        </span>
                        <span className="w-28 shrink-0 pr-3">
                          <StatusBadge status={lot.status} cfg={LOT_STATUS_CFG[lot.status]} />
                        </span>
                        <span className="w-32 shrink-0">
                          <PermissionGate permission={PERMISSIONS.LAB_QC_WRITE}>
                            <button
                              type="button"
                              disabled={lot.status === 'Depleted'}
                              onClick={() => retireLot(lot)}
                              className={`flex h-11 items-center rounded-[8px] px-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                              style={{ fontSize: 14, color: '#DC2626' }}
                            >
                              Retire Lot
                            </button>
                          </PermissionGate>
                        </span>
                      </div>
                    );
                  })}
                </ScrollableTable>
              )}
            </div>
          )}

          {/* ── Corrective Actions tab ──────────────────────────────────── */}
          {tab === 'corrective-actions' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
              <div
                className="min-w-0 rounded-b-[12px] pb-2"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.12)',
                  borderTop: 'none',
                }}
              >
                {correctiveActions.length === 0 ? (
                  <EmptyState
                    message="No corrective actions"
                    hint="Actions are raised automatically whenever a QC run fails."
                  />
                ) : (
                  <div className="flex flex-col">
                    {correctiveActions.map((action) => {
                      const active = selectedActionId === action.id;
                      return (
                        <div
                          key={action.id}
                          onClick={() => openCorrectiveAction(action)}
                          className={`flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors duration-150 ${active ? '' : 'hover:bg-[#F5FBFD]'}`}
                          style={{
                            borderBottom: '1px solid rgba(0,100,130,0.08)',
                            background: active ? 'rgba(0,180,216,0.06)' : undefined,
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <Tooltip content={action.issue}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {action.issue}
                              </p>
                            </Tooltip>
                            <Tooltip
                              content={`${action.instrumentName} · Assigned to ${action.assignedTo} · Raised ${formatDate(action.raisedAt)}`}
                            >
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {action.instrumentName} · {action.assignedTo} ·{' '}
                                {formatDate(action.raisedAt)}
                              </p>
                            </Tooltip>
                          </div>
                          <span className="shrink-0">
                            <StatusBadge
                              status={action.status}
                              cfg={CA_STATUS_CFG[action.status]}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {!selectedAction ? (
                    <EmptyState
                      message="No action selected"
                      hint="Select a corrective action to view and update it."
                    />
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <h2
                          className="font-display font-semibold"
                          style={{ fontSize: 18, color: '#0D2630' }}
                        >
                          Corrective Action
                        </h2>
                        <button
                          type="button"
                          onClick={() => setSelectedActionId(null)}
                          aria-label="Close details"
                          className={`flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] ${FOCUS_RING}`}
                        >
                          <X style={{ width: 16, height: 16, color: '#4A7080' }} />
                        </button>
                      </div>
                      <p className="mt-2" style={{ fontSize: 14, color: '#0D2630' }}>
                        {selectedAction.issue}
                      </p>

                      <div className="mt-4 flex flex-col gap-2.5">
                        <DetailField label="Instrument" value={selectedAction.instrumentName} />
                        <DetailField label="Rule" value={selectedAction.rule} />
                        <DetailField label="Assigned To" value={selectedAction.assignedTo} />
                        <DetailField
                          label="Raised"
                          value={formatDateTime(selectedAction.raisedAt)}
                        />
                        {selectedAction.resolvedAt && (
                          <DetailField
                            label="Resolved"
                            value={formatDateTime(selectedAction.resolvedAt)}
                          />
                        )}
                      </div>

                      <div className="mt-4">
                        <label
                          htmlFor="ca-status"
                          className="block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Status
                        </label>
                        <select
                          id="ca-status"
                          value={caStatus}
                          onChange={(e) => {
                            setCaStatus(e.target.value as CorrectiveActionStatus);
                            setCaDirtyId(selectedAction.id);
                          }}
                          className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>

                      <div className="mt-3">
                        <label
                          htmlFor="ca-root-cause"
                          className="block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Root Cause
                        </label>
                        <textarea
                          id="ca-root-cause"
                          value={caRootCause}
                          onChange={(e) => {
                            setCaRootCause(e.target.value);
                            setCaDirtyId(selectedAction.id);
                          }}
                          rows={2}
                          className={`mt-1.5 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                          placeholder="What caused this violation?"
                        />
                      </div>

                      <div className="mt-3">
                        <label
                          htmlFor="ca-action-taken"
                          className="block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Action Taken
                        </label>
                        <textarea
                          id="ca-action-taken"
                          value={caActionTaken}
                          onChange={(e) => {
                            setCaActionTaken(e.target.value);
                            setCaDirtyId(selectedAction.id);
                          }}
                          rows={2}
                          className={`mt-1.5 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                          placeholder="What was done to resolve it?"
                        />
                      </div>

                      <PermissionGate permission={PERMISSIONS.LAB_QC_WRITE}>
                        <button
                          type="button"
                          disabled={caDirtyId !== selectedAction.id}
                          onClick={saveCorrectiveAction}
                          className={`mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                          style={{ fontSize: 14, background: '#00B4D8' }}
                        >
                          Save Update
                        </button>
                      </PermissionGate>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>

      {showNewRun && (
        <NewQcRunModal
          onClose={() => setShowNewRun(false)}
          onCreated={(run) => {
            setShowNewRun(false);
            setTab('runs');
            setPage(1);
            setSelectedRunId(run.id);
            toast.success('QC run logged', `${run.id} — ${run.status}`);
          }}
        />
      )}
      {showSetup && (
        <QcSetupModal
          onClose={() => setShowSetup(false)}
          onCreated={(lot) => {
            setShowSetup(false);
            toast.success('Control lot added', `${lot.id} is now available for new QC runs.`);
          }}
        />
      )}
    </div>
  );
}
