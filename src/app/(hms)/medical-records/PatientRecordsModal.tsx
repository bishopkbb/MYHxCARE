'use client';

import { AlertTriangle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import type { MedicalRecord } from '@/features/medical-records/__mocks__/medicalRecordFixtures';
import { MRN_TO_PATIENT_ID, RECORD_TYPE_CFG, STATUS_CFG } from './config';

// ── Patient Records Modal ─────────────────────────────────────────────────────

export function PatientRecordsModal({
  records,
  onClose,
}: {
  records: MedicalRecord[];
  onClose: () => void;
}) {
  const patient = records[0]!;
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewingRecord = viewingId ? records.find((r) => r.id === viewingId) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{
          maxWidth: 720,
          maxHeight: 'calc(100vh - 64px)',
          borderRadius: 16,
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #0064821F' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 22, lineHeight: '30px', color: '#0D2630' }}
            >
              {patient.patientName}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              {patient.mrn} · {records.length} record{records.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        {viewingRecord ? (
          <RecordDetailView record={viewingRecord} onBack={() => setViewingId(null)} />
        ) : (
          <RecordListView records={records} onSelect={setViewingId} />
        )}

        {/* ── Footer ── */}
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #0064821F' }}
        >
          {MRN_TO_PATIENT_ID[patient.mrn] ? (
            <Link
              href={`/patients/${MRN_TO_PATIENT_ID[patient.mrn]}`}
              onClick={onClose}
              className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
            >
              View Patient Profile →
            </Link>
          ) : (
            <ProfileNotFoundButton />
          )}
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{
              height: 40,
              borderRadius: 10,
              padding: '0 16px',
              background: '#FFFFFF',
              border: '1px solid #0064821F',
              fontSize: 14,
              lineHeight: '22px',
              color: '#4A7080',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileNotFoundButton() {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast.info('Not found', 'No patient profile linked to this MRN.')}
      className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
      style={{ fontSize: 14, lineHeight: '22px', color: '#8A98A3' }}
    >
      View Patient Profile →
    </button>
  );
}

// ── Record list (modal body — default view) ───────────────────────────────────

function RecordListView({
  records,
  onSelect,
}: {
  records: MedicalRecord[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto scroll-smooth px-6 py-4">
      {records.map((record) => {
        const typeCfg = RECORD_TYPE_CFG[record.type];
        const statusCfg = STATUS_CFG[record.status];
        const Icon = typeCfg.icon;

        return (
          <div
            key={record.id}
            className="flex cursor-pointer items-center gap-3 px-3 transition-shadow duration-150 hover:shadow-sm sm:gap-4 sm:px-4"
            style={{
              minHeight: 70,
              borderRadius: 12,
              background: '#FFFFFF',
              borderTop: '1px solid #0064821F',
              borderRight: '1px solid #0064821F',
              borderBottom: '1px solid #0064821F',
              borderLeft: record.isCritical ? '3px solid #EF4444' : '1px solid #0064821F',
              paddingTop: 12,
              paddingBottom: 12,
            }}
            onClick={() => onSelect(record.id)}
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
                {record.date}
                <span className="hidden sm:inline"> · {record.provider}</span>
              </p>
            </div>

            {/* Type badge — desktop only */}
            <span
              className="hidden shrink-0 rounded-full px-3 py-0.5 font-sans font-semibold tracking-wide sm:inline"
              style={{
                fontSize: 14,
                lineHeight: '22px',
                color: typeCfg.badgeColor,
                border: `1px solid ${typeCfg.badgeBorder}`,
                background: typeCfg.badgeBg,
              }}
            >
              {typeCfg.label}
            </span>

            {/* Status badge */}
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium sm:px-3"
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

            <ChevronRight style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Record detail (modal body — drill-down view) ──────────────────────────────

function RecordDetailView({ record, onBack }: { record: MedicalRecord; onBack: () => void }) {
  const typeCfg = RECORD_TYPE_CFG[record.type];
  const statusCfg = STATUS_CFG[record.status];
  const Icon = typeCfg.icon;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto scroll-smooth px-6 py-4">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
        style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
      >
        <ChevronLeft style={{ width: 16, height: 16 }} />
        Back to records
      </button>

      {/* ── Record header ── */}
      <div className="flex items-start gap-3">
        <div
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 44, height: 44, background: typeCfg.iconBg }}
        >
          <Icon style={{ width: 20, height: 20, color: typeCfg.iconColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className="font-sans font-semibold"
              style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
            >
              {record.title}
            </p>
            {record.isCritical && (
              <AlertTriangle
                aria-hidden
                style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }}
              />
            )}
          </div>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            {record.date} · {record.provider}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="rounded-full px-3 py-0.5 font-sans font-semibold tracking-wide"
              style={{
                fontSize: 14,
                lineHeight: '22px',
                color: typeCfg.badgeColor,
                border: `1px solid ${typeCfg.badgeBorder}`,
                background: typeCfg.badgeBg,
              }}
            >
              {typeCfg.label}
            </span>
            <span
              className="rounded-full px-3 py-0.5 font-sans font-medium"
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
          </div>
        </div>
      </div>

      {/* ── Summary ── */}
      <p
        className="rounded-[12px] px-4 py-3 font-sans"
        style={{
          fontSize: 14,
          lineHeight: '22px',
          color: '#25464D',
          background: 'rgba(226,237,241,0.4)',
        }}
      >
        {record.detail.summary}
      </p>

      {/* ── Key fields ── */}
      <div
        className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-[12px] p-4 sm:grid-cols-2"
        style={{ border: '1px solid #0064821F' }}
      >
        {record.detail.fields.map((field) => (
          <div key={field.label}>
            <p
              className="font-sans font-bold tracking-wider uppercase"
              style={{ fontSize: 14, lineHeight: '20px', color: '#8A98A3' }}
            >
              {field.label}
            </p>
            <p
              className="mt-0.5 font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
            >
              {field.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Clinical notes ── */}
      {record.detail.notes && (
        <div
          className="rounded-[12px] px-4 py-3"
          style={{
            background: record.isCritical ? '#FEF2F2' : '#FFFBEB',
            border: `1px solid ${record.isCritical ? '#FFC9C9' : '#FEE685'}`,
          }}
        >
          <p
            className="font-sans font-bold tracking-wider uppercase"
            style={{
              fontSize: 14,
              lineHeight: '20px',
              color: record.isCritical ? '#EF4444' : '#B45309',
            }}
          >
            Clinical Notes
          </p>
          <p
            className="mt-1 font-sans"
            style={{
              fontSize: 14,
              lineHeight: '22px',
              color: record.isCritical ? '#7F1D1D' : '#78350F',
            }}
          >
            {record.detail.notes}
          </p>
        </div>
      )}
    </div>
  );
}
