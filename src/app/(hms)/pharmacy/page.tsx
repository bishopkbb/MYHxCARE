'use client';

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Info,
  Package,
  PackagePlus,
  PackageSearch,
  Pill,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { QuickActionTile } from '@components/shared/QuickActionTile';
import { StatCard, StatMini } from '@components/shared/StatCard';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatTime, toRelativeTime } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import { useAnnouncements } from '@/features/announcements/store/announcementsStore';
import {
  getExpiringBatches,
  getInventorySnapshot,
  getLowStockItems,
  getPendingTransferCount,
  SAFETY_ALERT_COUNTS,
  PHARMACY_NOTIFICATIONS,
  STOCK_TRANSFERS,
  type PharmacyQueueEntry,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  markCollected,
  useDispensedTodayCount,
  usePendingVerificationQueue,
  useReadyForPickupQueue,
  useRecentDispensingActivity,
  verifyAndDispense,
} from '@/features/pharmacy/store/pharmacyDispensingStore';

const VerifyDispenseModal = dynamic(
  () =>
    import('@/features/pharmacy/components/VerifyDispenseModal').then((m) => m.VerifyDispenseModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const SearchMedicationModal = dynamic(
  () =>
    import('@/features/pharmacy/components/SearchMedicationModal').then(
      (m) => m.SearchMedicationModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type ModalState = { type: 'verify'; rxNo?: string } | { type: 'search' } | null;

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

function formatClinicalDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

const PRIORITY_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Medium: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Low: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

const NOTIFICATION_ICON_CFG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  prescription: { icon: ClipboardList, color: '#00B4D8', bg: 'rgba(0,180,216,0.1)' },
  stock: { icon: AlertTriangle, color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  batch: { icon: CalendarClock, color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  transfer: { icon: Truck, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  system: { icon: Info, color: '#4A7080', bg: 'rgba(74,112,128,0.1)' },
  announcement: { icon: Bell, color: '#00B4D8', bg: 'rgba(0,180,216,0.1)' },
};

// ── Skeletons ──────────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="size-10 shrink-0 animate-pulse rounded-[12px] bg-slate-200" />
      </div>
      <div className="mt-2.5 h-7 w-14 animate-pulse rounded bg-slate-200" />
      <div className="mt-1.5 h-3.5 w-28 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-3.5 w-full max-w-[160px] animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-16 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="py-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
      {label}
    </p>
  );
}

// ── Panel shell ────────────────────────────────────────────────────────────

function Panel({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className={`font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none`}
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            View all
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export default function PharmacyDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [modal, setModal] = useState<ModalState>(null);
  const [now, setNow] = useState(() => new Date());

  const pendingQueue = usePendingVerificationQueue();
  const readyQueue = useReadyForPickupQueue();
  const dispensedToday = useDispensedTodayCount();
  const activity = useRecentDispensingActivity();
  const announcements = useAnnouncements();

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const actorName = user?.name ?? 'Pharmacist';
  const lowStock = getLowStockItems();
  const expiringBatches = getExpiringBatches(30);
  const pendingTransferCount = getPendingTransferCount();
  const snapshot = getInventorySnapshot();

  function handleDispense(rxNo: string) {
    verifyAndDispense(rxNo, actorName);
    toast.success('Prescription dispensed', `${rxNo} moved to Ready for Pickup.`);
  }

  function handleCollect(entry: PharmacyQueueEntry) {
    markCollected(entry.rxNo);
    toast.success('Marked collected', `${entry.rxNo} has been collected.`);
  }

  // Merge real announcements with pharmacy-specific mock notifications,
  // newest first — rule 16 (Announcements mandatory on every workspace) plus
  // the pharmacy-specific alerts a real system would also surface here.
  const feed = [
    ...announcements.slice(0, 3).map((a) => ({
      id: a.id,
      type: 'announcement' as const,
      title: a.title,
      body: a.preview,
      timestamp: a.publishedAt,
    })),
    ...PHARMACY_NOTIFICATIONS,
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load the Pharmacy Dashboard
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Greeting */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              {getWATGreeting()}, {lastName(actorName)}
            </h1>
            <p style={{ fontSize: 14, color: '#4A7080' }}>{formatClinicalDate(now)}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          {pageState === 'loading' ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={ClipboardList}
                label="Pending Prescriptions"
                value={pendingQueue.length}
                info="Awaiting verification"
                accent="#00B4D8"
                iconBg="rgba(0,180,216,0.1)"
                onClick={() => setModal({ type: 'verify' })}
              />
              <StatCard
                icon={CheckCircle2}
                label="Dispensed Today"
                value={dispensedToday}
                info="Completed successfully"
                accent="#16A34A"
                iconBg="rgba(22,163,74,0.1)"
              />
              <StatCard
                icon={Package}
                label="Ready for Pickup"
                value={readyQueue.length}
                info="Ready for collection"
                accent="#D97706"
                iconBg="rgba(217,119,6,0.1)"
              />
              <StatCard
                icon={AlertTriangle}
                label="Low Stock Medicines"
                value={lowStock.length}
                info="Require replenishment"
                accent="#DC2626"
                iconBg="rgba(220,38,38,0.1)"
              />
              <StatCard
                icon={CalendarClock}
                label="Expiring Batches"
                value={expiringBatches.length}
                info="Within the next 30 days"
                accent="#DC2626"
                iconBg="rgba(220,38,38,0.1)"
              />
              <StatCard
                icon={Truck}
                label="Transfers Pending"
                value={pendingTransferCount}
                info="Awaiting approval"
                accent="#8B5CF6"
                iconBg="rgba(139,92,246,0.1)"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-5">
          <h2
            className="font-display mb-2.5 font-semibold"
            style={{ fontSize: 16, color: '#0D2630' }}
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
              <QuickActionTile
                icon={ClipboardCheck}
                label="Verify Prescription"
                iconBg="rgba(0,180,216,0.1)"
                iconColor="#00B4D8"
                onClick={() => setModal({ type: 'verify' })}
              />
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
              <QuickActionTile
                icon={Pill}
                label="Dispense Medication"
                iconBg="rgba(22,163,74,0.1)"
                iconColor="#16A34A"
                onClick={() => setModal({ type: 'verify' })}
              />
            </PermissionGate>
            <QuickActionTile
              icon={Search}
              label="Search Medication"
              iconBg="rgba(139,92,246,0.1)"
              iconColor="#8B5CF6"
              onClick={() => setModal({ type: 'search' })}
            />
            <QuickActionTile
              icon={PackagePlus}
              label="Receive Stock"
              iconBg="rgba(217,119,6,0.1)"
              iconColor="#D97706"
              onClick={() => router.push(ROUTES.pharmacyInventory)}
            />
            <QuickActionTile
              icon={PackageSearch}
              label="Stock Adjustment"
              iconBg="rgba(0,180,216,0.1)"
              iconColor="#00B4D8"
              onClick={() => router.push(ROUTES.pharmacyStockAdjustments)}
            />
            <QuickActionTile
              icon={Truck}
              label="Transfer Stock"
              iconBg="rgba(139,92,246,0.1)"
              iconColor="#8B5CF6"
              onClick={() => router.push(ROUTES.pharmacyTransfers)}
            />
          </div>
        </div>

        {/* Prescription Queue | Ready Pickup Queue | Notifications */}
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <Panel
              title="Prescription Queue (Awaiting Verification)"
              viewAllHref={ROUTES.pharmacyPrescriptionQueue}
            >
              <div
                className="mt-3 flex flex-col divide-y"
                style={{ borderColor: 'rgba(0,100,130,0.08)' }}
              >
                {pageState === 'loading' ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : pendingQueue.length === 0 ? (
                  <EmptyRow label="No prescriptions awaiting verification." />
                ) : (
                  pendingQueue.slice(0, 5).map((entry) => {
                    const patient = getPatientDetail(entry.patientId);
                    const cfg = PRIORITY_CFG[entry.priority]!;
                    return (
                      <div key={entry.rxNo} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {patient.name}
                          </p>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {entry.medicationName} {entry.dose} · {entry.doctorName}
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            background: cfg.bg,
                          }}
                        >
                          {entry.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModal({ type: 'verify', rxNo: entry.rxNo })}
                          aria-label={`Review ${patient.name}'s prescription`}
                          className="flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        >
                          <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-4">
            <Panel title="Ready Pickup Queue" viewAllHref={ROUTES.pharmacyPickupQueue}>
              <div
                className="mt-3 flex flex-col divide-y"
                style={{ borderColor: 'rgba(0,100,130,0.08)' }}
              >
                {pageState === 'loading' ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : readyQueue.length === 0 ? (
                  <EmptyRow label="No prescriptions ready for pickup." />
                ) : (
                  readyQueue.slice(0, 5).map((entry) => {
                    const patient = getPatientDetail(entry.patientId);
                    return (
                      <div key={entry.rxNo} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {patient.name}
                          </p>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {entry.medicationName} ·{' '}
                            {entry.dispensedAt ? formatTime(entry.dispensedAt) : '—'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCollect(entry)}
                          className="h-11 shrink-0 rounded-[10px] px-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#00B4D8',
                            border: '1px solid rgba(0,180,216,0.35)',
                          }}
                        >
                          Mark Collected
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-3">
            <Panel title="Notifications &amp; Announcements" viewAllHref={ROUTES.notifications}>
              <div className="mt-3 flex flex-col gap-3">
                {pageState === 'loading' ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : feed.length === 0 ? (
                  <EmptyRow label="No notifications right now." />
                ) : (
                  feed.map((n) => {
                    const cfg = NOTIFICATION_ICON_CFG[n.type] ?? NOTIFICATION_ICON_CFG['system']!;
                    const Icon = cfg.icon;
                    return (
                      <div key={n.id} className="flex items-start gap-2.5">
                        <div
                          className="flex size-8 shrink-0 items-center justify-center rounded-full"
                          style={{ background: cfg.bg }}
                        >
                          <Icon style={{ width: 15, height: 15, color: cfg.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {n.title}
                          </p>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {n.body}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {toRelativeTime(n.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </div>
        </div>

        {/* Low Stock | Expiring Batches | Pending Transfers */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Panel title="Low Stock Medicines" viewAllHref={ROUTES.pharmacyLowStockAlerts}>
            <div
              className="mt-3 flex flex-col divide-y"
              style={{ borderColor: 'rgba(0,100,130,0.08)' }}
            >
              {pageState === 'loading' ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : lowStock.length === 0 ? (
                <EmptyRow label="No medicines below reorder level." />
              ) : (
                lowStock.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {item.name}
                      </p>
                    </div>
                    <span className="shrink-0" style={{ fontSize: 14, color: '#DC2626' }}>
                      {item.currentStock} left
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link
              href={ROUTES.pharmacyInventory}
              className="mt-3.5 inline-flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              Go to Inventory →
            </Link>
          </Panel>

          <Panel title="Expiring Batch List (Next 30 Days)" viewAllHref={ROUTES.pharmacyExpiry}>
            <div
              className="mt-3 flex flex-col divide-y"
              style={{ borderColor: 'rgba(0,100,130,0.08)' }}
            >
              {pageState === 'loading' ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : expiringBatches.length === 0 ? (
                <EmptyRow label="No batches expiring in the next 30 days." />
              ) : (
                expiringBatches.slice(0, 5).map(({ item, batch, daysLeft }) => (
                  <div key={batch.batchNo} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {item.name}
                      </p>
                      <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        Batch {batch.batchNo} · {formatDate(batch.expiryDate)}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: daysLeft <= 14 ? '#DC2626' : '#D97706',
                        border: `1px solid ${daysLeft <= 14 ? 'rgba(220,38,38,0.35)' : 'rgba(217,119,6,0.35)'}`,
                        background:
                          daysLeft <= 14 ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)',
                      }}
                    >
                      {daysLeft}d
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link
              href={ROUTES.pharmacyExpiry}
              className="mt-3.5 inline-flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              Go to Expiry Management →
            </Link>
          </Panel>

          <Panel title="Pending Stock Transfers" viewAllHref={ROUTES.pharmacyTransfers}>
            <div
              className="mt-3 flex flex-col divide-y"
              style={{ borderColor: 'rgba(0,100,130,0.08)' }}
            >
              {pageState === 'loading' ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : STOCK_TRANSFERS.filter((t) => t.status === 'Pending').length === 0 ? (
                <EmptyRow label="No stock transfers pending." />
              ) : (
                STOCK_TRANSFERS.filter((t) => t.status === 'Pending')
                  .slice(0, 5)
                  .map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {t.from} → {t.to}
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{t.itemCount} items</p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 whitespace-nowrap"
                        style={{
                          fontSize: 14,
                          color: '#D97706',
                          border: '1px solid rgba(217,119,6,0.35)',
                          background: 'rgba(217,119,6,0.08)',
                        }}
                      >
                        Pending
                      </span>
                    </div>
                  ))
              )}
            </div>
            <Link
              href={ROUTES.pharmacyTransfers}
              className="mt-3.5 inline-flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              Go to Transfers →
            </Link>
          </Panel>
        </div>

        {/* Inventory Snapshot | Safety Alerts */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Inventory Snapshot
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatMini label="Total Medicines" value={String(snapshot.totalMedicines)} />
              <StatMini
                label="Total Stock Value"
                value={`₦${snapshot.totalStockValue.toLocaleString('en-GB')}`}
              />
              <StatMini label="Available Stock" value={String(snapshot.availableStock)} />
              <StatMini label="Low Stock Items" value={String(snapshot.lowStockItems)} />
              <StatMini label="Expiring Soon" value={String(snapshot.expiringSoon)} />
              <StatMini label="Out of Stock" value={String(snapshot.outOfStock)} />
            </div>
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Safety Alerts
            </h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {[
                { label: 'Drug Interactions', value: SAFETY_ALERT_COUNTS.drugInteractions },
                { label: 'Allergy Conflicts', value: SAFETY_ALERT_COUNTS.allergyConflicts },
                { label: 'Duplicate Therapy', value: SAFETY_ALERT_COUNTS.duplicateTherapy },
                { label: 'High Risk Medications', value: SAFETY_ALERT_COUNTS.highRiskMedications },
                {
                  label: 'Expired Medication Attempts',
                  value: SAFETY_ALERT_COUNTS.expiredAttempts,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-2.5 rounded-[10px] p-2.5"
                  style={{
                    background: 'rgba(220,38,38,0.05)',
                    border: '1px solid rgba(220,38,38,0.2)',
                  }}
                >
                  <ShieldAlert
                    style={{ width: 16, height: 16, color: '#DC2626' }}
                    className="shrink-0"
                  />
                  <p className="min-w-0 flex-1" style={{ fontSize: 14, color: '#0D2630' }}>
                    <span className="font-semibold">{row.value}</span> {row.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Dispensing Activity */}
        <div className="mt-5">
          <Panel title="Recent Dispensing Activity" viewAllHref={ROUTES.pharmacyDispensingHistory}>
            <div
              className="mt-3 flex flex-col divide-y"
              style={{ borderColor: 'rgba(0,100,130,0.08)' }}
            >
              {pageState === 'loading' ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : activity.length === 0 ? (
                <EmptyRow label="No dispensing activity yet this session." />
              ) : (
                activity.slice(0, 6).map((entry) => {
                  const patient = getPatientDetail(entry.patientId);
                  return (
                    <div key={entry.id} className="flex items-center gap-2.5 py-2.5">
                      <CheckCircle2
                        style={{ width: 16, height: 16, color: '#16A34A' }}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p style={{ fontSize: 14, color: '#0D2630' }}>
                          Dispensed <span className="font-medium">{entry.medicationName}</span> to{' '}
                          {patient.name}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {entry.rxNo} · {formatTime(entry.dispensedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>
        </div>

        {/* Footer safety banner */}
        <div
          className="mt-5 flex items-start gap-2.5 rounded-[12px] p-4"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
        >
          <Info style={{ width: 16, height: 16, color: '#00B4D8' }} className="mt-0.5 shrink-0" />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Always verify patient allergies and check for drug interactions before dispensing.
            Follow FEFO (First Expire, First Out) for all dispensing activities.
          </p>
        </div>
      </div>

      {modal?.type === 'verify' && (
        <VerifyDispenseModal
          pendingQueue={pendingQueue}
          {...(modal.rxNo ? { initialRxNo: modal.rxNo } : {})}
          onClose={() => setModal(null)}
          onDispense={handleDispense}
        />
      )}
      {modal?.type === 'search' && <SearchMedicationModal onClose={() => setModal(null)} />}
    </main>
  );
}
