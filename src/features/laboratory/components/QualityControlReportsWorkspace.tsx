'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileDown,
  Printer,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatDate } from '@/utils/datetime';
import { useCorrectiveActions, useQcRuns } from '@/features/laboratory/store/qcStore';
import {
  QC_INSTRUMENTS,
  getInstrument,
  type WestgardRule,
} from '@/features/laboratory/__mocks__/qcFixtures';

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type TrendPoint = { label: string; value: number };

// ── Line trend chart (same hand-rolled technique as
// RegistrationReportsWorkspace.tsx's own LineTrendChart) ────────────────────
function LineTrendChart({ data, color }: { data: TrendPoint[]; color: string }) {
  // Always a 0-100% pass rate — a fixed axis (not the generic computeTick,
  // which is designed for arbitrary counts) keeps the top of the chart at
  // a real 100% instead of an overshoot like 120%.
  const niceMax = 100;
  const ticks = [0, 25, 50, 75, 100];
  const W = 700;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.value / niceMax) * H,
  }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const xLabelIdx = [0, Math.floor(data.length / 2), data.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  if (data.length === 0) {
    return (
      <p className="mt-3 py-10 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
        No QC runs in this date range.
      </p>
    );
  }

  return (
    <div className="mt-2 flex gap-3" style={{ height: 260 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 34 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}%
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
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
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
          {xLabelIdx.map((i) => (
            <span key={i} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {data[i]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[12px] p-4"
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
    </div>
  );
}

const WESTGARD_RULE_CFG: Record<WestgardRule, { label: string; color: string; bg: string }> = {
  '1-2s': { label: '1-2s Warnings', color: '#D97706', bg: 'rgba(245,158,11,0.1)' },
  '1-3s': { label: '1-3s Rejects', color: '#DC2626', bg: 'rgba(239,68,68,0.1)' },
  '2-2s': { label: '2-2s Rejects', color: '#DC2626', bg: 'rgba(239,68,68,0.1)' },
};

const INSTRUMENT_OPTIONS = [
  { value: 'ALL', label: 'All Instruments' },
  ...QC_INSTRUMENTS.map((i) => ({ value: i.id, label: i.name })),
];

/** Quality Control Reports — reads live from `qcStore.ts` (`useQcRuns()` /
 * `useCorrectiveActions()`), no separate fabricated report dataset. Same
 * anatomy as every other report screen in this app (stat cards, trend
 * chart, filtered table, export) — see `RegistrationReportsWorkspace.tsx`. */
export function QualityControlReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const runs = useQcRuns();
  const correctiveActions = useCorrectiveActions();

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toDateInputValue(d);
  });
  const [dateTo, setDateTo] = useState(() => toDateInputValue(new Date()));
  const [instrumentId, setInstrumentId] = useState('ALL');

  const fromMs = useMemo(() => new Date(`${dateFrom}T00:00:00`).getTime(), [dateFrom]);
  const toMs = useMemo(() => new Date(`${dateTo}T23:59:59`).getTime(), [dateTo]);

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      const t = new Date(r.runAt).getTime();
      if (t < fromMs || t > toMs) return false;
      if (instrumentId !== 'ALL' && r.instrumentId !== instrumentId) return false;
      return true;
    });
  }, [runs, fromMs, toMs, instrumentId]);

  const concludedRuns = filteredRuns.filter((r) => r.status !== 'In Progress');
  const passedCount = filteredRuns.filter((r) => r.status === 'Passed').length;
  const failedCount = filteredRuns.filter((r) => r.status === 'Failed').length;
  const passRate =
    concludedRuns.length > 0 ? Math.round((passedCount / concludedRuns.length) * 100) : 0;

  const openCorrectiveActionsCount = useMemo(() => {
    return correctiveActions.filter((a) => {
      const t = new Date(a.raisedAt).getTime();
      if (t < fromMs || t > toMs) return false;
      if (instrumentId !== 'ALL' && a.instrumentName !== getInstrument(instrumentId)?.name) {
        return false;
      }
      return a.status !== 'Resolved';
    }).length;
  }, [correctiveActions, fromMs, toMs, instrumentId]);

  const dailyPassRateSeries = useMemo<TrendPoint[]>(() => {
    const byDay = new Map<string, { passed: number; concluded: number }>();
    for (const r of filteredRuns) {
      if (r.status === 'In Progress') continue;
      const key = formatDate(r.runAt);
      const entry = byDay.get(key) ?? { passed: 0, concluded: 0 };
      entry.concluded += 1;
      if (r.status === 'Passed') entry.passed += 1;
      byDay.set(key, entry);
    }
    return Array.from(byDay.entries())
      .sort(
        (a, b) =>
          new Date(a[0].split('/').reverse().join('-')).getTime() -
          new Date(b[0].split('/').reverse().join('-')).getTime(),
      )
      .map(([label, v]) => ({
        label,
        value: v.concluded > 0 ? Math.round((v.passed / v.concluded) * 100) : 0,
      }));
  }, [filteredRuns]);

  const westgardCounts = useMemo(() => {
    const counts: Record<WestgardRule, number> = { '1-2s': 0, '1-3s': 0, '2-2s': 0 };
    for (const r of filteredRuns) {
      for (const result of r.results) {
        if (result.rule) counts[result.rule] += 1;
      }
    }
    return counts;
  }, [filteredRuns]);

  const instrumentRows = useMemo(() => {
    return QC_INSTRUMENTS.map((inst) => {
      const instRuns = filteredRuns.filter((r) => r.instrumentId === inst.id);
      const concluded = instRuns.filter((r) => r.status !== 'In Progress');
      const passed = instRuns.filter((r) => r.status === 'Passed').length;
      const failed = instRuns.filter((r) => r.status === 'Failed').length;
      const rate = concluded.length > 0 ? Math.round((passed / concluded.length) * 100) : null;
      const openActions = correctiveActions.filter(
        (a) => a.instrumentName === inst.name && a.status !== 'Resolved',
      ).length;
      return { inst, total: instRuns.length, passed, failed, rate, openActions };
    }).filter((row) => instrumentId === 'ALL' || row.inst.id === instrumentId);
  }, [filteredRuns, correctiveActions, instrumentId]);

  function exportPDF() {
    const rows = instrumentRows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.inst.name)}</td><td>${r.total}</td><td>${r.passed}</td><td>${r.failed}</td><td>${r.rate ?? '—'}%</td><td>${r.openActions}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'quality-control-report',
      `<h1>Quality Control Report</h1><p class="meta">${escapeHtml(dateFrom)} to ${escapeHtml(dateTo)} — Pass Rate ${passRate}% (${passedCount} passed, ${failedCount} failed)</p><hr/><table><thead><tr><th>Instrument</th><th>Total Runs</th><th>Passed</th><th>Failed</th><th>Pass Rate</th><th>Open Corrective Actions</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
    toast.success('Preparing report', 'Quality Control report opened in a new tab.');
  }

  function exportCSV() {
    const rows: string[][] = [
      ['Instrument', 'Total Runs', 'Passed', 'Failed', 'Pass Rate', 'Open Corrective Actions'],
      ...instrumentRows.map((r) => [
        r.inst.name,
        String(r.total),
        String(r.passed),
        String(r.failed),
        r.rate !== null ? `${r.rate}%` : '—',
        String(r.openActions),
      ]),
    ];
    downloadCSV('quality-control-report', rows);
    toast.success('Export ready', 'Quality Control report downloaded as CSV.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.laboratory)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Home
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Reports</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Quality Control Reports
            </span>
          </nav>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Quality Control Reports
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Pass/fail trends and Westgard-rule violations across every QC run.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={exportPDF}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print
              </button>
              <button
                type="button"
                onClick={exportCSV}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <FileDown style={{ width: 15, height: 15 }} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={exportPDF}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export PDF
              </button>
            </div>
          </div>

          {/* ── Filters ─────────────────────────────────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Filters
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  From
                </label>
                <FormDateInput
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="From date"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  To
                </label>
                <FormDateInput
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="To date"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Instrument
                </label>
                <FormSelect
                  id="qc-report-instrument"
                  value={instrumentId}
                  onChange={setInstrumentId}
                  options={INSTRUMENT_OPTIONS}
                  placeholder="All Instruments"
                />
              </div>
            </div>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={ClipboardList}
              label="Total QC Runs"
              value={filteredRuns.length}
              iconColor="#8B5CF6"
              iconBg="rgba(139,92,246,0.12)"
            />
            <StatCard
              icon={CheckCircle2}
              label="Pass Rate"
              value={`${passRate}%`}
              iconColor="#16A34A"
              iconBg="rgba(34,197,94,0.12)"
            />
            <StatCard
              icon={XCircle}
              label="Failed Runs"
              value={failedCount}
              iconColor="#DC2626"
              iconBg="rgba(239,68,68,0.12)"
            />
            <StatCard
              icon={AlertTriangle}
              label="Open Corrective Actions"
              value={openCorrectiveActionsCount}
              iconColor="#D97706"
              iconBg="rgba(245,158,11,0.12)"
            />
          </div>

          {/* ── Pass rate trend ─────────────────────────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
              Pass Rate Trend
            </h2>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>
              Daily pass rate across concluded runs in the selected range.
            </p>
            <LineTrendChart data={dailyPassRateSeries} color="#00B4D8" />
          </div>

          {/* ── Westgard breakdown ──────────────────────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
              Westgard Rule Violations
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(Object.keys(WESTGARD_RULE_CFG) as WestgardRule[]).map((rule) => {
                const cfg = WESTGARD_RULE_CFG[rule];
                return (
                  <div
                    key={rule}
                    className="flex items-center gap-3 rounded-[10px] p-3"
                    style={{ background: cfg.bg }}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: '#FFFFFF' }}
                    >
                      <ShieldAlert style={{ width: 16, height: 16, color: cfg.color }} />
                    </div>
                    <div>
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 22, color: cfg.color }}
                      >
                        {westgardCounts[rule]}
                      </p>
                      <p style={{ fontSize: 14, color: '#4A7080' }}>{cfg.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Per-instrument performance table ───────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
              Performance by Instrument
            </h2>
            <div className="mt-3">
              <ScrollableTable minWidth={780}>
                <div
                  className={`flex px-3 py-3 ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #0064821F' }}
                >
                  {[
                    ['Instrument', 'min-w-0 flex-1'],
                    ['Total Runs', 'w-28 shrink-0 text-right'],
                    ['Passed', 'w-24 shrink-0 text-right'],
                    ['Failed', 'w-24 shrink-0 text-right'],
                    ['Pass Rate', 'w-28 shrink-0 text-right'],
                    ['Open Actions', 'w-32 shrink-0 text-right'],
                  ].map(([label, width]) => (
                    <span
                      key={label}
                      className={`${width} truncate pr-3 font-sans font-bold tracking-wider uppercase`}
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                {instrumentRows.map((row) => (
                  <div
                    key={row.inst.id}
                    className="flex items-center px-3 py-3"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <Tooltip content={row.inst.name}>
                      <span
                        className="min-w-0 flex-1 truncate pr-3 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {row.inst.name}
                      </span>
                    </Tooltip>
                    <span
                      className="w-28 shrink-0 pr-3 text-right"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {row.total}
                    </span>
                    <span
                      className="w-24 shrink-0 pr-3 text-right"
                      style={{ fontSize: 14, color: '#16A34A' }}
                    >
                      {row.passed}
                    </span>
                    <span
                      className="w-24 shrink-0 pr-3 text-right"
                      style={{ fontSize: 14, color: '#DC2626' }}
                    >
                      {row.failed}
                    </span>
                    <span
                      className="w-28 shrink-0 pr-3 text-right"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {row.rate !== null ? `${row.rate}%` : '—'}
                    </span>
                    <span
                      className="w-32 shrink-0 text-right"
                      style={{ fontSize: 14, color: row.openActions > 0 ? '#D97706' : '#8A98A3' }}
                    >
                      {row.openActions}
                    </span>
                  </div>
                ))}
              </ScrollableTable>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
