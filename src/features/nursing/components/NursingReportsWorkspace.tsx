'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BedDouble,
  CalendarDays,
  Clock,
  Download,
  Eye,
  FileDown,
  Filter as FilterIcon,
  HeartPulse,
  ListOrdered,
  LogOut,
  Pill,
  RefreshCw,
  UserPlus,
  Users2,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { FormDateInput } from '@components/shared/FormDateInput';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';
import { downloadPDF, escapeHtml } from '@/utils/export';
import {
  CATEGORY_OPTIONS,
  NURSING_REPORTS,
  type NursingReport,
  type ReportCategory,
  type TwoColRow,
  type WardBar,
} from '@/features/nursing/__mocks__/nursingReportsFixtures';

const ReportDetailModal = dynamic(
  () => import('./ReportDetailModal').then((m) => m.ReportDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

const REPORT_ICON_CFG: Record<
  NursingReport['id'],
  { icon: LucideIcon; color: string; bg: string }
> = {
  'medication-admin': { icon: Pill, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  shift: { icon: Users2, color: '#16A34A', bg: 'rgba(34,197,94,0.12)' },
  'ward-census': { icon: BedDouble, color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  vitals: { icon: HeartPulse, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  admission: { icon: UserPlus, color: '#16A34A', bg: 'rgba(34,197,94,0.12)' },
  discharge: { icon: LogOut, color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  observation: { icon: Eye, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  'medication-due': { icon: Clock, color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
};

const STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Completed: { color: '#16A34A', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)' },
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.35)' },
  Pending: { color: '#D97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.35)' },
};

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── Small chart primitives ────────────────────────────────────────────────────

function TwoColTable({ columns, rows }: { columns: [string, string]; rows: TwoColRow[] }) {
  return (
    <div>
      <div
        className="flex items-center justify-between pb-2"
        style={{ borderBottom: '1px solid rgba(0,100,130,0.1)' }}
      >
        <span
          className="font-sans font-bold tracking-wider uppercase"
          style={{ fontSize: 14, color: '#4A7080' }}
        >
          {columns[0]}
        </span>
        <span
          className="font-sans font-bold tracking-wider uppercase"
          style={{ fontSize: 14, color: '#4A7080' }}
        >
          {columns[1]}
        </span>
      </div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between py-2"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
        >
          <span className="truncate" style={{ fontSize: 14, color: '#2F3A40' }}>
            {r.label}
          </span>
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  slices,
}: {
  slices: { label: string; count: number; percent: number; color: string }[];
}) {
  const total = slices.reduce((sum, s) => sum + s.count, 0) || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;
  const segments = slices.reduce<
    {
      label: string;
      count: number;
      percent: number;
      color: string;
      length: number;
      offset: number;
    }[]
  >((acc, s) => {
    const cumulative = acc.reduce((sum, seg) => sum + seg.count, 0);
    const rawLength = (s.count / total) * circumference;
    const offset = -(cumulative / total) * circumference;
    acc.push({ ...s, length: Math.max(0, rawLength - gapPx), offset });
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: 130, height: 130 }}
      >
        <svg
          viewBox="0 0 128 128"
          style={{ width: 130, height: 130 }}
          role="img"
          aria-label="Bed status"
        >
          <g transform="rotate(-90 64 64)">
            {segments.map((seg) => (
              <circle
                key={seg.label}
                cx={64}
                cy={64}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${seg.length} ${circumference}`}
                strokeDashoffset={seg.offset}
              />
            ))}
          </g>
        </svg>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                {s.label}
              </span>
            </div>
            <span
              className="shrink-0 font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {s.count} ({s.percent}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerticalBars({ bars }: { bars: WardBar[] }) {
  const maxVal = Math.max(...bars.map((b) => b.count), 1);
  const axisMax = Math.max(2, Math.ceil(maxVal / 2) * 2);
  const ticks = [axisMax, Math.round((axisMax * 2) / 3), Math.round(axisMax / 3), 0];

  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col justify-between py-1" style={{ height: 140 }}>
        {ticks.map((t) => (
          <span key={t} style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}
          </span>
        ))}
      </div>
      <div
        className="flex min-w-0 flex-1 items-end justify-around gap-3"
        style={{
          height: 140,
          borderLeft: '1px solid rgba(0,100,130,0.1)',
          borderBottom: '1px solid rgba(0,100,130,0.1)',
        }}
      >
        {bars.map((b) => (
          <div
            key={b.ward}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          >
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {b.count}
            </span>
            <div
              className="w-full max-w-[36px] rounded-t-[4px]"
              style={{
                height: `${(b.count / axisMax) * 100}%`,
                background: '#3B82F6',
                minHeight: 2,
              }}
            />
            <span style={{ fontSize: 14, color: '#4A7080' }}>{b.ward}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({ bars }: { bars: WardBar[] }) {
  const maxVal = Math.max(...bars.map((b) => b.count), 1);
  const axisMax = maxVal + 1;
  const ticks = Array.from({ length: axisMax + 1 }, (_, i) => i);

  return (
    <div className="flex flex-col gap-2.5">
      {bars.map((b) => (
        <div key={b.ward} className="flex items-center gap-2.5">
          <span className="w-12 shrink-0" style={{ fontSize: 14, color: '#4A7080' }}>
            {b.ward}
          </span>
          <div
            className="min-w-0 flex-1 rounded-full"
            style={{ background: 'rgba(0,100,130,0.06)', height: 14 }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${(b.count / axisMax) * 100}%`, background: '#3B82F6' }}
            />
          </div>
          <span className="w-4 shrink-0 text-right" style={{ fontSize: 14, color: '#0D2630' }}>
            {b.count}
          </span>
        </div>
      ))}
      <div className="ml-[62px] flex justify-between">
        {ticks.map((t) => (
          <span key={t} style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Report card ────────────────────────────────────────────────────────────────

function ReportCard({
  report,
  onView,
  onExport,
}: {
  report: NursingReport;
  onView: () => void;
  onExport: () => void;
}) {
  const cfg = REPORT_ICON_CFG[report.id];
  return (
    <div
      className="flex flex-col rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: cfg.bg }}
        >
          <cfg.icon style={{ width: 20, height: 20, color: cfg.color }} />
        </div>
        <div className="min-w-0">
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            {report.title}
          </h2>
          <p style={{ fontSize: 14, color: '#4A7080' }}>{report.subtitle}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {report.stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
              {s.label}
            </p>
            <p
              className="font-display truncate font-bold"
              style={{ fontSize: 18, color: '#0D2630' }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        {report.id === 'medication-admin' && (
          <div>
            <p className="mb-1 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {report.tableTitle}
            </p>
            <TwoColTable columns={report.columns} rows={report.rows} />
          </div>
        )}

        {report.id === 'shift' && (
          <div>
            <p className="mb-1 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {report.tableTitle}
            </p>
            <div className="flex flex-col">
              {report.rows.map((s) => {
                const statusCfg = STATUS_CFG[s.status]!;
                return (
                  <div
                    key={s.shift}
                    className="py-2"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        {s.shift}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                        style={{
                          fontSize: 14,
                          color: statusCfg.color,
                          background: statusCfg.bg,
                          border: `1px solid ${statusCfg.border}`,
                        }}
                      >
                        {s.status}
                      </span>
                    </div>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {s.time}
                    </p>
                    <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {s.staffInCharge}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {report.id === 'ward-census' && (
          <div>
            <p className="mb-2 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {report.chartTitle}
            </p>
            <DonutChart slices={report.slices} />
          </div>
        )}

        {report.id === 'vitals' && (
          <div>
            <p className="mb-1 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {report.tableTitle}
            </p>
            <TwoColTable columns={report.columns} rows={report.rows} />
          </div>
        )}

        {report.id === 'admission' && (
          <div>
            <p className="mb-2 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {report.chartTitle}
            </p>
            <VerticalBars bars={report.bars} />
          </div>
        )}

        {report.id === 'discharge' && (
          <div>
            <p className="mb-2 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {report.chartTitle}
            </p>
            <HorizontalBars bars={report.bars} />
          </div>
        )}

        {report.id === 'observation' && (
          <div>
            <p className="mb-1 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {report.tableTitle}
            </p>
            <TwoColTable columns={report.columns} rows={report.rows} />
          </div>
        )}

        {report.id === 'medication-due' && (
          <div>
            <p className="mb-1 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {report.tableTitle}
            </p>
            <div className="flex flex-col">
              {report.rows.map((r) => (
                <div
                  key={`${r.time}-${r.medication}`}
                  className="flex items-center justify-between gap-2 py-2"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
                >
                  <div className="min-w-0">
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#2F3A40' }}
                    >
                      {r.medication}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{r.time}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                    style={{ fontSize: 14, color: '#2563EB', background: 'rgba(37,99,235,0.08)' }}
                  >
                    {r.patients} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onView}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ border: '1px solid rgba(0,100,130,0.15)', color: '#0D2630', fontSize: 14 }}
        >
          <ListOrdered style={{ width: 15, height: 15, color: '#4A7080' }} />
          View Report
        </button>
        <button
          type="button"
          onClick={onExport}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ border: '1px solid rgba(0,100,130,0.15)', color: '#0D2630', fontSize: 14 }}
        >
          <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
          Export
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-start gap-3">
        <div className="size-11 shrink-0 rounded-[10px] bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded-md bg-slate-100" />
          <div className="h-3.5 w-56 rounded-md bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-16 rounded-md bg-slate-100" />
            <div className="h-5 w-12 rounded-md bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="mt-4 h-28 rounded-md bg-slate-100" />
      <div className="mt-4 flex gap-2.5">
        <div className="h-10 flex-1 rounded-[10px] bg-slate-100" />
        <div className="h-10 flex-1 rounded-[10px] bg-slate-100" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function NursingReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<ReportCategory>>(
    () => new Set(CATEGORY_OPTIONS),
  );
  const [detailReport, setDetailReport] = useState<NursingReport | null>(null);

  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function refreshForDateRange() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 600);
    setDateMenuOpen(false);
    toast.success(
      'Date range applied',
      `Reports refreshed for ${formatHumanDate(`${dateFrom}T00:00:00`)} – ${formatHumanDate(`${dateTo}T00:00:00`)}.`,
    );
  }

  function toggleCategory(c: ReportCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  const visibleReports = useMemo(
    () => NURSING_REPORTS.filter((r) => activeCategories.has(r.category)),
    [activeCategories],
  );

  function reportRowsToHtml(report: NursingReport): string {
    const statsRow = `<p class="meta">${report.stats.map((s) => `${escapeHtml(s.label)}: ${escapeHtml(s.value)}`).join(' &nbsp;·&nbsp; ')}</p>`;
    let table = '';
    if (report.id === 'medication-admin') {
      table = `<table><thead><tr><th>${escapeHtml(report.columns[0])}</th><th>${escapeHtml(report.columns[1])}</th></tr></thead><tbody>${report.fullRows.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td></tr>`).join('')}</tbody></table>`;
    } else if (report.id === 'shift') {
      table = `<table><thead><tr><th>Shift</th><th>Time</th><th>Staff In-Charge</th><th>Status</th></tr></thead><tbody>${report.rows.map((r) => `<tr><td>${escapeHtml(r.shift)}</td><td>${escapeHtml(r.time)}</td><td>${escapeHtml(r.staffInCharge)}</td><td>${escapeHtml(r.status)}</td></tr>`).join('')}</tbody></table>`;
    } else if (report.id === 'ward-census') {
      table = `<table><thead><tr><th>Status</th><th>Beds</th><th>Percent</th></tr></thead><tbody>${report.slices.map((s) => `<tr><td>${escapeHtml(s.label)}</td><td>${s.count}</td><td>${s.percent}%</td></tr>`).join('')}</tbody></table>`;
    } else if (report.id === 'vitals' || report.id === 'observation') {
      table = `<table><thead><tr><th>${escapeHtml(report.columns[0])}</th><th>${escapeHtml(report.columns[1])}</th></tr></thead><tbody>${report.rows.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td></tr>`).join('')}</tbody></table>`;
    } else if (report.id === 'admission' || report.id === 'discharge') {
      table = `<table><thead><tr><th>Ward</th><th>Count</th></tr></thead><tbody>${report.bars.map((b) => `<tr><td>${escapeHtml(b.ward)}</td><td>${b.count}</td></tr>`).join('')}</tbody></table>`;
    } else if (report.id === 'medication-due') {
      table = `<table><thead><tr><th>Time</th><th>Medication</th><th>Patients</th></tr></thead><tbody>${report.rows.map((r) => `<tr><td>${escapeHtml(r.time)}</td><td>${escapeHtml(r.medication)}</td><td>${r.patients}</td></tr>`).join('')}</tbody></table>`;
    }
    return `<h1>${escapeHtml(report.title)}</h1><p class="meta">${escapeHtml(report.subtitle)}</p>${statsRow}<hr />${table}`;
  }

  function exportReport(report: NursingReport) {
    downloadPDF(`${report.title.replace(/\s+/g, '-')}`, reportRowsToHtml(report));
    toast.success('Export started', `${report.title} is downloading.`);
  }

  function exportAll() {
    const body = visibleReports.map((r) => reportRowsToHtml(r)).join('<hr />');
    downloadPDF(
      'Nursing-Reports',
      `<h1>Nursing Reports</h1><p class="meta">${escapeHtml(formatHumanDate(`${dateFrom}T00:00:00`))} – ${escapeHtml(formatHumanDate(`${dateTo}T00:00:00`))}</p><hr />${body}`,
    );
    toast.success(
      'Export started',
      `${visibleReports.length} report${visibleReports.length !== 1 ? 's' : ''} downloading.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1512px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.nurseReports)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Reports
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
              Nursing Reports
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Nursing Reports
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                View and export nursing reports.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                ref={dateButtonRef}
                type="button"
                onClick={() => setDateMenuOpen((v) => !v)}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                <CalendarDays style={{ width: 16, height: 16, color: '#4A7080' }} />
                {formatHumanDate(`${dateFrom}T00:00:00`)} — {formatHumanDate(`${dateTo}T00:00:00`)}
              </button>
              <RowMenuPortal
                open={dateMenuOpen}
                anchorRef={dateButtonRef}
                onClose={() => setDateMenuOpen(false)}
                width={280}
              >
                <div className="px-4 py-3.5">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Date range
                  </p>
                  <div className="mt-3 flex flex-col gap-2.5">
                    <div>
                      <label
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        From
                      </label>
                      <FormDateInput
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1 h-10 w-full"
                      />
                    </div>
                    <div>
                      <label
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        To
                      </label>
                      <FormDateInput
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1 h-10 w-full"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={refreshForDateRange}
                    className={`mt-3.5 flex h-9 w-full items-center justify-center rounded-[8px] font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ background: '#00B4D8', fontSize: 14 }}
                  >
                    Apply
                  </button>
                </div>
              </RowMenuPortal>

              <button
                ref={filterButtonRef}
                type="button"
                onClick={() => setFilterMenuOpen((v) => !v)}
                aria-pressed={activeCategories.size !== CATEGORY_OPTIONS.length}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${activeCategories.size !== CATEGORY_OPTIONS.length ? '#00B4D8' : 'rgba(0,100,130,0.15)'}`,
                  color: activeCategories.size !== CATEGORY_OPTIONS.length ? '#00B4D8' : '#0D2630',
                  fontSize: 14,
                }}
              >
                <FilterIcon style={{ width: 16, height: 16 }} />
                Filter
              </button>
              <RowMenuPortal
                open={filterMenuOpen}
                anchorRef={filterButtonRef}
                onClose={() => setFilterMenuOpen(false)}
                width={240}
              >
                <div className="px-4 py-3.5">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Report categories
                  </p>
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {CATEGORY_OPTIONS.map((c) => (
                      <label key={c} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={activeCategories.has(c)}
                          onChange={() => toggleCategory(c)}
                          className="size-4.5 shrink-0 cursor-pointer rounded"
                          style={{ accentColor: '#00B4D8' }}
                        />
                        <span style={{ fontSize: 14, color: '#2F3A40' }}>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </RowMenuPortal>

              <button
                type="button"
                onClick={exportAll}
                disabled={pageState !== 'loaded' || visibleReports.length === 0}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                style={{ background: '#00B4D8', fontSize: 14 }}
              >
                <FileDown style={{ width: 16, height: 16 }} />
                Export All
              </button>
            </div>
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          {pageState === 'loading' && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {pageState === 'error' && (
            <div
              className="mt-5 flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[12px] bg-white py-10 text-center"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load nursing reports
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className={`flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                style={{
                  height: 40,
                  borderRadius: 12,
                  padding: '0 20px',
                  background: '#00B4D8',
                  fontSize: 14,
                }}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Retry
              </button>
            </div>
          )}

          {pageState === 'loaded' && (
            <>
              {visibleReports.length === 0 ? (
                <div
                  className="mt-5 flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[12px] bg-white py-16 text-center"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <FilterIcon style={{ width: 24, height: 24, color: '#8A98A3' }} />
                  </div>
                  <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                    No reports match your filters
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveCategories(new Set(CATEGORY_OPTIONS))}
                    className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {visibleReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onView={() => setDetailReport(report)}
                      onExport={() => exportReport(report)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Footer note ─────────────────────────────────────────────── */}
          <div
            className="mt-5 flex items-center gap-2.5 rounded-[12px] p-4"
            style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
          >
            <AlertCircle style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
            <p style={{ fontSize: 14, color: '#4A7080' }}>
              Reports are generated based on the selected date range and filters. All times are
              displayed in your local time.
            </p>
          </div>
        </div>
      </main>

      {detailReport && (
        <ReportDetailModal
          report={detailReport}
          icon={REPORT_ICON_CFG[detailReport.id].icon}
          iconColor={REPORT_ICON_CFG[detailReport.id].color}
          iconBg={REPORT_ICON_CFG[detailReport.id].bg}
          onExport={() => exportReport(detailReport)}
          onClose={() => setDetailReport(null)}
        />
      )}
    </div>
  );
}
