'use client';

import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Download,
  FlaskConical,
  ListFilter,
  Pill,
  Search,
  Share2,
  Stethoscope,
} from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  MOCK_MEDICAL_RECORDS,
  type MedicalRecord,
  type RecordStatus,
  type RecordType,
} from '@/features/medical-records/__mocks__/medicalRecordFixtures';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'all' | RecordType;

type TabCfg = {
  id: TabId;
  label: string;
  count: number;
};

type MetricCard = {
  label: string;
  value: number;
  color: string;
  borderLeft: string;
  bg: string;
};

type RecordTypeCfg = {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
};

type StatusCfg = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

// ── Config ────────────────────────────────────────────────────────────────────

const RECORD_TYPE_CFG: Record<RecordType, RecordTypeCfg> = {
  consultation: {
    label: 'CONSULTATION',
    icon: Stethoscope,
    iconBg: 'rgba(0,180,216,0.12)',
    iconColor: '#00B4D8',
    badgeColor: '#00B4D8',
    badgeBorder: 'rgba(0,180,216,0.30)',
    badgeBg: 'rgba(0,180,216,0.06)',
  },
  laboratory: {
    label: 'LABORATORY',
    icon: FlaskConical,
    iconBg: 'rgba(59,130,246,0.12)',
    iconColor: '#3B82F6',
    badgeColor: '#3B82F6',
    badgeBorder: 'rgba(59,130,246,0.30)',
    badgeBg: 'rgba(59,130,246,0.06)',
  },
  prescription: {
    label: 'PRESCRIPTION',
    icon: Pill,
    iconBg: 'rgba(139,92,246,0.12)',
    iconColor: '#8B5CF6',
    badgeColor: '#8B5CF6',
    badgeBorder: 'rgba(139,92,246,0.30)',
    badgeBg: 'rgba(139,92,246,0.06)',
  },
  referral: {
    label: 'REFERRAL',
    icon: Share2,
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#F59E0B',
    badgeColor: '#F59E0B',
    badgeBorder: 'rgba(245,158,11,0.30)',
    badgeBg: 'rgba(245,158,11,0.06)',
  },
};

const STATUS_CFG: Record<RecordStatus, StatusCfg> = {
  active: {
    label: 'Active',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  critical: {
    label: 'Critical',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
  completed: {
    label: 'Completed',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  dispensed: {
    label: 'Dispensed',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  accepted: {
    label: 'Accepted',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  verified: {
    label: 'Verified',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  'in-progress': {
    label: 'In Progress',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.40)',
    bg: 'rgba(245,158,11,0.06)',
  },
  emergency: {
    label: 'Emergency',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function countByType(records: MedicalRecord[], type: RecordType) {
  return records.filter((r) => r.type === type).length;
}

function countByStatus(records: MedicalRecord[], ...statuses: RecordStatus[]) {
  return records.filter((r) => statuses.includes(r.status)).length;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MedicalRecordsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');

  const allRecords = MOCK_MEDICAL_RECORDS;

  const metrics: MetricCard[] = [
    {
      label: 'Total Records',
      value: allRecords.length,
      color: '#00B4D8',
      borderLeft: '#00B4D8',
      bg: 'rgba(0,180,216,0.05)',
    },
    {
      label: 'Critical / Emergency',
      value: countByStatus(allRecords, 'critical', 'emergency'),
      color: '#EF4444',
      borderLeft: '#EF4444',
      bg: 'rgba(239,68,68,0.05)',
    },
    {
      label: 'Pending Review',
      value: countByStatus(allRecords, 'pending', 'in-progress'),
      color: '#F59E0B',
      borderLeft: '#F59E0B',
      bg: 'rgba(245,158,11,0.05)',
    },
    {
      label: 'Completed',
      value: countByStatus(allRecords, 'completed', 'dispensed', 'accepted', 'verified'),
      color: '#3B82F6',
      borderLeft: '#3B82F6',
      bg: 'rgba(59,130,246,0.05)',
    },
  ];

  const tabs: TabCfg[] = [
    { id: 'all', label: 'All Records', count: allRecords.length },
    { id: 'consultation', label: 'Consultations', count: countByType(allRecords, 'consultation') },
    { id: 'laboratory', label: 'Laboratory', count: countByType(allRecords, 'laboratory') },
    { id: 'prescription', label: 'Prescriptions', count: countByType(allRecords, 'prescription') },
    { id: 'referral', label: 'Referrals', count: countByType(allRecords, 'referral') },
  ];

  const q = search.trim().toLowerCase();
  const filtered = allRecords.filter((r) => {
    const matchesTab = activeTab === 'all' || r.type === activeTab;
    const matchesSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.patientName.toLowerCase().includes(q) ||
      r.mrn.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6" style={{ background: '#F5FBFD' }}>
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 24, lineHeight: '32px', color: '#0D2630' }}
          >
            Medical Records
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Complete clinical records for your patients — June 2026
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => toast.info('Filter', 'Advanced filters coming soon.')}
            className="flex items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors hover:bg-slate-50"
            style={{
              fontSize: 14,
              lineHeight: '22px',
              height: 42,
              color: '#0D2630',
              border: '1px solid #0064821F',
              background: '#FFFFFF',
            }}
          >
            <ListFilter style={{ width: 16, height: 16, flexShrink: 0 }} />
            Filter
          </button>

          <button
            type="button"
            onClick={() => toast.success('Export ready', 'Medical records downloaded as CSV.')}
            className="flex items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors hover:bg-slate-50"
            style={{
              fontSize: 14,
              lineHeight: '22px',
              height: 42,
              color: '#0D2630',
              border: '1px solid #0064821F',
              background: '#FFFFFF',
            }}
          >
            <Download style={{ width: 16, height: 16, flexShrink: 0 }} />
            Export Records
          </button>
        </div>
      </div>

      {/* ── Metric cards ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-[60px]">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-3"
            style={{
              width: 200,
              height: 64,
              borderRadius: 12,
              borderTop: '1px solid #0064821F',
              borderRight: '1px solid #0064821F',
              borderBottom: '1px solid #0064821F',
              borderLeft: `3px solid ${m.borderLeft}`,
              padding: '12px 16px',
              background: m.bg,
            }}
          >
            <span
              className="font-display shrink-0 font-semibold"
              style={{ fontSize: 28, lineHeight: '36px', color: m.color }}
            >
              {m.value}
            </span>
            <span
              className="font-sans"
              style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────────── */}
      <div
        className="mb-4 flex items-center gap-3 px-4"
        style={{
          height: 42,
          borderRadius: 10,
          border: '1px solid #0064821F',
          background: '#FFFFFF',
        }}
      >
        <Search style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, MRN, or record title..."
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8A98A3]"
          style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
        />
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div
        className="mb-4 flex gap-1 overflow-x-auto"
        style={{
          borderRadius: 12,
          padding: 4,
          background: '#8A98A333',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex shrink-0 items-center gap-2 rounded-[9px] px-4 font-sans font-semibold whitespace-nowrap transition-all"
              style={{
                fontSize: 14,
                lineHeight: '22px',
                height: 34,
                color: isActive ? '#0D2630' : '#4A7080',
                background: isActive ? '#FFFFFF' : 'transparent',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              {tab.label}
              <span
                className="flex items-center justify-center rounded-full font-bold"
                style={{
                  minWidth: 20,
                  height: 20,
                  fontSize: 12,
                  padding: '0 5px',
                  background: isActive ? 'rgba(0,180,216,0.12)' : 'rgba(138,152,163,0.20)',
                  color: isActive ? '#00B4D8' : '#4A7080',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Record rows ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            style={{ color: '#4A7080' }}
          >
            <ClipboardList style={{ width: 40, height: 40, opacity: 0.4, marginBottom: 12 }} />
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              No records found
            </p>
            <p className="mt-1" style={{ fontSize: 14 }}>
              Try adjusting your search or filter.
            </p>
          </div>
        ) : (
          filtered.map((record) => {
            const typeCfg = RECORD_TYPE_CFG[record.type];
            const statusCfg = STATUS_CFG[record.status];
            const Icon = typeCfg.icon;
            const isCriticalRow = record.isCritical;

            return (
              <div
                key={record.id}
                className="flex cursor-pointer items-center gap-4 px-4 transition-shadow hover:shadow-sm"
                style={{
                  height: 70,
                  borderRadius: 12,
                  background: '#FFFFFF',
                  borderTop: '1px solid #0064821F',
                  borderRight: '1px solid #0064821F',
                  borderBottom: '1px solid #0064821F',
                  borderLeft: isCriticalRow ? '3px solid #EF4444' : '1px solid #0064821F',
                }}
              >
                {/* Icon circle */}
                <div
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{ width: 40, height: 40, background: typeCfg.iconBg }}
                >
                  <Icon style={{ width: 18, height: 18, color: typeCfg.iconColor }} />
                </div>

                {/* Title + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                    >
                      {record.title}
                    </p>
                    {record.isCritical && (
                      <AlertTriangle
                        aria-hidden
                        style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0 }}
                      />
                    )}
                  </div>
                  <p
                    className="truncate"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    {record.patientName} · {record.mrn} · {record.date} · {record.provider}
                  </p>
                </div>

                {/* Type badge */}
                <span
                  className="shrink-0 rounded-full px-3 py-0.5 font-sans font-semibold tracking-wide"
                  style={{
                    fontSize: 12,
                    lineHeight: '20px',
                    color: typeCfg.badgeColor,
                    border: `1px solid ${typeCfg.badgeBorder}`,
                    background: typeCfg.badgeBg,
                  }}
                >
                  {typeCfg.label}
                </span>

                {/* Status badge */}
                <span
                  className="shrink-0 rounded-full px-3 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    lineHeight: '22px',
                    color: statusCfg.color,
                    border: `1px solid ${statusCfg.border}`,
                    background: statusCfg.bg,
                  }}
                >
                  {statusCfg.label}
                </span>

                {/* Chevron */}
                <ChevronRight style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
