'use client';

import {
  AlertCircle,
  Archive,
  ChevronRight,
  ClipboardList,
  Files,
  History,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { QuickActionTile } from '@components/shared/QuickActionTile';
import { StatCardTrend } from '@components/shared/StatCard';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@hooks/useAuth';
import {
  MEDICAL_RECORDS_STATS,
  RECENTLY_RETRIEVED_RECORDS,
  RECENT_RECORD_REQUESTS,
  SYSTEM_ANNOUNCEMENTS,
  type RecentRecordRequest,
} from '@/features/medical-records/__mocks__/dashboardFixtures';

type PageState = 'loading' | 'loaded' | 'error';

const REQUEST_STATUS_CFG: Record<
  RecentRecordRequest['status'],
  { color: string; border: string; bg: string }
> = {
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  'In Progress': { color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
  Fulfilled: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
};

function getWATGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-start gap-3">
        <div className="size-11 shrink-0 animate-pulse rounded-[12px] bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-14 animate-pulse rounded bg-slate-200" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function MedicalRecordsDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const firstName = (user?.name ?? 'Ngozi').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/, '').split(' ')[0];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            {getWATGreeting()}, {firstName}!
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Welcome to the Medical Records workspace.
          </p>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load dashboard
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
          ) : (
            <>
              {/* ── Stats ─────────────────────────────────────────────────── */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pageState === 'loading'
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
                  : MEDICAL_RECORDS_STATS.map((stat) => (
                      <StatCardTrend
                        key={stat.id}
                        icon={stat.icon}
                        label={stat.label}
                        value={stat.value}
                        trendPercent={stat.trendPercent}
                        accent={stat.accent}
                        iconBg={stat.iconBg}
                        sparklineData={stat.sparkline}
                      />
                    ))}
              </div>

              {/* ── Quick Actions ─────────────────────────────────────────── */}
              <div className="mt-5">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                >
                  Quick Actions
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <QuickActionTile
                    icon={Search}
                    label="Retrieve Record"
                    iconBg="rgba(0,180,216,0.12)"
                    iconColor="#00B4D8"
                    onClick={() => router.push(ROUTES.medicalRecords)}
                  />
                  <QuickActionTile
                    icon={Upload}
                    label="Upload Document"
                    iconBg="rgba(34,197,94,0.12)"
                    iconColor="#22C55E"
                    onClick={() => router.push(ROUTES.medicalRecordsDocumentUpload)}
                  />
                  <QuickActionTile
                    icon={History}
                    label="View Visit History"
                    iconBg="rgba(59,130,246,0.12)"
                    iconColor="#3B82F6"
                    onClick={() => router.push(ROUTES.medicalRecordsVisitHistory)}
                  />
                  <QuickActionTile
                    icon={Files}
                    label="Clinical Documents"
                    iconBg="rgba(139,92,246,0.12)"
                    iconColor="#8B5CF6"
                    onClick={() => router.push(ROUTES.medicalRecordsClinicalDocuments)}
                  />
                  <QuickActionTile
                    icon={Archive}
                    label="Archive Record"
                    iconBg="rgba(239,68,68,0.12)"
                    iconColor="#EF4444"
                    onClick={() => router.push(ROUTES.medicalRecordsArchived)}
                  />
                  <QuickActionTile
                    icon={ClipboardList}
                    label="Request Record"
                    iconBg="rgba(245,158,11,0.12)"
                    iconColor="#F59E0B"
                    onClick={() => router.push(ROUTES.medicalRecordsRequests)}
                  />
                </div>
              </div>

              {/* ── Bottom row ────────────────────────────────────────────── */}
              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Recent Record Requests */}
                <div
                  className="rounded-[12px] p-4 sm:p-5 lg:col-span-1"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Recent Record Requests
                    </h2>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.medicalRecordsRequests)}
                      className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View All
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {(pageState === 'loading' ? [] : RECENT_RECORD_REQUESTS).map((req) => {
                      const cfg = REQUEST_STATUS_CFG[req.status];
                      return (
                        <div
                          key={req.id}
                          className="flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5"
                          style={{ border: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="min-w-0">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {req.patient}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {req.time} · {req.requestedBy}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                              background: cfg.bg,
                            }}
                          >
                            {req.status}
                          </span>
                        </div>
                      );
                    })}
                    {pageState === 'loading' &&
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-[10px] bg-slate-100" />
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.medicalRecordsRequests)}
                    className="mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All Requests
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>

                {/* Recently Retrieved Records */}
                <div
                  className="rounded-[12px] p-4 sm:p-5 lg:col-span-1"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Recently Retrieved
                    </h2>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.medicalRecords)}
                      className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View All
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {(pageState === 'loading' ? [] : RECENTLY_RETRIEVED_RECORDS).map((rec) => (
                      <div key={rec.id} className="flex items-center gap-3">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                          style={{ background: rec.avatarBg }}
                        >
                          {rec.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {rec.patient}
                          </p>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {rec.mrn}
                          </p>
                        </div>
                        <p
                          className="shrink-0 text-right"
                          style={{ fontSize: 14, color: '#8A98A3' }}
                        >
                          {rec.time}
                          <br />
                          {rec.day}
                        </p>
                      </div>
                    ))}
                    {pageState === 'loading' &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-9 animate-pulse rounded-full bg-slate-100" />
                      ))}
                  </div>
                </div>

                {/* System Announcements */}
                <div
                  className="rounded-[12px] p-4 sm:p-5 lg:col-span-1"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      System Announcements
                    </h2>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {(pageState === 'loading' ? [] : SYSTEM_ANNOUNCEMENTS).map((ann) => {
                      const Icon = ann.icon;
                      return (
                        <div key={ann.id} className="flex items-start gap-2.5">
                          <div
                            className="flex size-8 shrink-0 items-center justify-center rounded-full"
                            style={{ background: ann.iconBg }}
                          >
                            <Icon style={{ width: 15, height: 15, color: ann.iconColor }} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {ann.title}
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{ann.description}</p>
                            <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {ann.date}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {pageState === 'loading' &&
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded-[10px] bg-slate-100" />
                      ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
