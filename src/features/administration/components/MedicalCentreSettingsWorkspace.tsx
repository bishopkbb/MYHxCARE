'use client';

import {
  Archive,
  Bell,
  Building2,
  Clock,
  Download,
  FileText,
  Globe,
  Image as ImageIcon,
  Info,
  MapPin,
  Palette,
  Phone,
  Receipt,
  Save,
  Settings as SettingsIcon,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormTextarea } from '@components/shared/FormTextarea';
import { PreferenceToggle } from '@components/shared/PreferenceToggle';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV } from '@/utils/export';
import { formatDateTime, formatHumanDate } from '@/utils/datetime';
import { resizeImageToDataUrl } from '@providers/AvatarProvider';
import {
  CENTRE_TYPE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  TIMEZONE_OPTIONS,
  type MedicalCentreSettings,
} from '@/features/administration/__mocks__/medicalCentreSettingsFixtures';
import {
  updateMedicalCentreSettings,
  useMedicalCentreSettings,
} from '@/features/administration/store/medicalCentreSettingsStore';
import { useDepartments } from '@/features/administration/store/departmentsStore';
import { useServices } from '@/features/administration/store/servicePricingStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type SectionKey =
  | 'general'
  | 'branding'
  | 'contact'
  | 'address'
  | 'hours'
  | 'departments'
  | 'services'
  | 'notifications'
  | 'documents'
  | 'receipts'
  | 'system'
  | 'backup';

const SECTIONS: { key: SectionKey; label: string; icon: typeof Building2 }[] = [
  { key: 'general', label: 'General Information', icon: Building2 },
  { key: 'branding', label: 'Logo & Branding', icon: ImageIcon },
  { key: 'contact', label: 'Contact Information', icon: Phone },
  { key: 'address', label: 'Address', icon: MapPin },
  { key: 'hours', label: 'Operating Hours', icon: Clock },
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'services', label: 'Service Configuration', icon: Tag },
  { key: 'notifications', label: 'Notification Preferences', icon: Bell },
  { key: 'documents', label: 'Document Settings', icon: FileText },
  { key: 'receipts', label: 'Receipt Settings', icon: Receipt },
  { key: 'system', label: 'System Preferences', icon: SettingsIcon },
  { key: 'backup', label: 'Backup & Data', icon: Archive },
];

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
        {title}
      </p>
      {hint && (
        <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
          {hint}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
      {value.length} / {max}
    </p>
  );
}

function ColorSwatchInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  return (
    <FormField label={label} htmlFor={id}>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          aria-label={`Choose ${label}`}
          className={`size-11 shrink-0 rounded-[10px] ${FOCUS_RING}`}
          style={{ background: value, border: '1px solid rgba(0,100,130,0.2)' }}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="sr-only"
        />
        <FormInput id={id} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} />
      </div>
    </FormField>
  );
}

export function MedicalCentreSettingsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const stored = useMedicalCentreSettings();
  const departments = useDepartments();
  const services = useServices();

  const [activeSection, setActiveSection] = useState<SectionKey>('general');
  const [draft, setDraft] = useState<MedicalCentreSettings>(stored);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function patch(partial: Partial<MedicalCentreSettings>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function handleSave() {
    if (!draft.name.trim() || !draft.shortName.trim()) {
      toast.error('Required', 'Medical Centre Name and Short Name are required.');
      return;
    }
    updateMedicalCentreSettings(draft);
    toast.success('Settings saved', 'Medical centre settings have been updated.');
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please choose an image file.');
      return;
    }
    const dataUrl = await resizeImageToDataUrl(file, 200, 0.9, 300_000);
    patch({ logoDataUrl: dataUrl });
    toast.success('Logo updated', 'Preview updated. Save Changes to keep it.');
  }

  function handleExportSettings() {
    const rows: string[][] = [
      ['Field', 'Value'],
      ...Object.entries(draft)
        .filter(([key]) => key !== 'logoDataUrl' && key !== 'coreValues')
        .map(([key, value]) => [key, String(value)]),
      ['coreValues', draft.coreValues.join('; ')],
    ];
    downloadCSV('medical-centre-settings', rows);
    toast.success('Export ready', 'Settings exported as CSV.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.admin)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Home
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span style={{ color: '#4A7080' }}>Configuration</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Medical Centre Settings
            </span>
          </div>

          {/* Header */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Medical Centre Settings
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Configure your medical centre information and preferences.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Save style={{ width: 15, height: 15 }} />
              Save Changes
            </button>
          </div>

          {/* Three-column layout */}
          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
            {/* Left section nav */}
            <div
              className="flex w-full shrink-0 flex-col gap-1 rounded-[12px] p-2 xl:w-[220px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {SECTIONS.map((s) => {
                const active = activeSection === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setActiveSection(s.key)}
                    className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      background: active ? '#E6F8FD' : 'transparent',
                      border: active ? '1px solid #00B4D8' : '1px solid transparent',
                    }}
                  >
                    <s.icon
                      style={{
                        width: 16,
                        height: 16,
                        color: active ? '#00B4D8' : '#8A98A3',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: active ? '#00B4D8' : '#0D2630' }}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Center form */}
            <div
              className="min-w-0 flex-1 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {activeSection === 'general' && (
                <SectionCard
                  title="General Information"
                  hint="Basic information about your medical centre."
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Medical Centre Name" htmlFor="mc-name" required>
                      <FormInput
                        id="mc-name"
                        value={draft.name}
                        onChange={(e) => patch({ name: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Short Name" htmlFor="mc-short-name" required>
                      <FormInput
                        id="mc-short-name"
                        value={draft.shortName}
                        onChange={(e) => patch({ shortName: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Medical Centre Type" htmlFor="mc-type">
                      <FormSelect
                        id="mc-type"
                        value={draft.centreType}
                        onChange={(v) => patch({ centreType: v })}
                        options={CENTRE_TYPE_OPTIONS}
                        placeholder="Select type"
                      />
                    </FormField>
                    <FormField label="Registration Number" htmlFor="mc-reg-number">
                      <FormInput
                        id="mc-reg-number"
                        value={draft.registrationNumber}
                        onChange={(e) => patch({ registrationNumber: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="TIN" htmlFor="mc-tin">
                      <FormInput
                        id="mc-tin"
                        value={draft.tin}
                        onChange={(e) => patch({ tin: e.target.value })}
                      />
                    </FormField>
                    <FormField label="RC Number" htmlFor="mc-rc-number">
                      <FormInput
                        id="mc-rc-number"
                        value={draft.rcNumber}
                        onChange={(e) => patch({ rcNumber: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Tagline / Motto" htmlFor="mc-tagline">
                      <FormInput
                        id="mc-tagline"
                        value={draft.tagline}
                        onChange={(e) => patch({ tagline: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Established Date" htmlFor="mc-established">
                      <FormDateInput
                        id="mc-established"
                        value={draft.establishedDate}
                        onChange={(e) => patch({ establishedDate: e.target.value })}
                      />
                    </FormField>
                  </div>

                  <div>
                    <FormField
                      label="About Medical Centre"
                      htmlFor="mc-about"
                      hint="A brief description about your medical centre."
                    >
                      <FormTextarea
                        id="mc-about"
                        rows={4}
                        maxLength={500}
                        value={draft.about}
                        onChange={(e) => patch({ about: e.target.value })}
                      />
                    </FormField>
                    <Counter value={draft.about} max={500} />
                  </div>

                  <div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Vision, Mission &amp; Values
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <FormField label="Vision" htmlFor="mc-vision">
                          <FormTextarea
                            id="mc-vision"
                            rows={5}
                            maxLength={200}
                            value={draft.vision}
                            onChange={(e) => patch({ vision: e.target.value })}
                          />
                        </FormField>
                        <Counter value={draft.vision} max={200} />
                      </div>
                      <div>
                        <FormField label="Mission" htmlFor="mc-mission">
                          <FormTextarea
                            id="mc-mission"
                            rows={5}
                            maxLength={200}
                            value={draft.mission}
                            onChange={(e) => patch({ mission: e.target.value })}
                          />
                        </FormField>
                        <Counter value={draft.mission} max={200} />
                      </div>
                      <div>
                        <FormField
                          label="Core Values"
                          htmlFor="mc-values"
                          hint="One value per line."
                        >
                          <FormTextarea
                            id="mc-values"
                            rows={5}
                            maxLength={200}
                            value={draft.coreValues.join('\n')}
                            onChange={(e) => patch({ coreValues: e.target.value.split('\n') })}
                          />
                        </FormField>
                        <Counter value={draft.coreValues.join('\n')} max={200} />
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

              {activeSection === 'branding' && (
                <SectionCard
                  title="Logo & Branding"
                  hint="Your medical centre's logo and brand colors."
                >
                  <div>
                    <p
                      className="mb-1.5 font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Current Logo
                    </p>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full"
                        style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        {draft.logoDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={draft.logoDataUrl}
                            alt="Medical centre logo"
                            className="size-full object-cover"
                          />
                        ) : (
                          <ImageIcon style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          <Upload style={{ width: 14, height: 14 }} />
                          Change Logo
                        </button>
                        {draft.logoDataUrl && (
                          <button
                            type="button"
                            onClick={() => patch({ logoDataUrl: null })}
                            className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              color: '#DC2626',
                              border: '1px solid rgba(220,38,38,0.3)',
                            }}
                          >
                            <X style={{ width: 14, height: 14 }} />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ColorSwatchInput
                      id="mc-primary-color"
                      label="Primary Color"
                      value={draft.primaryColor}
                      onChange={(v) => patch({ primaryColor: v })}
                    />
                    <ColorSwatchInput
                      id="mc-secondary-color"
                      label="Secondary Color"
                      value={draft.secondaryColor}
                      onChange={(v) => patch({ secondaryColor: v })}
                    />
                  </div>
                  <div
                    className="flex items-start gap-2.5 rounded-[10px] p-3.5"
                    style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <Palette
                      style={{
                        width: 15,
                        height: 15,
                        color: '#4A7080',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    />
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Brand colors are used on generated documents and reports. The
                      application&apos;s own interface colors are not affected.
                    </p>
                  </div>
                </SectionCard>
              )}

              {activeSection === 'contact' && (
                <SectionCard
                  title="Contact Information"
                  hint="How patients and staff can reach the medical centre."
                >
                  <FormField label="Phone" htmlFor="mc-phone">
                    <FormInput
                      id="mc-phone"
                      value={draft.phone}
                      onChange={(e) => patch({ phone: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Email" htmlFor="mc-email">
                    <FormInput
                      id="mc-email"
                      type="email"
                      value={draft.email}
                      onChange={(e) => patch({ email: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Website" htmlFor="mc-website">
                    <FormInput
                      id="mc-website"
                      value={draft.website}
                      onChange={(e) => patch({ website: e.target.value })}
                    />
                  </FormField>
                </SectionCard>
              )}

              {activeSection === 'address' && (
                <SectionCard title="Address" hint="The medical centre's physical location.">
                  <FormField label="Address Line 1" htmlFor="mc-address-1">
                    <FormInput
                      id="mc-address-1"
                      value={draft.addressLine1}
                      onChange={(e) => patch({ addressLine1: e.target.value })}
                    />
                  </FormField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="City" htmlFor="mc-city">
                      <FormInput
                        id="mc-city"
                        value={draft.city}
                        onChange={(e) => patch({ city: e.target.value })}
                      />
                    </FormField>
                    <FormField label="State" htmlFor="mc-state">
                      <FormInput
                        id="mc-state"
                        value={draft.state}
                        onChange={(e) => patch({ state: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Country" htmlFor="mc-country">
                      <FormInput
                        id="mc-country"
                        value={draft.country}
                        onChange={(e) => patch({ country: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Postal Code" htmlFor="mc-postal">
                      <FormInput
                        id="mc-postal"
                        value={draft.postalCode}
                        onChange={(e) => patch({ postalCode: e.target.value })}
                      />
                    </FormField>
                  </div>
                </SectionCard>
              )}

              {activeSection === 'hours' && (
                <SectionCard title="Operating Hours" hint="When the medical centre is open.">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Monday - Friday" htmlFor="mc-weekday-hours">
                      <FormInput
                        id="mc-weekday-hours"
                        value={draft.weekdayRange}
                        onChange={(e) => patch({ weekdayRange: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Saturday" htmlFor="mc-saturday-hours">
                      <FormInput
                        id="mc-saturday-hours"
                        value={draft.saturdayRange}
                        onChange={(e) => patch({ saturdayRange: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Open on Sunday</span>
                    <PreferenceToggle
                      on={draft.sundayOpen}
                      onToggle={() => patch({ sundayOpen: !draft.sundayOpen })}
                      ariaLabel="Open on Sunday"
                    />
                  </div>
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Emergency services available 24/7
                    </span>
                    <PreferenceToggle
                      on={draft.emergencyAvailable}
                      onToggle={() => patch({ emergencyAvailable: !draft.emergencyAvailable })}
                      ariaLabel="Emergency services available 24/7"
                    />
                  </div>
                </SectionCard>
              )}

              {activeSection === 'departments' && (
                <SectionCard
                  title="Departments"
                  hint="Departments are managed on their own dedicated screen."
                >
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] p-4"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div>
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 24, color: '#0D2630' }}
                      >
                        {departments.length}
                      </p>
                      <p style={{ fontSize: 14, color: '#4A7080' }}>Departments configured</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.adminDepartments)}
                      className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      Manage Departments
                    </button>
                  </div>
                </SectionCard>
              )}

              {activeSection === 'services' && (
                <SectionCard
                  title="Service Configuration"
                  hint="Services and pricing are managed on their own dedicated screen."
                >
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] p-4"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div>
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 24, color: '#0D2630' }}
                      >
                        {services.length}
                      </p>
                      <p style={{ fontSize: 14, color: '#4A7080' }}>Services in the catalogue</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.adminServicePricing)}
                      className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      Manage Service &amp; Pricing
                    </button>
                  </div>
                </SectionCard>
              )}

              {activeSection === 'notifications' && (
                <SectionCard
                  title="Notification Preferences"
                  hint="Institution-wide notifications, sent by email or in-app."
                >
                  {[
                    {
                      key: 'notifyNewStaffAccounts' as const,
                      label: 'New staff account requests',
                      description: 'Notify administrators when a new staff account is created.',
                    },
                    {
                      key: 'notifyPriceChangeApprovals' as const,
                      label: 'Price change approvals',
                      description:
                        'Notify administrators when a service price change is awaiting publication.',
                    },
                    {
                      key: 'notifyDailyActivityDigest' as const,
                      label: 'Daily activity digest',
                      description: 'Send a daily summary of system activity by email.',
                    },
                    {
                      key: 'notifySystemAlerts' as const,
                      label: 'System alerts',
                      description: 'Notify administrators of critical system events.',
                    },
                  ].map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
                      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="min-w-0">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {row.label}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{row.description}</p>
                      </div>
                      <PreferenceToggle
                        on={draft[row.key]}
                        onToggle={() => patch({ [row.key]: !draft[row.key] })}
                        ariaLabel={row.label}
                      />
                    </div>
                  ))}
                </SectionCard>
              )}

              {activeSection === 'documents' && (
                <SectionCard title="Document Settings" hint="Preferences for generated documents.">
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Include hospital logo on generated documents
                    </span>
                    <PreferenceToggle
                      on={draft.includeLogoOnDocuments}
                      onToggle={() =>
                        patch({ includeLogoOnDocuments: !draft.includeLogoOnDocuments })
                      }
                      ariaLabel="Include hospital logo on generated documents"
                    />
                  </div>
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Include QR code on patient ID cards
                    </span>
                    <PreferenceToggle
                      on={draft.includeQrCodeOnIdCards}
                      onToggle={() =>
                        patch({ includeQrCodeOnIdCards: !draft.includeQrCodeOnIdCards })
                      }
                      ariaLabel="Include QR code on patient ID cards"
                    />
                  </div>
                  <FormField label="Default Document Footer" htmlFor="mc-doc-footer">
                    <FormInput
                      id="mc-doc-footer"
                      value={draft.documentFooterText}
                      onChange={(e) => patch({ documentFooterText: e.target.value })}
                    />
                  </FormField>
                </SectionCard>
              )}

              {activeSection === 'receipts' && (
                <SectionCard title="Receipt Settings" hint="Preferences for billing receipts.">
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Show tax breakdown on receipts
                    </span>
                    <PreferenceToggle
                      on={draft.showTaxBreakdownOnReceipts}
                      onToggle={() =>
                        patch({ showTaxBreakdownOnReceipts: !draft.showTaxBreakdownOnReceipts })
                      }
                      ariaLabel="Show tax breakdown on receipts"
                    />
                  </div>
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Include registration number on receipts
                    </span>
                    <PreferenceToggle
                      on={draft.includeRegistrationNumberOnReceipts}
                      onToggle={() =>
                        patch({
                          includeRegistrationNumberOnReceipts:
                            !draft.includeRegistrationNumberOnReceipts,
                        })
                      }
                      ariaLabel="Include registration number on receipts"
                    />
                  </div>
                  <FormField label="Receipt Footer Message" htmlFor="mc-receipt-footer">
                    <FormInput
                      id="mc-receipt-footer"
                      value={draft.receiptFooterText}
                      onChange={(e) => patch({ receiptFooterText: e.target.value })}
                    />
                  </FormField>
                </SectionCard>
              )}

              {activeSection === 'system' && (
                <SectionCard title="System Preferences" hint="Regional and formatting preferences.">
                  <FormField
                    label="System Timezone"
                    htmlFor="mc-timezone"
                    hint="MYHxCare operates on West Africa Time (WAT) system-wide, this cannot be changed here."
                  >
                    <FormSelect
                      id="mc-timezone"
                      value={draft.timezone}
                      onChange={() => undefined}
                      options={TIMEZONE_OPTIONS}
                      placeholder="Select timezone"
                      disabled
                    />
                  </FormField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Date Format"
                      htmlFor="mc-date-format"
                      hint="Applies to generated documents and reports only."
                    >
                      <FormSelect
                        id="mc-date-format"
                        value={draft.dateFormat}
                        onChange={(v) => patch({ dateFormat: v })}
                        options={DATE_FORMAT_OPTIONS}
                        placeholder="Select date format"
                      />
                    </FormField>
                    <FormField
                      label="Time Format"
                      htmlFor="mc-time-format"
                      hint="Applies to generated documents and reports only."
                    >
                      <FormSelect
                        id="mc-time-format"
                        value={draft.timeFormat}
                        onChange={(v) => patch({ timeFormat: v })}
                        options={TIME_FORMAT_OPTIONS}
                        placeholder="Select time format"
                      />
                    </FormField>
                  </div>
                </SectionCard>
              )}

              {activeSection === 'backup' && (
                <SectionCard title="Backup & Data" hint="Data backup status and export.">
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Last backup</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatDateTime(draft.lastBackupAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleExportSettings}
                      className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <Download style={{ width: 15, height: 15 }} />
                      Export Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        patch({ lastBackupAt: new Date().toISOString() });
                        toast.info('Backup requested', 'A data backup has been requested.');
                      }}
                      className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <Archive style={{ width: 15, height: 15 }} />
                      Request Data Backup
                    </button>
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Right preview sidebar */}
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Logo &amp; Branding
                </p>
                <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Current Logo
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full"
                    style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    {draft.logoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.logoDataUrl}
                        alt="Medical centre logo"
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon style={{ width: 20, height: 20, color: '#8A98A3' }} />
                    )}
                  </div>
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    {draft.name}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Primary Color</span>
                  <span
                    className="flex items-center gap-1.5"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: draft.primaryColor }}
                    />
                    {draft.primaryColor}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Secondary Color</span>
                  <span
                    className="flex items-center gap-1.5"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: draft.secondaryColor }}
                    />
                    {draft.secondaryColor}
                  </span>
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Contact Information
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Phone style={{ width: 14, height: 14, color: '#8A98A3' }} />
                    <span style={{ fontSize: 14, color: '#4A7080' }}>{draft.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info style={{ width: 14, height: 14, color: '#8A98A3' }} />
                    <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {draft.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe style={{ width: 14, height: 14, color: '#8A98A3' }} />
                    <span style={{ fontSize: 14, color: '#4A7080' }}>{draft.website}</span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <Clock style={{ width: 16, height: 16, color: '#4A7080' }} />
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Operating Hours
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Monday - Friday</span>
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{draft.weekdayRange}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Saturday</span>
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{draft.saturdayRange}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Sunday</span>
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: draft.sundayOpen ? '#16A34A' : '#DC2626',
                        background: draft.sundayOpen
                          ? 'rgba(22,163,74,0.08)'
                          : 'rgba(220,38,38,0.08)',
                      }}
                    >
                      {draft.sundayOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Emergency (24/7)</span>
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: draft.emergencyAvailable ? '#16A34A' : '#8A98A3',
                        background: draft.emergencyAvailable
                          ? 'rgba(22,163,74,0.08)'
                          : 'rgba(226,237,241,0.6)',
                      }}
                    >
                      {draft.emergencyAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('hours')}
                  className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#00B4D8',
                    border: '1px solid rgba(0,180,216,0.35)',
                  }}
                >
                  Edit Operating Hours
                </button>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  System Timezone
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Timezone</span>
                  <span style={{ fontSize: 14, color: '#0D2630' }}>West Africa Time (Lagos)</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Date Format</span>
                  <span style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatHumanDate(new Date())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
