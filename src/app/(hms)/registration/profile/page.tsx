'use client';

import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  Droplet,
  FileText,
  GraduationCap,
  Globe2,
  Heart,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Printer,
  Shield,
  Stethoscope,
  Upload,
  User as UserIcon,
  UserCheck,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { PermissionGate } from '@components/shared/PermissionGate';
import { UserAvatar } from '@components/shared/UserAvatar';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime, toRelativeTime } from '@/utils/datetime';
import { computeAge } from '@/features/registration/schemas/registerPatientSchema';
import {
  MOCK_PATIENT_PROFILE,
  type MedicalAlertSeverity,
} from '@/features/registration/__mocks__/patientProfileFixtures';

const TABS = [
  'Overview',
  'Visit History',
  'Medical Records',
  'Laboratory',
  'Prescriptions',
  'Documents',
  'Referrals',
] as const;

type Tab = (typeof TABS)[number];

const ALERT_SEVERITY_COLOR: Record<MedicalAlertSeverity, string> = {
  Severe: '#EF4444',
  Moderate: '#F59E0B',
  Important: '#DC2626',
};

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

function InfoCard({
  icon: Icon,
  title,
  onEdit,
  danger,
  headerAction,
  children,
}: {
  icon: typeof UserIcon;
  title: string;
  onEdit?: () => void;
  danger?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{
        background: danger ? 'rgba(239,68,68,0.04)' : '#FFFFFF',
        border: danger ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(0,100,130,0.12)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon style={{ width: 17, height: 17, color: danger ? '#EF4444' : '#00B4D8' }} />
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 16, lineHeight: '24px', color: danger ? '#7F1D1D' : '#0D2630' }}
          >
            {title}
          </h2>
        </div>
        {headerAction ??
          (onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Pencil style={{ width: 13, height: 13 }} />
              Edit
            </button>
          ))}
      </div>
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
      <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value || '—'}
      </p>
    </div>
  );
}

function BannerStat({ icon: Icon, value }: { icon: typeof Calendar; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon style={{ width: 15, height: 15, color: '#8A98A3' }} />
      <span style={{ fontSize: 14, color: '#4A7080' }}>{value}</span>
    </div>
  );
}

function VisitSummaryMini({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: typeof Calendar;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: string | undefined;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[10px] p-3"
      style={{ border: '1px solid rgba(0,100,130,0.1)' }}
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
        style={{ background: iconBg }}
      >
        <Icon style={{ width: 16, height: 16, color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
        <p
          className="font-display truncate font-semibold"
          style={{ fontSize: 16, color: '#0D2630' }}
        >
          {value}
        </p>
        {sub && (
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: typeof Calendar;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-[10px] p-3 text-left font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
      style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.15)' }}
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
        style={{ background: `${color}1F` }}
      >
        <Icon style={{ width: 16, height: 16, color }} />
      </div>
      {label}
    </button>
  );
}

function ComingSoonTab({ tab }: { tab: Tab }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-[12px] px-6 py-20 text-center"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(0,180,216,0.1)' }}
      >
        <FileText style={{ width: 24, height: 24, color: '#00B4D8' }} />
      </div>
      <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
        {tab}
      </p>
      <p className="max-w-[380px]" style={{ fontSize: 14, color: '#4A7080' }}>
        This patient&apos;s {tab.toLowerCase()} will be shown here once this tab is built.
      </p>
    </div>
  );
}

export default function PatientProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const patient = MOCK_PATIENT_PROFILE;
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionsOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [actionsOpen]);

  const age = computeAge(patient.dateOfBirth);

  function notImplemented(action: string) {
    toast.info(action, 'This action will be wired up once the endpoint is ready.');
    setActionsOpen(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.registration)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <button
              type="button"
              onClick={() => router.push(ROUTES.registrationDirectory)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Patient Directory
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Patient Profile
            </span>
          </nav>

          {/* ── Title + actions ──────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Patient Profile
            </h1>
            <div className="flex items-center gap-2.5">
              <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                <button
                  type="button"
                  onClick={() => notImplemented('Edit Profile')}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Pencil style={{ width: 15, height: 15 }} />
                  Edit Profile
                </button>
              </PermissionGate>
              <button
                type="button"
                onClick={() =>
                  toast.success(
                    'Preparing document',
                    'Patient profile is being prepared for printing.',
                  )
                }
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print Profile
              </button>
              <div ref={actionsRef} className="relative">
                <button
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
                {actionsOpen && (
                  <div
                    className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
                    style={{
                      border: '1px solid rgba(0,100,130,0.12)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => notImplemented('Merge Duplicate Record')}
                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                      style={{ fontSize: 14, color: '#2F3A40' }}
                    >
                      Merge Duplicate Record
                    </button>
                    <button
                      type="button"
                      onClick={() => notImplemented('Transfer Care')}
                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                      style={{ fontSize: 14, color: '#2F3A40' }}
                    >
                      Transfer to Another Faculty
                    </button>
                    <button
                      type="button"
                      onClick={() => notImplemented('Deactivate Patient')}
                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                      style={{ fontSize: 14, color: '#2F3A40' }}
                    >
                      Deactivate Patient
                    </button>
                    <div
                      className="my-1.5"
                      style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}
                    />
                    <button
                      type="button"
                      onClick={() => notImplemented('Archive Patient Record')}
                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-red-50"
                      style={{ fontSize: 14, color: '#EF4444' }}
                    >
                      Archive Patient Record
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Patient banner ───────────────────────────────────────────── */}
          <div
            className="mt-5 flex flex-col gap-4 rounded-[12px] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-wrap items-center gap-4">
              <UserAvatar initials={getInitials(patient.fullName)} size={88} textSize={28} />
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

            <div className="flex flex-col gap-2 sm:items-end sm:text-right">
              <div>
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Date Registered: </span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {formatHumanDate(patient.dateRegistered)} (
                  {toRelativeTime(patient.dateRegistered)})
                </span>
              </div>
              <div>
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Registered By: </span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {patient.registeredBy}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Last Updated: </span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {formatHumanDate(patient.lastUpdated)} by {patient.lastUpdatedBy}
                </span>
              </div>
            </div>
          </div>

          {/* ── Allergy banner (compliance — every patient-context page) ──── */}
          <AllergyBanner allergies={patient.allergies} className="mt-4" />

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="mt-4 overflow-x-auto scroll-smooth">
            <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}>
              {TABS.map((tab) => (
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
            </div>
          </div>

          {/* ── Tab content ──────────────────────────────────────────────── */}
          <div className="mt-5">
            {activeTab !== 'Overview' ? (
              <ComingSoonTab tab={activeTab} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
                {/* ── Left column ─────────────────────────────────────────── */}
                <div className="flex flex-col gap-4">
                  <InfoCard
                    icon={UserIcon}
                    title="Personal Information"
                    onEdit={() => notImplemented('Edit Personal Information')}
                  >
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <Field label="Full Name" value={patient.fullName} />
                      <Field
                        label="Date of Birth"
                        value={`${formatHumanDate(patient.dateOfBirth)} (${age ?? '—'} Yrs)`}
                      />
                      <Field label="Gender" value={patient.gender} />
                      <Field label="Blood Group" value={patient.bloodGroup} />
                      <Field label="Marital Status" value={patient.maritalStatus} />
                      <Field label="Nationality" value={patient.nationality} />
                      <Field label="Religion" value={patient.religion} />
                      <Field label="Occupation" value={patient.occupation} />
                    </div>
                  </InfoCard>

                  <InfoCard
                    icon={Phone}
                    title="Contact Details"
                    onEdit={() => notImplemented('Edit Contact Details')}
                  >
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <Field label="Phone Number" value={patient.phone} />
                      <Field label="Email Address" value={patient.email} />
                      <Field label="Residential Address" value={patient.address} />
                      <div />
                      <Field label="State of Origin" value={patient.stateOfOrigin} />
                      <Field label="LGA" value={patient.lga} />
                    </div>
                  </InfoCard>

                  <InfoCard
                    icon={Users}
                    title="Next of Kin"
                    onEdit={() => notImplemented('Edit Next of Kin')}
                  >
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <Field label="Full Name" value={patient.nextOfKin.name} />
                      <Field label="Relationship" value={patient.nextOfKin.relationship} />
                      <Field label="Phone Number" value={patient.nextOfKin.phone} />
                      <Field label="Email Address" value={patient.nextOfKin.email} />
                      <Field label="Address" value={patient.nextOfKin.address} />
                    </div>
                  </InfoCard>

                  <InfoCard
                    icon={Shield}
                    title="Insurance Information"
                    onEdit={() => notImplemented('Edit Insurance Information')}
                  >
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <Field label="Insurance Provider" value={patient.insurance.provider} />
                      <Field label="Insurance Type" value={patient.insurance.type} />
                      <Field label="Policy/Member ID" value={patient.insurance.policyId} />
                      <Field label="Group Number" value={patient.insurance.groupNumber} />
                      <Field
                        label="Valid From"
                        value={formatHumanDate(patient.insurance.validFrom)}
                      />
                      <Field label="Valid To" value={formatHumanDate(patient.insurance.validTo)} />
                    </div>
                  </InfoCard>

                  <InfoCard
                    icon={GraduationCap}
                    title="Student Information"
                    onEdit={() => notImplemented('Edit Student Information')}
                  >
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <Field label="Faculty/Department" value={patient.student.facultyDepartment} />
                      <Field label="Level" value={patient.student.level} />
                      <Field label="Programme" value={patient.student.programme} />
                      <Field label="Matric Number" value={patient.student.matricNumber} />
                      <Field label="Admission Year" value={patient.student.admissionYear} />
                      <Field label="Hostel/Residence" value={patient.student.hostel} />
                    </div>
                  </InfoCard>

                  <InfoCard
                    icon={AlertTriangle}
                    title="Medical Alerts"
                    danger
                    headerAction={
                      <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                        <button
                          type="button"
                          onClick={() => notImplemented('Add Alert')}
                          className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 font-sans font-medium transition-colors duration-150 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#EF4444',
                            border: '1px solid rgba(239,68,68,0.3)',
                          }}
                        >
                          <Plus style={{ width: 13, height: 13 }} />
                          Add Alert
                        </button>
                      </PermissionGate>
                    }
                  >
                    <div className="flex flex-col gap-3">
                      {patient.medicalAlerts.map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {alert.label}
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{alert.detail}</p>
                          </div>
                          <span
                            className="shrink-0 font-sans font-semibold"
                            style={{ fontSize: 14, color: ALERT_SEVERITY_COLOR[alert.severity] }}
                          >
                            {alert.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Last reviewed on {formatHumanDate(patient.alertsLastReviewed)} by{' '}
                      {patient.alertsLastReviewedBy}
                    </p>
                  </InfoCard>
                </div>

                {/* ── Right column ────────────────────────────────────────── */}
                <div className="flex flex-col gap-4">
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Registration History
                      </h2>
                      <button
                        type="button"
                        onClick={() => notImplemented('View All Registration History')}
                        className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        View All
                      </button>
                    </div>
                    <div className="mt-3.5 flex flex-col">
                      {patient.registrationHistory.map((entry, i) => (
                        <div key={entry.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className="mt-1.5 size-2 shrink-0 rounded-full"
                              style={{ background: '#22C55E' }}
                            />
                            {i < patient.registrationHistory.length - 1 && (
                              <span
                                className="w-px flex-1"
                                style={{ background: 'rgba(0,100,130,0.15)', minHeight: 24 }}
                              />
                            )}
                          </div>
                          <div className="min-w-0 pb-3.5">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatHumanDate(entry.dateTime)} · {formatTime(entry.dateTime)}
                            </p>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {entry.label}
                            </p>
                            {entry.detail && (
                              <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.detail}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Visit Summary
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Visit History')}
                        className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        View All
                      </button>
                    </div>
                    <div className="mt-3.5 grid grid-cols-2 gap-3">
                      <VisitSummaryMini
                        icon={Stethoscope}
                        iconBg="rgba(34,197,94,0.12)"
                        iconColor="#22C55E"
                        label="Total Visits"
                        value={String(patient.totalVisits)}
                      />
                      <VisitSummaryMini
                        icon={CalendarClock}
                        iconBg="rgba(0,180,216,0.12)"
                        iconColor="#00B4D8"
                        label="Last Visit"
                        value={formatHumanDate(patient.lastVisit)}
                      />
                      <VisitSummaryMini
                        icon={CalendarPlus}
                        iconBg="rgba(139,92,246,0.12)"
                        iconColor="#8B5CF6"
                        label="Upcoming Appointment"
                        value={
                          patient.upcomingAppointment
                            ? formatHumanDate(patient.upcomingAppointment.dateTime)
                            : 'None scheduled'
                        }
                        sub={
                          patient.upcomingAppointment
                            ? formatTime(patient.upcomingAppointment.dateTime)
                            : undefined
                        }
                      />
                      <VisitSummaryMini
                        icon={UserCheck}
                        iconBg="rgba(245,158,11,0.12)"
                        iconColor="#F59E0B"
                        label="Primary Physician"
                        value={patient.primaryPhysician.name}
                        sub={patient.primaryPhysician.role}
                      />
                    </div>
                  </div>

                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Quick Actions
                    </h2>
                    <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                        <QuickActionButton
                          icon={UserCheck}
                          label="Check-In Patient"
                          color="#22C55E"
                          onClick={() => router.push(ROUTES.registrationCheckIn)}
                        />
                      </PermissionGate>
                      <QuickActionButton
                        icon={CalendarPlus}
                        label="Schedule Appointment"
                        color="#8B5CF6"
                        onClick={() => router.push(ROUTES.registrationAppointments)}
                      />
                      <QuickActionButton
                        icon={FileText}
                        label="View Medical Record"
                        color="#00B4D8"
                        onClick={() => setActiveTab('Medical Records')}
                      />
                      <QuickActionButton
                        icon={Printer}
                        label="Print Patient Card"
                        color="#F59E0B"
                        onClick={() =>
                          toast.success('Sending to printer', 'Patient card queued for printing.')
                        }
                      />
                      <QuickActionButton
                        icon={Upload}
                        label="Upload Document"
                        color="#EF4444"
                        onClick={() => setActiveTab('Documents')}
                      />
                      <button
                        type="button"
                        onClick={() => notImplemented('More Actions')}
                        className="flex items-center justify-center gap-1.5 rounded-[10px] p-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.15)',
                        }}
                      >
                        <MoreVertical style={{ width: 16, height: 16, color: '#8A98A3' }} />
                        More Actions
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
