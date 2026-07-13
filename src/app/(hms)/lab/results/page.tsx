'use client';

import { AlertCircle, AlertTriangle, FlaskConical, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  MOCK_LAB_RESULTS,
  type LabFlag,
  type LabResult,
  type LabResultPriority,
  type LabResultStatus,
} from '@/features/laboratory/__mocks__/labResultFixtures';

// ── Config ────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';

type StatusCfg = {
  cardBorder: string;
  headerBg: string;
  headerDivider: string;
  icon: 'alert' | 'flask';
  iconColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
  badgeLabel: string;
  commentBg: string;
  commentColor: string;
};

const STATUS_CFG: Record<LabResultStatus, StatusCfg> = {
  critical: {
    cardBorder: '#FFC9C9',
    headerBg: '#FEF2F2',
    headerDivider: '#FFC9C9',
    icon: 'alert',
    iconColor: '#EF4444',
    badgeBg: '#FB2C36',
    badgeBorder: '#FB2C36',
    badgeColor: '#FFFFFF',
    badgeLabel: 'CRITICAL',
    commentBg: 'rgba(239,68,68,0.06)',
    commentColor: '#B91C1C',
  },
  pending: {
    cardBorder: 'rgba(245,158,11,0.40)',
    headerBg: '#FFFBEB',
    headerDivider: 'rgba(245,158,11,0.30)',
    icon: 'alert',
    iconColor: '#F59E0B',
    badgeBg: 'rgba(245,158,11,0.12)',
    badgeBorder: 'rgba(245,158,11,0.50)',
    badgeColor: '#D97706',
    badgeLabel: 'PENDING',
    commentBg: '#F8FAFC',
    commentColor: '#6B7280',
  },
  verified: {
    cardBorder: 'rgba(0,100,130,0.22)',
    headerBg: 'rgba(0,100,130,0.06)',
    headerDivider: 'rgba(0,100,130,0.15)',
    icon: 'flask',
    iconColor: '#16A34A',
    badgeBg: '#16A34A',
    badgeBorder: '#16A34A',
    badgeColor: '#FFFFFF',
    badgeLabel: 'VERIFIED',
    commentBg: 'rgba(0,100,130,0.04)',
    commentColor: '#2F3A40',
  },
};

type PriorityCfg = {
  bg: string;
  border: string;
  color: string;
};

const PRIORITY_CFG: Record<LabResultPriority, PriorityCfg> = {
  stat: { bg: 'rgba(0,0,0,0.06)', border: 'rgba(0,0,0,0.14)', color: '#0D2630' },
  urgent: { bg: 'transparent', border: 'rgba(245,158,11,0.55)', color: '#D97706' },
  routine: { bg: 'transparent', border: 'rgba(0,100,130,0.25)', color: '#4A7080' },
};

type FlagCfg = { bg: string; border: string; color: string };

const FLAG_CFG: Record<LabFlag, FlagCfg> = {
  H: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#DC2626' },
  L: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', color: '#6366F1' },
  A: { bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.40)', color: '#D97706' },
};

type TabId = LabResultStatus;

type TabCfg = { id: TabId; label: string; countColor: string };

const TABS: TabCfg[] = [
  { id: 'critical', label: 'Critical Results', countColor: '#EF4444' },
  { id: 'pending', label: 'Pending', countColor: '#D97706' },
  { id: 'verified', label: 'Verified', countColor: '#16A34A' },
];

// skeleton column header widths, then per-row cell widths
const SK_HEADER_W = [100, 80, 80, 40] as const;
const SK_ROW_W = [120, 90, 80, 26] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function FlagBadge({ flag }: { flag: LabFlag }) {
  const c = FLAG_CFG[flag];
  return (
    <span
      className="inline-flex items-center justify-center font-sans font-semibold"
      style={{
        width: 26,
        height: 26,
        borderRadius: 4,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.color,
        fontSize: 14,
        lineHeight: '20px',
      }}
    >
      {flag}
    </span>
  );
}

function StatusBadge({ status }: { status: LabResultStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span
      className="inline-flex shrink-0 items-center font-sans font-semibold"
      style={{
        height: 24,
        borderRadius: 4,
        padding: '0 8px',
        background: c.badgeBg,
        border: `1px solid ${c.badgeBorder}`,
        color: c.badgeColor,
        fontSize: 14,
        lineHeight: '20px',
        letterSpacing: '0.3px',
      }}
    >
      {c.badgeLabel}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: LabResultPriority }) {
  const c = PRIORITY_CFG[priority];
  const label = priority === 'stat' ? 'STAT' : priority.charAt(0).toUpperCase() + priority.slice(1);
  return (
    <span
      className="inline-flex shrink-0 items-center font-sans font-medium"
      style={{
        height: 24,
        borderRadius: 4,
        padding: '0 8px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        fontSize: 14,
        lineHeight: '20px',
      }}
    >
      {label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonResultCard() {
  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 12,
        border: '1px solid rgba(0,100,130,0.12)',
        background: '#FFFFFF',
      }}
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
        style={{
          background: 'rgba(0,100,130,0.04)',
          borderBottom: '1px solid rgba(0,100,130,0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="h-[18px] w-[18px] animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
      </div>

      {/* Patient row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-[38px] w-[38px] shrink-0 animate-pulse rounded-full bg-slate-200" />
        <div className="flex flex-col gap-1.5">
          <div className="h-[18px] w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-[18px] w-28 animate-pulse rounded bg-slate-200" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scroll-smooth">
        <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 420 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {SK_HEADER_W.map((w, i) => (
                <th key={i} style={{ padding: '10px 16px' }}>
                  <div
                    className="animate-pulse rounded bg-slate-200"
                    style={{ width: w, height: 16 }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr
                key={i}
                style={{ borderBottom: i < 3 ? '1px solid rgba(0,100,130,0.08)' : 'none' }}
              >
                {SK_ROW_W.map((w, j) => (
                  <td key={j} style={{ padding: '10px 16px' }}>
                    <div
                      className="animate-pulse rounded bg-slate-200"
                      style={{ width: w, height: j === 3 ? 26 : 18 }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Result Card ───────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: LabResult }) {
  const sc = STATUS_CFG[result.status];
  const isPending = result.status === 'pending';

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 12,
        border: `1px solid ${sc.cardBorder}`,
        background: '#FFFFFF',
      }}
    >
      {/* Card header */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
        style={{
          background: sc.headerBg,
          borderBottom: `1px solid ${sc.headerDivider}`,
        }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {sc.icon === 'alert' ? (
            <AlertTriangle style={{ width: 18, height: 18, color: sc.iconColor, flexShrink: 0 }} />
          ) : (
            <FlaskConical style={{ width: 18, height: 18, color: sc.iconColor, flexShrink: 0 }} />
          )}
          <span
            className="font-display font-semibold"
            style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
          >
            {result.testName}
          </span>
          <StatusBadge status={result.status} />
          <PriorityBadge priority={result.priority} />
        </div>
        <span
          className="shrink-0 font-sans"
          style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
        >
          {result.date} {result.time}
        </span>
      </div>

      {/* Patient row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex shrink-0 items-center justify-center rounded-full font-sans font-medium text-white"
          style={{
            width: 38,
            height: 38,
            background: result.patient.avatarBg,
            fontSize: 14,
            lineHeight: '20px',
          }}
        >
          {result.patient.initials}
        </div>
        <div>
          <p
            className="font-sans font-semibold"
            style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
          >
            {result.patient.name}
          </p>
          <p className="font-sans" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            {result.patient.mrn}
          </p>
        </div>
      </div>

      {/* Pending: awaiting row */}
      {isPending && (
        <div
          className="mx-4 mb-4 flex items-center gap-2 px-3 py-2.5"
          style={{ borderRadius: 8, background: '#F1F5F9' }}
        >
          <Loader2
            className="animate-spin"
            style={{ width: 16, height: 16, color: '#94A3B8', flexShrink: 0 }}
          />
          <span
            className="font-sans"
            style={{ fontSize: 14, lineHeight: '22px', color: '#6B7280' }}
          >
            Awaiting laboratory processing…
          </span>
        </div>
      )}

      {/* Results table */}
      {!isPending && result.rows && result.rows.length > 0 && (
        <>
          <div className="overflow-x-auto scroll-smooth">
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 420 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Parameter', 'Value', 'Reference', 'Flag'].map((col) => (
                    <th
                      key={col}
                      className="font-sans font-semibold"
                      style={{
                        fontSize: 14,
                        lineHeight: '22px',
                        color: '#2F3A40',
                        padding: '10px 16px',
                        textAlign: 'left',
                        borderBottom: '1px solid rgba(0,100,130,0.10)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr
                    key={row.parameter}
                    style={{
                      borderBottom:
                        i < result.rows!.length - 1 ? '1px solid rgba(0,100,130,0.08)' : 'none',
                    }}
                  >
                    <td
                      className="font-sans"
                      style={{
                        fontSize: 14,
                        lineHeight: '22px',
                        color: '#2F3A40',
                        padding: '10px 16px',
                      }}
                    >
                      {row.parameter}
                    </td>
                    <td
                      className="font-sans font-medium"
                      style={{
                        fontSize: 14,
                        lineHeight: '22px',
                        color: row.valueAbnormal ? '#DC2626' : '#0D2630',
                        padding: '10px 16px',
                      }}
                    >
                      {row.value}
                    </td>
                    <td
                      className="font-sans"
                      style={{
                        fontSize: 14,
                        lineHeight: '22px',
                        color: '#4A7080',
                        padding: '10px 16px',
                      }}
                    >
                      {row.reference}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {row.flag && <FlagBadge flag={row.flag} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.comment && (
            <div className="px-4 py-3" style={{ background: sc.commentBg }}>
              <p
                className="font-sans"
                style={{ fontSize: 14, lineHeight: '22px', color: sc.commentColor }}
              >
                {result.comment}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LabResultsPage() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [activeTab, setActiveTab] = useState<TabId>('critical');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  const criticalResults = MOCK_LAB_RESULTS.filter((r) => r.status === 'critical');
  const pendingResults = MOCK_LAB_RESULTS.filter((r) => r.status === 'pending');
  const verifiedResults = MOCK_LAB_RESULTS.filter((r) => r.status === 'verified');

  const countByTab: Record<TabId, number> = {
    critical: criticalResults.length,
    pending: pendingResults.length,
    verified: verifiedResults.length,
  };

  const visibleResults =
    activeTab === 'critical'
      ? criticalResults
      : activeTab === 'pending'
        ? pendingResults
        : verifiedResults;

  function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Results refreshed', 'Laboratory data is up to date.');
    }, 1200);
  }

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1200px]">
        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div
          className="flex items-start justify-between gap-4 px-4 sm:px-6"
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid rgba(0,100,130,0.12)',
            paddingTop: 20,
            paddingBottom: 20,
            minHeight: 88,
          }}
        >
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Laboratory Results
            </h1>
            <p
              className="mt-0.5 font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
            >
              Results from the laboratory for your patients
            </p>
          </div>

          {pageState === 'loaded' && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex shrink-0 items-center gap-2 font-sans font-medium transition-colors duration-150 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:opacity-60"
              style={{
                height: 38,
                borderRadius: 10,
                padding: '0 14px',
                border: '1px solid rgba(0,100,130,0.15)',
                background: '#FFFFFF',
                fontSize: 14,
                lineHeight: '22px',
                color: '#4A7080',
              }}
            >
              <RefreshCw
                className={refreshing ? 'animate-spin' : ''}
                style={{ width: 15, height: 15, flexShrink: 0 }}
              />
              Refresh
            </button>
          )}
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Loading ──────────────────────────────────────────────────────── */}
          {pageState === 'loading' && (
            <div className="flex flex-col gap-4">
              <SkeletonResultCard />
              <SkeletonResultCard />
              <SkeletonResultCard />
            </div>
          )}

          {/* ── Error ────────────────────────────────────────────────────────── */}
          {pageState === 'error' && (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ maxWidth: 420, margin: '0 auto' }}
            >
              <div
                className="mb-4 flex items-center justify-center rounded-full"
                style={{ width: 56, height: 56, background: 'rgba(239,68,68,0.08)' }}
              >
                <AlertCircle style={{ width: 26, height: 26, color: '#EF4444' }} />
              </div>
              <p
                className="font-display font-semibold"
                style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
              >
                Failed to load results
              </p>
              <p
                className="mt-1.5 font-sans"
                style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
              >
                Something went wrong while fetching laboratory results. Please try again.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-5 flex items-center gap-2 font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,100,130,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  height: 40,
                  borderRadius: 10,
                  padding: '0 20px',
                  border: '1px solid rgba(0,100,130,0.18)',
                  background: '#FFFFFF',
                  fontSize: 14,
                  lineHeight: '22px',
                  color: '#0D2630',
                }}
              >
                <RefreshCw style={{ width: 15, height: 15 }} />
                Retry
              </button>
            </div>
          )}

          {/* ── Loaded ───────────────────────────────────────────────────────── */}
          {pageState === 'loaded' && (
            <>
              {/* Critical alert banner */}
              {criticalResults.length > 0 && (
                <div
                  className="mb-4 flex items-start gap-3 px-4 py-3"
                  style={{
                    borderRadius: 10,
                    border: '1px solid #FFC9C9',
                    background: '#FFF0F0',
                  }}
                >
                  <AlertTriangle
                    style={{
                      width: 18,
                      height: 18,
                      color: '#EF4444',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 15, lineHeight: '22px', color: '#DC2626' }}
                    >
                      {criticalResults.length} Critical Result
                      {criticalResults.length !== 1 ? 's' : ''} — Immediate Action Required
                    </p>
                    <p
                      className="mt-0.5 font-sans"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#B91C1C' }}
                    >
                      {criticalResults.map((r) => r.patient.name).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab bar */}
              <div
                className="mb-4 flex gap-1"
                style={{
                  borderRadius: 12,
                  padding: 4,
                  background: 'rgba(138,152,163,0.20)',
                }}
              >
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count = countByTab[tab.id];
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-2 font-sans font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none sm:px-4"
                      style={{
                        height: 36,
                        fontSize: 14,
                        lineHeight: '22px',
                        color: isActive ? '#0D2630' : '#4A7080',
                        background: isActive ? '#FFFFFF' : 'transparent',
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                        border: isActive
                          ? '1px solid rgba(0,100,130,0.12)'
                          : '1px solid transparent',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">
                        {tab.id === 'critical'
                          ? 'Critical'
                          : tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}
                      </span>
                      <span
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, lineHeight: '20px', color: tab.countColor }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Result cards — empty or list */}
              {visibleResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <FlaskConical style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p
                    className="font-sans font-semibold"
                    style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                  >
                    No {activeTab} results
                  </p>
                  <p
                    className="mt-1 font-sans"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    {activeTab === 'pending'
                      ? 'All orders have been processed.'
                      : activeTab === 'critical'
                        ? 'No critical alerts at this time.'
                        : 'No verified results yet.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {visibleResults.map((result) => (
                    <ResultCard key={result.id} result={result} />
                  ))}
                </div>
              )}
            </>
          )}

          <div className="h-6" />
        </div>
      </div>
    </main>
  );
}
