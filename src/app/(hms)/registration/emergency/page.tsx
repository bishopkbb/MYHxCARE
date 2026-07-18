'use client';

import {
  Ambulance,
  ArrowRight,
  Calendar,
  Clock,
  HeartPulse,
  ListChecks,
  Phone,
  Route,
  Search,
  ShieldAlert,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormPhoneInput } from '@components/shared/FormPhoneInput';
import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  CHECKIN_PATIENT_SEARCH_KEYS,
  MOCK_CHECKIN_PATIENT,
} from '@/features/registration/__mocks__/checkInFixtures';
import { MOCK_PATIENT_PROFILE } from '@/features/registration/__mocks__/patientProfileFixtures';
import { RELATIONSHIP_OPTIONS } from '@/features/registration/__mocks__/registerPatientOptions';
import {
  ARRIVAL_MODE_OPTIONS,
  EMERGENCY_MRN_START,
  NEXT_STEPS,
  TRIAGE_PRIORITY_OPTIONS,
  formatEmergencyMrn,
  type ArrivalMode,
  type TriagePriority,
} from '@/features/registration/__mocks__/emergencyRegistrationFixtures';

type PatientType = 'known' | 'unknown';

function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SectionHeader({
  icon: Icon,
  label,
  color,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon style={{ width: 18, height: 18, color }} />
      <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
        {label}
      </p>
    </div>
  );
}

function TextField({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        className="mb-1.5 block font-sans font-medium"
        style={{ fontSize: 14, color: '#0D2630' }}
      >
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      <input
        {...props}
        className="h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 disabled:cursor-not-allowed disabled:bg-[#F5FBFD] disabled:text-[#8A98A3]"
        style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
      />
    </div>
  );
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  activeColor = '#00B4D8',
}: {
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (v: T) => void;
  activeColor?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{
              fontSize: 14,
              color: active ? activeColor : '#4A7080',
              border: `1px solid ${active ? activeColor : 'rgba(0,100,130,0.2)'}`,
              background: active ? `${activeColor}14` : 'transparent',
            }}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ background: active ? activeColor : 'rgba(138,152,163,0.4)' }}
            />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const STATUS_LABEL_BY_STEP = ['To Be Triage', 'In Triage', 'Triage Complete', 'With Doctor'];

export default function EmergencyRegistrationPage() {
  const router = useRouter();
  const toast = useToast();

  const [patientType, setPatientType] = useState<PatientType>('unknown');
  const [patientSearch, setPatientSearch] = useState('');
  const [matchedKnown, setMatchedKnown] = useState<typeof MOCK_CHECKIN_PATIENT | null>(null);
  const [patientName, setPatientName] = useState('');
  const [unknownLabel, setUnknownLabel] = useState('UNKNOWN PATIENT');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [dob, setDob] = useState('');

  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+234');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [altPhoneCountryCode, setAltPhoneCountryCode] = useState('+234');
  const [altPhoneNumber, setAltPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const [arrivalTime, setArrivalTime] = useState(() => toDateTimeLocal(new Date()));
  const [arrivalBy, setArrivalBy] = useState<ArrivalMode>('Walk-in');
  const [broughtInBy, setBroughtInBy] = useState('');

  const [triagePriority, setTriagePriority] = useState<TriagePriority>('Red');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [briefNotes, setBriefNotes] = useState('');

  const [emrCounter, setEmrCounter] = useState(EMERGENCY_MRN_START);
  const [isComplete, setIsComplete] = useState(false);
  const [registeredMrn, setRegisteredMrn] = useState('');
  const [registeredName, setRegisteredName] = useState('');

  const priorityCfg = TRIAGE_PRIORITY_OPTIONS.find((p) => p.value === triagePriority);
  const previewMrn = matchedKnown ? matchedKnown.mrn : formatEmergencyMrn(emrCounter);

  function selectPatientType(type: PatientType) {
    setPatientType(type);
    setMatchedKnown(null);
    setPatientSearch('');
    setPatientName('');
    setAge('');
    setGender('');
    setDob('');
  }

  function handlePatientSearch(query: string) {
    setPatientSearch(query);
    setPatientName(query);
    const q = query.trim().toLowerCase();
    const found =
      q.length > 0 && CHECKIN_PATIENT_SEARCH_KEYS.some((k) => k.includes(q) || q.includes(k));
    if (found) {
      setMatchedKnown(MOCK_CHECKIN_PATIENT);
      setPatientName(MOCK_CHECKIN_PATIENT.fullName);
      setAge(String(MOCK_CHECKIN_PATIENT.age));
      setGender(MOCK_CHECKIN_PATIENT.gender as 'Male' | 'Female');
      setDob(MOCK_PATIENT_PROFILE.dateOfBirth);
    } else {
      setMatchedKnown(null);
    }
  }

  function resetForm() {
    setPatientType('unknown');
    setPatientSearch('');
    setMatchedKnown(null);
    setPatientName('');
    setUnknownLabel('UNKNOWN PATIENT');
    setAge('');
    setGender('');
    setDob('');
    setContactName('');
    setRelationship('');
    setPhoneCountryCode('+234');
    setPhoneNumber('');
    setAltPhoneCountryCode('+234');
    setAltPhoneNumber('');
    setEmail('');
    setAddress('');
    setArrivalTime(toDateTimeLocal(new Date()));
    setArrivalBy('Walk-in');
    setBroughtInBy('');
    setTriagePriority('Red');
    setChiefComplaint('');
    setBriefNotes('');
  }

  function handleSubmit() {
    if (
      !patientName.trim() ||
      !age ||
      !gender ||
      !contactName.trim() ||
      !relationship ||
      !phoneNumber.trim()
    ) {
      toast.error(
        'Missing information',
        'Patient identity and emergency contact details are required.',
      );
      return;
    }
    if (!arrivalTime || !chiefComplaint.trim()) {
      toast.error('Missing information', 'Arrival time and chief complaint are required.');
      return;
    }
    const finalMrn = matchedKnown ? matchedKnown.mrn : formatEmergencyMrn(emrCounter);
    if (!matchedKnown) setEmrCounter((n) => n + 1);
    setRegisteredMrn(finalMrn);
    setRegisteredName(patientName.trim());
    setIsComplete(true);
    toast.success('Patient routed to ED', `${patientName.trim()} registered as ${finalMrn}.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRegisterAnother() {
    resetForm();
    setIsComplete(false);
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
              Emergency Registration
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Emergency Registration
            </h1>
            <span
              className="rounded-full px-2.5 py-1 font-sans font-bold tracking-wide text-white uppercase"
              style={{ fontSize: 14, background: '#EF4444' }}
            >
              Emergency Mode
            </span>
          </div>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Register emergency patient and route directly to Emergency Department
          </p>

          {isComplete ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] px-6 py-20 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div
                className="flex size-16 items-center justify-center rounded-full"
                style={{ background: 'rgba(239,68,68,0.1)' }}
              >
                <Ambulance style={{ width: 32, height: 32, color: '#EF4444' }} />
              </div>
              <p className="font-display font-semibold" style={{ fontSize: 22, color: '#0D2630' }}>
                Patient Routed to Emergency Department
              </p>
              <p className="max-w-[420px]" style={{ fontSize: 14, color: '#4A7080' }}>
                <span className="font-medium" style={{ color: '#0D2630' }}>
                  {registeredName}
                </span>{' '}
                has been registered and the ED team has been notified.
              </p>
              <span
                className="mt-1 rounded-full px-3 py-1 font-sans font-semibold"
                style={{ fontSize: 14, color: '#EF4444', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                {registeredMrn}
              </span>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRegisterAnother}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Ambulance style={{ width: 15, height: 15 }} />
                  Register Another Emergency Patient
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.registrationQueue)}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Users style={{ width: 15, height: 15 }} />
                  View Queue Management
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              {/* ── Form ──────────────────────────────────────────────────── */}
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div
                  className="rounded-[12px] bg-white p-4"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <SectionHeader icon={ShieldAlert} label="Patient Information" color="#00B4D8" />
                  <div className="mt-3">
                    <label
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Patient Type <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <ToggleGroup
                      options={[
                        { value: 'known' as PatientType, label: 'Known Patient' },
                        { value: 'unknown' as PatientType, label: 'Unknown Patient' },
                      ]}
                      value={patientType}
                      onChange={selectPatientType}
                      activeColor="#EF4444"
                    />
                  </div>

                  {patientType === 'unknown' && (
                    <div
                      className="animate-in fade-in-0 slide-in-from-top-1 mt-3 rounded-[10px] p-3 duration-150"
                      style={{
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.05)',
                      }}
                    >
                      <p style={{ fontSize: 14, color: '#EF4444' }}>
                        Unknown patient will be automatically assigned an emergency MRN
                      </p>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Patient Name <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <div className="relative">
                        <input
                          value={patientType === 'known' ? patientSearch : patientName}
                          onChange={(e) =>
                            patientType === 'known'
                              ? handlePatientSearch(e.target.value)
                              : setPatientName(e.target.value)
                          }
                          placeholder={
                            patientType === 'known'
                              ? 'Search by Name, MRN or Phone...'
                              : 'Enter patient full name'
                          }
                          className="h-11 w-full rounded-[10px] px-3.5 pr-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        />
                        {patientType === 'known' ? (
                          <Search
                            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
                            style={{ width: 16, height: 16, color: '#8A98A3' }}
                          />
                        ) : (
                          <User
                            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
                            style={{ width: 16, height: 16, color: '#8A98A3' }}
                          />
                        )}
                      </div>
                    </div>
                    <TextField
                      label="If Unknown, enter as"
                      value={unknownLabel}
                      onChange={(e) => setUnknownLabel(e.target.value)}
                      disabled={patientType === 'known'}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <TextField
                      label="Age"
                      required
                      type="number"
                      min={0}
                      max={130}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Enter age"
                      disabled={!!matchedKnown}
                    />
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Gender <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <ToggleGroup
                        options={[
                          { value: 'Male' as const, label: 'Male' },
                          { value: 'Female' as const, label: 'Female' },
                          { value: 'Other' as const, label: 'Other' },
                        ]}
                        value={gender}
                        onChange={(v) => !matchedKnown && setGender(v)}
                      />
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Date of Birth (If known)
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          lang="en-GB"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          disabled={!!matchedKnown}
                          className="h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 disabled:cursor-not-allowed disabled:bg-[#F5FBFD] disabled:text-[#8A98A3]"
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                            colorScheme: 'light',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-[12px] bg-white p-4"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <SectionHeader icon={Phone} label="Emergency Contact" color="#00B4D8" />
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <TextField
                      label="Contact Name"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Enter contact name"
                    />
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Relationship <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <FormSelect
                        id="er-relationship"
                        value={relationship}
                        onChange={setRelationship}
                        options={RELATIONSHIP_OPTIONS}
                        placeholder="Select Relationship"
                      />
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Phone Number <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <FormPhoneInput
                        countryCode={phoneCountryCode}
                        onCountryCodeChange={setPhoneCountryCode}
                        numberInputProps={{
                          value: phoneNumber,
                          onChange: (e) => setPhoneNumber(e.target.value),
                          placeholder: 'Enter phone number',
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
                        Alternate Phone (Optional)
                      </label>
                      <FormPhoneInput
                        countryCode={altPhoneCountryCode}
                        onCountryCodeChange={setAltPhoneCountryCode}
                        numberInputProps={{
                          value: altPhoneNumber,
                          onChange: (e) => setAltPhoneNumber(e.target.value),
                          placeholder: 'Enter alternate phone',
                        }}
                      />
                    </div>
                    <TextField
                      label="Email (Optional)"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                    />
                    <TextField
                      label="Address (Optional)"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                <div
                  className="rounded-[12px] bg-white p-4"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <SectionHeader icon={Clock} label="Arrival Information" color="#00B4D8" />
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Arrival Time <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="datetime-local"
                          lang="en-GB"
                          value={arrivalTime}
                          onChange={(e) => setArrivalTime(e.target.value)}
                          className="h-11 w-full rounded-[10px] px-3.5 pr-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                            colorScheme: 'light',
                          }}
                        />
                        <Calendar
                          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
                          style={{ width: 16, height: 16, color: '#8A98A3' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Arrival By <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <ToggleGroup
                        options={ARRIVAL_MODE_OPTIONS.map((a) => ({ value: a, label: a }))}
                        value={arrivalBy}
                        onChange={setArrivalBy}
                        activeColor="#EF4444"
                      />
                    </div>
                    <TextField
                      label="Brought In By"
                      value={broughtInBy}
                      onChange={(e) => setBroughtInBy(e.target.value)}
                      placeholder="Enter name (if known)"
                    />
                  </div>
                </div>

                <div
                  className="rounded-[12px] bg-white p-4"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <SectionHeader icon={HeartPulse} label="Triage & Priority" color="#EF4444" />
                  <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Triage Priority <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TRIAGE_PRIORITY_OPTIONS.map((p) => {
                          const active = p.value === triagePriority;
                          return (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setTriagePriority(p.value)}
                              className="flex flex-col items-center gap-0.5 rounded-[10px] px-3.5 py-2 font-sans font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{
                                fontSize: 14,
                                color: active ? p.color : '#4A7080',
                                border: `1px solid ${active ? p.color : 'rgba(0,100,130,0.2)'}`,
                                background: active ? `${p.color}14` : 'transparent',
                              }}
                            >
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="size-2.5 rounded-full"
                                  style={{ background: p.color }}
                                />
                                {p.label}
                              </span>
                              <span style={{ fontSize: 14, color: '#8A98A3' }}>{p.sublabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Chief Complaint / Reason for Visit{' '}
                        <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <textarea
                        value={chiefComplaint}
                        onChange={(e) => setChiefComplaint(e.target.value)}
                        placeholder="Briefly describe the patient's condition"
                        rows={3}
                        className="w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Brief Notes (Optional)
                    </label>
                    <textarea
                      value={briefNotes}
                      onChange={(e) => setBriefNotes(e.target.value)}
                      placeholder="Additional notes about the patient's condition, allergies, or other important information..."
                      rows={2}
                      className="w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Right panel ───────────────────────────────────────────── */}
              <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
                <div
                  className="rounded-[12px] bg-white p-4"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <SectionHeader icon={ShieldAlert} label="Registration Summary" color="#EF4444" />
                  <div
                    className="mt-3 rounded-[10px] p-3"
                    style={{
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'rgba(239,68,68,0.05)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {matchedKnown ? 'Patient MRN' : 'Emergency MRN'}
                      </p>
                      <span
                        className="rounded-full px-2 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: matchedKnown ? '#00B4D8' : '#22C55E',
                          border: `1px solid ${matchedKnown ? 'rgba(0,180,216,0.4)' : 'rgba(34,197,94,0.4)'}`,
                        }}
                      >
                        {matchedKnown ? 'Existing Patient' : 'Auto Generated'}
                      </span>
                    </div>
                    <p
                      className="font-display mt-1 font-bold"
                      style={{ fontSize: 22, color: '#EF4444' }}
                    >
                      {previewMrn}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {[
                      [
                        'Patient Type',
                        patientType === 'known' ? 'Known Patient' : 'Unknown Patient',
                      ],
                      [
                        'Arrival Time',
                        `${formatHumanDate(arrivalTime)} ${formatTime(arrivalTime)}`,
                      ],
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
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Triage Priority</p>
                      <p
                        className="flex items-center gap-1.5 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: priorityCfg?.color }}
                        />
                        {priorityCfg?.label} ({priorityCfg?.sublabel})
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Assigned Department</p>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Emergency Department
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Status</p>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: '#F59E0B',
                          border: '1px solid rgba(245,158,11,0.35)',
                        }}
                      >
                        {STATUS_LABEL_BY_STEP[0]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Assigned To</p>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Triage Nurse
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-[12px] bg-white p-4"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <SectionHeader icon={Route} label="Routing Information" color="#00B4D8" />
                  <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
                    Patient will be automatically routed to:
                  </p>
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#EF4444' }}>
                    Emergency Department
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Triage Area</p>
                  <div
                    className="mt-3 flex items-start gap-2.5 rounded-[10px] p-3"
                    style={{
                      border: '1px solid rgba(239,68,68,0.25)',
                      background: 'rgba(239,68,68,0.05)',
                    }}
                  >
                    <Ambulance
                      style={{ width: 18, height: 18, color: '#EF4444' }}
                      className="mt-0.5 shrink-0"
                    />
                    <p style={{ fontSize: 14, color: '#0D2630' }}>
                      ED Team will be notified immediately once patient is registered.
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-[12px] bg-white p-4"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <SectionHeader icon={ListChecks} label="Next Steps" color="#EF4444" />
                  <div className="mt-3 flex flex-col gap-2.5">
                    {NEXT_STEPS.map((step, i) => (
                      <div key={step} className="flex items-center gap-2.5">
                        <span
                          className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
                          style={{
                            fontSize: 14,
                            color: i === 0 ? '#FFFFFF' : '#8A98A3',
                            background: i === 0 ? '#EF4444' : 'rgba(226,237,241,0.6)',
                          }}
                        >
                          {i + 1}
                        </span>
                        <p style={{ fontSize: 14, color: i === 0 ? '#0D2630' : '#4A7080' }}>
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isComplete && (
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Clear Form
              </button>
              <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#EF4444' }}
                >
                  Complete Registration &amp; Route to ED
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </PermissionGate>
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
