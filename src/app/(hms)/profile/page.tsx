'use client';

import { AlertCircle, Pencil, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  MOCK_DOCTOR_PROFILE,
  type DoctorProfile,
} from '@/features/profile/__mocks__/profileFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

const FIELD_BASE: React.CSSProperties = {
  border: '1px solid #0064821F',
  fontSize: 14,
  lineHeight: '22px',
  color: '#0D2630',
  background: '#FFFFFF',
  height: 44,
  borderRadius: 10,
};

function focusBorder(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#00B4D8';
}
function blurBorder(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#0064821F';
}

// ── Field display ────────────────────────────────────────────────────────────

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-sans" style={{ fontSize: 14, lineHeight: '20px', color: '#8A98A3' }}>
        {label}
      </p>
      <p
        className="mt-0.5 font-sans font-medium"
        style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
      >
        {value}
      </p>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonProfileCard() {
  return (
    <div
      className="overflow-hidden"
      style={{ borderRadius: 12, border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
    >
      <div className="flex items-start gap-4 p-5 sm:p-6">
        <div className="size-16 shrink-0 animate-pulse rounded-[14px] bg-slate-100" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-5 w-48 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(0,100,130,0.10)' }} />
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3.5 w-28 animate-pulse rounded bg-slate-100" />
            <div className="h-4.5 w-40 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Edit Profile modal — contact details only; credentials stay read-only ──

function EditProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: DoctorProfile;
  onClose: () => void;
  onSave: (patch: { phone: string; email: string }) => void;
}) {
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);

  function handleSave() {
    if (!phone.trim() || !email.trim()) return;
    onSave({ phone: phone.trim(), email: email.trim() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-in fade-in-0 zoom-in-95 w-full overflow-hidden bg-white duration-150"
        style={{ maxWidth: 440, borderRadius: 16 }}
      >
        <div
          className="flex items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #0064821F' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Edit Contact Details
            </h2>
            <p
              className="mt-0.5 font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
            >
              Credentials and role are managed by your administrator
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
              className={`w-full px-4 transition-[border-color] duration-150 outline-none ${FOCUS_RING}`}
              style={FIELD_BASE}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
              className={`w-full px-4 transition-[border-color] duration-150 outline-none ${FOCUS_RING}`}
              style={FIELD_BASE}
            />
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #0064821F' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center justify-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-slate-50 ${FOCUS_RING}`}
            style={{
              border: '1px solid rgba(0,100,130,0.20)',
              color: '#0D2630',
              background: '#FFFFFF',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!phone.trim() || !email.trim()}
            className={`flex h-11 items-center justify-center rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            style={{ background: '#00B4D8' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [profile, setProfile] = useState<DoctorProfile>(MOCK_DOCTOR_PROFILE);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleSave(patch: { phone: string; email: string }) {
    setProfile((prev) => ({ ...prev, ...patch }));
    setEditOpen(false);
    toast.success('Profile updated', 'Your contact details have been saved.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              My Profile
            </h1>
            {pageState === 'loaded' && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className={`flex items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  height: 40,
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                <Pencil style={{ width: 15, height: 15, color: '#4A7080' }} />
                Edit Profile
              </button>
            )}
          </div>

          <div className="mt-6">
            {pageState === 'loading' && <SkeletonProfileCard />}

            {pageState === 'error' && (
              <div
                className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-10 text-center"
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
                    height: 40,
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
              <div
                className="overflow-hidden"
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(0,100,130,0.12)',
                  background: '#FFFFFF',
                }}
              >
                {/* Identity */}
                <div className="flex items-start gap-4 p-5 sm:p-6">
                  <div
                    className="flex size-16 shrink-0 items-center justify-center font-sans font-semibold text-white"
                    style={{ borderRadius: 14, background: profile.avatarBg, fontSize: 22 }}
                  >
                    {profile.initials}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 22, lineHeight: '30px', color: '#0D2630' }}
                    >
                      {profile.name}
                    </p>
                    <p
                      className="mt-0.5 font-sans"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#4A7080' }}
                    >
                      {profile.role} · {profile.platform}
                    </p>
                    <p
                      className="mt-0.5 font-sans"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
                    >
                      {profile.licenseNo} · {profile.facility}
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(0,100,130,0.10)' }} />

                {/* Fields */}
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
                  <ProfileField label="Specialization" value={profile.specialization} />
                  <ProfileField label="Medical Council No." value={profile.medicalCouncilNo} />
                  <ProfileField label="Department" value={profile.department} />
                  <ProfileField label="Experience" value={profile.experience} />
                  <ProfileField label="Phone" value={profile.phone} />
                  <ProfileField label="Email" value={profile.email} />
                </div>
              </div>
            )}
          </div>

          <div className="h-6" />
        </div>
      </main>

      {editOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
