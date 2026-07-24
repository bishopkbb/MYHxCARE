'use client';

import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Fingerprint,
  LogIn,
  MapPin,
  Pencil,
  Pill,
  RefreshCw,
  Share2,
  Shield,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { findWorkspaceRoute } from '@/config/workspaces';
import { ROUTES } from '@/constants/routes';
import {
  MOCK_DOCTOR_PROFILE,
  getStaffProfile,
  type RecentActivityItem,
  type StaffProfile,
} from '@/features/profile/__mocks__/profileFixtures';
import { ABOUT_APP_INFO, readStoredPrefs } from '@/features/settings/__mocks__/settingsFixtures';
import { resolveWorkspace, type WorkspaceId } from '@/types/auth.types';
import { formatDate, formatDateTime, formatHumanDate, toRelativeTime } from '@/utils/datetime';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { UserAvatar } from '@components/shared/UserAvatar';
import { useAuth } from '@hooks/useAuth';
import { useContactDetails } from '@hooks/useContactDetails';
import { useToast } from '@hooks/useToast';
import { getInitials } from '@lib/utils';
import { resizeImageToDataUrl, useAvatar } from '@providers/AvatarProvider';

const EditProfileModal = dynamic(
  () => import('@components/shared/EditProfileModal').then((m) => m.EditProfileModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const TABS = [
  'Overview',
  'Personal Information',
  'Professional Information',
  'Change Password',
] as const;
type Tab = (typeof TABS)[number];

type PageState = 'loading' | 'loaded' | 'error';

// Defensive fallback identity for the (practically unreachable, since every
// route here requires an authenticated session) case useAuth() has no user
// yet. Mirrors authFixtures.MOCK_USERS' values for the corresponding role so
// nothing looks invented if it's ever hit mid-render.
const FALLBACK_IDENTITY: Record<
  WorkspaceId,
  { name: string; role: string; department: string; email: string }
> = {
  nursing: {
    name: 'Nurse Chidinma Eze',
    role: 'Staff Nurse',
    department: 'General Ward',
    email: 'chidinma.eze@unizikmedical.edu.ng',
  },
  clinical: {
    name: MOCK_DOCTOR_PROFILE.name,
    role: MOCK_DOCTOR_PROFILE.role,
    department: MOCK_DOCTOR_PROFILE.department,
    email: MOCK_DOCTOR_PROFILE.email,
  },
  registration: {
    name: 'Mrs. Adaobi Nwankwo',
    role: 'Registration Officer',
    department: 'Patient Registration',
    email: 'adaobi.nwankwo@unizikmedical.edu.ng',
  },
  records: {
    name: 'Mrs. Ngozi Asogwa',
    role: 'Medical Records Officer',
    department: 'Medical Records',
    email: 'ngozi.asogwa@unizikmedical.edu.ng',
  },
  'ward-management': {
    name: 'Mrs. Amaka Nwosu',
    role: 'Ward Manager',
    department: 'Female Surgical Ward',
    email: 'amaka.nwosu@unizikmedical.edu.ng',
  },
  pharmacy: {
    name: 'Mr. Emeka Obi',
    role: 'Pharmacist',
    department: 'Pharmacy',
    email: 'emeka.obi@unizikmedical.edu.ng',
  },
  laboratory: {
    name: 'Mrs. Adaora Ugwu',
    role: 'Medical Laboratory Scientist',
    department: 'Haematology Laboratory',
    email: 'adaora.ugwu@unizikmedical.edu.ng',
  },
  finance: {
    name: 'Mr. Ifeanyi Okafor',
    role: 'Billing Officer',
    department: 'Finance Department',
    email: 'ifeanyi.okafor@unizikmedical.edu.ng',
  },
  emergency: {
    name: 'Dr. Chukwuemeka Nwosu',
    role: 'Emergency Physician',
    department: 'Accident & Emergency',
    email: 'chukwuemeka.nwosu@unizikmedical.edu.ng',
  },
  administration: {
    name: 'Mr. Kelechi Obasi',
    role: 'Systems Administrator',
    department: 'ICT Department',
    email: 'kelechi.obasi@unizikmedical.edu.ng',
  },
};

const ACTIVITY_ICON: Record<RecentActivityItem['icon'], LucideIcon> = {
  login: LogIn,
  note: FileText,
  medication: Pill,
  'shift-start': Clock,
  record: FileText,
  checkin: UserCheck,
  referral: Share2,
};

// ── Small building blocks ────────────────────────────────────────────────────

function Card({
  title,
  icon: Icon,
  headerAction,
  children,
}: {
  title: string;
  icon: LucideIcon;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon style={{ width: 17, height: 17, color: '#00B4D8' }} />
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
          >
            {title}
          </h2>
        </div>
        {headerAction}
      </div>
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
    >
      <Pencil style={{ width: 13, height: 13 }} />
      Edit
    </button>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
      <p
        className="mt-0.5 font-sans font-medium break-words"
        style={{ fontSize: 14, color: '#0D2630' }}
      >
        {value || '—'}
      </p>
    </div>
  );
}

function IdentityStat({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon style={{ width: 15, height: 15, color: '#8A98A3' }} />
      <span style={{ fontSize: 14, color: '#4A7080' }}>{value}</span>
    </div>
  );
}

function SkeletonProfile() {
  return (
    <div className="mt-5 flex flex-col gap-4">
      <div
        className="h-[168px] animate-pulse rounded-[12px]"
        style={{ background: 'rgba(0,100,130,0.05)' }}
      />
      <div
        className="h-11 animate-pulse rounded-[10px]"
        style={{ background: 'rgba(0,100,130,0.05)' }}
      />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-[12px]"
          style={{ background: 'rgba(0,100,130,0.05)' }}
        />
      ))}
    </div>
  );
}

function PersonalInfoCard({
  name,
  contact,
  staffProfile,
  onEdit,
}: {
  name: string;
  contact: { phone: string; email: string };
  staffProfile: StaffProfile;
  onEdit: () => void;
}) {
  return (
    <Card
      title="Personal Information"
      icon={UserCheck}
      headerAction={<EditButton onClick={onEdit} />}
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Full Name" value={name} />
        <Field label="Date of Birth" value={formatHumanDate(staffProfile.personal.dobIso)} />
        <Field label="Gender" value={staffProfile.personal.gender} />
        <Field label="Phone" value={contact.phone} />
        <Field label="Email" value={contact.email} />
        <Field label="Residential Address" value={staffProfile.personal.address} />
        <Field label="Emergency Contact" value={staffProfile.personal.emergencyContact} />
        <Field label="Blood Group" value={staffProfile.personal.bloodGroup} />
        <Field label="Marital Status" value={staffProfile.personal.maritalStatus} />
      </div>
    </Card>
  );
}

function ProfessionalInfoCard({
  role,
  department,
  staffProfile,
  onEdit,
}: {
  role: string;
  department: string;
  staffProfile: StaffProfile;
  onEdit: () => void;
}) {
  return (
    <Card
      title="Professional Information"
      icon={Stethoscope}
      headerAction={<EditButton onClick={onEdit} />}
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Staff ID" value={staffProfile.staffId} />
        <Field label="Role" value={role} />
        <Field label="Department" value={department} />
        <Field
          label={staffProfile.professional.unitLabel}
          value={staffProfile.professional.unitValue}
        />
        <Field
          label={staffProfile.professional.subUnitLabel}
          value={staffProfile.professional.subUnitValue}
        />
        <Field label="Qualification" value={staffProfile.professional.qualification} />
        <Field
          label={staffProfile.professional.licenseLabel}
          value={staffProfile.professional.licenseValue}
        />
        <Field label="Date of Joining" value={formatDate(staffProfile.dateJoinedIso)} />
        <Field label="Employment Type" value={staffProfile.employmentType} />
        <Field label="Years of Experience" value={staffProfile.professional.yearsOfExperience} />
      </div>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function ProfileWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [uploading, setUploading] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const prefs = readStoredPrefs();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const workspaceId: WorkspaceId = user ? resolveWorkspace(user.workspaceRole) : 'clinical';
  const fallback = FALLBACK_IDENTITY[workspaceId];
  const staffProfile = getStaffProfile(
    workspaceId,
    user?.role ?? fallback.role,
    user?.department ?? fallback.department,
  );

  const name = user?.name ?? fallback.name;
  const role = user?.role ?? fallback.role;
  const department = user?.department ?? fallback.department;
  const initials = getInitials(name);

  const { contact, setContact } = useContactDetails({
    phone: staffProfile.phone,
    email: user?.email ?? fallback.email,
  });

  const scheduleHref = staffProfile.scheduleNavLabel
    ? (findWorkspaceRoute(workspaceId, staffProfile.scheduleNavLabel) ?? ROUTES.mySchedule)
    : null;

  function handleAvatarClick() {
    avatarInputRef.current?.click();
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please choose an image file (JPG, PNG, etc.).');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Image too large', 'Please choose an image under 5MB.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setAvatarUrl(dataUrl);
      toast.success('Profile photo updated', 'Your new photo now shows across MyHxCare.');
    } catch {
      toast.error('Upload failed', 'Could not read that image. Please try another file.');
    } finally {
      setUploading(false);
    }
  }

  function handleRemovePhoto(e: React.MouseEvent) {
    e.stopPropagation();
    setAvatarUrl(null);
    toast.info('Photo removed', 'Your profile now shows your initials again.');
  }

  function handleContactSave(patch: { phone: string; email: string }) {
    setContact(patch);
    setEditContactOpen(false);
    toast.success('Profile updated', 'Your contact details have been saved.');
  }

  function notImplemented(action: string) {
    toast.info(action, 'This action will be wired up once the endpoint is ready.');
  }

  function handlePasswordSubmit() {
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('Please fill in every field.');
      return;
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setPwError(null);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    toast.success('Password updated', 'Your login password has been changed.');
  }

  const username = contact.email.split('@')[0] ?? contact.email;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                My Profile
              </h1>
              <p className="mt-0.5 font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                Your identity and credentials across MyHxCare
              </p>
            </div>
          </div>

          {pageState === 'loading' && <SkeletonProfile />}

          {pageState === 'error' && (
            <div
              className="mt-5 flex min-h-[280px] flex-col items-center justify-center gap-3 py-10 text-center"
              style={{
                borderRadius: 12,
                border: '1px solid rgba(0,100,130,0.12)',
                background: '#FFFFFF',
              }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load profile
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className={`flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                style={{
                  height: 44,
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
          )}

          {pageState === 'loaded' && (
            <>
              {/* ── Identity + Today's Schedule ─────────────────────────────── */}
              <div
                className={`mt-5 grid grid-cols-1 gap-4 ${staffProfile.todaySchedule ? 'lg:grid-cols-[2fr_1fr]' : ''}`}
              >
                <div
                  className="flex flex-col gap-4 rounded-[12px] p-4 sm:flex-row sm:items-center sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="relative size-20 shrink-0">
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      disabled={uploading}
                      aria-label={avatarUrl ? 'Change profile photo' : 'Upload profile photo'}
                      className={`group relative block size-20 overflow-hidden rounded-full transition-opacity duration-150 disabled:cursor-wait ${FOCUS_RING}`}
                    >
                      <UserAvatar
                        initials={initials}
                        size={80}
                        textSize={26}
                        className="pointer-events-none"
                      />
                      <span
                        className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/40 group-hover:opacity-100"
                        aria-hidden="true"
                      >
                        <Camera style={{ width: 20, height: 20, color: '#FFFFFF' }} />
                      </span>
                      {uploading && (
                        <span
                          className="absolute inset-0 flex items-center justify-center bg-black/40"
                          aria-hidden="true"
                        >
                          <span
                            className="size-5 animate-spin rounded-full border-2 border-white/30"
                            style={{ borderTopColor: '#FFFFFF' }}
                          />
                        </span>
                      )}
                    </button>
                    <span
                      className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full"
                      style={{ background: '#22C55E', border: '2px solid #FFFFFF' }}
                      aria-hidden="true"
                    />
                    {avatarUrl && !uploading && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        aria-label="Remove profile photo"
                        className={`absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full text-white transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] hover:bg-red-600 ${FOCUS_RING}`}
                        style={{ background: '#EF4444', border: '2px solid #FFFFFF' }}
                      >
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 22, lineHeight: '30px', color: '#0D2630' }}
                      >
                        {name}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: '#22C55E',
                          border: '1px solid rgba(34,197,94,0.4)',
                        }}
                      >
                        Active
                      </span>
                      <span
                        className="flex items-center gap-1.5"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        <span className="size-2 rounded-full" style={{ background: '#22C55E' }} />
                        Online
                      </span>
                    </div>
                    <p className="mt-0.5 font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                      {staffProfile.staffId} · {role}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <IdentityStat icon={Building2} value={department} />
                      <IdentityStat icon={Briefcase} value={staffProfile.employmentType} />
                      <IdentityStat
                        icon={Calendar}
                        value={`Joined ${formatDate(staffProfile.dateJoinedIso)}`}
                      />
                      <IdentityStat icon={CheckCircle2} value={staffProfile.onDutyStatus} />
                    </div>
                  </div>
                </div>

                {staffProfile.todaySchedule && (
                  <div
                    className="flex flex-col rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      My Schedule (Today)
                    </h2>
                    <p
                      className="font-display mt-2.5 font-semibold"
                      style={{ fontSize: 18, color: '#00B4D8' }}
                    >
                      {staffProfile.todaySchedule.shiftLabel}
                    </p>
                    <p className="font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                      {staffProfile.todaySchedule.timeRange}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <MapPin style={{ width: 15, height: 15, color: '#8A98A3' }} />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>
                        {staffProfile.todaySchedule.locationLabel}:{' '}
                        {staffProfile.todaySchedule.locationValue}
                      </span>
                    </div>
                    {scheduleHref && (
                      <button
                        type="button"
                        onClick={() => router.push(scheduleHref)}
                        className={`mt-3.5 flex h-11 items-center justify-center rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          border: '1px solid rgba(0,100,130,0.2)',
                          color: '#0D2630',
                          fontSize: 14,
                        }}
                      >
                        View My Schedule
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Tabs ────────────────────────────────────────────────────── */}
              <div className="mt-4 overflow-x-auto scroll-smooth">
                <div
                  className="flex gap-1"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className="shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: activeTab === tab ? '#00B4D8' : '#4A7080',
                        borderBottom:
                          activeTab === tab ? '2px solid #00B4D8' : '2px solid transparent',
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Tab content ─────────────────────────────────────────────── */}
              <div className="mt-5">
                {activeTab === 'Overview' && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <PersonalInfoCard
                      name={name}
                      contact={contact}
                      staffProfile={staffProfile}
                      onEdit={() => setEditContactOpen(true)}
                    />
                    <ProfessionalInfoCard
                      role={role}
                      department={department}
                      staffProfile={staffProfile}
                      onEdit={() => notImplemented('Edit Professional Information')}
                    />

                    <Card title="Work Information" icon={Clock}>
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <Field label="Current Shift" value={staffProfile.work.currentShiftLabel} />
                        <Field label="Next Shift" value={staffProfile.work.nextShiftLabel} />
                        <Field
                          label="Reporting Location"
                          value={staffProfile.work.reportingLocation}
                        />
                        <Field label="Supervisor" value={staffProfile.work.supervisor} />
                        <Field label="Days Off" value={staffProfile.work.daysOff} />
                        <Field label="Leave Balance" value={staffProfile.work.leaveBalance} />
                      </div>
                      {scheduleHref && (
                        <button
                          type="button"
                          onClick={() => router.push(scheduleHref)}
                          className={`mt-4 flex h-11 items-center justify-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{
                            border: '1px solid rgba(0,100,130,0.2)',
                            color: '#0D2630',
                            fontSize: 14,
                          }}
                        >
                          View My Schedule
                        </button>
                      )}
                    </Card>

                    <Card title="Account Information" icon={Fingerprint}>
                      <div className="flex flex-col">
                        <div
                          className="flex items-center justify-between gap-3 py-2.5"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>Username</span>
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {username}
                          </span>
                        </div>
                        <div
                          className="flex items-center justify-between gap-3 py-2.5"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>Password</span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('Change Password')}
                            className={`font-sans font-semibold transition-opacity duration-150 hover:opacity-75 ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            •••••••••• · Change Password
                          </button>
                        </div>
                        <div
                          className="flex items-center justify-between gap-3 py-2.5"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>
                            Two-Factor Authentication
                          </span>
                          <span
                            className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={
                              prefs.twoFactorEnabled
                                ? {
                                    fontSize: 14,
                                    color: '#22C55E',
                                    border: '1px solid rgba(34,197,94,0.4)',
                                  }
                                : {
                                    fontSize: 14,
                                    color: '#8A98A3',
                                    border: '1px solid rgba(0,100,130,0.2)',
                                  }
                            }
                          >
                            <ShieldCheck style={{ width: 14, height: 14 }} />
                            {prefs.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div
                          className="flex items-center justify-between gap-3 py-2.5"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>Last Login</span>
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {toRelativeTime(staffProfile.lastLoginIso)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-2.5">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>Account Status</span>
                          <span
                            className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: '#22C55E',
                              border: '1px solid rgba(34,197,94,0.4)',
                            }}
                          >
                            Active
                          </span>
                        </div>
                      </div>
                    </Card>

                    <div className="lg:col-span-2">
                      <Card
                        title="Recent Activity"
                        icon={Shield}
                        headerAction={
                          <button
                            type="button"
                            onClick={() => router.push(ROUTES.settingsAuditLog)}
                            className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            View All Activity
                          </button>
                        }
                      >
                        {staffProfile.recentActivity.length === 0 ? (
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>No recent activity yet.</p>
                        ) : (
                          <div className="flex flex-col">
                            {staffProfile.recentActivity.map((item, i) => {
                              const Icon = ACTIVITY_ICON[item.icon];
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-3 py-2.5"
                                  style={
                                    i < staffProfile.recentActivity.length - 1
                                      ? { borderBottom: '1px solid rgba(0,100,130,0.08)' }
                                      : undefined
                                  }
                                >
                                  <div
                                    className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                                    style={{ background: 'rgba(0,180,216,0.1)' }}
                                  >
                                    <Icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className="font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {item.title}
                                    </p>
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {formatDateTime(item.timestampIso)} · {item.category}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                )}

                {activeTab === 'Personal Information' && (
                  <PersonalInfoCard
                    name={name}
                    contact={contact}
                    staffProfile={staffProfile}
                    onEdit={() => setEditContactOpen(true)}
                  />
                )}
                {activeTab === 'Professional Information' && (
                  <ProfessionalInfoCard
                    role={role}
                    department={department}
                    staffProfile={staffProfile}
                    onEdit={() => notImplemented('Edit Professional Information')}
                  />
                )}

                {activeTab === 'Change Password' && (
                  <div
                    className="max-w-[440px] rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Shield style={{ width: 17, height: 17, color: '#00B4D8' }} />
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Change Password
                      </h2>
                    </div>
                    <div className="mt-4 flex flex-col gap-4">
                      {(
                        [
                          ['Current Password', currentPw, setCurrentPw],
                          ['New Password', newPw, setNewPw],
                          ['Confirm New Password', confirmPw, setConfirmPw],
                        ] as const
                      ).map(([label, value, setValue]) => (
                        <div key={label}>
                          <label
                            className="mb-1.5 block font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {label}
                          </label>
                          <input
                            type="password"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#00B4D8';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '#0064821F';
                            }}
                            className={`w-full px-4 transition-[border-color] duration-150 outline-none ${FOCUS_RING}`}
                            style={{
                              border: '1px solid #0064821F',
                              fontSize: 14,
                              color: '#0D2630',
                              background: '#FFFFFF',
                              height: 44,
                              borderRadius: 10,
                            }}
                          />
                        </div>
                      ))}
                      {pwError && (
                        <p className="font-sans" style={{ fontSize: 14, color: '#EF4444' }}>
                          {pwError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handlePasswordSubmit}
                        className={`flex h-11 items-center justify-center rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ background: '#00B4D8', fontSize: 14 }}
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-6" style={{ fontSize: 14, color: '#8A98A3' }}>
                {ABOUT_APP_INFO.institution} · {ABOUT_APP_INFO.version}
              </p>
              <div className="h-6" />
            </>
          )}
        </div>
      </main>

      {editContactOpen && (
        <EditProfileModal
          phone={contact.phone}
          email={contact.email}
          onClose={() => setEditContactOpen(false)}
          onSave={handleContactSave}
        />
      )}
    </div>
  );
}
