'use client';

import {
  Calendar,
  ChevronDown,
  ClipboardEdit,
  ClipboardList,
  Download,
  Droplet,
  Eye,
  FileText,
  Globe2,
  Heart,
  History,
  Mail,
  MapPin,
  Lock,
  MoreVertical,
  Pencil,
  Phone,
  Printer,
  Upload,
  User as UserIcon,
  UserCog,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { QuickActionTile } from '@components/shared/QuickActionTile';
import { Tooltip } from '@components/shared/Tooltip';
import { UserAvatar } from '@components/shared/UserAvatar';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { computeAge } from '@/features/registration/schemas/registerPatientSchema';
import {
  MOCK_PATIENT_PROFILE,
  directoryPatientToProfile,
  type PatientProfile,
} from '@/features/registration/__mocks__/patientProfileFixtures';
import { useDirectoryPatients } from '@/features/registration/store/patientDirectoryStore';
import type { Referral } from '@/features/registration/__mocks__/referralFixtures';
import { useReferrals } from '@/features/registration/store/referralStore';
import {
  getPatientDetail,
  resolvePatientIdByMrn,
  type Medication,
} from '@/features/patients/__mocks__/patientFixtures';
import type { Allergy } from '@/types/patient.types';
import {
  DOCUMENT_TYPE_CFG,
  MEDICAL_SUMMARY_EXTRA,
  MOCK_DOCUMENTS,
  MOCK_IMMUNIZATIONS,
  MOCK_INSURANCE_CLAIMS,
  MOCK_LAB_RESULTS,
  MOCK_PRESCRIPTIONS,
  MOCK_REFERRALS,
  PATIENT_VISITS,
  RECORD_ACCESS,
  RECORD_ACTIVITY,
  generateActivityFromVisits,
  generateClinicalDocumentsForPatient,
  generateVisitsForPatient,
  type ClinicalDocumentEntry,
  type DocumentType,
  type ImmunizationEntry,
  type InsuranceClaimEntry,
  type LabResultEntry,
  type MedicalDocument,
  type Prescription,
  type PatientVisit,
  type RecordActivityEntry,
  type RecordAccessEntry,
  type ReferralEntry,
} from '@/features/medical-records/__mocks__/medicalRecordDetailFixtures';
import { useEncounters } from '@/features/encounters/store/encounterStore';
import { useLabResults } from '@/features/laboratory/store/labResultStore';
import type { Encounter } from '@/types/visit.types';
import { computeVisitSummary, VisitHistorySection } from './VisitHistorySection';

const CURATED_PATIENT_ID = 'dp-001';

const VISIT_TYPE_LABEL: Record<Encounter['type'], string> = {
  OPD: 'Outpatient Consultation',
  EMERGENCY: 'Emergency Visit',
  INPATIENT: 'Inpatient',
};

/** Converts a real, completed `Encounter` (Doctor's Dashboard's canonical
 * visit record) into this module's own `PatientVisit` display shape — closes
 * half of SYS-003 (MedicalRecord Model A/B): a completed consultation used to
 * update only the flat `MedicalRecord` feed, never this chart's own Visit
 * History tab. Joined by MRN, not patientId — Medical Records resolves
 * patients through Registration's `DirectoryPatient.id` namespace, a
 * different identity space from `Encounter.patientId` (Doctor's Dashboard's
 * own patient ids); MRN is the one field disciplined enough to be shared
 * across both today (see SYS-001). `credentials` has no `Encounter`
 * equivalent — left honestly blank rather than fabricated. */
function encounterToPatientVisit(encounter: Encounter): PatientVisit {
  return {
    id: encounter.id,
    dateTime: encounter.completedAt ?? encounter.checkedInAt ?? encounter.createdAt,
    department: encounter.departmentName,
    doctor: encounter.attendingPhysicianName ?? 'Unknown Doctor',
    credentials: '',
    visitType: VISIT_TYPE_LABEL[encounter.type],
    diagnosisSummary: encounter.diagnosis || encounter.chiefComplaint || '—',
    reason: encounter.chiefComplaint || '—',
    status: 'Completed',
  };
}

/** `ClinicalDocumentEntry` (the richer, formal taxonomy used by the standalone
 * Clinical Documents workspace) is the canonical document shape per
 * `03-domain-entities.md` §3.7 — this maps it onto the Overview tab's looser
 * `MedicalDocument` shape for display, rather than maintaining a second
 * generator for a patient who isn't the curated demo persona. */
function clinicalDocToMedicalDoc(doc: ClinicalDocumentEntry): MedicalDocument {
  const CATEGORY_TO_TYPE: Record<ClinicalDocumentEntry['category'], DocumentType> = {
    'Consultation Note': 'Clinical Note',
    'Discharge Summary': 'Other',
    'Referral Letter': 'Other',
    'Medical Certificate': 'Other',
    'Imaging Report': 'Imaging',
    'Consent Form': 'Other',
  };
  return {
    id: doc.id,
    name: doc.name,
    subtitle: doc.subtitle,
    type: CATEGORY_TO_TYPE[doc.category],
    uploadedBy: doc.createdBy,
    dateUploaded: doc.dateCreated,
    visitDate: doc.visitDate,
  };
}

const PRIMARY_TABS = [
  'Overview',
  'Visit History',
  'Medical Documents',
  'Lab Results',
  'Prescriptions',
  'Immunizations',
  'Allergies',
] as const;
const MORE_TABS = ['Referrals', 'Insurance Claims', 'Audit Log'] as const;
export type Tab = (typeof PRIMARY_TABS)[number] | (typeof MORE_TABS)[number];

const TAB_META: Record<Tab, { breadcrumb: string; title: string; subtitle: string }> = {
  Overview: {
    breadcrumb: 'Patient Medical Record',
    title: 'Medical Record',
    subtitle: 'View, manage and track patient medical records and documents',
  },
  'Visit History': {
    breadcrumb: 'Visit History',
    title: 'Visit History',
    subtitle: 'View patient encounter history and visit details',
  },
  'Medical Documents': {
    breadcrumb: 'Medical Documents',
    title: 'Medical Documents',
    subtitle: "Browse and manage this patient's documents and files",
  },
  'Lab Results': {
    breadcrumb: 'Lab Results',
    title: 'Lab Results',
    subtitle: "This patient's laboratory test results",
  },
  Prescriptions: {
    breadcrumb: 'Prescriptions',
    title: 'Prescriptions',
    subtitle: "This patient's prescribed medications",
  },
  Immunizations: {
    breadcrumb: 'Immunizations',
    title: 'Immunizations',
    subtitle: "This patient's vaccination record",
  },
  Allergies: {
    breadcrumb: 'Allergies',
    title: 'Allergies',
    subtitle: "This patient's recorded allergies",
  },
  Referrals: {
    breadcrumb: 'Referrals',
    title: 'Referrals',
    subtitle: "This patient's referral history",
  },
  'Insurance Claims': {
    breadcrumb: 'Insurance Claims',
    title: 'Insurance Claims',
    subtitle: "This patient's insurance claim history",
  },
  'Audit Log': {
    breadcrumb: 'Audit Log',
    title: 'Audit Log',
    subtitle: 'A complete access and activity trail for this record',
  },
};

const DOC_FILTERS: { value: DocumentType | 'All'; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Clinical Note', label: 'Clinical Notes' },
  { value: 'Lab Result', label: 'Lab Results' },
  { value: 'Prescription', label: 'Prescriptions' },
  { value: 'Imaging', label: 'Imaging' },
  { value: 'Other', label: 'Other' },
];

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

function physicianAbbrev(role: string): string {
  return role === 'General Practitioner' ? 'GP' : role;
}

export function toDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function BannerStat({ icon: Icon, value }: { icon: typeof Calendar; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon style={{ width: 15, height: 15, color: '#8A98A3' }} />
      <span style={{ fontSize: 14, color: '#4A7080' }}>{value}</span>
    </div>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{ fontSize: 14, color, border: `1px solid ${color}66`, background: `${color}0F` }}
    >
      {label}
    </span>
  );
}

export type TableColumn = { label: string; width: string };

export function SimpleTableCard({
  title,
  headerAction,
  columns,
  rows,
  emptyMessage = 'No records found',
}: {
  title: string;
  headerAction?: React.ReactNode;
  columns: TableColumn[];
  rows: React.ReactNode[][];
  emptyMessage?: string;
}) {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          {title}
        </h2>
        {headerAction}
      </div>
      <div className="mt-3 overflow-x-auto scroll-smooth">
        <div style={{ minWidth: columns.length * 150 }}>
          <div
            className="flex rounded-t-[8px]"
            style={{ background: 'rgba(226,237,241,0.4)', borderBottom: '1px solid #E6F8FD' }}
          >
            {columns.map((col, i) => (
              <div
                key={col.label}
                className={`${col.width} shrink-0 py-2.5 pr-2 ${i === 0 ? 'pl-3' : ''}`}
              >
                <span
                  className="font-sans font-bold tracking-wider uppercase"
                  style={{ fontSize: 14, color: '#4A7080' }}
                >
                  {col.label}
                </span>
              </div>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>{emptyMessage}</p>
            </div>
          ) : (
            rows.map((row, ri) => (
              <div
                key={ri}
                className="flex items-center"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
              >
                {row.map((cell, ci) => (
                  <div
                    key={ci}
                    className={`${columns[ci]?.width ?? 'flex-1'} min-w-0 shrink-0 py-3 pr-2 ${ci === 0 ? 'pl-3' : ''}`}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const RX_STATUS_COLOR: Record<Prescription['status'], string> = {
  Active: '#00B4D8',
  Completed: '#22C55E',
  Discontinued: '#8A98A3',
  Cancelled: '#8A98A3',
};

// Exhaustive so a future Medication status fails to compile here instead of
// silently falling through to the wrong Prescription status (G-MR-13).
const MEDICATION_TO_RX_STATUS: Record<Medication['status'], Prescription['status']> = {
  active: 'Active',
  completed: 'Completed',
  discontinued: 'Discontinued',
  cancelled: 'Cancelled',
};

/** Converts a real, live Medication (prescriptionStore.ts's canonical shape —
 * SYS-011) into this tab's own long-standing Prescription display shape,
 * the same adapter convention already proven for SYS-004/005/007. */
function medicationToPrescription(m: Medication): Prescription {
  return {
    id: m.id,
    drugName: m.name,
    dosage: m.dose,
    frequency: m.frequency,
    route: m.route,
    prescribedBy: m.prescribedBy,
    datePrescribed: m.startedDate,
    status: MEDICATION_TO_RX_STATUS[m.status],
  };
}

function PrescriptionsSection({ prescriptions }: { prescriptions: Prescription[] }) {
  return (
    <SimpleTableCard
      title="Prescriptions"
      columns={[
        { label: 'Drug Name', width: 'flex-1' },
        { label: 'Dosage', width: 'w-28' },
        { label: 'Frequency', width: 'w-48' },
        { label: 'Route', width: 'w-28' },
        { label: 'Prescribed By', width: 'w-44' },
        { label: 'Date', width: 'w-28' },
        { label: 'Status', width: 'w-28' },
      ]}
      rows={prescriptions.map((rx) => [
        <Tooltip key="drug" content={rx.drugName}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {rx.drugName}
          </p>
        </Tooltip>,
        <p key="dose" style={{ fontSize: 14, color: '#4A7080' }}>
          {rx.dosage}
        </p>,
        <Tooltip key="freq" content={rx.frequency}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {rx.frequency}
          </p>
        </Tooltip>,
        <p key="route" style={{ fontSize: 14, color: '#4A7080' }}>
          {rx.route}
        </p>,
        <Tooltip key="by" content={rx.prescribedBy}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {rx.prescribedBy}
          </p>
        </Tooltip>,
        <p key="date" style={{ fontSize: 14, color: '#4A7080' }}>
          {formatHumanDate(rx.datePrescribed)}
        </p>,
        <Pill key="status" label={rx.status} color={RX_STATUS_COLOR[rx.status] ?? '#8A98A3'} />,
      ])}
    />
  );
}

const LAB_FLAG_COLOR: Record<string, string> = {
  Normal: '#22C55E',
  High: '#EF4444',
  Low: '#F59E0B',
  Critical: '#991B1B',
};

function LabResultsSection({ labResults }: { labResults: LabResultEntry[] }) {
  return (
    <SimpleTableCard
      title="Lab Results"
      columns={[
        { label: 'Test Name', width: 'flex-1' },
        { label: 'Result', width: 'w-24' },
        { label: 'Unit', width: 'w-24' },
        { label: 'Reference Range', width: 'w-36' },
        { label: 'Flag', width: 'w-24' },
        { label: 'Date Collected', width: 'w-32' },
        { label: 'Ordered By', width: 'w-40' },
      ]}
      rows={labResults.map((lab) => [
        <Tooltip key="test" content={lab.testName}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {lab.testName}
          </p>
        </Tooltip>,
        <p key="result" style={{ fontSize: 14, color: '#0D2630' }}>
          {lab.result}
        </p>,
        <p key="unit" style={{ fontSize: 14, color: '#4A7080' }}>
          {lab.unit}
        </p>,
        <Tooltip key="range" content={lab.referenceRange}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {lab.referenceRange}
          </p>
        </Tooltip>,
        <Pill key="flag" label={lab.flag} color={LAB_FLAG_COLOR[lab.flag] ?? '#8A98A3'} />,
        <p key="date" style={{ fontSize: 14, color: '#4A7080' }}>
          {formatHumanDate(lab.dateCollected)}
        </p>,
        <Tooltip key="by" content={lab.orderedBy}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {lab.orderedBy}
          </p>
        </Tooltip>,
      ])}
    />
  );
}

function ImmunizationsSection({ immunizations }: { immunizations: ImmunizationEntry[] }) {
  return (
    <SimpleTableCard
      title="Immunizations"
      columns={[
        { label: 'Vaccine', width: 'flex-1' },
        { label: 'Dose', width: 'w-32' },
        { label: 'Date Given', width: 'w-32' },
        { label: 'Given By', width: 'w-44' },
        { label: 'Next Due', width: 'w-32' },
      ]}
      rows={immunizations.map((imm) => [
        <Tooltip key="vaccine" content={imm.vaccine}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {imm.vaccine}
          </p>
        </Tooltip>,
        <Tooltip key="dose" content={imm.doseLabel}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {imm.doseLabel}
          </p>
        </Tooltip>,
        <p key="date" style={{ fontSize: 14, color: '#4A7080' }}>
          {formatHumanDate(imm.dateGiven)}
        </p>,
        <Tooltip key="by" content={imm.givenBy}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {imm.givenBy}
          </p>
        </Tooltip>,
        <p key="next" style={{ fontSize: 14, color: '#4A7080' }}>
          {imm.nextDueDate ? formatHumanDate(imm.nextDueDate) : '—'}
        </p>,
      ])}
    />
  );
}

const ALLERGY_SEVERITY_COLOR: Record<string, string> = {
  MILD: '#22C55E',
  MODERATE: '#F59E0B',
  SEVERE: '#EF4444',
  LIFE_THREATENING: '#EF4444',
};

function AllergiesSection({ allergies }: { allergies: Allergy[] }) {
  return (
    <SimpleTableCard
      title="Allergies"
      emptyMessage="No known drug allergies (NKDA) on record"
      columns={[
        { label: 'Substance', width: 'flex-1' },
        { label: 'Reaction', width: 'flex-1' },
        { label: 'Severity', width: 'w-32' },
        { label: 'Recorded On', width: 'w-32' },
        { label: 'Recorded By', width: 'w-44' },
      ]}
      rows={allergies.map((a) => [
        <Tooltip key="substance" content={a.substance}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {a.substance}
          </p>
        </Tooltip>,
        <Tooltip key="reaction" content={a.reaction}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {a.reaction}
          </p>
        </Tooltip>,
        <Pill
          key="severity"
          label={a.severity.replace('_', ' ')}
          color={ALLERGY_SEVERITY_COLOR[a.severity] ?? '#8A98A3'}
        />,
        <p key="date" style={{ fontSize: 14, color: '#4A7080' }}>
          {formatHumanDate(a.recordedAt)}
        </p>,
        <Tooltip key="by" content={a.recordedBy}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {a.recordedBy}
          </p>
        </Tooltip>,
      ])}
    />
  );
}

const REFERRAL_STATUS_COLOR: Record<string, string> = {
  Pending: '#F59E0B',
  Accepted: '#00B4D8',
  Completed: '#22C55E',
  Cancelled: '#8A98A3',
};

/** Converts a real, shared Referral (referralStore.ts — already correctly
 * cross-module for Registration/Doctor's Dashboard, SYS-006) into this tab's
 * own long-standing ReferralEntry display shape. */
function referralToReferralEntry(r: Referral): ReferralEntry {
  return {
    id: r.id,
    toDepartment: r.toDepartment,
    // No named-provider field exists on the real entity — reuse the
    // department rather than fabricate a person's name.
    toProvider: r.toDepartment,
    reason: r.reason,
    dateReferred: r.date,
    status: r.status,
  };
}

function ReferralsSection({ referrals }: { referrals: ReferralEntry[] }) {
  return (
    <SimpleTableCard
      title="Referrals"
      columns={[
        { label: 'Department', width: 'w-40' },
        { label: 'Provider', width: 'w-44' },
        { label: 'Reason', width: 'flex-1' },
        { label: 'Date Referred', width: 'w-32' },
        { label: 'Status', width: 'w-28' },
      ]}
      rows={referrals.map((ref) => [
        <Tooltip key="dept" content={ref.toDepartment}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {ref.toDepartment}
          </p>
        </Tooltip>,
        <Tooltip key="provider" content={ref.toProvider}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {ref.toProvider}
          </p>
        </Tooltip>,
        <Tooltip key="reason" content={ref.reason}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {ref.reason}
          </p>
        </Tooltip>,
        <p key="date" style={{ fontSize: 14, color: '#4A7080' }}>
          {formatHumanDate(ref.dateReferred)}
        </p>,
        <Pill
          key="status"
          label={ref.status}
          color={REFERRAL_STATUS_COLOR[ref.status] ?? '#8A98A3'}
        />,
      ])}
    />
  );
}

const CLAIM_STATUS_COLOR: Record<string, string> = {
  Submitted: '#00B4D8',
  Approved: '#22C55E',
  Rejected: '#EF4444',
  Paid: '#8B5CF6',
};

function InsuranceClaimsSection({ insuranceClaims }: { insuranceClaims: InsuranceClaimEntry[] }) {
  return (
    <SimpleTableCard
      title="Insurance Claims"
      columns={[
        { label: 'Claim ID', width: 'w-40' },
        { label: 'Service', width: 'flex-1' },
        { label: 'Amount', width: 'w-28' },
        { label: 'Date Submitted', width: 'w-32' },
        { label: 'Status', width: 'w-28' },
      ]}
      rows={insuranceClaims.map((claim) => [
        <Tooltip key="id" content={claim.claimId}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {claim.claimId}
          </p>
        </Tooltip>,
        <Tooltip key="service" content={claim.service}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {claim.service}
          </p>
        </Tooltip>,
        <p key="amount" style={{ fontSize: 14, color: '#0D2630' }}>
          &#8358;{claim.amount.toLocaleString('en-NG')}
        </p>,
        <p key="date" style={{ fontSize: 14, color: '#4A7080' }}>
          {formatHumanDate(claim.dateSubmitted)}
        </p>,
        <Pill
          key="status"
          label={claim.status}
          color={CLAIM_STATUS_COLOR[claim.status] ?? '#8A98A3'}
        />,
      ])}
    />
  );
}

type AuditRow = { dateTime: string; type: 'Activity' | 'Access'; description: string };

function AuditLogSection({
  activity,
  access,
}: {
  activity: RecordActivityEntry[];
  access: RecordAccessEntry[];
}) {
  const rows: AuditRow[] = [
    ...activity.map((a) => ({
      dateTime: a.dateTime,
      type: 'Activity' as const,
      description: `${a.label} — ${a.detail}`,
    })),
    ...access.map((a) => ({
      dateTime: a.dateTime,
      type: 'Access' as const,
      description: `${a.name} viewed this record`,
    })),
  ].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return (
    <SimpleTableCard
      title="Audit Log"
      columns={[
        { label: 'Date / Time', width: 'w-44' },
        { label: 'Type', width: 'w-28' },
        { label: 'Details', width: 'flex-1' },
      ]}
      rows={rows.map((r, i) => [
        <p key="dt" style={{ fontSize: 14, color: '#4A7080' }}>
          {formatHumanDate(r.dateTime)} {formatTime(r.dateTime)}
        </p>,
        <Pill key="type" label={r.type} color={r.type === 'Activity' ? '#00B4D8' : '#8B5CF6'} />,
        <Tooltip key={`desc-${i}`} content={r.description}>
          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
            {r.description}
          </p>
        </Tooltip>,
      ])}
    />
  );
}

function DocumentsAndFilesCard({ initialDocuments }: { initialDocuments: MedicalDocument[] }) {
  const toast = useToast();
  const [docFilter, setDocFilter] = useState<DocumentType | 'All'>('All');
  const [documents, setDocuments] = useState<MedicalDocument[]>(initialDocuments);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredDocs = useMemo(
    () => (docFilter === 'All' ? documents : documents.filter((d) => d.type === docFilter)),
    [documents, docFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageDocs = filteredDocs.slice(pageStart, pageStart + rowsPerPage);

  const docMenuButtonRefs = useMemo(() => {
    const map = new Map<string, RefObject<HTMLButtonElement | null>>();
    for (const doc of pageDocs) map.set(doc.id, { current: null });
    return map;
  }, [pageDocs]);

  function getDocMenuButtonRef(id: string) {
    return docMenuButtonRefs.get(id) ?? { current: null };
  }

  function selectFilter(value: DocumentType | 'All') {
    setDocFilter(value);
    setCurrentPage(1);
  }

  function deleteDocument(doc: MedicalDocument) {
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast.success('Document deleted', `${doc.name} was removed from this record.`);
    setOpenMenuId(null);
  }

  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Documents &amp; Files
        </h2>
        <button
          type="button"
          onClick={() =>
            toast.info('Link Document', 'This action will be wired up once the endpoint is ready.')
          }
          className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
        >
          Link Document
        </button>
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto scroll-smooth">
        {DOC_FILTERS.map((f) => {
          const active = docFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => selectFilter(f.value)}
              className="shrink-0 rounded-full px-3.5 py-1.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{
                fontSize: 14,
                color: active ? '#FFFFFF' : '#4A7080',
                background: active ? '#00B4D8' : 'rgba(226,237,241,0.5)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 overflow-x-auto scroll-smooth">
        <div className="min-w-[820px]">
          <div
            className="flex rounded-t-[8px]"
            style={{
              background: 'rgba(226,237,241,0.4)',
              borderBottom: '1px solid #E6F8FD',
            }}
          >
            <div className="min-w-0 flex-1 py-2.5 pr-2 pl-3">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Document Name
              </span>
            </div>
            <div className="w-32 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Type
              </span>
            </div>
            <div className="w-36 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Uploaded By
              </span>
            </div>
            <div className="w-32 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Date Uploaded
              </span>
            </div>
            <div className="w-28 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Visit Date
              </span>
            </div>
            <div className="w-28 shrink-0 py-2.5 pr-3 text-right">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Actions
              </span>
            </div>
          </div>

          {pageDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(226,237,241,0.6)' }}
              >
                <FileText style={{ width: 24, height: 24, color: '#8A98A3' }} />
              </div>
              <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                No documents in this category
              </p>
            </div>
          )}

          {pageDocs.map((doc) => {
            const cfg = DOCUMENT_TYPE_CFG[doc.type];
            const Icon = cfg.icon;
            return (
              <div
                key={doc.id}
                className="flex items-center"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${cfg.iconColor}1F` }}
                  >
                    <Icon style={{ width: 16, height: 16, color: cfg.iconColor }} />
                  </div>
                  <div className="min-w-0">
                    <Tooltip content={doc.name}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {doc.name}
                      </p>
                    </Tooltip>
                    {doc.subtitle && (
                      <Tooltip content={doc.subtitle}>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {doc.subtitle}
                        </p>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                    style={{
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      color: cfg.badgeColor,
                      border: `1px solid ${cfg.badgeBorder}`,
                      background: cfg.badgeBg,
                    }}
                  >
                    {doc.type}
                  </span>
                </div>
                <div className="w-36 shrink-0 py-3 pr-2">
                  <Tooltip content={doc.uploadedBy}>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {doc.uploadedBy}
                    </p>
                  </Tooltip>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2">
                  <Tooltip
                    content={`${formatHumanDate(doc.dateUploaded)} ${formatTime(doc.dateUploaded)}`}
                  >
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {formatHumanDate(doc.dateUploaded)} {formatTime(doc.dateUploaded)}
                    </p>
                  </Tooltip>
                </div>
                <div className="w-28 shrink-0 py-3 pr-2">
                  <Tooltip content={formatHumanDate(doc.visitDate)}>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {formatHumanDate(doc.visitDate)}
                    </p>
                  </Tooltip>
                </div>
                <div className="flex w-28 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                  <button
                    type="button"
                    onClick={() => toast.info('Opening document', `Viewing ${doc.name}.`)}
                    aria-label={`View ${doc.name}`}
                    className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  >
                    <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.success('Download started', `${doc.name} is downloading.`)}
                    aria-label={`Download ${doc.name}`}
                    className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  >
                    <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
                  </button>
                  <div className="relative">
                    <button
                      ref={getDocMenuButtonRef(doc.id)}
                      type="button"
                      onClick={() => setOpenMenuId((id) => (id === doc.id ? null : doc.id))}
                      aria-label={`More actions for ${doc.name}`}
                      className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    >
                      <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
                    </button>
                    <RowMenuPortal
                      open={openMenuId === doc.id}
                      anchorRef={getDocMenuButtonRef(doc.id)}
                      onClose={() => setOpenMenuId(null)}
                      width={176}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          toast.info('Rename document', `Renaming ${doc.name}.`);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        Rename Document
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toast.success('Shared', `${doc.name} shared with care team.`);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        Share Document
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDocument(doc)}
                        className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-red-50"
                        style={{ fontSize: 14, color: '#EF4444' }}
                      >
                        Delete Document
                      </button>
                    </RowMenuPortal>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filteredDocs.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Showing {pageStart + 1} to {Math.min(pageStart + rowsPerPage, filteredDocs.length)} of{' '}
            {filteredDocs.length} documents
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
              aria-label="Previous page"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p) => {
                if (acc.length > 0 && typeof acc[acc.length - 1] === 'number') {
                  const prev = acc[acc.length - 1] as number;
                  if (p - prev > 1) acc.push('ellipsis');
                }
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e-${i}`} style={{ fontSize: 14, color: '#8A98A3' }} className="px-1">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className="flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{
                      fontSize: 14,
                      border: `1px solid ${p === safePage ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                      color: p === safePage ? '#00B4D8' : '#4A7080',
                      background: p === safePage ? '#E6F8FD' : 'transparent',
                    }}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-9 rounded-[8px] px-2 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
              style={{
                fontSize: 14,
                border: '1px solid rgba(0,100,130,0.18)',
                color: '#0D2630',
              }}
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export function MedicalRecordView({ initialTab = 'Overview' }: { initialTab?: Tab } = {}) {
  const router = useRouter();
  const toast = useToast();

  // Read via `window.location.search` in an effect (same convention as
  // Patient Card Printing's `?prefill=` handoff and Registration's Patient
  // Profile fix) rather than `useSearchParams()`, which would opt this route
  // out of static optimization unless wrapped in a Suspense boundary.
  const [patientId, setPatientId] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      setPatientId(new URLSearchParams(window.location.search).get('patientId'));
    }, 0);
    return () => clearTimeout(id);
  }, []);
  const directoryPatients = useDirectoryPatients();
  const directoryMatch = patientId
    ? (directoryPatients.find((p) => p.id === patientId) ?? null)
    : null;
  // No id, or the curated demo id, keeps today's default (the one richly
  // detailed persona, with real per-patient Lab Results/Prescriptions/
  // Immunizations/Referrals/Insurance Claims); any other real patient renders
  // from the directory, with those five sections honestly empty rather than
  // fabricated (this module has no per-patient generator for them — only
  // Visit History and Clinical Documents do) — still falling back to the
  // demo persona if the id somehow doesn't resolve, rather than crashing.
  const isCuratedOrDemo = !patientId || patientId === CURATED_PATIENT_ID;
  const patient: PatientProfile = isCuratedOrDemo
    ? MOCK_PATIENT_PROFILE
    : directoryMatch
      ? directoryPatientToProfile(directoryMatch)
      : MOCK_PATIENT_PROFILE;

  // Real completed consultations (from Doctor's Dashboard's Complete
  // Consultation) merged ahead of the fixture/generated list — see
  // `encounterToPatientVisit()` above for why this joins on `mrn`, not
  // `patientId`.
  const allEncounters = useEncounters();
  const realVisits = useMemo(
    () =>
      allEncounters
        .filter((e) => e.mrn === patient.mrn && e.status === 'COMPLETED')
        .map(encounterToPatientVisit),
    [allEncounters, patient.mrn],
  );
  const visits = [
    ...realVisits,
    ...(isCuratedOrDemo ? PATIENT_VISITS : generateVisitsForPatient(patient)),
  ];
  const clinicalDocs = isCuratedOrDemo ? null : generateClinicalDocumentsForPatient(patient);
  const documents: MedicalDocument[] = isCuratedOrDemo
    ? MOCK_DOCUMENTS
    : (clinicalDocs ?? []).map(clinicalDocToMedicalDoc);
  // Real, resulted lab tests (canonical LabResult store — SYS-004), flattened
  // one row per parameter to match this tab's own per-parameter LabResultEntry
  // shape, merged ahead of the fixture/empty list. Joined by MRN — same
  // identity-namespace bridge used for the Visit History merge above.
  const allLabResults = useLabResults();
  const realLabResultEntries: LabResultEntry[] = useMemo(
    () =>
      allLabResults
        .filter(
          (r) => r.mrn === patient.mrn && (r.status === 'RESULTED' || r.status === 'VERIFIED'),
        )
        .flatMap((r) =>
          (r.rows ?? []).map((row, i) => ({
            id: `${r.id}-${i}`,
            testName: row.parameter,
            result: row.value,
            unit: '',
            referenceRange: row.reference,
            flag: (row.flag === 'H'
              ? 'High'
              : row.flag === 'L'
                ? 'Low'
                : row.flag === 'A'
                  ? 'Critical'
                  : r.flag === 'CRITICAL'
                    ? 'Critical'
                    : 'Normal') as LabResultEntry['flag'],
            dateCollected: r.resultAt ?? r.orderedAt,
            orderedBy: r.orderedBy,
          })),
        ),
    [allLabResults, patient.mrn],
  );
  const labResults = [...realLabResultEntries, ...(isCuratedOrDemo ? MOCK_LAB_RESULTS : [])];
  // Real, live prescriptions (prescriptionStore.ts's canonical Medication —
  // SYS-011), merged ahead of the fixture/empty list. Joined by MRN — same
  // identity-namespace bridge used for the Visit History/Lab Results merges
  // above (Medical Records resolves patients via DirectoryPatient.id, a
  // different namespace from Doctor's Dashboard's own patient ids).
  const resolvedPatientId = resolvePatientIdByMrn(patient.mrn);
  const realMedications = resolvedPatientId ? getPatientDetail(resolvedPatientId).medications : [];
  const prescriptions: Prescription[] = [
    ...realMedications.map(medicationToPrescription),
    ...(isCuratedOrDemo ? MOCK_PRESCRIPTIONS : []),
  ];
  const immunizations = isCuratedOrDemo ? MOCK_IMMUNIZATIONS : [];
  // Real, live referrals (referralStore.ts — SYS-006), merged ahead of the
  // fixture/empty list. Referral already carries a real mrn field, so this
  // is a direct flat-array filter, same as labResults/visits above.
  const allReferrals = useReferrals();
  const realReferrals = allReferrals.filter((r) => r.mrn === patient.mrn);
  const referrals: ReferralEntry[] = [
    ...realReferrals.map(referralToReferralEntry),
    ...(isCuratedOrDemo ? MOCK_REFERRALS : []),
  ];
  const insuranceClaims = isCuratedOrDemo ? MOCK_INSURANCE_CLAIMS : [];
  const recordActivity = isCuratedOrDemo ? RECORD_ACTIVITY : generateActivityFromVisits(visits);
  const recordAccess = isCuratedOrDemo ? RECORD_ACCESS : [];

  const age = computeAge(patient.dateOfBirth);
  const physicianName = `${patient.primaryPhysician.name} (${physicianAbbrev(patient.primaryPhysician.role)})`;

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const knownAllergiesText = patient.allergies.length
    ? patient.allergies.map((a) => a.substance).join(', ')
    : 'NKDA';
  const chronicConditionsText =
    patient.medicalAlerts.find((a) => a.label === 'Chronic Condition')?.detail ?? 'None recorded';

  function notImplemented(action: string) {
    toast.info(action, 'This action will be wired up once the endpoint is ready.');
    setActionsOpen(false);
  }

  function handlePrint() {
    toast.success(
      'Preparing document',
      "This patient's medical record is being prepared for printing.",
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.medicalRecordsDashboard)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <button
              type="button"
              onClick={() => router.push(ROUTES.medicalRecords)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Medical Records
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {TAB_META[activeTab].breadcrumb}
            </span>
          </nav>

          {/* ── Title + actions ──────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                {TAB_META[activeTab].title}
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                {TAB_META[activeTab].subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print Record
              </button>
              <button
                type="button"
                onClick={() => router.push(ROUTES.medicalRecordsDocumentUpload)}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Upload style={{ width: 15, height: 15 }} />
                Upload Document
              </button>
              <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                <div className="relative">
                  <button
                    ref={actionsButtonRef}
                    type="button"
                    onClick={() => setActionsOpen((o) => !o)}
                    className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    Actions
                    <ChevronDown
                      style={{
                        width: 15,
                        height: 15,
                        transition: 'transform 150ms',
                        transform: actionsOpen ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  </button>
                  <RowMenuPortal
                    open={actionsOpen}
                    anchorRef={actionsButtonRef}
                    onClose={() => setActionsOpen(false)}
                    width={224}
                  >
                    <button
                      type="button"
                      onClick={() => notImplemented('Amend Record')}
                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                      style={{ fontSize: 14, color: '#2F3A40' }}
                    >
                      Amend Record
                    </button>
                    <button
                      type="button"
                      onClick={() => notImplemented('Share with Provider')}
                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                      style={{ fontSize: 14, color: '#2F3A40' }}
                    >
                      Share with Provider
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(ROUTES.medicalRecordsRequests);
                        setActionsOpen(false);
                      }}
                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                      style={{ fontSize: 14, color: '#2F3A40' }}
                    >
                      Request Record Correction
                    </button>
                    <div
                      className="my-1.5"
                      style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        router.push(ROUTES.medicalRecordsArchived);
                        setActionsOpen(false);
                      }}
                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                      style={{ fontSize: 14, color: '#2F3A40' }}
                    >
                      View Archived Records
                    </button>
                  </RowMenuPortal>
                </div>
              </PermissionGate>
            </div>
          </div>

          {/* ── Patient banner ───────────────────────────────────────────── */}
          <div
            className="mt-5 flex flex-col gap-4 rounded-[12px] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-wrap items-center gap-4">
              <UserAvatar initials={getInitials(patient.fullName)} size={72} textSize={24} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 22, color: '#0D2630' }}
                  >
                    {patient.fullName}
                  </p>
                  <span
                    className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                    style={{
                      fontSize: 14,
                      color: '#22C55E',
                      border: '1px solid rgba(34,197,94,0.4)',
                    }}
                  >
                    {patient.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>{patient.mrn}</span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                    Patient ID: {patient.patientId}
                  </span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                    Student ID: {patient.studentId}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <BannerStat icon={Calendar} value={`${age ?? '—'} Yrs`} />
                  <BannerStat icon={UserIcon} value={patient.gender} />
                  <BannerStat icon={Droplet} value={patient.bloodGroup} />
                  <BannerStat icon={Heart} value={patient.maritalStatus} />
                  <BannerStat icon={Globe2} value={patient.nationality} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
              <div className="flex items-center gap-1.5 sm:flex-row-reverse">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Phone</span>
                <Phone style={{ width: 14, height: 14, color: '#8A98A3' }} />
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {patient.phone}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:flex-row-reverse">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Email</span>
                <Mail style={{ width: 14, height: 14, color: '#8A98A3' }} />
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {patient.email}
                </span>
              </div>
              <div className="flex items-start gap-1.5 sm:max-w-[280px] sm:flex-row-reverse">
                <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Address
                </span>
                <MapPin
                  style={{ width: 14, height: 14, color: '#8A98A3' }}
                  className="mt-0.5 shrink-0"
                />
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {patient.address}
                </span>
              </div>
            </div>
          </div>

          {/* ── Allergy banner (compliance — every patient-context page) ──── */}
          <AllergyBanner allergies={patient.allergies} className="mt-4" />

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="mt-4 flex items-center gap-1 overflow-x-auto scroll-smooth">
            <div
              className="flex flex-1 gap-1"
              style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
            >
              {PRIMARY_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: activeTab === tab ? '#00B4D8' : '#4A7080',
                    borderBottom: activeTab === tab ? '2px solid #00B4D8' : '2px solid transparent',
                  }}
                >
                  {tab}
                </button>
              ))}
              <div className="relative shrink-0">
                <button
                  ref={moreButtonRef}
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className="flex shrink-0 items-center gap-1 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: MORE_TABS.includes(activeTab as (typeof MORE_TABS)[number])
                      ? '#00B4D8'
                      : '#4A7080',
                    borderBottom: MORE_TABS.includes(activeTab as (typeof MORE_TABS)[number])
                      ? '2px solid #00B4D8'
                      : '2px solid transparent',
                  }}
                >
                  {MORE_TABS.includes(activeTab as (typeof MORE_TABS)[number]) ? activeTab : 'More'}
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      transition: 'transform 150ms',
                      transform: moreOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>
                <RowMenuPortal
                  open={moreOpen}
                  anchorRef={moreButtonRef}
                  onClose={() => setMoreOpen(false)}
                  width={192}
                >
                  {MORE_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab);
                        setMoreOpen(false);
                      }}
                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                      style={{
                        fontSize: 14,
                        color: activeTab === tab ? '#00B4D8' : '#2F3A40',
                        fontWeight: activeTab === tab ? 600 : 400,
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </RowMenuPortal>
              </div>
            </div>
          </div>

          {/* ── Tab content + sidebar ─────────────────────────────────────── */}
          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div className="min-w-0 flex-1">
              {activeTab === 'Overview' && (
                <>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
                    {/* Medical Summary */}
                    <div
                      className="rounded-[12px] p-4 sm:p-5"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center justify-between">
                        <h2
                          className="font-display font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Medical Summary
                        </h2>
                        <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                          <button
                            type="button"
                            onClick={() => notImplemented('Edit Medical Summary')}
                            className="flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            <Pencil style={{ width: 13, height: 13 }} />
                            Edit (Role-based)
                          </button>
                        </PermissionGate>
                      </div>
                      <div className="@container mt-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 @sm:grid-cols-3 @lg:grid-cols-4 @2xl:grid-cols-5">
                          {[
                            ['Blood Group', patient.bloodGroup],
                            ['Genotype', MEDICAL_SUMMARY_EXTRA.genotype],
                            ['Height', MEDICAL_SUMMARY_EXTRA.height],
                            ['Weight', MEDICAL_SUMMARY_EXTRA.weight],
                            ['BMI', MEDICAL_SUMMARY_EXTRA.bmi],
                            ['Known Allergies', knownAllergiesText],
                            ['Chronic Conditions', chronicConditionsText],
                            ['Medications', MEDICAL_SUMMARY_EXTRA.medications],
                            ['Last Visit', formatHumanDate(patient.lastVisit)],
                            ['Primary Physician', physicianName],
                          ].map(([label, value]) => (
                            <div key={label} className="min-w-0">
                              <p
                                className="font-sans font-bold tracking-wider break-words uppercase"
                                style={{ fontSize: 14, color: '#8A98A3' }}
                              >
                                {label}
                              </p>
                              <p
                                className="mt-0.5 font-sans font-medium break-words"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Record Information */}
                    <div
                      className="rounded-[12px] p-4 sm:p-5"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Record Information
                      </h2>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
                        {[
                          ['Record Created', formatHumanDate(patient.dateRegistered)],
                          ['Created By', patient.registeredBy],
                          [
                            'Last Updated',
                            `${formatHumanDate(patient.lastUpdated)} ${formatTime(patient.lastUpdated)}`,
                          ],
                          ['Updated By', physicianName],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <p
                              className="font-sans font-bold tracking-wider break-words uppercase"
                              style={{ fontSize: 14, color: '#8A98A3' }}
                            >
                              {label}
                            </p>
                            <p
                              className="mt-0.5 font-sans font-medium break-words"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {value}
                            </p>
                          </div>
                        ))}
                        <div>
                          <p
                            className="font-sans font-bold tracking-wider break-words uppercase"
                            style={{ fontSize: 14, color: '#8A98A3' }}
                          >
                            Record Status
                          </p>
                          <span
                            className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: '#22C55E',
                              border: '1px solid rgba(34,197,94,0.4)',
                            }}
                          >
                            {patient.status}
                          </span>
                        </div>
                        <div>
                          <p
                            className="font-sans font-bold tracking-wider break-words uppercase"
                            style={{ fontSize: 14, color: '#8A98A3' }}
                          >
                            Record Visibility
                          </p>
                          <p
                            className="mt-0.5 font-sans font-medium break-words"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {MEDICAL_SUMMARY_EXTRA.recordVisibility}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DocumentsAndFilesCard key={patient.id} initialDocuments={documents} />
                </>
              )}
              {activeTab === 'Visit History' && (
                <VisitHistorySection visits={visits} patientName={patient.fullName} />
              )}
              {activeTab === 'Medical Documents' && (
                <DocumentsAndFilesCard key={patient.id} initialDocuments={documents} />
              )}
              {activeTab === 'Lab Results' && <LabResultsSection labResults={labResults} />}
              {activeTab === 'Prescriptions' && (
                <PrescriptionsSection prescriptions={prescriptions} />
              )}
              {activeTab === 'Immunizations' && (
                <ImmunizationsSection immunizations={immunizations} />
              )}
              {activeTab === 'Allergies' && <AllergiesSection allergies={patient.allergies} />}
              {activeTab === 'Referrals' && <ReferralsSection referrals={referrals} />}
              {activeTab === 'Insurance Claims' && (
                <InsuranceClaimsSection insuranceClaims={insuranceClaims} />
              )}
              {activeTab === 'Audit Log' && (
                <AuditLogSection activity={recordActivity} access={recordAccess} />
              )}
            </div>

            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
              {activeTab === 'Visit History' && (
                <div
                  className="rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center gap-2">
                    <History style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Visit Summary
                    </h2>
                  </div>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {(() => {
                      const summary = computeVisitSummary(visits);
                      return [
                        ['Total Visits', String(summary.totalVisits)],
                        [
                          'Last Visit',
                          summary.lastVisit ? formatHumanDate(summary.lastVisit) : '—',
                        ],
                        [
                          'First Visit',
                          summary.firstVisit ? formatHumanDate(summary.firstVisit) : '—',
                        ],
                        ['Unique Departments', String(summary.uniqueDepartments)],
                        ['Emergency Visits', String(summary.emergencyVisits)],
                        ['Hospitalizations', String(summary.hospitalizations)],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {value}
                          </p>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Record Activity
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Audit Log')}
                    className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {recordActivity.map((act) => {
                    const Icon = act.icon;
                    return (
                      <div key={act.id} className="flex items-start gap-2.5">
                        <div
                          className="flex size-8 shrink-0 items-center justify-center rounded-full"
                          style={{ background: act.iconBg }}
                        >
                          <Icon style={{ width: 15, height: 15, color: act.iconColor }} />
                        </div>
                        <div className="min-w-0">
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatHumanDate(act.dateTime)} {formatTime(act.dateTime)}
                          </p>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {act.label}
                          </p>
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{act.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Record Access
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Audit Log')}
                    className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {recordAccess.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between gap-2">
                      <Tooltip content={acc.name}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {acc.name}
                        </p>
                      </Tooltip>
                      <p className="shrink-0 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {formatHumanDate(acc.dateTime)} {formatTime(acc.dateTime)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                <div
                  className="rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Quick Actions
                  </h2>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <QuickActionTile
                      icon={ClipboardEdit}
                      label="Add Clinical Note"
                      iconBg="rgba(0,180,216,0.12)"
                      iconColor="#00B4D8"
                      onClick={() => notImplemented('Add Clinical Note')}
                    />
                    <QuickActionTile
                      icon={ClipboardList}
                      label="Request Record"
                      iconBg="rgba(245,158,11,0.12)"
                      iconColor="#F59E0B"
                      onClick={() => router.push(ROUTES.medicalRecordsRequests)}
                    />
                    <QuickActionTile
                      icon={History}
                      label="View Visit History"
                      iconBg="rgba(59,130,246,0.12)"
                      iconColor="#3B82F6"
                      onClick={() => router.push(ROUTES.medicalRecordsVisitHistory)}
                    />
                    <QuickActionTile
                      icon={UserCog}
                      label="Update Demographics"
                      iconBg="rgba(139,92,246,0.12)"
                      iconColor="#8B5CF6"
                      onClick={() =>
                        router.push(`${ROUTES.registrationProfile}?patientId=${patient.id}`)
                      }
                    />
                  </div>
                </div>
              </PermissionGate>
            </div>
          </div>

          {/* ── Confidentiality notice ───────────────────────────────────── */}
          <div
            className="mt-5 flex items-center gap-2.5 rounded-[10px] px-4 py-3"
            style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
          >
            <Lock style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
            <p style={{ fontSize: 14, color: '#0D2630' }}>
              Medical records are confidential and access is role-based. All activities are logged
              for audit purposes.
            </p>
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
