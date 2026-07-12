'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Heart,
  Activity,
  Scissors,
  UserRound,
  Eye,
  Scale,
  Shield,
  BookOpen,
  TrendingUp,
  Droplets,
  ArrowLeftRight,
  Microscope,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { MOCK_REFERRAL_PATIENT } from '@/features/referrals/__mocks__/referralFixtures';

// ── Types ──────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';

type Department = {
  id: string;
  label: string;
  icon: LucideIcon;
};

// ── Config ─────────────────────────────────────────────────────────────────────

const DEPARTMENTS: Department[] = [
  { id: 'cardiology', label: 'Cardiology', icon: Heart },
  { id: 'neurology', label: 'Neurology', icon: Activity },
  { id: 'general-surgery', label: 'General Surgery', icon: Scissors },
  { id: 'obs-gynaecology', label: 'Obs & Gynaecology', icon: UserRound },
  { id: 'ophthalmology', label: 'Ophthalmology', icon: Eye },
  { id: 'orthopaedics', label: 'Orthopaedics', icon: Scale },
  { id: 'dermatology', label: 'Dermatology', icon: Shield },
  { id: 'psychiatry', label: 'Psychiatry', icon: BookOpen },
  { id: 'endocrinology', label: 'Endocrinology', icon: TrendingUp },
  { id: 'nephrology', label: 'Nephrology', icon: Droplets },
  { id: 'pulmonology', label: 'Pulmonology', icon: ArrowLeftRight },
  { id: 'ent', label: 'ENT', icon: Microscope },
];

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="shrink-0 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? '#00B4D8' : '#CBD5E1',
        position: 'relative',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
      }}
    >
      <span
        className="absolute top-[2px] block transition-transform duration-200"
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
          transform: on ? 'translateX(22px)' : 'translateX(2px)',
        }}
      />
    </button>
  );
}

// ── Skeletons ──────────────────────────────────────────────────────────────────

function SkeletonToggleCard() {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{
        borderRadius: 12,
        background: '#FFFFFF',
        border: '1px solid rgba(0,100,130,0.12)',
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 140, height: 20 }} />
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 240, height: 16 }} />
      </div>
      <div
        className="shrink-0 animate-pulse rounded-full bg-slate-200"
        style={{ width: 44, height: 24 }}
      />
    </div>
  );
}

function SkeletonDeptCard() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        borderRadius: 10,
        background: '#FFFFFF',
        border: '1px solid rgba(0,100,130,0.12)',
        minHeight: 52,
      }}
    >
      <div
        className="shrink-0 animate-pulse rounded bg-slate-200"
        style={{ width: 20, height: 20 }}
      />
      <div className="animate-pulse rounded bg-slate-200" style={{ width: 100, height: 18 }} />
    </div>
  );
}

function SkeletonReasonSection() {
  return (
    <div className="flex flex-col gap-2">
      <div className="animate-pulse rounded bg-slate-200" style={{ width: 150, height: 22 }} />
      <div className="animate-pulse rounded-lg bg-slate-200" style={{ height: 120 }} />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReferralsPage() {
  const router = useRouter();
  const toast = useToast();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [attachNote, setAttachNote] = useState(true);
  const [notifyDoctor, setNotifyDoctor] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleSend() {
    if (!selectedDept) {
      toast.error(
        'No department selected',
        'Please select a department before sending the referral.',
      );
      return;
    }
    if (!reason.trim()) {
      toast.error(
        'Referral reason required',
        'Describe the clinical indication and what you expect from the specialist.',
      );
      return;
    }
    const dept = DEPARTMENTS.find((d) => d.id === selectedDept);
    toast.success(
      'Referral sent',
      `${patient.name} has been referred to ${dept?.label ?? 'the selected department'}.`,
    );
    setSelectedDept(null);
    setReason('');
    setIsUrgent(false);
    setAttachNote(true);
    setNotifyDoctor(true);
  }

  const patient = MOCK_REFERRAL_PATIENT;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Patient preview bar ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 py-[10px] sm:flex sm:min-h-[56px] sm:items-center sm:gap-4 sm:px-5 sm:py-0"
        style={{ background: '#1A3D4D', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
      >
        {/* Row 1 (mobile) / nav block (sm+) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex shrink-0 items-center gap-1.5 rounded-[6px] transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            <ChevronLeft style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.58)' }} />
            <span
              className="font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: 'rgba(255,255,255,0.58)' }}
            >
              Back to Queue
            </span>
          </button>

          <div
            className="shrink-0"
            style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.18)' }}
          />

          <div
            className="flex shrink-0 items-center justify-center rounded-full font-sans font-medium text-white"
            style={{
              width: 38,
              height: 38,
              background: 'rgba(255,255,255,0.15)',
              fontSize: 14,
              lineHeight: '22px',
            }}
          >
            {patient.initials}
          </div>

          <span
            className="min-w-0 flex-1 truncate font-sans text-white sm:hidden"
            style={{ fontSize: 15, lineHeight: '22px' }}
          >
            {patient.name}
          </span>

          {patient.isUrgent && (
            <span
              className="shrink-0 font-sans font-medium sm:hidden"
              style={{
                fontSize: 14,
                lineHeight: '20px',
                borderRadius: 4,
                padding: '2px 8px',
                background: 'rgba(245,158,11,0.30)',
                border: '1px solid rgba(245,158,11,0.45)',
                color: '#FCD34D',
              }}
            >
              URGENT
            </span>
          )}
        </div>

        {/* Row 2 (mobile) / info strip (sm+) */}
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 sm:mt-0 sm:flex-1 sm:gap-x-4">
          <span
            className="hidden shrink-0 font-sans text-white sm:inline"
            style={{ fontSize: 16, lineHeight: '24px' }}
          >
            {patient.name}
          </span>

          <span
            className="shrink-0 font-sans"
            style={{ fontSize: 14, lineHeight: '22px', color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.mrn}
          </span>
          <span
            className="shrink-0 font-sans"
            style={{ fontSize: 14, lineHeight: '22px', color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.age} · {patient.gender}
          </span>
          <span
            className="shrink-0 font-sans"
            style={{ fontSize: 14, lineHeight: '22px', color: 'rgba(255,255,255,0.52)' }}
          >
            BG: {patient.bloodGroup}
          </span>

          {patient.allergies.length > 0 && (
            <>
              <AlertTriangle style={{ width: 16, height: 16, color: '#FCA5A5', flexShrink: 0 }} />
              <span
                className="font-sans font-medium sm:hidden"
                style={{
                  fontSize: 14,
                  lineHeight: '20px',
                  borderRadius: 4,
                  padding: '2px 8px',
                  background: 'rgba(239,68,68,0.28)',
                  border: '1px solid rgba(239,68,68,0.40)',
                  color: '#FCA5A5',
                }}
              >
                {patient.allergies.length === 1
                  ? '1 allergy'
                  : `${patient.allergies.length} allergies`}
              </span>
              {patient.allergies.map((a) => (
                <span
                  key={a}
                  className="hidden shrink-0 font-sans font-medium sm:inline"
                  style={{
                    fontSize: 14,
                    lineHeight: '22px',
                    borderRadius: 4,
                    padding: '3px 8px',
                    background: 'rgba(239,68,68,0.28)',
                    border: '1px solid rgba(239,68,68,0.40)',
                    color: '#FCA5A5',
                  }}
                >
                  {a}
                </span>
              ))}
            </>
          )}
        </div>

        {patient.isUrgent && (
          <span
            className="hidden shrink-0 font-sans font-semibold sm:inline"
            style={{
              fontSize: 14,
              lineHeight: '20px',
              borderRadius: 6,
              padding: '4px 12px',
              background: 'rgba(245,158,11,0.22)',
              border: '1px solid rgba(245,158,11,0.40)',
              color: '#FCD34D',
              letterSpacing: '0.5px',
            }}
          >
            URGENT
          </span>
        )}
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px]">
          {/* ── Page header ─────────────────────────────────────────────────── */}
          <div
            className="px-4 sm:px-6"
            style={{
              background: '#FFFFFF',
              borderBottom: '1px solid rgba(0,100,130,0.12)',
              paddingTop: 16,
              paddingBottom: 16,
              minHeight: 88,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Refer Patient
            </h1>
            <p
              className="font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8', marginTop: 2 }}
            >
              For {patient.name} · {patient.mrn}
            </p>
          </div>

          {/* ── Form body ────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 px-4 pt-4 pb-10 sm:px-6">
            {/* Loading */}
            {pageState === 'loading' && (
              <>
                <SkeletonToggleCard />
                <div className="flex flex-col gap-3">
                  <div
                    className="animate-pulse rounded bg-slate-200"
                    style={{ width: 170, height: 22 }}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SkeletonDeptCard key={i} />
                    ))}
                  </div>
                </div>
                <SkeletonReasonSection />
                <SkeletonToggleCard />
                <SkeletonToggleCard />
              </>
            )}

            {/* Error */}
            {pageState === 'error' && (
              <div
                className="flex flex-col items-center justify-center gap-4 py-20"
                style={{ color: '#4A7080' }}
              >
                <AlertCircle style={{ width: 40, height: 40, color: '#EF4444', opacity: 0.7 }} />
                <div className="text-center">
                  <p
                    className="font-sans font-medium"
                    style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                  >
                    Failed to load referral form
                  </p>
                  <p
                    className="font-sans"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080', marginTop: 4 }}
                  >
                    Check your connection and try again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-2 transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    borderRadius: 8,
                    border: '1px solid rgba(0,100,130,0.20)',
                    background: '#FFFFFF',
                    padding: '10px 20px',
                    fontSize: 14,
                    lineHeight: '22px',
                    color: '#0D2630',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw style={{ width: 16, height: 16 }} />
                  Retry
                </button>
              </div>
            )}

            {/* Loaded */}
            {pageState === 'loaded' && (
              <>
                {/* Urgent Referral */}
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderRadius: 12,
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.12)',
                  }}
                >
                  <div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Urgent Referral
                    </p>
                    <p
                      className="font-sans"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080', marginTop: 2 }}
                    >
                      Mark as urgent for immediate specialist attention
                    </p>
                  </div>
                  <Toggle on={isUrgent} onToggle={() => setIsUrgent((v) => !v)} />
                </div>

                {/* Select Department */}
                <div className="flex flex-col gap-3">
                  <p
                    className="font-sans font-semibold"
                    style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                  >
                    Select Department
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {DEPARTMENTS.map((dept) => {
                      const isSelected = selectedDept === dept.id;
                      const Icon = dept.icon;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => setSelectedDept(isSelected ? null : dept.id)}
                          className="flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            borderRadius: 10,
                            minHeight: 52,
                            background: isSelected ? 'rgba(0,180,216,0.06)' : '#FFFFFF',
                            border: isSelected
                              ? '2px solid #00B4D8'
                              : '1px solid rgba(0,100,130,0.12)',
                            cursor: 'pointer',
                          }}
                        >
                          <Icon
                            style={{
                              width: 20,
                              height: 20,
                              flexShrink: 0,
                              color: isSelected ? '#00B4D8' : '#4A7080',
                            }}
                          />
                          <span
                            className="font-sans font-medium"
                            style={{
                              fontSize: 14,
                              lineHeight: '22px',
                              color: isSelected ? '#00B4D8' : '#0D2630',
                            }}
                          >
                            {dept.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Referral Reason */}
                <div className="flex flex-col gap-2">
                  <p
                    className="font-sans font-semibold"
                    style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                  >
                    Referral Reason
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Clinical indication, relevant findings, and what you expect from the specialist..."
                    rows={5}
                    className="w-full resize-none font-sans transition-colors duration-150 focus:outline-none"
                    style={{
                      borderRadius: 10,
                      border: '1px solid rgba(0,100,130,0.20)',
                      background: '#FFFFFF',
                      padding: '12px 14px',
                      fontSize: 14,
                      lineHeight: '22px',
                      color: '#0D2630',
                      minHeight: 120,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#00B4D8';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,100,130,0.20)';
                    }}
                  />
                </div>

                {/* Attach Clinical Note */}
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderRadius: 12,
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.12)',
                  }}
                >
                  <div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Attach Clinical Note
                    </p>
                    <p
                      className="font-sans"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080', marginTop: 2 }}
                    >
                      Include your clinical notes with this referral
                    </p>
                  </div>
                  <Toggle on={attachNote} onToggle={() => setAttachNote((v) => !v)} />
                </div>

                {/* Notify Receiving Doctor */}
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderRadius: 12,
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.12)',
                  }}
                >
                  <div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Notify Receiving Doctor
                    </p>
                    <p
                      className="font-sans"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080', marginTop: 2 }}
                    >
                      Send an immediate notification to the specialist
                    </p>
                  </div>
                  <Toggle on={notifyDoctor} onToggle={() => setNotifyDoctor((v) => !v)} />
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex min-h-[48px] items-center justify-center font-sans font-medium transition-colors duration-150 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none sm:min-w-[200px]"
                    style={{
                      borderRadius: 30,
                      border: '1px solid rgba(0,100,130,0.20)',
                      background: '#FFFFFF',
                      padding: '12px 32px',
                      fontSize: 14,
                      lineHeight: '22px',
                      color: '#0D2630',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    className="flex min-h-[48px] items-center justify-center gap-2 font-sans font-medium transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none sm:min-w-[220px]"
                    style={{
                      borderRadius: 30,
                      border: 'none',
                      background: '#00B4D8',
                      padding: '12px 32px',
                      fontSize: 14,
                      lineHeight: '22px',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <Send style={{ width: 16, height: 16 }} />
                    Send Referral to Department
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
