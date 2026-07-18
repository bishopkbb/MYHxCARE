'use client';

import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Droplet,
  Globe2,
  Heart,
  Info,
  MapPin,
  QrCode,
  Search,
  Shield,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import { FormTextarea } from '@components/shared/FormTextarea';
import { PermissionGate } from '@components/shared/PermissionGate';
import { UserAvatar } from '@components/shared/UserAvatar';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatDateTime, formatHumanDate, formatTime } from '@/utils/datetime';
import {
  CHECKIN_PATIENT_SEARCH_KEYS,
  CONSULTING_ROOM_OPTIONS,
  DEPARTMENT_OPTIONS,
  ESTIMATED_WAIT_MINUTES,
  MOCK_CHECKIN_APPOINTMENT,
  MOCK_CHECKIN_PATIENT,
  PHYSICIAN_OPTIONS,
  PURPOSE_OF_VISIT_OPTIONS,
  QUEUE_PREFIX,
  TODAYS_QUEUE_COUNT_BEFORE_ASSIGNMENT,
  TOTAL_PATIENTS_IN_QUEUE,
  VISIT_TYPE_OPTIONS,
  type CheckInAppointment,
  type CheckInPatient,
} from '@/features/registration/__mocks__/checkInFixtures';

type Mode = 'verify' | 'walkin';

function labelFor(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function Card({
  icon: Icon,
  title,
  headerAction,
  children,
}: {
  icon: typeof UserIcon;
  title: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            {title}
          </h2>
        </div>
        {headerAction}
      </div>
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
      <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value || '—'}
      </p>
    </div>
  );
}

function BannerStat({ icon: Icon, value }: { icon: typeof Calendar; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon style={{ width: 14, height: 14, color: '#8A98A3' }} />
      <span style={{ fontSize: 14, color: '#4A7080' }}>{value}</span>
    </div>
  );
}

type StepState = 'done' | 'active' | 'pending';

function StepPill({
  index,
  label,
  detail,
  state,
  isLast,
}: {
  index: number;
  label: string;
  detail: string;
  state: StepState;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
          style={{
            fontSize: 14,
            background: state === 'pending' ? '#FFFFFF' : '#00B4D8',
            color: state === 'pending' ? '#8A98A3' : '#FFFFFF',
            border: state === 'pending' ? '1px solid rgba(0,100,130,0.25)' : 'none',
          }}
        >
          {state === 'done' ? <Check style={{ width: 16, height: 16 }} /> : index}
        </div>
        <div className="min-w-0">
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {label}
          </p>
          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
            {detail}
          </p>
        </div>
      </div>
      {!isLast && (
        <div className="hidden shrink-0 sm:block" style={{ color: '#8A98A3' }}>
          →
        </div>
      )}
    </div>
  );
}

const EMPTY_VISIT_DETAILS = {
  visitType: '',
  department: '',
  purposeOfVisit: '',
  physician: '',
  notes: '',
};

export default function CheckInPage() {
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('verify');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [patient, setPatient] = useState<CheckInPatient | null>(null);
  const [appointment, setAppointment] = useState<CheckInAppointment | null>(null);

  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visitDetails, setVisitDetails] = useState(EMPTY_VISIT_DETAILS);

  const [clinicUnit, setClinicUnit] = useState('');
  const [consultingRoom, setConsultingRoom] = useState('');
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [todaysCount, setTodaysCount] = useState(TODAYS_QUEUE_COUNT_BEFORE_ASSIGNMENT);
  const [notifyChecked, setNotifyChecked] = useState(true);
  const [notified, setNotified] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [checkInDateTime, setCheckInDateTime] = useState<string | null>(null);

  function resetAll(nextMode: Mode = mode) {
    setMode(nextMode);
    setSearchQuery('');
    setSearchAttempted(false);
    setPatient(null);
    setAppointment(null);
    setVisitDate(new Date().toISOString().slice(0, 10));
    setVisitDetails(EMPTY_VISIT_DETAILS);
    setClinicUnit('');
    setConsultingRoom('');
    setQueueNumber(null);
    setNotifyChecked(true);
    setNotified(false);
    setIsComplete(false);
    setCheckInDateTime(null);
  }

  function handleModeChange(next: Mode) {
    if (next === mode) return;
    resetAll(next);
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    setSearchAttempted(true);
    const q = query.trim().toLowerCase();
    const found =
      q.length > 0 && CHECKIN_PATIENT_SEARCH_KEYS.some((key) => key.includes(q) || q.includes(key));

    if (!found) {
      setPatient(null);
      setAppointment(null);
      return;
    }

    setPatient(MOCK_CHECKIN_PATIENT);
    setClinicUnit(DEPARTMENT_OPTIONS[0]?.value ?? '');

    if (mode === 'verify') {
      const matched =
        MOCK_CHECKIN_APPOINTMENT.patientId === MOCK_CHECKIN_PATIENT.id
          ? MOCK_CHECKIN_APPOINTMENT
          : null;
      setAppointment(matched);
      if (matched) {
        const departmentValue =
          DEPARTMENT_OPTIONS.find((o) => o.label === matched.department)?.value ?? '';
        const physicianValue =
          PHYSICIAN_OPTIONS.find((o) => o.label === matched.physician)?.value ?? '';
        const purposeValue =
          PURPOSE_OF_VISIT_OPTIONS.find((o) => o.label === matched.purpose)?.value ?? '';
        setVisitDetails({
          visitType: 'outpatient',
          department: departmentValue,
          purposeOfVisit: purposeValue,
          physician: physicianValue,
          notes: '',
        });
        setClinicUnit(departmentValue);
      }
    } else {
      setAppointment(null);
    }
  }

  function handleScanId() {
    toast.success('Scanned successfully', 'Patient ID retrieved from scan.');
    handleSearch(MOCK_CHECKIN_PATIENT.mrn);
  }

  function handleAssignQueue() {
    const next = todaysCount + 1;
    setTodaysCount(next);
    setQueueNumber(next);
    toast.success(
      'Queue number assigned',
      `${QUEUE_PREFIX}-${String(next).padStart(3, '0')} assigned to ${patient?.fullName}.`,
    );
  }

  function handleNotifyDepartment() {
    if (!notifyChecked) {
      toast.error('Select a department', 'Check the department to notify before sending.');
      return;
    }
    setNotified(true);
    toast.success(
      'Department notified',
      `${labelFor(DEPARTMENT_OPTIONS, clinicUnit)} has been notified.`,
    );
  }

  const visitDetailsValid =
    visitDetails.visitType !== '' &&
    visitDetails.department !== '' &&
    visitDetails.purposeOfVisit !== '';
  const canCompleteCheckIn = patient !== null && queueNumber !== null && visitDetailsValid;

  function handleCompleteCheckIn() {
    if (!canCompleteCheckIn) {
      toast.error(
        'Cannot complete check-in',
        'Find a patient, fill in visit details, and assign a queue number first.',
      );
      return;
    }
    setCheckInDateTime(new Date().toISOString());
    setIsComplete(true);
    toast.success('Check-in complete', `${patient?.fullName} has been checked in.`);
  }

  function handleCancelCheckIn() {
    toast.info('Check-in cancelled', 'No changes were saved.');
    resetAll();
  }

  const steps = useMemo(() => {
    const s1: StepState = patient ? 'done' : 'pending';
    const s2: StepState =
      mode === 'walkin'
        ? patient
          ? 'done'
          : 'pending'
        : appointment
          ? 'done'
          : patient
            ? 'active'
            : 'pending';
    const s3: StepState = queueNumber !== null ? 'done' : s2 !== 'pending' ? 'active' : 'pending';
    const s4: StepState =
      clinicUnit && consultingRoom ? 'done' : queueNumber !== null ? 'active' : 'pending';
    const s5: StepState = notified ? 'done' : s4 === 'done' ? 'active' : 'pending';
    return [
      {
        label: 'Patient Identified',
        detail: patient ? 'Patient found' : 'Awaiting search',
        state: s1,
      },
      {
        label: mode === 'walkin' ? 'Walk-in Registered' : 'Appointment Verified',
        detail:
          mode === 'walkin'
            ? patient
              ? 'No appointment needed'
              : 'Awaiting patient'
            : appointment
              ? 'Appointment is valid'
              : searchAttempted && patient
                ? 'No appointment found'
                : 'Awaiting verification',
        state: s2,
      },
      {
        label: 'Queue Assigned',
        detail:
          queueNumber !== null
            ? `Queue number ${QUEUE_PREFIX}-${String(queueNumber).padStart(3, '0')}`
            : 'Not yet assigned',
        state: s3,
      },
      {
        label: 'Routed to Clinic',
        detail:
          clinicUnit && consultingRoom
            ? `${labelFor(DEPARTMENT_OPTIONS, clinicUnit)} · ${labelFor(CONSULTING_ROOM_OPTIONS, consultingRoom)}`
            : 'Not yet routed',
        state: s4,
      },
      {
        label: 'Department Notified',
        detail: notified ? 'Notification sent' : 'Not yet sent',
        state: s5,
      },
    ];
  }, [
    patient,
    appointment,
    mode,
    queueNumber,
    clinicUnit,
    consultingRoom,
    notified,
    searchAttempted,
  ]);

  if (isComplete && patient) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
          <div className="mx-auto max-w-[900px] px-4 py-4 sm:px-6 sm:py-5">
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-[12px] px-6 py-20 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div
                className="flex size-16 items-center justify-center rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)' }}
              >
                <CheckCircle2 style={{ width: 32, height: 32, color: '#22C55E' }} />
              </div>
              <p className="font-display font-semibold" style={{ fontSize: 22, color: '#0D2630' }}>
                Check-In Complete
              </p>
              <p className="max-w-[420px]" style={{ fontSize: 14, color: '#4A7080' }}>
                <span className="font-medium" style={{ color: '#0D2630' }}>
                  {patient.fullName}
                </span>{' '}
                has been checked in and assigned queue number{' '}
                <span className="font-medium" style={{ color: '#00B4D8' }}>
                  {QUEUE_PREFIX}-{String(queueNumber).padStart(3, '0')}
                </span>
                .
              </p>
              {checkInDateTime && (
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatDateTime(checkInDateTime)}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => resetAll()}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Users style={{ width: 15, height: 15 }} />
                  Check In Another Patient
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.registrationQueue)}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  View Queue
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
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
              onClick={() => router.push(ROUTES.registration)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Patient Management</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Check-In
            </span>
          </nav>

          {/* ── Title + mode toggle ──────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display font-semibold" style={{ fontSize: 26, color: '#0D2630' }}>
                Check-In
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Verify appointment, check-in patient and assign queue number
              </p>
            </div>
            <div
              className="flex rounded-[10px] p-1"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.15)' }}
            >
              <button
                type="button"
                onClick={() => handleModeChange('verify')}
                className="rounded-[8px] px-4 py-2 font-sans font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  fontSize: 14,
                  background: mode === 'verify' ? '#00B4D8' : 'transparent',
                  color: mode === 'verify' ? '#FFFFFF' : '#4A7080',
                }}
              >
                Verify Appointment
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('walkin')}
                className="rounded-[8px] px-4 py-2 font-sans font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  fontSize: 14,
                  background: mode === 'walkin' ? '#00B4D8' : 'transparent',
                  color: mode === 'walkin' ? '#FFFFFF' : '#4A7080',
                }}
              >
                Walk-in Registration
              </button>
            </div>
          </div>

          {/* ── Search bar ───────────────────────────────────────────────── */}
          <div
            className="mt-5 flex flex-col gap-4 rounded-[12px] bg-white p-4 sm:flex-row sm:items-end sm:justify-between"
            style={{ border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="min-w-0 flex-1">
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Search Patient
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by Name, MRN, Phone or National ID..."
                  className="h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
              <label style={{ fontSize: 14, color: '#0D2630' }}>or Scan Patient ID / QR Code</label>
              <button
                type="button"
                onClick={handleScanId}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
              >
                <QrCode style={{ width: 15, height: 15 }} />
                Scan ID
              </button>
            </div>
          </div>

          {/* ── No patient found ─────────────────────────────────────────── */}
          {searchAttempted && !patient && (
            <div
              className="mt-4 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(226,237,241,0.6)' }}
              >
                <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
              </div>
              <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                No patient found
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                Try searching by MRN, phone number, or National ID — or register a new patient.
              </p>
              <button
                type="button"
                onClick={() => router.push(ROUTES.registrationRegister)}
                className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                Register New Patient
              </button>
            </div>
          )}

          {/* ── Main content ─────────────────────────────────────────────── */}
          {patient && (
            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
              {/* ── Left column ───────────────────────────────────────────── */}
              <div className="flex flex-col gap-4">
                <Card icon={UserIcon} title="Patient Information">
                  <div className="flex items-start gap-3">
                    <UserAvatar initials={patient.initials} size={64} textSize={22} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className="font-display font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          {patient.fullName}
                        </p>
                        <span
                          className="rounded-full px-2 py-0.5 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            color: '#22C55E',
                            border: '1px solid rgba(34,197,94,0.4)',
                          }}
                        >
                          {patient.status}
                        </span>
                      </div>
                      <p style={{ fontSize: 14 }}>
                        <span style={{ color: '#00B4D8' }}>{patient.mrn}</span>
                        <span style={{ color: '#8A98A3' }}> · Patient ID: {patient.patientId}</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <BannerStat icon={Calendar} value={`${patient.age} Yrs`} />
                        <BannerStat icon={UserIcon} value={patient.gender} />
                        <BannerStat icon={Droplet} value={patient.bloodGroup} />
                        <BannerStat icon={Heart} value={patient.maritalStatus} />
                        <BannerStat icon={Globe2} value={patient.nationality} />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card icon={ClipboardCheck} title="Visit Details">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <FormField label="Visit Type" htmlFor="visitType" required>
                      <FormSelect
                        id="visitType"
                        value={visitDetails.visitType}
                        onChange={(v) => setVisitDetails((p) => ({ ...p, visitType: v }))}
                        options={VISIT_TYPE_OPTIONS}
                        placeholder="Select visit type"
                      />
                    </FormField>
                    <FormField label="Visit Date" htmlFor="visitDate" required>
                      <FormDateInput
                        id="visitDate"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Department" htmlFor="department" required>
                      <FormSelect
                        id="department"
                        value={visitDetails.department}
                        onChange={(v) => {
                          setVisitDetails((p) => ({ ...p, department: v }));
                          setClinicUnit(v);
                        }}
                        options={DEPARTMENT_OPTIONS}
                        placeholder="Select department"
                      />
                    </FormField>
                    <FormField label="Purpose of Visit" htmlFor="purposeOfVisit" required>
                      <FormSelect
                        id="purposeOfVisit"
                        value={visitDetails.purposeOfVisit}
                        onChange={(v) => setVisitDetails((p) => ({ ...p, purposeOfVisit: v }))}
                        options={PURPOSE_OF_VISIT_OPTIONS}
                        placeholder="Select purpose"
                      />
                    </FormField>
                    <FormField label="Attending Physician" htmlFor="physician">
                      <FormSelect
                        id="physician"
                        value={visitDetails.physician}
                        onChange={(v) => setVisitDetails((p) => ({ ...p, physician: v }))}
                        options={PHYSICIAN_OPTIONS}
                        placeholder="Select physician"
                      />
                    </FormField>
                    {mode === 'verify' && appointment && (
                      <FormField label="Appointment Time" htmlFor="appointmentTime">
                        <input
                          id="appointmentTime"
                          disabled
                          readOnly
                          value={formatTime(appointment.dateTime)}
                          className="h-11 w-full rounded-[10px] bg-[#F5FBFD] px-3.5 font-sans"
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#8A98A3',
                          }}
                        />
                      </FormField>
                    )}
                    <div className="sm:col-span-2">
                      <FormField label="Notes (Optional)" htmlFor="notes">
                        <FormTextarea
                          id="notes"
                          rows={2}
                          placeholder="Enter any notes..."
                          value={visitDetails.notes}
                          onChange={(e) =>
                            setVisitDetails((p) => ({ ...p, notes: e.target.value }))
                          }
                        />
                      </FormField>
                    </div>
                  </div>
                </Card>

                <Card icon={Shield} title="Insurance Information">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Field label="Insurance Provider" value={patient.insurance.provider} />
                    <Field label="Policy Number" value={patient.insurance.policyNumber} />
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Coverage Status</p>
                      <span
                        className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color:
                            patient.insurance.coverageStatus === 'Valid' ? '#22C55E' : '#EF4444',
                          border: `1px solid ${patient.insurance.coverageStatus === 'Valid' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                        }}
                      >
                        {patient.insurance.coverageStatus}
                      </span>
                    </div>
                    <Field
                      label="Valid Till"
                      value={formatHumanDate(patient.insurance.validTill)}
                    />
                  </div>
                </Card>
              </div>

              {/* ── Middle column ─────────────────────────────────────────── */}
              <div className="flex flex-col gap-4">
                {mode === 'verify' && (
                  <Card
                    icon={Info}
                    title="Appointment Verification"
                    headerAction={
                      <span
                        className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: appointment ? '#22C55E' : '#EF4444',
                          border: `1px solid ${appointment ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                        }}
                      >
                        {appointment ? 'Appointment Found' : 'Not Found'}
                      </span>
                    }
                  >
                    {appointment ? (
                      <>
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <Field label="Appointment ID" value={appointment.id} />
                          <Field
                            label="Appointment Date"
                            value={formatHumanDate(appointment.dateTime)}
                          />
                          <Field
                            label="Appointment Time"
                            value={formatTime(appointment.dateTime)}
                          />
                          <div>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>Status</p>
                            <span
                              className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                color: '#00B4D8',
                                border: '1px solid rgba(0,180,216,0.4)',
                              }}
                            >
                              {appointment.status}
                            </span>
                          </div>
                          <Field label="Booked By" value={appointment.bookedBy} />
                          <Field label="Booked On" value={formatDateTime(appointment.bookedOn)} />
                        </div>
                        <div
                          className="mt-3.5 flex items-start gap-2.5 rounded-[10px] p-3"
                          style={{
                            background: 'rgba(34,197,94,0.06)',
                            border: '1px solid rgba(34,197,94,0.25)',
                          }}
                        >
                          <CheckCircle2
                            style={{ width: 16, height: 16, color: '#22C55E' }}
                            className="mt-0.5 shrink-0"
                          />
                          <div>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#166534' }}
                            >
                              Appointment is valid
                            </p>
                            <p style={{ fontSize: 14, color: '#166534' }}>
                              Patient is scheduled for an appointment with {appointment.physician}{' '}
                              in {appointment.department}.
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        className="flex items-start gap-2.5 rounded-[10px] p-3"
                        style={{
                          background: 'rgba(239,68,68,0.06)',
                          border: '1px solid rgba(239,68,68,0.25)',
                        }}
                      >
                        <AlertCircle
                          style={{ width: 16, height: 16, color: '#EF4444' }}
                          className="mt-0.5 shrink-0"
                        />
                        <div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#7F1D1D' }}
                          >
                            No appointment found for today
                          </p>
                          <p style={{ fontSize: 14, color: '#7F1D1D' }}>
                            Switch to Walk-in Registration to check this patient in without a
                            scheduled appointment.
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                <Card icon={ClipboardCheck} title="Check-In Summary">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Field
                      label="Check-In Date & Time"
                      value={
                        checkInDateTime
                          ? formatDateTime(checkInDateTime)
                          : formatDateTime(new Date())
                      }
                    />
                    <Field label="Checked In By" value="Adaobi Nwankwo" />
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Check-In Type</p>
                      <span
                        className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: '#00B4D8',
                          border: '1px solid rgba(0,180,216,0.4)',
                        }}
                      >
                        {mode === 'verify' && appointment ? 'Appointment' : 'Walk-in'}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Payment Status</p>
                      <span
                        className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: '#22C55E',
                          border: '1px solid rgba(34,197,94,0.4)',
                        }}
                      >
                        Covered ({patient.insurance.provider})
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ── Right column ──────────────────────────────────────────── */}
              <div className="flex flex-col gap-4">
                <Card icon={Users} title="Queue Assignment">
                  <div
                    className="flex flex-col items-center rounded-[10px] py-5"
                    style={{ background: '#F5FBFD' }}
                  >
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Current Queue Number</p>
                    <p
                      className="font-display font-bold"
                      style={{ fontSize: 40, color: '#00B4D8' }}
                    >
                      {queueNumber !== null ? String(queueNumber).padStart(3, '0') : '—'}
                    </p>
                  </div>
                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                    <Field label="Prefix" value={QUEUE_PREFIX} />
                    <Field label="Today's Count" value={String(todaysCount)} />
                    <Field label="Est. Wait Time" value={`~ ${ESTIMATED_WAIT_MINUTES} mins`} />
                  </div>
                  <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                    <button
                      type="button"
                      onClick={handleAssignQueue}
                      disabled={queueNumber !== null || !visitDetailsValid}
                      className="mt-3.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <Users style={{ width: 15, height: 15 }} />
                      {queueNumber !== null ? 'Queue Number Assigned' : 'Assign Queue Number'}
                    </button>
                  </PermissionGate>
                </Card>

                <Card icon={MapPin} title="Route to Clinic">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <FormField label="Clinic/Unit" htmlFor="clinicUnit" required>
                      <FormSelect
                        id="clinicUnit"
                        value={clinicUnit}
                        onChange={setClinicUnit}
                        options={DEPARTMENT_OPTIONS}
                        placeholder="Select clinic"
                      />
                    </FormField>
                    <FormField label="Consulting Room" htmlFor="consultingRoom">
                      <FormSelect
                        id="consultingRoom"
                        value={consultingRoom}
                        onChange={setConsultingRoom}
                        options={CONSULTING_ROOM_OPTIONS}
                        placeholder="Select room"
                      />
                    </FormField>
                  </div>
                  <div className="mt-3.5 grid grid-cols-2 gap-3.5">
                    <Field
                      label="Total Patients in Queue"
                      value={String(TOTAL_PATIENTS_IN_QUEUE)}
                    />
                    <Field
                      label="Next Available Doctor"
                      value={
                        visitDetails.physician
                          ? labelFor(PHYSICIAN_OPTIONS, visitDetails.physician)
                          : '—'
                      }
                    />
                  </div>
                </Card>

                <Card icon={Bell} title="Notify Department">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Send check-in notification to the selected department
                  </p>
                  <label
                    className="mt-3 flex cursor-pointer items-center gap-2 font-sans"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    <input
                      type="checkbox"
                      checked={notifyChecked}
                      onChange={(e) => setNotifyChecked(e.target.checked)}
                      style={{ accentColor: '#00B4D8' }}
                      className="size-4 cursor-pointer rounded"
                    />
                    {clinicUnit
                      ? labelFor(DEPARTMENT_OPTIONS, clinicUnit)
                      : 'No department selected'}
                  </label>
                  <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                    <button
                      type="button"
                      onClick={handleNotifyDepartment}
                      disabled={notified}
                      className="mt-3.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <Bell style={{ width: 15, height: 15 }} />
                      {notified ? 'Department Notified' : 'Notify Department'}
                    </button>
                  </PermissionGate>
                </Card>
              </div>
            </div>
          )}

          {/* ── Progress stepper ─────────────────────────────────────────── */}
          {patient && (
            <div
              className="mt-5 flex flex-col gap-4 overflow-x-auto scroll-smooth rounded-[12px] p-4 sm:flex-row sm:items-center sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {steps.map((step, i) => (
                <StepPill
                  key={step.label}
                  index={i + 1}
                  label={step.label}
                  detail={step.detail}
                  state={step.state}
                  isLast={i === steps.length - 1}
                />
              ))}
            </div>
          )}

          {/* ── Bottom actions ───────────────────────────────────────────── */}
          {patient && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => resetAll()}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <X style={{ width: 15, height: 15 }} />
                Clear
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelCheckIn}
                  className="flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  Cancel Check-In
                </button>
                <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                  <button
                    type="button"
                    onClick={handleCompleteCheckIn}
                    disabled={!canCompleteCheckIn}
                    className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <CheckCircle2 style={{ width: 15, height: 15 }} />
                    Complete Check-In
                  </button>
                </PermissionGate>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
