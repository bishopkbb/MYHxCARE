'use client';

import { ChevronLeft, Lock, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';
import type { DirectoryPatient } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import { MOCK_PATIENT_PROFILE } from '@/features/registration/__mocks__/patientProfileFixtures';
import {
  PATIENT_VISITS,
  RECORD_ACTIVITY,
  generateActivityFromVisits,
  generateVisitsForPatient,
} from '@/features/medical-records/__mocks__/medicalRecordDetailFixtures';
import { PatientBanner, toCuratedBannerPatient } from './PatientBanner';
import { PatientPicker } from './PatientPicker';
import { computeVisitSummary, VisitHistorySection } from './VisitHistorySection';

const CURATED_PATIENT_ID = 'dp-001';

export function VisitHistoryWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [selectedPatient, setSelectedPatient] = useState<DirectoryPatient | null>(null);

  const isCurated = selectedPatient?.id === CURATED_PATIENT_ID;
  const visits = useMemo(() => {
    if (!selectedPatient) return [];
    return isCurated ? PATIENT_VISITS : generateVisitsForPatient(selectedPatient);
  }, [selectedPatient, isCurated]);
  const activity = useMemo(() => {
    if (!selectedPatient) return [];
    return isCurated ? RECORD_ACTIVITY : generateActivityFromVisits(visits);
  }, [selectedPatient, isCurated, visits]);
  const allergies = isCurated ? MOCK_PATIENT_PROFILE.allergies : [];

  function handlePrint() {
    toast.success(
      'Preparing document',
      `${selectedPatient?.name}'s visit history is being prepared for printing.`,
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
              onClick={() => router.push(ROUTES.medicalRecordsDashboard)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <button
              type="button"
              onClick={() => router.push(ROUTES.medicalRecords)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Medical Records
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Visit History
            </span>
          </nav>

          {/* ── Title ─────────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Visit History
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                {selectedPatient
                  ? 'View patient encounter history and visit details'
                  : 'Select a patient to view their encounter history'}
              </p>
            </div>
            {selectedPatient && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Printer style={{ width: 15, height: 15 }} />
                  Print Record
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <ChevronLeft style={{ width: 15, height: 15 }} />
                  Change Patient
                </button>
              </div>
            )}
          </div>

          {!selectedPatient ? (
            <div className="mt-5">
              <PatientPicker onSelect={setSelectedPatient} />
            </div>
          ) : (
            <>
              <PatientBanner
                patient={isCurated ? toCuratedBannerPatient(selectedPatient) : selectedPatient}
              />

              <AllergyBanner allergies={allergies} className="mt-4" />

              {/* ── Content + sidebar ─────────────────────────────────────── */}
              <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <VisitHistorySection visits={visits} patientName={selectedPatient.name} />
                </div>

                <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Visit Summary
                    </h2>
                    <div className="mt-3 flex flex-col gap-2.5">
                      {(() => {
                        const summary = computeVisitSummary(visits);
                        return [
                          ['Total Visits', String(summary.totalVisits)],
                          [
                            'Last Visit',
                            summary.lastVisit ? formatHumanDate(summary.lastVisit) : '—',
                          ],
                          [
                            'First Visit',
                            summary.firstVisit ? formatHumanDate(summary.firstVisit) : '—',
                          ],
                          ['Unique Departments', String(summary.uniqueDepartments)],
                          ['Emergency Visits', String(summary.emergencyVisits)],
                          ['Hospitalizations', String(summary.hospitalizations)],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-2">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {value}
                            </p>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Record Activity
                    </h2>
                    <div className="mt-3 flex flex-col gap-3">
                      {activity.map((act) => {
                        const Icon = act.icon;
                        return (
                          <div key={act.id} className="flex items-start gap-2.5">
                            <div
                              className="flex size-8 shrink-0 items-center justify-center rounded-full"
                              style={{ background: act.iconBg }}
                            >
                              <Icon style={{ width: 15, height: 15, color: act.iconColor }} />
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatHumanDate(act.dateTime)}
                              </p>
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {act.label}
                              </p>
                              <p style={{ fontSize: 14, color: '#4A7080' }}>{act.detail}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Quick Actions
                    </h2>
                    <div className="mt-3 grid grid-cols-1 gap-2.5">
                      {isCurated && (
                        <button
                          type="button"
                          onClick={() => router.push(ROUTES.medicalRecordsPatient)}
                          className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#00B4D8',
                            border: '1px solid rgba(0,180,216,0.35)',
                          }}
                        >
                          View Full Medical Record
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.registrationDirectory)}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#4A7080',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        View in Patient Directory
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Confidentiality notice ───────────────────────────────── */}
              <div
                className="mt-5 flex items-center gap-2.5 rounded-[10px] px-4 py-3"
                style={{
                  background: 'rgba(0,180,216,0.06)',
                  border: '1px solid rgba(0,180,216,0.2)',
                }}
              >
                <Lock style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: '#0D2630' }}>
                  Medical records are confidential and access is role-based. All activities are
                  logged for audit purposes.
                </p>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
