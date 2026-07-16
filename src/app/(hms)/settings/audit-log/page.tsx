'use client';

import { AlertCircle, ChevronLeft, History, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { ROUTES } from '@/constants/routes';
import { formatDate, formatTime } from '@/utils/datetime';
import {
  AUDIT_CATEGORY_COLOR,
  AUDIT_CATEGORY_LABEL,
  MOCK_AUDIT_LOG,
  type AuditLogEntry,
} from '@/features/settings/__mocks__/auditLogFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

function groupByDay(entries: AuditLogEntry[]): { dateLabel: string; entries: AuditLogEntry[] }[] {
  const groups: { dateLabel: string; entries: AuditLogEntry[] }[] = [];
  for (const entry of entries) {
    const label = formatDate(entry.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.dateLabel === label) last.entries.push(entry);
    else groups.push({ dateLabel: label, entries: [entry] });
  }
  return groups;
}

function SkeletonEntry() {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5 sm:px-5"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="size-8 shrink-0 animate-pulse rounded-full bg-slate-100" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-3.5 w-full max-w-sm animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function ClinicalAuditLogPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const groups = groupByDay(MOCK_AUDIT_LOG);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => router.push(ROUTES.settings)}
            className={`flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-75 ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Back to Settings
          </button>
          <h1
            className="font-display mt-2 font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Clinical Audit Log
          </h1>
          <p
            className="mt-0.5 font-sans"
            style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
          >
            Your complete clinical activity audit trail
          </p>

          {/* ── Log ────────────────────────────────────────────────────────── */}
          <div
            className="mt-6 overflow-hidden"
            style={{
              borderRadius: 12,
              border: '1px solid rgba(0,100,130,0.12)',
              background: '#FFFFFF',
            }}
          >
            {pageState === 'loading' &&
              Array.from({ length: 6 }).map((_, i) => <SkeletonEntry key={i} />)}

            {pageState === 'error' && (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-10 text-center">
                <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  Failed to load the audit log
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

            {pageState === 'loaded' && MOCK_AUDIT_LOG.length === 0 && (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-10 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <History style={{ width: 24, height: 24, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                  No activity recorded yet
                </p>
              </div>
            )}

            {pageState === 'loaded' &&
              groups.map((group) => (
                <div key={group.dateLabel}>
                  <div
                    className="px-4 py-2.5 sm:px-5"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      {group.dateLabel}
                    </span>
                  </div>
                  {group.entries.map((entry, idx) => {
                    const color = AUDIT_CATEGORY_COLOR[entry.category];
                    const isLast =
                      idx === group.entries.length - 1 &&
                      group.dateLabel === groups[groups.length - 1]?.dateLabel;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 px-4 py-3.5 sm:px-5"
                        style={{
                          borderBottom: isLast ? undefined : '1px solid rgba(0,100,130,0.08)',
                        }}
                      >
                        <span
                          className="mt-1.5 shrink-0 rounded-full"
                          style={{ width: 8, height: 8, background: color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                            >
                              {entry.action}
                            </p>
                            <span
                              className="rounded-full px-2 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                lineHeight: '18px',
                                color,
                                background: `${color}1F`,
                              }}
                            >
                              {AUDIT_CATEGORY_LABEL[entry.category]}
                            </span>
                          </div>
                          <p
                            className="mt-0.5 font-sans"
                            style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                          >
                            {entry.detail}
                          </p>
                          <p
                            className="mt-1 font-sans"
                            style={{ fontSize: 14, lineHeight: '18px', color: '#8A98A3' }}
                          >
                            {formatTime(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>

          <div className="h-6" />
        </div>
      </main>
    </div>
  );
}
