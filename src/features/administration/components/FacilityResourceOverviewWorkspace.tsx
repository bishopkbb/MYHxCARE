'use client';

import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { downloadCSV } from '@/utils/export';
import { formatHumanDate } from '@/utils/datetime';
import {
  FACILITY_OVERVIEW,
  LABORATORY_ICON,
  PHARMACY_ICON,
  RECENT_MAINTENANCE,
  RESOURCE_ALERTS,
  RESOURCE_CATEGORIES,
  SEVERITY_COLOR,
  type AlertSeverity,
  type FacilityOverviewCard,
  type ResourceCategory,
} from '@/features/administration/__mocks__/facilityResourceFixtures';
import { getEquipmentSummary, useEquipment } from '@/features/laboratory/store/equipmentStore';
import { useInventoryBatches } from '@/features/pharmacy/store/inventoryStore';
import { getInventoryRowStatus } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const LAST_UPDATED = new Date().toISOString();

function UtilizationBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: '#EEF3F5' }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: color }}
      />
    </div>
  );
}

function barColor(percent: number): string {
  if (percent >= 85) return '#DC2626';
  if (percent >= 65) return '#D97706';
  return '#16A34A';
}

function FacilityCard({ card }: { card: FacilityOverviewCard }) {
  const router = useRouter();
  const Icon = card.icon;
  const color = barColor(card.percent);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: card.iconBg }}
        >
          <Icon style={{ width: 17, height: 17, color: card.iconColor }} />
        </div>
        <p className="truncate font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          {card.title}
        </p>
      </div>

      <p
        className="font-display mt-3 font-bold"
        style={{ fontSize: 30, lineHeight: '36px', color: '#0D2630' }}
      >
        {card.percent}%
      </p>
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{card.percentLabel}</p>

      <div className="mt-2.5">
        <UtilizationBar percent={card.percent} color={color} />
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        {card.rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <span style={{ fontSize: 14, color: '#8A98A3' }}>{r.label}</span>
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.push(card.detailsRoute)}
        className={`mt-3.5 flex items-center gap-1 self-start font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
        style={{ fontSize: 14, color: '#00B4D8' }}
      >
        {card.detailsLabel}
        <ChevronRight style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

function CategoryCard({ category }: { category: ResourceCategory }) {
  const router = useRouter();
  const Icon = category.icon;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: category.iconBg }}
        >
          <Icon style={{ width: 17, height: 17, color: category.iconColor }} />
        </div>
        <Tooltip content={category.title}>
          <p
            className="truncate font-sans font-semibold"
            style={{ fontSize: 16, color: '#0D2630' }}
          >
            {category.title}
          </p>
        </Tooltip>
      </div>

      <p
        className="font-display mt-3 font-bold"
        style={{ fontSize: 26, lineHeight: '32px', color: '#0D2630' }}
      >
        {category.total}
      </p>
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{category.totalLabel}</p>

      <div className="mt-3.5 flex flex-col gap-2">
        {category.rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <span style={{ fontSize: 14, color: '#8A98A3' }}>{r.label}</span>
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: r.color }}>
              {r.value} ({r.percent}%)
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.push(category.detailsRoute)}
        className={`mt-3.5 flex items-center gap-1 self-start font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
        style={{ fontSize: 14, color: '#00B4D8' }}
      >
        View Details
        <ChevronRight style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const { color, bg } = SEVERITY_COLOR[severity];
  return (
    <span
      className="inline-block shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{ fontSize: 14, color, background: bg }}
    >
      {severity}
    </span>
  );
}

export function FacilityResourceOverviewWorkspace() {
  const router = useRouter();
  useEquipment();
  const equipmentSummary = getEquipmentSummary();
  const inventoryBatches = useInventoryBatches();

  const pharmacyStatusCounts = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    for (const row of inventoryBatches) {
      const status = getInventoryRowStatus(row);
      if (status === 'In Stock') inStock += 1;
      else if (status === 'Low Stock') lowStock += 1;
      else if (status === 'Out of Stock') outOfStock += 1;
    }
    return { inStock, lowStock, outOfStock };
  }, [inventoryBatches]);

  const pharmacyTotal = inventoryBatches.length;
  const pct = (n: number) => (pharmacyTotal > 0 ? Math.round((n / pharmacyTotal) * 100) : 0);

  const laboratoryCategory: ResourceCategory = {
    id: 'res-laboratory',
    icon: LABORATORY_ICON,
    iconColor: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.1)',
    title: 'Laboratory Resources',
    total: equipmentSummary.total,
    totalLabel: 'Resources Monitored',
    rows: [
      {
        label: 'Operational',
        value: equipmentSummary.inUse + equipmentSummary.available,
        percent:
          equipmentSummary.total > 0
            ? Math.round(
                ((equipmentSummary.inUse + equipmentSummary.available) / equipmentSummary.total) *
                  100,
              )
            : 0,
        color: '#16A34A',
      },
      {
        label: 'Maintenance',
        value: equipmentSummary.underMaintenance,
        percent:
          equipmentSummary.total > 0
            ? Math.round((equipmentSummary.underMaintenance / equipmentSummary.total) * 100)
            : 0,
        color: '#D97706',
      },
      {
        label: 'Out of Service',
        value: equipmentSummary.outOfService,
        percent:
          equipmentSummary.total > 0
            ? Math.round((equipmentSummary.outOfService / equipmentSummary.total) * 100)
            : 0,
        color: '#DC2626',
      },
    ],
    detailsRoute: ROUTES.laboratoryEquipmentManagement,
  };

  const pharmacyCategory: ResourceCategory = {
    id: 'res-pharmacy',
    icon: PHARMACY_ICON,
    iconColor: '#16A34A',
    iconBg: 'rgba(22,163,74,0.1)',
    title: 'Pharmacy & Supplies',
    total: pharmacyTotal,
    totalLabel: 'Items Monitored',
    rows: [
      {
        label: 'In Stock',
        value: pharmacyStatusCounts.inStock,
        percent: pct(pharmacyStatusCounts.inStock),
        color: '#16A34A',
      },
      {
        label: 'Low Stock',
        value: pharmacyStatusCounts.lowStock,
        percent: pct(pharmacyStatusCounts.lowStock),
        color: '#D97706',
      },
      {
        label: 'Out of Stock',
        value: pharmacyStatusCounts.outOfStock,
        percent: pct(pharmacyStatusCounts.outOfStock),
        color: '#DC2626',
      },
    ],
    detailsRoute: ROUTES.pharmacyInventory,
  };

  const allCategories = [
    RESOURCE_CATEGORIES[0]!,
    pharmacyCategory,
    laboratoryCategory,
    ...RESOURCE_CATEGORIES.slice(1),
  ];

  const equipmentStatusCard: FacilityOverviewCard = {
    id: 'fac-equipment',
    icon: LABORATORY_ICON,
    iconColor: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.1)',
    title: 'Equipment Status',
    percent:
      equipmentSummary.total > 0
        ? Math.round(
            ((equipmentSummary.inUse + equipmentSummary.available) / equipmentSummary.total) * 100,
          )
        : 0,
    percentLabel: 'Operational',
    rows: [
      { label: 'Operational', value: String(equipmentSummary.inUse + equipmentSummary.available) },
      { label: 'Maintenance', value: String(equipmentSummary.underMaintenance) },
      { label: 'Out of Service', value: String(equipmentSummary.outOfService) },
    ],
    detailsLabel: 'View Equipment',
    detailsRoute: ROUTES.laboratoryEquipmentManagement,
  };

  const facilityCards = [
    FACILITY_OVERVIEW[0]!,
    FACILITY_OVERVIEW[1]!,
    equipmentStatusCard,
    FACILITY_OVERVIEW[2]!,
  ];

  const resourcesMonitored = allCategories.reduce((sum, c) => sum + c.total, 0);
  const criticalAlerts = RESOURCE_ALERTS.filter((a) => a.severity === 'Critical').length;
  const overallStatus = criticalAlerts > 0 ? 'Attention Needed' : 'Good';
  const overallStatusNote =
    criticalAlerts > 0 ? 'Critical issues detected' : 'All systems operational';

  function handleExportReport() {
    const rows: string[][] = [['Section', 'Item', 'Value']];
    for (const c of facilityCards) {
      rows.push(['Facility Overview', c.title, `${c.percent}% ${c.percentLabel}`]);
      for (const r of c.rows) rows.push(['Facility Overview', `${c.title} - ${r.label}`, r.value]);
    }
    for (const c of allCategories) {
      rows.push(['Resource Category', c.title, `${c.total} ${c.totalLabel}`]);
      for (const r of c.rows)
        rows.push(['Resource Category', `${c.title} - ${r.label}`, `${r.value} (${r.percent}%)`]);
    }
    for (const a of RESOURCE_ALERTS) {
      rows.push([
        'Resource Alert',
        `${a.severity}: ${a.title}`,
        `${a.department} - ${a.detail} (${a.timeLabel})`,
      ]);
    }
    for (const m of RECENT_MAINTENANCE) {
      rows.push(['Recent Maintenance', m.title, `${m.detail} (${m.dateLabel})`]);
    }
    downloadCSV('facility-resource-overview', rows);
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
              Operations
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Facility & Resource Overview
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(0,180,216,0.1)' }}
              >
                <Building2 style={{ width: 18, height: 18, color: '#00B4D8' }} />
              </div>
              <div>
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
                >
                  Facility & Resource Overview
                </h1>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  Real-time overview of facilities, equipment and resources across the medical
                  centre.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-11 items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <CalendarDays style={{ width: 15, height: 15, color: '#4A7080' }} />
                {formatHumanDate(new Date())}
              </div>
              <button
                type="button"
                onClick={handleExportReport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export Report
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            <StatCard
              icon={CheckCircle2}
              label="Overall Status"
              value={overallStatus}
              info={overallStatusNote}
              accent={criticalAlerts > 0 ? '#DC2626' : '#16A34A'}
              iconBg={criticalAlerts > 0 ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)'}
            />
            <StatCard
              icon={AlertTriangle}
              label="Active Alerts"
              value={RESOURCE_ALERTS.length}
              info="Requires attention"
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
              onClick={() => router.push(ROUTES.adminAuditLog)}
            />
            <StatCard
              icon={ShieldAlert}
              label="Critical Alerts"
              value={criticalAlerts}
              info="Immediate action needed"
              accent="#DC2626"
              iconBg="rgba(220,38,38,0.1)"
              onClick={() => router.push(ROUTES.adminAuditLog)}
            />
            <StatCard
              icon={Building2}
              label="Resources Monitored"
              value={resourcesMonitored}
              info="Across all departments"
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={Clock}
              label="Last Updated"
              value={new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Africa/Lagos',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              }).format(new Date(LAST_UPDATED))}
              info={formatHumanDate(LAST_UPDATED)}
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
            />
          </div>

          <p className="font-display mt-6 font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Facility Overview
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {facilityCards.map((c) => (
              <FacilityCard key={c.id} card={c} />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 18, color: '#0D2630' }}
                >
                  Resource Overview by Category
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allCategories.map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Resource Alerts
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.adminAuditLog)}
                    className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                    <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {RESOURCE_ALERTS.map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <SeverityBadge severity={a.severity} />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.title}
                        </p>
                        <Tooltip content={a.detail}>
                          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {a.detail}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="shrink-0 text-right">
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{a.department}</p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{a.timeLabel}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.adminAuditLog)}
                  className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All Alerts
                  <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Recent Maintenance
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.laboratoryEquipmentManagement)}
                    className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                    <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {RECENT_MAINTENANCE.map((m) => (
                    <div key={m.id} className="flex items-start gap-2.5">
                      <div
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(22,163,74,0.1)' }}
                      >
                        <CheckCircle2 style={{ width: 13, height: 13, color: '#16A34A' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {m.title}
                        </p>
                        <Tooltip content={m.detail}>
                          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {m.detail}
                          </p>
                        </Tooltip>
                      </div>
                      <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {m.dateLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
