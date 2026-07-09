'use client';

import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type PatientDetail = {
  id: string;
  initials: string;
  name: string;
  mrn: string;
  age: string;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  isUrgent: boolean;
};

// ── Mock data — will be replaced with real API data in Phase 6 ────────────────

const MOCK_PATIENTS: Record<string, PatientDetail> = {
  p1: {
    id: 'p1',
    initials: 'AO',
    name: 'Adaeze Okonkwo',
    mrn: 'MRN-2024-00451',
    age: '21y',
    gender: 'Female',
    bloodGroup: 'O+',
    allergies: ['Penicillin', 'Sulfonamides'],
    isUrgent: true,
  },
  p2: {
    id: 'p2',
    initials: 'IE',
    name: 'Ifeanyi Eze',
    mrn: 'MRN-2024-00592',
    age: '20y',
    gender: 'Male',
    bloodGroup: 'A+',
    allergies: [],
    isUrgent: false,
  },
  p3: {
    id: 'p3',
    initials: 'NA',
    name: 'Ngozi Adeyemi',
    mrn: 'MRN-2024-00512',
    age: '23y',
    gender: 'Female',
    bloodGroup: 'B-',
    allergies: ['Aspirin'],
    isUrgent: false,
  },
};

const FALLBACK_PATIENT: PatientDetail = {
  id: 'unknown',
  initials: '??',
  name: 'Unknown Patient',
  mrn: 'MRN-0000-00000',
  age: '—',
  gender: '—',
  bloodGroup: '—',
  allergies: [],
  isUrgent: false,
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const patient = MOCK_PATIENTS[id] ?? FALLBACK_PATIENT;

  return (
    <div>
      {/* ── Quick patient preview bar ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-5"
        style={{
          background: '#1A3D4D',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          minHeight: 60,
          paddingTop: 14,
          paddingBottom: 14,
        }}
      >
        {/* Back to Queue */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex shrink-0 items-center gap-1.5"
        >
          <ChevronLeft style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.58)' }} />
          <span
            className="text-sm leading-[22px]"
            style={{ color: 'rgba(255,255,255,0.58)', fontFamily: 'var(--font-sans)' }}
          >
            Back to Queue
          </span>
        </button>

        {/* Vertical separator */}
        <div
          className="shrink-0"
          style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.18)' }}
        />

        {/* Avatar */}
        <div
          className="flex shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
          style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)' }}
        >
          {patient.initials}
        </div>

        {/* Patient info strip */}
        <div className="flex min-w-0 items-center gap-4">
          {/* Name */}
          <span
            className="shrink-0 text-lg leading-7 font-normal text-white"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {patient.name}
          </span>

          {/* MRN */}
          <span
            className="shrink-0 text-base leading-6"
            style={{ color: 'rgba(255,255,255,0.52)', fontFamily: 'var(--font-sans)' }}
          >
            {patient.mrn}
          </span>

          {/* Age · Gender */}
          <span
            className="shrink-0 text-base leading-6"
            style={{ color: 'rgba(255,255,255,0.52)', fontFamily: 'var(--font-sans)' }}
          >
            {patient.age} · {patient.gender}
          </span>

          {/* Blood group */}
          <span
            className="shrink-0 text-base leading-6"
            style={{ color: 'rgba(255,255,255,0.52)', fontFamily: 'var(--font-sans)' }}
          >
            BG: {patient.bloodGroup}
          </span>

          {/* Allergy icon + pills */}
          {patient.allergies.length > 0 && (
            <>
              <AlertTriangle style={{ width: 22, height: 22, color: '#FCA5A5', flexShrink: 0 }} />
              {patient.allergies.slice(0, 2).map((allergy) => (
                <span
                  key={allergy}
                  className="shrink-0 text-sm leading-[22px] font-medium"
                  style={{
                    borderRadius: 4,
                    padding: '3px 8px',
                    background: 'rgba(239,68,68,0.28)',
                    border: '1px solid rgba(239,68,68,0.40)',
                    color: '#FCA5A5',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {allergy}
                </span>
              ))}
              {patient.allergies.length > 2 && (
                <span
                  className="shrink-0 text-sm leading-[22px] font-medium"
                  style={{
                    borderRadius: 4,
                    padding: '3px 8px',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#FCA5A5',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  +{patient.allergies.length - 2} more
                </span>
              )}
            </>
          )}
        </div>

        {/* URGENT badge — pushed to far right */}
        {patient.isUrgent && (
          <div className="ml-auto shrink-0">
            <span
              className="text-sm leading-[22px] font-medium"
              style={{
                borderRadius: 4,
                padding: '4px 12px',
                background: 'rgba(245,158,11,0.30)',
                border: '1px solid rgba(245,158,11,0.45)',
                color: '#FCD34D',
                fontFamily: 'var(--font-sans)',
              }}
            >
              URGENT
            </span>
          </div>
        )}
      </div>

      {/* ── Page content — subsequent sections will be built here ─────────── */}
      <div className="p-6" />
    </div>
  );
}
