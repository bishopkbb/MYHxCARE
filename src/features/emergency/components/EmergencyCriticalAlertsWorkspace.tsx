'use client';

import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime, isToday, toRelativeTime } from '@/utils/datetime';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import type { QueueEntry } from '@/features/registration/__mocks__/queueFixtures';
import {
  markDoctorReviewed,
  useLabResults,
  type LabResult,
} from '@/features/laboratory/store/labResultStore';
import {
  deriveResultCategory,
  findAlertRow,
  type ResultCategory,
} from '@/features/laboratory/utils/labOrders';
import { deriveRecommendedActions } from '@/features/emergency/__mocks__/emergencyFixtures';

const AlertSettingsModal = dynamic(
  () => import('./AlertSettingsModal').then((m) => m.AlertSettingsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type Severity = 'Critical' | 'High' | 'Moderate';
type StatusFilterValue = 'ALL' | 'UNACK' | 'ACK';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const SEVERITY_CFG: Record<Severity, { color: string; bg: string; icon: typeof AlertOctagon }> = {
  Critical: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)', icon: AlertOctagon },
  High: { color: '#D97706', bg: 'rgba(217,119,6,0.1)', icon: AlertTriangle },
  Moderate: { color: '#D97706', bg: 'rgba(217,119,6,0.08)', icon: AlertTriangle },
};

const PAGE_SIZE = 5;

/** Only ABNORMAL/CRITICAL results have a meaningful severity — CRITICAL maps
 * directly; ABNORMAL splits on whether any row actually crossed high (more
 * urgent) vs only low/unflagged, a real derivation from the row data, not a
 * fabricated third tier. */
function deriveSeverity(r: LabResult): Severity {
  if (r.flag === 'CRITICAL') return 'Critical';
  if ((r.rows ?? []).some((row) => row.flag === 'H')) return 'High';
  return 'Moderate';
}

export function EmergencyCriticalAlertsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const defaultAuthor = user?.name ?? 'Emergency Physician';

  const [pageState, setPageState] = useState<PageState>('loading');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ResultCategory>('ALL');
  const [testFilter, setTestFilter] = useState('ALL');
  const [patientFilter, setPatientFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('ALL');
  const [openFilter, setOpenFilter] = useState<'severity' | 'category' | 'test' | 'patient' | null>(
    null,
  );
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  const allEntries = useQueueEntries();
  const allResults = useLabResults();

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const emergencyEntries = allEntries.filter((e) => e.isEmergency);
  const entryByMrn = new Map<string, QueueEntry>(emergencyEntries.map((e) => [e.mrn, e]));

  const alerts = allResults.filter(
    (r) => (r.flag === 'CRITICAL' || r.flag === 'ABNORMAL') && entryByMrn.has(r.mrn),
  );

  const critUnack = alerts.filter((r) => deriveSeverity(r) === 'Critical' && !r.doctorReviewedAt);
  const highUnack = alerts.filter((r) => deriveSeverity(r) === 'High' && !r.doctorReviewedAt);
  const modUnack = alerts.filter((r) => deriveSeverity(r) === 'Moderate' && !r.doctorReviewedAt);
  const acknowledged = alerts.filter((r) => r.doctorReviewedAt);
  const resolvedToday = acknowledged.filter((r) => isToday(r.doctorReviewedAt!));

  const q = search.trim().toLowerCase();
  const filtered = alerts
    .filter((r) => severityFilter === 'ALL' || deriveSeverity(r) === severityFilter)
    .filter((r) => categoryFilter === 'ALL' || deriveResultCategory(r) === categoryFilter)
    .filter((r) => testFilter === 'ALL' || r.testName === testFilter)
    .filter((r) => patientFilter === 'ALL' || r.mrn === patientFilter)
    .filter((r) => {
      if (statusFilter === 'UNACK') return !r.doctorReviewedAt;
      if (statusFilter === 'ACK') return !!r.doctorReviewedAt;
      return true;
    })
    .filter(
      (r) => !q || r.testName.toLowerCase().includes(q) || r.patientName.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const aUnack = !a.doctorReviewedAt;
      const bUnack = !b.doctorReviewedAt;
      if (aUnack !== bUnack) return aUnack ? -1 : 1;
      const rank: Record<Severity, number> = { Critical: 0, High: 1, Moderate: 2 };
      const sevDiff = rank[deriveSeverity(a)] - rank[deriveSeverity(b)];
      if (sevDiff !== 0) return sevDiff;
      return (
        new Date(b.resultAt ?? b.orderedAt).getTime() -
        new Date(a.resultAt ?? a.orderedAt).getTime()
      );
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectedAlert: LabResult | undefined = selectedAlertId
    ? alerts.find((r) => r.id === selectedAlertId)
    : filtered[0];
  const selectedEntry = selectedAlert ? entryByMrn.get(selectedAlert.mrn) : undefined;
  const selectedRow = selectedAlert ? findAlertRow(selectedAlert) : undefined;

  const recentCritical = alerts
    .filter((r) => r.flag === 'CRITICAL')
    .sort(
      (a, b) =>
        new Date(b.resultAt ?? b.orderedAt).getTime() -
        new Date(a.resultAt ?? a.orderedAt).getTime(),
    )
    .slice(0, 3);

  const testNameOptions = Array.from(new Set(alerts.map((r) => r.testName)));
  const patientOptions = Array.from(new Set(alerts.map((r) => r.mrn))).map((mrn) => ({
    mrn,
    name: entryByMrn.get(mrn)?.patientName ?? mrn,
  }));

  function handleAcknowledge(id: string) {
    markDoctorReviewed(id, defaultAuthor);
    toast.success('Alert acknowledged', 'This critical alert has been marked as reviewed.');
  }

  function handleExport() {
    downloadCSV('critical-alerts', [
      [
        'Severity',
        'Patient',
        'MRN',
        'Test',
        'Category',
        'Result',
        'Reference',
        'Ordered By',
        'Status',
        'Date/Time',
      ],
      ...filtered.map((r) => {
        const row = findAlertRow(r);
        return [
          deriveSeverity(r),
          r.patientName,
          r.mrn,
          r.testName,
          deriveResultCategory(r),
          row ? `${row.value} ${row.unit ?? ''}`.trim() : '—',
          row?.reference ?? '—',
          r.orderedBy,
          r.doctorReviewedAt ? 'Acknowledged' : 'Unacknowledged',
          formatHumanDate(r.resultAt ?? r.orderedAt) + ' ' + formatTime(r.resultAt ?? r.orderedAt),
        ];
      }),
    ]);
    toast.success('Export ready', `${filtered.length} alerts exported.`);
  }

  function handlePrintSummary() {
    const body = `
      <h1>Critical Alerts Summary</h1>
      <p class="meta">Emergency Department · ${escapeHtml(formatHumanDate(new Date()))}</p>
      <hr>
      <p>Critical (Unacknowledged): ${critUnack.length}</p>
      <p>High Priority (Unacknowledged): ${highUnack.length}</p>
      <p>Moderate Priority (Unacknowledged): ${modUnack.length}</p>
      <p>Acknowledged: ${acknowledged.length}</p>
      <p>Resolved Today: ${resolvedToday.length}</p>
      <h3>Alerts</h3>
      <table><thead><tr><th>Severity</th><th>Patient</th><th>Test</th><th>Status</th></tr></thead><tbody>
      ${filtered
        .map(
          (r) =>
            `<tr><td>${escapeHtml(deriveSeverity(r))}</td><td>${escapeHtml(r.patientName)}</td><td>${escapeHtml(r.testName)}</td><td>${r.doctorReviewedAt ? 'Acknowledged' : 'Unacknowledged'}</td></tr>`,
        )
        .join('')}
      </tbody></table>
    `;
    downloadPDF('critical-alerts-summary', body);
  }

  const FILTER_DEFS: { key: 'severity' | 'category' | 'test' | 'patient'; def: FilterDef }[] = [
    {
      key: 'severity',
      def: {
        key: 'severity',
        defaultLabel: 'All Alert Types',
        options: (['Critical', 'High', 'Moderate'] as Severity[]).map((s) => ({
          value: s,
          label: s,
        })),
      },
    },
    {
      key: 'category',
      def: {
        key: 'category',
        defaultLabel: 'All Categories',
        options: (['Laboratory', 'Imaging', 'Cardiology', 'Microbiology'] as ResultCategory[]).map(
          (c) => ({
            value: c,
            label: c,
          }),
        ),
      },
    },
    {
      key: 'test',
      def: {
        key: 'test',
        defaultLabel: 'All Tests / Investigations',
        options: testNameOptions.map((t) => ({ value: t, label: t })),
      },
    },
    {
      key: 'patient',
      def: {
        key: 'patient',
        defaultLabel: 'All Patients',
        options: patientOptions.map((p) => ({ value: p.mrn, label: p.name })),
      },
    },
  ];
  const filterValue: Record<string, string> = {
    severity: severityFilter,
    category: categoryFilter,
    test: testFilter,
    patient: patientFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    severity: (v) => setSeverityFilter(v as Severity),
    category: (v) => setCategoryFilter(v as ResultCategory),
    test: setTestFilter,
    patient: setPatientFilter,
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Critical Alerts
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (pageState === 'loading') {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-64 animate-pulse rounded-[12px] bg-slate-100" />
        </div>
      </main>
    );
  }

  const STAT_CARDS: {
    key: string;
    label: string;
    value: number;
    color: string;
    bg: string;
    icon: typeof AlertOctagon;
    onView: () => void;
  }[] = [
    {
      key: 'crit',
      label: 'Critical (Unacknowledged)',
      value: critUnack.length,
      color: '#DC2626',
      bg: 'rgba(220,38,38,0.1)',
      icon: AlertOctagon,
      onView: () => {
        setSeverityFilter('Critical');
        setStatusFilter('UNACK');
        setPage(1);
      },
    },
    {
      key: 'high',
      label: 'High Priority',
      value: highUnack.length,
      color: '#D97706',
      bg: 'rgba(217,119,6,0.1)',
      icon: AlertTriangle,
      onView: () => {
        setSeverityFilter('High');
        setStatusFilter('UNACK');
        setPage(1);
      },
    },
    {
      key: 'mod',
      label: 'Moderate Priority',
      value: modUnack.length,
      color: '#D97706',
      bg: 'rgba(217,119,6,0.08)',
      icon: Users,
      onView: () => {
        setSeverityFilter('Moderate');
        setStatusFilter('UNACK');
        setPage(1);
      },
    },
    {
      key: 'ack',
      label: 'Acknowledged',
      value: acknowledged.length,
      color: '#16A34A',
      bg: 'rgba(22,163,74,0.1)',
      icon: CheckCircle2,
      onView: () => {
        setSeverityFilter('ALL');
        setStatusFilter('ACK');
        setPage(1);
      },
    },
    {
      key: 'resolved',
      label: 'Resolved (Today)',
      value: resolvedToday.length,
      color: '#4A7080',
      bg: 'rgba(74,112,128,0.1)',
      icon: Clock,
      onView: () => {
        setSeverityFilter('ALL');
        setStatusFilter('ACK');
        setPage(1);
      },
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergency)}
            className={`font-sans transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            Home
          </button>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Diagnostics</span>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
            Critical Alerts
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle style={{ width: 22, height: 22, color: '#DC2626' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Critical Alerts
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Monitor and act on critical laboratory and imaging alerts immediately.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                handleRetry();
                toast.success('Refreshed', 'Showing the latest critical alerts.');
              }}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Settings style={{ width: 15, height: 15 }} />
              Alert Settings
            </button>
            <button
              type="button"
              onClick={handleExport}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Download style={{ width: 15, height: 15 }} />
              Export Alerts
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_320px] 2xl:items-start">
          <div className="min-w-0">
            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {STAT_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="flex items-start gap-3 rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: card.bg }}
                    >
                      <Icon style={{ width: 20, height: 20, color: card.color }} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{card.label}</p>
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 22, color: '#0D2630' }}
                      >
                        {card.value}
                      </p>
                      <button
                        type="button"
                        onClick={card.onView}
                        className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        View Alerts
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filter bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {FILTER_DEFS.map(({ key, def }) => (
                <FilterDropdown
                  key={key}
                  def={def}
                  value={filterValue[key] ?? 'ALL'}
                  isOpen={openFilter === key}
                  onToggle={() => setOpenFilter((prev) => (prev === key ? null : key))}
                  onSelect={(v) => {
                    filterSetter[key]?.(v);
                    setOpenFilter(null);
                    setPage(1);
                  }}
                />
              ))}
              <div className="relative min-w-[200px] flex-1">
                <Search
                  style={{
                    width: 16,
                    height: 16,
                    color: '#8A98A3',
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search alerts..."
                  className={`h-11 w-full rounded-[10px] py-2 pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
            </div>

            {/* Alerts table */}
            <div
              className="mt-4 rounded-[12px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Bell style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    No critical alerts
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    {alerts.length === 0
                      ? 'No abnormal or critical results for patients currently in the Emergency Department.'
                      : 'Try a different search term or filter combination.'}
                  </p>
                </div>
              ) : (
                <>
                  <ScrollableTable minWidth={1150}>
                    <div
                      className={`flex items-center rounded-t-[12px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Alert Type', 'w-28'],
                        ['Patient', 'min-w-[180px] flex-1'],
                        ['Test / Investigation', 'w-40'],
                        ['Result', 'w-32'],
                        ['Alert Trigger', 'w-32'],
                        ['Date & Time', 'w-32'],
                        ['Ordered By', 'w-28'],
                        ['Status', 'w-36'],
                        ['', 'w-20'],
                      ].map(([label, width]) => (
                        <div
                          key={label}
                          className={`${width} shrink-0 overflow-hidden px-2 py-2.5 text-center`}
                        >
                          <span
                            className="truncate font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                    {paged.map((r) => {
                      const severity = deriveSeverity(r);
                      const cfg = SEVERITY_CFG[severity];
                      const Icon = cfg.icon;
                      const entry = entryByMrn.get(r.mrn);
                      const row = findAlertRow(r);
                      const isSelected = selectedAlert?.id === r.id;
                      return (
                        <div
                          key={r.id}
                          className="flex cursor-pointer items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                          onClick={() => setSelectedAlertId(r.id)}
                          style={{
                            background: isSelected
                              ? 'rgba(0,180,216,0.05)'
                              : r.flag === 'CRITICAL'
                                ? 'rgba(220,38,38,0.03)'
                                : 'transparent',
                            borderBottom: '1px solid rgba(0,100,130,0.08)',
                          }}
                        >
                          <div className="w-28 shrink-0 px-2 py-3 text-center">
                            <span
                              className="inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
                              style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
                            >
                              <Icon style={{ width: 12, height: 12 }} />
                              {severity}
                            </span>
                          </div>
                          <div className="min-w-[180px] flex-1 px-2 py-3 text-center">
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.patientName}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {r.mrn}
                              {entry ? ` · ${entry.age}Y / ${entry.gender[0]}` : ''}
                            </p>
                          </div>
                          <div className="w-40 shrink-0 px-2 py-3 text-center">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.testName}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {deriveResultCategory(r)}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <p
                              className="font-sans font-semibold"
                              style={{
                                fontSize: 14,
                                color:
                                  row?.flag === 'H'
                                    ? '#DC2626'
                                    : row?.flag === 'L'
                                      ? '#2563EB'
                                      : '#0D2630',
                              }}
                            >
                              {row ? `${row.value} ${row.unit ?? ''}`.trim() : '—'}
                            </p>
                            {row?.flag && (
                              <p
                                style={{
                                  fontSize: 14,
                                  color: row.flag === 'H' ? '#DC2626' : '#2563EB',
                                }}
                              >
                                {row.flag === 'H' ? 'High' : 'Low'}
                              </p>
                            )}
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {row?.reference ?? '—'}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatTime(r.resultAt ?? r.orderedAt)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatHumanDate(r.resultAt ?? r.orderedAt)}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 px-2 py-3 text-center">
                            <Tooltip content={r.orderedBy}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {r.orderedBy}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-36 shrink-0 px-2 py-3 text-center">
                            {r.doctorReviewedAt ? (
                              <>
                                <p
                                  className="font-sans font-medium"
                                  style={{ fontSize: 14, color: '#16A34A' }}
                                >
                                  Acknowledged
                                </p>
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {toRelativeTime(r.doctorReviewedAt)}
                                  {r.doctorReviewedBy ? ` by ${r.doctorReviewedBy}` : ''}
                                </p>
                              </>
                            ) : (
                              <>
                                <p
                                  className="font-sans font-medium"
                                  style={{ fontSize: 14, color: '#DC2626' }}
                                >
                                  Unacknowledged
                                </p>
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {toRelativeTime(r.resultAt ?? r.orderedAt)}
                                </p>
                              </>
                            )}
                          </div>
                          <div
                            className="flex w-20 shrink-0 items-center justify-center gap-1 px-2 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedAlertId(r.id)}
                              aria-label="View details"
                              className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                            </button>
                            <AlertRowMenu
                              open={openRowMenuId === r.id}
                              onToggle={() =>
                                setOpenRowMenuId((prev) => (prev === r.id ? null : r.id))
                              }
                              isAcknowledged={!!r.doctorReviewedAt}
                              onAcknowledge={() => {
                                setOpenRowMenuId(null);
                                handleAcknowledge(r.id);
                              }}
                              onViewResults={() => {
                                setOpenRowMenuId(null);
                                if (entry)
                                  router.push(
                                    `${ROUTES.emergencyResultsReview}?entryId=${entry.id}`,
                                  );
                              }}
                              onOpenChart={() => {
                                setOpenRowMenuId(null);
                                router.push(ROUTES.patients);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </ScrollableTable>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
                      {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}{' '}
                      critical alerts
                    </p>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          aria-label="Previous page"
                          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                          style={{ border: '1px solid rgba(0,100,130,0.2)' }}
                        >
                          <ChevronLeft style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            className={`flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              color: p === currentPage ? '#FFFFFF' : '#0D2630',
                              background: p === currentPage ? '#0D2630' : 'transparent',
                              border: p === currentPage ? 'none' : '1px solid rgba(0,100,130,0.2)',
                            }}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          aria-label="Next page"
                          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                          style={{ border: '1px solid rgba(0,100,130,0.2)' }}
                        >
                          <ChevronRight style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Alert Details */}
            {selectedAlert && selectedEntry && (
              <div
                className="mt-4 rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Alert Details (Selected Alert)
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div>
                    <span
                      className="inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: SEVERITY_CFG[deriveSeverity(selectedAlert)].color,
                        background: SEVERITY_CFG[deriveSeverity(selectedAlert)].bg,
                      }}
                    >
                      {deriveSeverity(selectedAlert)}
                    </span>
                    <p
                      className="font-display mt-1.5 font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      {selectedAlert.patientName}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      MRN: {selectedAlert.mrn} · {selectedEntry.age} Years, {selectedEntry.gender}
                    </p>
                    <div className="mt-2.5 flex flex-col gap-1">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        Location: <span style={{ color: '#0D2630' }}>ER-01, Resus Bay</span>
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        Attending Physician:{' '}
                        <span style={{ color: '#0D2630' }}>
                          {selectedEntry.attendingDoctor ?? '—'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Test / Investigation</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {selectedAlert.testName}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {deriveResultCategory(selectedAlert)}
                    </p>
                    {selectedRow && (
                      <>
                        <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                          Critical Result
                        </p>
                        <p
                          className="font-sans font-semibold"
                          style={{
                            fontSize: 16,
                            color:
                              selectedRow.flag === 'H'
                                ? '#DC2626'
                                : selectedRow.flag === 'L'
                                  ? '#2563EB'
                                  : '#0D2630',
                          }}
                        >
                          {selectedRow.value} {selectedRow.unit}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          Alert Trigger: {selectedRow.reference}
                        </p>
                      </>
                    )}
                  </div>

                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Date &amp; Time</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {formatHumanDate(selectedAlert.resultAt ?? selectedAlert.orderedAt)},{' '}
                      {formatTime(selectedAlert.resultAt ?? selectedAlert.orderedAt)}
                    </p>
                    <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Ordered By
                    </p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {selectedAlert.orderedBy}
                    </p>
                    {selectedAlert.doctorReviewedAt && (
                      <>
                        <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                          Acknowledged By
                        </p>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#16A34A' }}
                        >
                          {selectedAlert.doctorReviewedBy} ·{' '}
                          {toRelativeTime(selectedAlert.doctorReviewedAt)}
                        </p>
                      </>
                    )}
                  </div>

                  <div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Recommended Action
                    </p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {deriveRecommendedActions(
                        selectedRow?.parameter ?? selectedAlert.testName,
                      ).map((a) => (
                        <li key={a} className="flex items-start gap-1.5">
                          <span
                            className="mt-1.5 size-1 shrink-0 rounded-full"
                            style={{ background: '#4A7080' }}
                          />
                          <span style={{ fontSize: 14, color: '#4A7080' }}>{a}</span>
                        </li>
                      ))}
                    </ul>
                    {!selectedAlert.doctorReviewedAt && (
                      <PermissionGate permission={PERMISSIONS.LAB_RESULTS_WRITE}>
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(selectedAlert.id)}
                          className={`mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                          style={{ fontSize: 14, background: '#0D2630' }}
                        >
                          <CheckCircle2 style={{ width: 15, height: 15 }} />
                          Acknowledge Alert
                        </button>
                      </PermissionGate>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Recent Critical Alerts
              </p>
              {recentCritical.length === 0 ? (
                <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No critical alerts yet.
                </p>
              ) : (
                <div className="mt-2.5 flex flex-col gap-2.5">
                  {recentCritical.map((r) => {
                    const row = findAlertRow(r);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedAlertId(r.id)}
                        className={`flex items-center justify-between gap-2 text-left transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                      >
                        <div className="min-w-0">
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatTime(r.resultAt ?? r.orderedAt)}
                          </p>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {r.testName}
                          </p>
                        </div>
                        <span
                          className="shrink-0 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#DC2626' }}
                        >
                          {row ? `${row.value} ${row.unit ?? ''}`.trim() : '—'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Alert Summary (Today)
              </p>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <div
                  className="rounded-[10px] p-2.5 text-center"
                  style={{ background: 'rgba(220,38,38,0.06)' }}
                >
                  <p className="font-display font-bold" style={{ fontSize: 18, color: '#DC2626' }}>
                    {critUnack.length + highUnack.length + modUnack.length}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Unack.</p>
                </div>
                <div
                  className="rounded-[10px] p-2.5 text-center"
                  style={{ background: 'rgba(22,163,74,0.06)' }}
                >
                  <p className="font-display font-bold" style={{ fontSize: 18, color: '#16A34A' }}>
                    {acknowledged.length}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Ack.</p>
                </div>
                <div
                  className="rounded-[10px] p-2.5 text-center"
                  style={{ background: 'rgba(74,112,128,0.08)' }}
                >
                  <p className="font-display font-bold" style={{ fontSize: 18, color: '#4A7080' }}>
                    {resolvedToday.length}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Resolved</p>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      selectedEntry
                        ? `${ROUTES.emergencyResultsReview}?entryId=${selectedEntry.id}`
                        : ROUTES.emergencyResultsReview,
                    )
                  }
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <FileText style={{ width: 14, height: 14 }} />
                  Results Review
                </button>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        selectedEntry
                          ? `${ROUTES.emergencyClinicalNotes}?entryId=${selectedEntry.id}`
                          : ROUTES.emergencyClinicalNotes,
                      )
                    }
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    Add Clinical Note
                  </button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        selectedEntry
                          ? `${ROUTES.emergencyDiagnosticRequests}?entryId=${selectedEntry.id}`
                          : ROUTES.emergencyDiagnosticRequests,
                      )
                    }
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    New Diagnostic Request
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={handlePrintSummary}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  Print Alert Summary
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>

      {showSettings && (
        <AlertSettingsModal
          initial={{
            notifyCritical: true,
            notifyHigh: true,
            notifyModerate: false,
            playSound: true,
          }}
          onClose={() => setShowSettings(false)}
          onSave={() => {
            setShowSettings(false);
            toast.success(
              'Preferences saved',
              'Your alert notification preferences have been updated.',
            );
          }}
        />
      )}
    </main>
  );
}

// ── Row menu ─────────────────────────────────────────────────────────────

function AlertRowMenu({
  open,
  onToggle,
  isAcknowledged,
  onAcknowledge,
  onViewResults,
  onOpenChart,
}: {
  open: boolean;
  onToggle: () => void;
  isAcknowledged: boolean;
  onAcknowledge: () => void;
  onViewResults: () => void;
  onOpenChart: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={200}>
        {!isAcknowledged && (
          <PermissionGate permission={PERMISSIONS.LAB_RESULTS_WRITE}>
            <button
              type="button"
              onClick={onAcknowledge}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <CheckCircle2 style={{ width: 15, height: 15, color: '#16A34A' }} />
              Acknowledge Alert
            </button>
          </PermissionGate>
        )}
        <button
          type="button"
          onClick={onViewResults}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <FileText style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View in Results Review
        </button>
        <button
          type="button"
          onClick={onOpenChart}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Users style={{ width: 15, height: 15, color: '#4A7080' }} />
          Open Patient Chart
        </button>
      </RowMenuPortal>
    </div>
  );
}
