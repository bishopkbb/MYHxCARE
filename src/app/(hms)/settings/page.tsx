'use client';

import { Check, CheckCircle2, ChevronRight, Shield, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { MOCK_DOCTOR_PROFILE } from '@/features/profile/__mocks__/profileFixtures';
import {
  ABOUT_APP_INFO,
  DISPLAY_PREF_DEFS,
  NOTIFICATION_PREF_DEFS,
  ROLE_PERMISSION_ITEMS,
  buildDefaultPrefs,
  type SettingsPrefs,
} from '@/features/settings/__mocks__/settingsFixtures';
import { formatDate } from '@/utils/datetime';
import { EditProfileModal } from '@components/shared/EditProfileModal';
import { UserAvatar } from '@components/shared/UserAvatar';
import { useAuth } from '@hooks/useAuth';
import { useContactDetails } from '@hooks/useContactDetails';
import { getInitials } from '@lib/utils';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PREFS_STORAGE_KEY = 'myhxcare:settingsPrefs';

function readStoredPrefs(): SettingsPrefs {
  if (typeof window === 'undefined') return buildDefaultPrefs();
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return buildDefaultPrefs();
    return { ...buildDefaultPrefs(), ...(JSON.parse(raw) as Partial<SettingsPrefs>) };
  } catch {
    return buildDefaultPrefs();
  }
}

// ── Toggle — exact spec: 65×34 track, 30×30 knob, #00B4D8 / #D1D5DB ─────────
// The visual track stays pinned to spec size; the button itself is 44px tall
// so the hit area still clears the touch-target floor without inflating the
// switch's appearance (the "small-visual/full-hit-area" pattern).

function Toggle({
  on,
  onToggle,
  ariaLabel,
}: {
  on: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`relative flex shrink-0 items-center justify-center ${FOCUS_RING}`}
      style={{ width: 65, height: 44, border: 'none', background: 'transparent', padding: 0 }}
    >
      <span
        className="absolute transition-colors duration-200"
        style={{
          width: 65,
          height: 34,
          borderRadius: 9999,
          background: on ? '#00B4D8' : '#D1D5DB',
        }}
      />
      <span
        className="absolute transition-[left] duration-200"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: '#FFFFFF',
          top: '50%',
          marginTop: -15,
          left: on ? 65 - 30 - 3 : 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

// ── Section chrome ───────────────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <div
        className="px-4 py-4 sm:px-5"
        style={{
          borderRadius: '12px 12px 0 0',
          border: '1px solid rgba(0,100,130,0.12)',
          borderBottom: 'none',
          background: 'rgba(226,237,241,0.4)',
        }}
      >
        <p
          className="font-display font-semibold"
          style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
        >
          {title}
        </p>
      </div>
      <div
        className="overflow-hidden"
        style={{
          borderRadius: '0 0 12px 12px',
          border: '1px solid rgba(0,100,130,0.12)',
          background: '#FFFFFF',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid rgba(0,100,130,0.10)' }} />;
}

// ── Preference row (Notification & Display sections share this) ────────────

function PreferenceRow({
  icon: Icon,
  label,
  description,
  on,
  onToggle,
}: {
  icon?: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  description: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      {Icon && (
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: 'rgba(226,237,241,0.6)' }}
        >
          <Icon style={{ width: 18, height: 18, color: '#4A7080' }} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className="font-sans font-semibold"
          style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
        >
          {label}
        </p>
        <p
          className="mt-0.5 font-sans"
          style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
        >
          {description}
        </p>
      </div>
      <Toggle on={on} onToggle={onToggle} ariaLabel={label} />
    </div>
  );
}

// ── Security action row ──────────────────────────────────────────────────────

function SecurityActionRow({
  label,
  description,
  actionLabel,
  onAction,
}: {
  label: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p
          className="font-sans font-semibold"
          style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
        >
          {label}
        </p>
        <p
          className="mt-0.5 font-sans"
          style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
        >
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className={`flex h-11 shrink-0 items-center gap-1 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-slate-50 ${FOCUS_RING}`}
        style={{ border: '1px solid rgba(0,100,130,0.20)', color: '#0D2630', fontSize: 14 }}
      >
        {actionLabel}
        <ChevronRight style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
    </div>
  );
}

// ── Field row (Account Information) ──────────────────────────────────────────

function AccountFieldRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="font-sans" style={{ fontSize: 14, lineHeight: '20px', color: '#8A98A3' }}>
          {label}
        </p>
        <p
          className="mt-0.5 truncate font-sans font-medium"
          style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
        >
          {value}
        </p>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`shrink-0 font-sans font-semibold transition-opacity duration-150 hover:opacity-75 ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#00B4D8' }}
        >
          Edit
        </button>
      )}
    </div>
  );
}

// ── Change Password modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!current || !next || !confirm) {
      setError('Please fill in every field.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setError(null);
    onSaved();
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid #0064821F',
    fontSize: 14,
    lineHeight: '22px',
    color: '#0D2630',
    background: '#FFFFFF',
    height: 44,
    borderRadius: 10,
  };

  const rows: { label: string; value: string; setValue: (v: string) => void }[] = [
    { label: 'Current Password', value: current, setValue: setCurrent },
    { label: 'New Password', value: next, setValue: setNext },
    { label: 'Confirm New Password', value: confirm, setValue: setConfirm },
  ];

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
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Change Password
          </h2>
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
          {rows.map((row) => (
            <div key={row.label}>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {row.label}
              </label>
              <input
                type="password"
                value={row.value}
                onChange={(e) => row.setValue(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#00B4D8';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#0064821F';
                }}
                className={`w-full px-4 transition-[border-color] duration-150 outline-none ${FOCUS_RING}`}
                style={inputStyle}
              />
            </div>
          ))}
          {error && (
            <p className="font-sans" style={{ fontSize: 14, color: '#EF4444' }}>
              {error}
            </p>
          )}
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
            onClick={handleSubmit}
            className={`flex h-11 items-center justify-center rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ background: '#00B4D8' }}
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Two-Factor Authentication modal ──────────────────────────────────────────

function TwoFactorModal({ onClose, onEnabled }: { onClose: () => void; onEnabled: () => void }) {
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
        style={{ maxWidth: 420, borderRadius: 16 }}
      >
        <div
          className="flex items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #0064821F' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Enable Two-Factor Authentication
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-6 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(0,180,216,0.10)' }}
          >
            <Shield style={{ width: 26, height: 26, color: '#00B4D8' }} />
          </div>
          <p className="font-sans" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            You&apos;ll be asked for a one-time code from your authenticator app every time you sign
            in from a new device. This adds a second layer of protection to your account.
          </p>
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
            Not Now
          </button>
          <button
            type="button"
            onClick={onEnabled}
            className={`flex h-11 items-center justify-center rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ background: '#00B4D8' }}
          >
            Enable
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { contact, setContact } = useContactDetails({
    phone: MOCK_DOCTOR_PROFILE.phone,
    email: user?.email ?? MOCK_DOCTOR_PROFILE.email,
  });
  const [prefs, setPrefs] = useState<SettingsPrefs>(readStoredPrefs);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);

  const name = user?.name ?? MOCK_DOCTOR_PROFILE.name;
  const role = user?.role ?? MOCK_DOCTOR_PROFILE.role;
  const initials = getInitials(name);
  const userPermissions = user?.permissions ?? [];

  const permitted = ROLE_PERMISSION_ITEMS.filter((item) =>
    userPermissions.includes(item.permission),
  );
  const notPermitted = ROLE_PERMISSION_ITEMS.filter(
    (item) => !userPermissions.includes(item.permission),
  );

  function handleSaveChanges() {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Best-effort persistence only — in-memory state already reflects it.
    }
    toast.success('Settings saved', 'Your preferences have been updated.');
  }

  function toggleNotification(key: keyof SettingsPrefs['notifications']) {
    setPrefs((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  }

  function toggleDisplay(key: keyof SettingsPrefs['display']) {
    setPrefs((prev) => ({ ...prev, display: { ...prev.display, [key]: !prev.display[key] } }));
  }

  function handleContactSave(patch: { phone: string; email: string }) {
    setContact(patch);
    setEditContactOpen(false);
    toast.success('Contact details updated', 'Your changes have been saved.');
  }

  function handlePasswordSaved() {
    setPasswordModalOpen(false);
    toast.success('Password updated', 'Your login password has been changed.');
  }

  function handleTwoFactorEnabled() {
    setPrefs((prev) => ({ ...prev, twoFactorEnabled: true }));
    setTwoFactorModalOpen(false);
    toast.success(
      'Two-factor authentication enabled',
      'Your account now has an extra layer of protection.',
    );
  }

  function handleTwoFactorDisable() {
    setPrefs((prev) => ({ ...prev, twoFactorEnabled: false }));
    toast.info('Two-factor authentication disabled', 'You can re-enable it at any time.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Settings
              </h1>
              <p
                className="mt-0.5 font-sans"
                style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
              >
                Manage your account settings, preferences, and security
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveChanges}
              className={`flex items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ height: 44, background: '#00B4D8', fontSize: 14 }}
            >
              <Check style={{ width: 16, height: 16 }} />
              Save Changes
            </button>
          </div>

          {/* ── Account Information ────────────────────────────────────────── */}
          <SettingsSection title="Account Information">
            <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-start gap-4">
                <UserAvatar initials={initials} size={64} radius={14} textSize={22} />
                <div className="min-w-0">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                  >
                    {name}
                  </p>
                  <p
                    className="mt-0.5 font-sans"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    {role} · {MOCK_DOCTOR_PROFILE.medicalCouncilNo}
                  </p>
                  <p
                    className="mt-0.5 font-sans"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
                  >
                    {MOCK_DOCTOR_PROFILE.department} · {MOCK_DOCTOR_PROFILE.facility}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.profile)}
                className={`flex h-11 shrink-0 items-center justify-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-slate-50 ${FOCUS_RING}`}
                style={{ border: '1px solid rgba(0,100,130,0.20)', color: '#0D2630', fontSize: 14 }}
              >
                Edit Profile
              </button>
            </div>
            <Divider />
            <AccountFieldRow
              label="Email Address"
              value={contact.email}
              onEdit={() => setEditContactOpen(true)}
            />
            <Divider />
            <AccountFieldRow
              label="Phone Number"
              value={contact.phone}
              onEdit={() => setEditContactOpen(true)}
            />
            <Divider />
            <AccountFieldRow
              label="Medical Council No."
              value={MOCK_DOCTOR_PROFILE.medicalCouncilNo}
            />
            <Divider />
            <AccountFieldRow label="Specialization" value={MOCK_DOCTOR_PROFILE.specialization} />
          </SettingsSection>

          {/* ── Notification Preferences ──────────────────────────────────── */}
          <SettingsSection title="Notification Preferences">
            {NOTIFICATION_PREF_DEFS.map((def, i) => (
              <div key={def.key}>
                {i > 0 && <Divider />}
                <PreferenceRow
                  icon={def.icon}
                  label={def.label}
                  description={def.description}
                  on={prefs.notifications[def.key]}
                  onToggle={() => toggleNotification(def.key)}
                />
              </div>
            ))}
          </SettingsSection>

          {/* ── Display & Clinical Preferences ────────────────────────────── */}
          <SettingsSection title="Display & Clinical Preferences">
            {DISPLAY_PREF_DEFS.map((def, i) => (
              <div key={def.key}>
                {i > 0 && <Divider />}
                <PreferenceRow
                  label={def.label}
                  description={def.description}
                  on={prefs.display[def.key]}
                  onToggle={() => toggleDisplay(def.key)}
                />
              </div>
            ))}
          </SettingsSection>

          {/* ── Security & Access ──────────────────────────────────────────── */}
          <SettingsSection title="Security & Access">
            <SecurityActionRow
              label="Change Password"
              description="Update your HMS login password"
              actionLabel="Change"
              onAction={() => setPasswordModalOpen(true)}
            />
            <Divider />
            <SecurityActionRow
              label="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
              actionLabel={prefs.twoFactorEnabled ? 'Disable' : 'Enable'}
              onAction={() =>
                prefs.twoFactorEnabled ? handleTwoFactorDisable() : setTwoFactorModalOpen(true)
              }
            />
            <Divider />
            <SecurityActionRow
              label="Active Sessions"
              description="View and manage devices where you're currently signed in"
              actionLabel="Manage"
              onAction={() => router.push(ROUTES.settingsSessions)}
            />
            <Divider />
            <SecurityActionRow
              label="Clinical Audit Log"
              description="View your complete clinical activity audit trail"
              actionLabel="View Log"
              onAction={() => router.push(ROUTES.settingsAuditLog)}
            />
          </SettingsSection>

          {/* ── Role Permissions (Read-only) ──────────────────────────────── */}
          <SettingsSection title="Role Permissions (Read-only)">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <p
                  className="font-sans font-bold tracking-wider uppercase"
                  style={{ fontSize: 14, color: '#16A34A' }}
                >
                  Permitted
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {permitted.map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <CheckCircle2
                        style={{ width: 17, height: 17, color: '#22C55E', flexShrink: 0 }}
                      />
                      <span className="font-sans" style={{ fontSize: 14, color: '#25464D' }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                  {permitted.length === 0 && (
                    <p className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                      No permissions granted yet.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p
                  className="font-sans font-bold tracking-wider uppercase"
                  style={{ fontSize: 14, color: '#DC2626' }}
                >
                  Not Permitted
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {notPermitted.map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <X style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }} />
                      <span className="font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                  {notPermitted.length === 0 && (
                    <p className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Every listed capability is permitted for your role.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* ── About MyHxCare HMS ─────────────────────────────────────────── */}
          <SettingsSection title="About MyHxCare HMS">
            {(
              [
                ['Version', ABOUT_APP_INFO.version],
                ['Platform', ABOUT_APP_INFO.platform],
                ['Institution', ABOUT_APP_INFO.institution],
                ['Support Email', ABOUT_APP_INFO.supportEmail],
                ['Last Updated', formatDate(ABOUT_APP_INFO.lastUpdated)],
              ] as const
            ).map(([label, value], i) => (
              <div key={label}>
                {i > 0 && <Divider />}
                <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <span className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                    {label}
                  </span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {value}
                  </span>
                </div>
              </div>
            ))}
          </SettingsSection>

          <div className="h-6" />
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
      {passwordModalOpen && (
        <ChangePasswordModal
          onClose={() => setPasswordModalOpen(false)}
          onSaved={handlePasswordSaved}
        />
      )}
      {twoFactorModalOpen && (
        <TwoFactorModal
          onClose={() => setTwoFactorModalOpen(false)}
          onEnabled={handleTwoFactorEnabled}
        />
      )}
    </div>
  );
}
