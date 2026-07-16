'use client';

import { AlertCircle, Camera, Pencil, RefreshCw, X } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

import { useToast } from '@/hooks/useToast';
import { MOCK_DOCTOR_PROFILE } from '@/features/profile/__mocks__/profileFixtures';
import { EditProfileModal } from '@components/shared/EditProfileModal';
import { UserAvatar } from '@components/shared/UserAvatar';
import { useAuth } from '@hooks/useAuth';
import { useContactDetails } from '@hooks/useContactDetails';
import { getInitials } from '@lib/utils';
import { resizeImageToDataUrl, useAvatar } from '@providers/AvatarProvider';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // pre-resize ceiling — generous since we downscale anyway

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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const toast = useToast();
  const { user } = useAuth();
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const [pageState, setPageState] = useState<PageState>('loading');
  const { contact, setContact } = useContactDetails({
    phone: MOCK_DOCTOR_PROFILE.phone,
    email: user?.email ?? MOCK_DOCTOR_PROFILE.email,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleSave(patch: { phone: string; email: string }) {
    setContact(patch);
    setEditOpen(false);
    toast.success('Profile updated', 'Your contact details have been saved.');
  }

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

  const name = user?.name ?? MOCK_DOCTOR_PROFILE.name;
  const role = user?.role ?? MOCK_DOCTOR_PROFILE.role;
  const department = user?.department ?? MOCK_DOCTOR_PROFILE.department;
  const initials = getInitials(name);

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
                  <div className="relative size-16 shrink-0">
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      disabled={uploading}
                      aria-label={avatarUrl ? 'Change profile photo' : 'Upload profile photo'}
                      className={`group relative block size-16 overflow-hidden rounded-[14px] transition-opacity duration-150 disabled:cursor-wait ${FOCUS_RING}`}
                    >
                      <UserAvatar
                        initials={initials}
                        size={64}
                        radius={14}
                        textSize={22}
                        className="pointer-events-none"
                      />
                      {/* Hover overlay hint */}
                      <span
                        className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/40 group-hover:opacity-100"
                        aria-hidden="true"
                      >
                        <Camera style={{ width: 18, height: 18, color: '#FFFFFF' }} />
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
                    {avatarUrl && !uploading && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        aria-label="Remove profile photo"
                        className={`absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full text-white transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] hover:bg-red-600 ${FOCUS_RING}`}
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
                  <div className="min-w-0">
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 22, lineHeight: '30px', color: '#0D2630' }}
                    >
                      {name}
                    </p>
                    <p
                      className="mt-0.5 font-sans"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#4A7080' }}
                    >
                      {role} · {MOCK_DOCTOR_PROFILE.platform}
                    </p>
                    <p
                      className="mt-0.5 font-sans"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
                    >
                      {MOCK_DOCTOR_PROFILE.licenseNo} · {MOCK_DOCTOR_PROFILE.facility}
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(0,100,130,0.10)' }} />

                {/* Fields */}
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
                  <ProfileField label="Specialization" value={MOCK_DOCTOR_PROFILE.specialization} />
                  <ProfileField
                    label="Medical Council No."
                    value={MOCK_DOCTOR_PROFILE.medicalCouncilNo}
                  />
                  <ProfileField label="Department" value={department} />
                  <ProfileField label="Experience" value={MOCK_DOCTOR_PROFILE.experience} />
                  <ProfileField label="Phone" value={contact.phone} />
                  <ProfileField label="Email" value={contact.email} />
                </div>
              </div>
            )}
          </div>

          <div className="h-6" />
        </div>
      </main>

      {editOpen && (
        <EditProfileModal
          phone={contact.phone}
          email={contact.email}
          onClose={() => setEditOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
