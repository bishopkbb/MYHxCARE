'use client';

import {
  CalendarPlus,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Repeat,
  Search,
  User,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { UserAvatar } from '@components/shared/UserAvatar';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  CHECKIN_PATIENT_SEARCH_KEYS,
  MOCK_CHECKIN_PATIENT,
} from '@/features/registration/__mocks__/checkInFixtures';
import {
  APPOINTMENT_MODE_OPTIONS,
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  DEPARTMENT_OPTIONS,
  DOCTORS,
  DURATION_OPTIONS,
  FEE_BY_VISIT_TYPE,
  PATIENT_UPCOMING_APPOINTMENTS,
  SEED_APPOINTMENTS,
  VISIT_TYPE_OPTIONS,
  type AppointmentStatus,
  type ScheduledAppointment,
  type SchedulingDoctor,
  type UpcomingAppointment,
} from '@/features/registration/__mocks__/appointmentSchedulingFixtures';

const STATUS_CFG: Record<AppointmentStatus, { color: string; border: string; bg: string }> = {
  Confirmed: { color: '#22C55E', border: 'rgba(34,197,94,0.35)', bg: 'rgba(34,197,94,0.08)' },
  Scheduled: { color: '#00B4D8', border: 'rgba(0,180,216,0.35)', bg: 'rgba(0,180,216,0.08)' },
  'In Progress': { color: '#F59E0B', border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.08)' },
  Completed: { color: '#8B5CF6', border: 'rgba(139,92,246,0.35)', bg: 'rgba(139,92,246,0.08)' },
  Cancelled: { color: '#8A98A3', border: 'rgba(138,152,163,0.35)', bg: 'rgba(138,152,163,0.06)' },
};

type CalendarView = 'day' | 'week' | 'month';
type SelectedPatient = typeof MOCK_CHECKIN_PATIENT;

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function combineDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function deriveStatus(entry: ScheduledAppointment, now: number): AppointmentStatus {
  if (entry.baseStatus === 'Cancelled') return 'Cancelled';
  const start = new Date(entry.dateTime).getTime();
  const end = start + entry.durationMinutes * 60_000;
  if (now < start) return entry.baseStatus;
  if (now < end) return 'In Progress';
  return 'Completed';
}

function slotTimes(): { hour: number; minute: number }[] {
  const slots: { hour: number; minute: number }[] = [];
  for (let h = CALENDAR_START_HOUR; h < CALENDAR_END_HOUR; h++) {
    slots.push({ hour: h, minute: 0 });
    slots.push({ hour: h, minute: 30 });
  }
  return slots;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <input
        type="time"
        lang="en-GB"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-[10px] pr-10 pl-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
        style={{
          fontSize: 14,
          border: '1px solid rgba(0,100,130,0.18)',
          color: '#0D2630',
          colorScheme: 'light',
        }}
      />
      <Clock
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
        style={{ width: 16, height: 16, color: '#8A98A3' }}
      />
    </div>
  );
}

export default function AppointmentSchedulingPage() {
  const router = useRouter();
  const toast = useToast();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const [appointments, setAppointments] = useState<ScheduledAppointment[]>(SEED_APPOINTMENTS);
  const [patientUpcoming, setPatientUpcoming] = useState<UpcomingAppointment[]>(
    PATIENT_UPCOMING_APPOINTMENTS,
  );
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(
    MOCK_CHECKIN_PATIENT,
  );

  const [department, setDepartment] = useState('General Outpatient Clinic');
  const [doctorId, setDoctorId] = useState('doc-jane');
  const [visitType, setVisitType] = useState('General Consultation');
  const [mode, setMode] = useState('In-Person');
  const [reason, setReason] = useState('Regular Check-up');
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [preferredTime, setPreferredTime] = useState('10:00');
  const [duration, setDuration] = useState('20');

  const [doctorSearch, setDoctorSearch] = useState('');
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const [view, setView] = useState<CalendarView>('day');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const selectedAppointment = appointments.find((a) => a.id === selectedAppointmentId) ?? null;
  const selectedDoctor = DOCTORS.find((d) => d.id === doctorId) ?? null;

  const visibleDoctors = useMemo(() => {
    const searched = doctorSearch.trim()
      ? DOCTORS.filter((d) => d.name.toLowerCase().includes(doctorSearch.trim().toLowerCase()))
      : DOCTORS;
    return showAllDoctors ? searched : searched.slice(0, 5);
  }, [doctorSearch, showAllDoctors]);

  const viewDate = useMemo(() => combineDateTime(selectedDate, '00:00'), [selectedDate]);
  const isToday = isSameCalendarDay(viewDate, new Date());

  function selectPatient(query: string) {
    setPatientSearch(query);
    const q = query.trim().toLowerCase();
    const found =
      q.length > 0 && CHECKIN_PATIENT_SEARCH_KEYS.some((k) => k.includes(q) || q.includes(k));
    setSelectedPatient(found ? MOCK_CHECKIN_PATIENT : null);
  }

  function clearPatient() {
    setSelectedPatient(null);
    setPatientSearch('');
  }

  function resetForm() {
    setDepartment('General Outpatient Clinic');
    setDoctorId('doc-jane');
    setVisitType('General Consultation');
    setMode('In-Person');
    setReason('Regular Check-up');
    setSelectedDate(toDateInputValue(new Date()));
    setPreferredTime('10:00');
    setDuration('20');
    setSelectedAppointmentId(null);
    setRescheduleOpen(false);
  }

  function goToDate(d: Date) {
    setSelectedDate(toDateInputValue(d));
  }

  function bookAppointment() {
    if (!selectedPatient) {
      toast.info('Select a patient', 'Search for and select a patient before booking.');
      return;
    }
    if (!department || !doctorId || !visitType || !selectedDate || !preferredTime) {
      toast.info('Missing details', 'Department, Doctor, Visit Type, Date and Time are required.');
      return;
    }
    const dateTime = combineDateTime(selectedDate, preferredTime).toISOString();
    const conflict = appointments.some(
      (a) => a.doctorId === doctorId && a.baseStatus !== 'Cancelled' && a.dateTime === dateTime,
    );
    if (conflict) {
      toast.error('Slot unavailable', 'This doctor already has an appointment at that time.');
      return;
    }
    const newEntry: ScheduledAppointment = {
      id: `apt-${Date.now()}`,
      doctorId,
      patientName: selectedPatient.fullName,
      visitType,
      dateTime,
      durationMinutes: Number(duration),
      baseStatus: 'Scheduled',
    };
    setAppointments((prev) => [...prev, newEntry]);
    setPatientUpcoming((prev) => [
      ...prev,
      {
        id: newEntry.id,
        dateTime,
        department,
        doctorName: selectedDoctor?.name ?? '',
      },
    ]);
    toast.success(
      'Appointment booked',
      `${selectedPatient.fullName} scheduled with ${selectedDoctor?.name} on ${formatHumanDate(dateTime)} at ${formatTime(dateTime)}.`,
    );
  }

  function openReschedule() {
    if (!selectedAppointment) {
      toast.info(
        'Select an appointment',
        'Choose an existing appointment from the calendar first.',
      );
      return;
    }
    setRescheduleDate(toDateInputValue(new Date(selectedAppointment.dateTime)));
    setRescheduleTime(formatTime(selectedAppointment.dateTime));
    setRescheduleOpen(true);
  }

  function confirmReschedule() {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;
    const newDateTime = combineDateTime(rescheduleDate, rescheduleTime).toISOString();
    setAppointments((prev) =>
      prev.map((a) => (a.id === selectedAppointment.id ? { ...a, dateTime: newDateTime } : a)),
    );
    toast.success(
      'Appointment rescheduled',
      `${selectedAppointment.patientName} moved to ${formatHumanDate(newDateTime)} at ${formatTime(newDateTime)}.`,
    );
    setRescheduleOpen(false);
  }

  function cancelAppointment() {
    if (!selectedAppointment) {
      toast.info(
        'Select an appointment',
        'Choose an existing appointment from the calendar first.',
      );
      return;
    }
    setAppointments((prev) =>
      prev.map((a) => (a.id === selectedAppointment.id ? { ...a, baseStatus: 'Cancelled' } : a)),
    );
    toast.success(
      'Appointment cancelled',
      `${selectedAppointment.patientName}'s appointment was cancelled.`,
    );
    setSelectedAppointmentId(null);
  }

  const fee = FEE_BY_VISIT_TYPE[visitType] ?? 0;

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
              Appointment Scheduling
            </span>
          </nav>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Appointment Scheduling
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Book, reschedule or cancel patient appointments
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                <button
                  type="button"
                  onClick={bookAppointment}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <CalendarPlus style={{ width: 16, height: 16 }} />
                  Book Appointment
                </button>
                <button
                  type="button"
                  onClick={openReschedule}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Repeat style={{ width: 16, height: 16 }} />
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={cancelAppointment}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  <CalendarX2 style={{ width: 16, height: 16 }} />
                  Cancel Appointment
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Search Patient / Selected Patient ────────────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] bg-white p-4"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                Search Patient
              </p>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                />
                <input
                  type="search"
                  value={patientSearch}
                  onChange={(e) => selectPatient(e.target.value)}
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

            <div
              className="rounded-[12px] bg-white p-4"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Selected Patient
                </p>
                {selectedPatient && (
                  <button
                    type="button"
                    onClick={clearPatient}
                    className="flex h-8 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{
                      fontSize: 14,
                      color: '#4A7080',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  >
                    <X style={{ width: 13, height: 13 }} />
                    Clear
                  </button>
                )}
              </div>
              {selectedPatient ? (
                <div className="mt-2 flex items-center gap-3">
                  <UserAvatar initials={selectedPatient.initials} size={48} bg="#00B4D8" />
                  <div className="min-w-0">
                    <p
                      className="font-display truncate font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      {selectedPatient.fullName}
                    </p>
                    <p style={{ fontSize: 14, color: '#00B4D8' }}>{selectedPatient.mrn}</p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {selectedPatient.age} Yrs &middot; {selectedPatient.gender}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Search for a patient to book, reschedule or cancel an appointment.
                </p>
              )}
            </div>
          </div>

          {/* ── Booking form ──────────────────────────────────────────────── */}
          <div
            className="mt-4 rounded-[12px] bg-white p-4"
            style={{ border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Department *
                </label>
                <FormSelect
                  id="apt-department"
                  value={department}
                  onChange={(v) => {
                    setDepartment(v);
                    const firstMatch = DOCTORS.find((d) => d.department === v);
                    if (firstMatch) setDoctorId(firstMatch.id);
                  }}
                  options={DEPARTMENT_OPTIONS}
                  placeholder="Select department"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Doctor *
                </label>
                <FormSelect
                  id="apt-doctor"
                  value={doctorId}
                  onChange={setDoctorId}
                  options={DOCTORS.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Select doctor"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Visit Type *
                </label>
                <FormSelect
                  id="apt-visit-type"
                  value={visitType}
                  onChange={setVisitType}
                  options={VISIT_TYPE_OPTIONS}
                  placeholder="Select visit type"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Appointment Mode
                </label>
                <FormSelect
                  id="apt-mode"
                  value={mode}
                  onChange={setMode}
                  options={APPOINTMENT_MODE_OPTIONS}
                  placeholder="Select mode"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Reason for Visit
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Regular Check-up"
                  className="h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Select Date
                </label>
                <FormDateInput
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Preferred Time
                </label>
                <TimeInput value={preferredTime} onChange={setPreferredTime} />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Duration
                </label>
                <FormSelect
                  id="apt-duration"
                  value={duration}
                  onChange={setDuration}
                  options={DURATION_OPTIONS}
                  placeholder="Select duration"
                />
              </div>
            </div>
          </div>

          {/* ── Doctors + Calendar + Summary ──────────────────────────────── */}
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
            {/* Doctors panel */}
            <div
              className="w-full shrink-0 rounded-[12px] bg-white p-4 xl:w-[240px]"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                Doctors
              </p>
              <div className="relative mt-2.5">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ width: 14, height: 14, color: '#8A98A3' }}
                />
                <input
                  type="search"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Search doctor..."
                  className="h-9 w-full rounded-[8px] pr-3 pl-8 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {visibleDoctors.map((doc) => (
                  <DoctorCard
                    key={doc.id}
                    doctor={doc}
                    active={doc.id === doctorId}
                    onClick={() => {
                      setDoctorId(doc.id);
                      setDepartment(doc.department);
                    }}
                  />
                ))}
                {visibleDoctors.length === 0 && (
                  <p className="py-3 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No doctors match
                  </p>
                )}
              </div>
              {!showAllDoctors && DOCTORS.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllDoctors(true)}
                  className="mt-2.5 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  + View All Doctors
                </button>
              )}
            </div>

            {/* Calendar */}
            <div
              className="min-w-0 flex-1 rounded-[12px] bg-white p-4"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    {new Intl.DateTimeFormat('en-GB', {
                      weekday: 'long',
                      timeZone: 'Africa/Lagos',
                    }).format(viewDate)}
                    , {formatHumanDate(viewDate)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      goToDate(
                        addDays(viewDate, view === 'month' ? -30 : view === 'week' ? -7 : -1),
                      )
                    }
                    aria-label="Previous"
                    className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                  >
                    <ChevronLeft style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      goToDate(addDays(viewDate, view === 'month' ? 30 : view === 'week' ? 7 : 1))
                    }
                    aria-label="Next"
                    className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                  >
                    <ChevronRight style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToDate(new Date())}
                    className="flex h-9 items-center rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    Today
                  </button>
                </div>
                <div
                  className="flex gap-1 rounded-[10px] p-1"
                  style={{ background: 'rgba(226,237,241,0.5)' }}
                >
                  {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className="rounded-[8px] px-3.5 py-1.5 font-sans font-medium capitalize transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: view === v ? '#FFFFFF' : '#4A7080',
                        background: view === v ? '#00B4D8' : 'transparent',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                {view === 'day' && (
                  <DayView
                    doctors={visibleDoctors}
                    appointments={appointments}
                    viewDate={viewDate}
                    now={now}
                    isToday={isToday}
                    selectedDoctorId={doctorId}
                    selectedDate={selectedDate}
                    preferredTime={preferredTime}
                    selectedAppointmentId={selectedAppointmentId}
                    onSelectAppointment={setSelectedAppointmentId}
                  />
                )}
                {view === 'week' && (
                  <WeekView
                    appointments={appointments}
                    viewDate={viewDate}
                    selectedDoctorId={doctorId}
                    now={now}
                    onSelectDay={(d) => {
                      goToDate(d);
                      setView('day');
                    }}
                  />
                )}
                {view === 'month' && (
                  <MonthView
                    appointments={appointments}
                    viewDate={viewDate}
                    selectedDoctorId={doctorId}
                    onSelectDay={(d) => {
                      goToDate(d);
                      setView('day');
                    }}
                  />
                )}
              </div>

              {view === 'day' && (
                <div
                  className="mt-4 flex flex-wrap items-center gap-4"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 12 }}
                >
                  {(Object.keys(STATUS_CFG) as AppointmentStatus[]).map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: STATUS_CFG[s].color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{s}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ border: '1.5px dashed #8A98A3' }}
                    />
                    <span style={{ fontSize: 14, color: '#4A7080' }}>Available</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right panel */}
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[320px]">
              <div
                className="rounded-[12px] bg-white p-4"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  Appointment Summary
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {[
                    ['Patient', selectedPatient?.fullName ?? '—'],
                    ['MRN', selectedPatient?.mrn ?? '—'],
                    ['Department', department || '—'],
                    ['Doctor', selectedDoctor?.name ?? '—'],
                    ['Visit Type', visitType || '—'],
                    ['Date', selectedDate ? formatHumanDate(viewDate) : '—'],
                    [
                      'Time',
                      preferredTime
                        ? formatTime(combineDateTime(selectedDate, preferredTime))
                        : '—',
                    ],
                    ['Duration', `${duration} mins`],
                    ['Mode', mode || '—'],
                    ['Reason', reason || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
                      <p
                        className="truncate text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                  <div
                    className="mt-1 flex items-center justify-between gap-2"
                    style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 10 }}
                  >
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Total Fee
                    </p>
                    <p className="font-sans font-bold" style={{ fontSize: 16, color: '#00B4D8' }}>
                      &#8358;{fee.toLocaleString('en-NG')}.00
                    </p>
                  </div>
                </div>
              </div>

              <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                <div
                  className="rounded-[12px] bg-white p-4"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Quick Actions
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    <QuickAction
                      icon={CalendarPlus}
                      label="Book Appointment"
                      color="#00B4D8"
                      onClick={bookAppointment}
                    />
                    <QuickAction
                      icon={Repeat}
                      label="Reschedule"
                      color="#8B5CF6"
                      onClick={openReschedule}
                    />
                    <QuickAction
                      icon={CalendarX2}
                      label="Cancel Appointment"
                      color="#EF4444"
                      onClick={cancelAppointment}
                    />
                    <QuickAction
                      icon={Eye}
                      label="View Patient Profile"
                      color="#22C55E"
                      onClick={() => router.push(ROUTES.registrationProfile)}
                    />
                  </div>
                </div>
              </PermissionGate>

              <div
                className="rounded-[12px] bg-white p-4"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Upcoming Appointments
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.registrationProfile)}
                    className="font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                <div className="mt-2.5 flex flex-col gap-2.5">
                  {patientUpcoming.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>No upcoming appointments</p>
                  )}
                  {patientUpcoming.map((a) => (
                    <div
                      key={a.id}
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)', paddingBottom: 10 }}
                    >
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatHumanDate(a.dateTime)} &middot; {formatTime(a.dateTime)}
                      </p>
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {a.department} &middot; {a.doctorName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {rescheduleOpen && selectedAppointment && (
            <div
              className="animate-in fade-in-0 slide-in-from-top-1 mt-4 flex flex-col gap-3 rounded-[12px] p-4 duration-150 sm:flex-row sm:items-end"
              style={{
                border: '1px solid rgba(0,180,216,0.3)',
                background: 'rgba(0,180,216,0.04)',
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Rescheduling {selectedAppointment.patientName}&apos;s appointment
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2.5">
                  <FormDateInput
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                  <TimeInput value={rescheduleTime} onChange={setRescheduleTime} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirmReschedule}
                  className="flex h-11 items-center justify-center rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleOpen(false)}
                  className="flex h-11 items-center justify-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#4A7080',
                    border: '1px solid rgba(0,100,130,0.18)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Bottom bar ────────────────────────────────────────────────── */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              Clear
            </button>
            <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
              <button
                type="button"
                onClick={bookAppointment}
                className="flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                Confirm Appointment
              </button>
            </PermissionGate>
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}

function DoctorCard({
  doctor,
  active,
  onClick,
}: {
  doctor: SchedulingDoctor;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-[10px] p-2 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
      style={{ background: active ? '#E6F8FD' : 'transparent' }}
    >
      <UserAvatar initials={doctor.initials} size={36} bg={active ? '#00B4D8' : '#4A7080'} />
      <div className="min-w-0">
        <p
          className="truncate font-sans font-medium"
          style={{ fontSize: 14, color: active ? '#00B4D8' : '#0D2630' }}
        >
          {doctor.name}
        </p>
        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
          {doctor.department}
        </p>
      </div>
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-[10px] py-3 text-center font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
      style={{ fontSize: 14, color, border: `1px solid ${color}4D` }}
    >
      <Icon style={{ width: 16, height: 16 }} />
      {label}
    </button>
  );
}

function DayView({
  doctors,
  appointments,
  viewDate,
  now,
  isToday,
  selectedDoctorId,
  selectedDate,
  preferredTime,
  selectedAppointmentId,
  onSelectAppointment,
}: {
  doctors: SchedulingDoctor[];
  appointments: ScheduledAppointment[];
  viewDate: Date;
  now: number;
  isToday: boolean;
  selectedDoctorId: string;
  selectedDate: string;
  preferredTime: string;
  selectedAppointmentId: string | null;
  onSelectAppointment: (id: string) => void;
}) {
  const slots = slotTimes();
  const nowDate = new Date(now);
  const currentSlotKey = isToday
    ? `${nowDate.getHours()}:${nowDate.getMinutes() < 30 ? 0 : 30}`
    : null;
  const availableSlotKey =
    selectedDate === toDateInputValue(viewDate) && preferredTime
      ? `${Number(preferredTime.split(':')[0])}:${Number(preferredTime.split(':')[1]) < 30 ? 0 : 30}`
      : null;

  if (doctors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div
          className="flex size-14 items-center justify-center rounded-full"
          style={{ background: 'rgba(226,237,241,0.6)' }}
        >
          <User style={{ width: 24, height: 24, color: '#8A98A3' }} />
        </div>
        <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
          No doctors to display
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scroll-smooth">
      <div className="flex" style={{ minWidth: 120 + doctors.length * 200 }}>
        <div className="w-20 shrink-0">
          <div className="h-11" />
          {slots.map((s) => {
            const rowDate = new Date(viewDate);
            rowDate.setHours(s.hour, s.minute, 0, 0);
            return (
              <div key={`${s.hour}:${s.minute}`} className="flex h-16 items-start justify-end pr-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(rowDate)}</span>
              </div>
            );
          })}
        </div>
        {doctors.map((doc) => (
          <div
            key={doc.id}
            className="min-w-[200px] flex-1"
            style={{ borderLeft: '1px solid rgba(0,100,130,0.08)' }}
          >
            <div className="flex h-11 flex-col items-center justify-center px-2 text-center">
              <p
                className="truncate font-sans font-semibold"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {doc.name}
              </p>
              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                {doc.department}
              </p>
            </div>
            {slots.map((s) => {
              const slotKey = `${s.hour}:${s.minute}`;
              const slotDate = new Date(viewDate);
              slotDate.setHours(s.hour, s.minute, 0, 0);
              const appt = appointments.find((a) => {
                const start = new Date(a.dateTime);
                return (
                  a.doctorId === doc.id &&
                  isSameCalendarDay(start, viewDate) &&
                  start.getHours() === s.hour &&
                  start.getMinutes() === s.minute
                );
              });
              const isAvailable =
                !appt && doc.id === selectedDoctorId && slotKey === availableSlotKey;
              const isCurrent = slotKey === currentSlotKey;
              return (
                <div
                  key={slotKey}
                  className="h-16 border-b p-1"
                  style={{
                    borderColor: 'rgba(0,100,130,0.06)',
                    background: isCurrent ? 'rgba(239,68,68,0.04)' : 'transparent',
                  }}
                >
                  {appt ? (
                    <AppointmentBlock
                      appt={appt}
                      status={deriveStatus(appt, now)}
                      selected={appt.id === selectedAppointmentId}
                      onClick={() => onSelectAppointment(appt.id)}
                    />
                  ) : isAvailable ? (
                    <div
                      className="flex h-full flex-col justify-center rounded-[8px] px-2"
                      style={{ border: '1.5px dashed #00B4D8', background: 'rgba(0,180,216,0.04)' }}
                    >
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        Available Slot
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentBlock({
  appt,
  status,
  selected,
  onClick,
}: {
  appt: ScheduledAppointment;
  status: AppointmentStatus;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CFG[status];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full flex-col justify-center rounded-[8px] px-2 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
      style={{
        border: `1px solid ${selected ? '#00B4D8' : cfg.border}`,
        background: selected ? '#E6F8FD' : cfg.bg,
      }}
    >
      <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {appt.patientName}
      </p>
      <p className="truncate" style={{ fontSize: 14, color: cfg.color }}>
        {appt.visitType}
      </p>
    </button>
  );
}

function WeekView({
  appointments,
  viewDate,
  selectedDoctorId,
  now,
  onSelectDay,
}: {
  appointments: ScheduledAppointment[];
  viewDate: Date;
  selectedDoctorId: string;
  now: number;
  onSelectDay: (d: Date) => void;
}) {
  const startOfWeek = addDays(viewDate, -viewDate.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i));

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {days.map((day) => {
        const dayAppointments = appointments.filter(
          (a) =>
            a.doctorId === selectedDoctorId &&
            a.baseStatus !== 'Cancelled' &&
            isSameCalendarDay(new Date(a.dateTime), day),
        );
        const isToday = isSameCalendarDay(day, new Date(now));
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDay(day)}
            className="flex flex-col items-start gap-1.5 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ border: `1px solid ${isToday ? '#00B4D8' : 'rgba(0,100,130,0.12)'}` }}
          >
            <p
              className="font-sans font-semibold"
              style={{ fontSize: 14, color: isToday ? '#00B4D8' : '#0D2630' }}
            >
              {new Intl.DateTimeFormat('en-GB', {
                weekday: 'short',
                timeZone: 'Africa/Lagos',
              }).format(day)}{' '}
              {day.getDate()}
            </p>
            {dayAppointments.slice(0, 3).map((a) => (
              <p key={a.id} className="w-full truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                {formatTime(a.dateTime)} &middot; {a.patientName}
              </p>
            ))}
            {dayAppointments.length === 0 && (
              <p style={{ fontSize: 14, color: '#8A98A3' }}>No appointments</p>
            )}
            {dayAppointments.length > 3 && (
              <p style={{ fontSize: 14, color: '#00B4D8' }}>+{dayAppointments.length - 3} more</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MonthView({
  appointments,
  viewDate,
  selectedDoctorId,
  onSelectDay,
}: {
  appointments: ScheduledAppointment[];
  viewDate: Date;
  selectedDoctorId: string;
  onSelectDay: (d: Date) => void;
}) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = addDays(firstOfMonth, -startOffset);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <p
            key={d}
            className="py-1 text-center font-sans font-semibold"
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            {d}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = day.getMonth() === viewDate.getMonth();
          const isToday = isSameCalendarDay(day, new Date());
          const count = appointments.filter(
            (a) =>
              a.doctorId === selectedDoctorId &&
              a.baseStatus !== 'Cancelled' &&
              isSameCalendarDay(new Date(a.dateTime), day),
          ).length;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex h-16 flex-col items-center justify-start gap-1 rounded-[8px] p-1.5 transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{
                border: `1px solid ${isToday ? '#00B4D8' : 'rgba(0,100,130,0.08)'}`,
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <span style={{ fontSize: 14, color: isToday ? '#00B4D8' : '#0D2630' }}>
                {day.getDate()}
              </span>
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#00B4D8', background: 'rgba(0,180,216,0.1)' }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
