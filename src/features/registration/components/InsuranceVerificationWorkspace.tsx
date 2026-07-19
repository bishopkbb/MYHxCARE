'use client';

import { FileDown, FileText, Search, Shield, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { UserAvatar } from '@components/shared/UserAvatar';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import type { DirectoryPatient } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  AUTHORIZATION_STATUS_OPTIONS,
  CURATED_INSURANCE_RECORD,
  INSURANCE_PROVIDER_OPTIONS,
  PLAN_OPTIONS,
  RELATIONSHIP_OPTIONS,
  generateInsuranceRecordForPatient,
  type ActivityEntry,
  type AuthorizationStatus,
  type InsuranceRecord,
  type RelationshipToPatient,
  type VerificationMethod,
} from '@/features/registration/__mocks__/insuranceVerificationFixtures';
import { PatientPicker } from '@/features/medical-records/components/PatientPicker';
import { toCuratedBannerPatient } from '@/features/medical-records/components/PatientBanner';

const CURATED_PATIENT_ID = 'dp-001';

function toDateInputValue(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function naira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTimeHuman(iso: string): string {
  if (!iso) return '—';
  return `${formatHumanDate(iso)} ${formatTime(iso)}`;
}

export function InsuranceVerificationWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [selectedPatient, setSelectedPatient] = useState<DirectoryPatient | null>(null);
  const isCurated = selectedPatient?.id === CURATED_PATIENT_ID;

  const bannerPatient = selectedPatient
    ? isCurated
      ? toCuratedBannerPatient(selectedPatient)
      : selectedPatient
    : null;

  // ── Form state ──────────────────────────────────────────────────────────
  const [provider, setProvider] = useState('');
  const [plan, setPlan] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [policyStartDate, setPolicyStartDate] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [policyEndDate, setPolicyEndDate] = useState('');
  const [policyHolderName, setPolicyHolderName] = useState('');
  const [copayAmount, setCopayAmount] = useState('');
  const [relationship, setRelationship] = useState<RelationshipToPatient>('Self');
  const [isVip, setIsVip] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('realtime');
  const [authorizationStatus, setAuthorizationStatus] = useState<AuthorizationStatus>('Pending');
  const [authorizationNumber, setAuthorizationNumber] = useState('');
  const [authorizedOn, setAuthorizedOn] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const [hasVerified, setHasVerified] = useState(false);
  const [record, setRecord] = useState<InsuranceRecord | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  function hydrateFromRecord(r: InsuranceRecord) {
    setProvider(r.provider);
    setPlan(r.plan);
    setPolicyNumber(r.policyNumber);
    setPolicyStartDate(toDateInputValue(r.policyStartDate));
    setGroupNumber(r.groupNumber);
    setPolicyEndDate(toDateInputValue(r.policyEndDate));
    setPolicyHolderName(r.policyHolderName);
    setCopayAmount(String(r.copayAmount));
    setRelationship(r.relationshipToPatient);
    setIsVip(r.isVip);
    setVerificationMethod(r.verificationMethod);
    setAuthorizationStatus(r.authorizationStatus);
    setAuthorizationNumber(r.authorizationNumber);
    setAuthorizedOn(r.authorizedOn ? toDateInputValue(r.authorizedOn) : '');
    setAuthorizedBy(r.authorizedBy);
    setNextReviewDate(toDateInputValue(r.nextReviewDate));
    setRemarks(r.remarks);
    setRecord(r);
    setActivity(r.activity);
    setHasVerified(r.eligibilityStatus !== 'Not Verified');
  }

  function selectPatient(p: DirectoryPatient) {
    setSelectedPatient(p);
    const r =
      p.id === CURATED_PATIENT_ID ? CURATED_INSURANCE_RECORD : generateInsuranceRecordForPatient(p);
    hydrateFromRecord(r);
  }

  function handleChangePatient() {
    setSelectedPatient(null);
    setRecord(null);
    setActivity([]);
    setHasVerified(false);
  }

  function addActivity(
    entry: Omit<ActivityEntry, 'id' | 'icon' | 'iconColor' | 'iconBg'> & {
      kind: 'success' | 'info';
    },
  ) {
    setActivity((prev) => [
      {
        id: `act-${Date.now()}`,
        icon: entry.kind === 'success' ? Shield : X,
        iconColor: entry.kind === 'success' ? '#22C55E' : '#3B82F6',
        iconBg: entry.kind === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
        label: entry.label,
        dateTime: entry.dateTime,
        actor: entry.actor,
      },
      ...prev,
    ]);
  }

  function handleVerifyEligibility() {
    if (!provider || !policyNumber) {
      toast.error(
        'Missing information',
        'Enter Insurance Provider and Policy Number before verifying.',
      );
      return;
    }
    const now = new Date().toISOString();
    const eligible =
      !record || record.eligibilityStatus !== 'Not Verified' || Boolean(policyNumber);
    setHasVerified(true);
    setRecord((prev) =>
      prev
        ? {
            ...prev,
            eligibilityStatus: eligible ? 'Eligible' : 'Not Eligible',
            coverageActive: eligible,
            verifiedOn: now,
            verifiedBy: 'Adaobi Nwankwo',
            verificationReference:
              prev.verificationReference || `VERIF-2026-${Date.now().toString().slice(-6)}`,
          }
        : prev,
    );
    addActivity({
      kind: eligible ? 'success' : 'info',
      label: eligible ? 'Eligibility verified successfully' : 'Eligibility verification failed',
      dateTime: now,
      actor: 'Adaobi Nwankwo',
    });
    toast.success(
      eligible ? 'Eligible' : 'Not eligible',
      eligible
        ? 'This patient is eligible for coverage.'
        : 'This patient is not eligible for coverage.',
    );
  }

  function handleClearFields() {
    setProvider('');
    setPlan('');
    setPolicyNumber('');
    setPolicyStartDate('');
    setGroupNumber('');
    setPolicyEndDate('');
    setPolicyHolderName('');
    setCopayAmount('');
    setRelationship('Self');
    setIsVip(false);
    setVerificationMethod('realtime');
    setHasVerified(false);
    toast.info('Fields cleared', 'Insurance information has been cleared.');
  }

  function handleCancel() {
    if (record) hydrateFromRecord(record);
    toast.info('Changes discarded', 'Reverted to the last saved insurance information.');
  }

  function handleSaveDraft() {
    const now = new Date().toISOString();
    addActivity({
      kind: 'info',
      label: 'Insurance information saved as draft',
      dateTime: now,
      actor: 'Adaobi Nwankwo',
    });
    toast.success('Draft saved', 'Insurance verification saved as a draft.');
  }

  function handleSaveComplete() {
    if (!provider || !policyNumber || !policyHolderName) {
      toast.error(
        'Missing required fields',
        'Insurance Provider, Policy Number, and Policy Holder Name are required.',
      );
      return;
    }
    const now = new Date().toISOString();
    addActivity({
      kind: 'success',
      label: 'Insurance information updated',
      dateTime: now,
      actor: 'Adaobi Nwankwo',
    });
    toast.success('Saved', 'Insurance verification has been completed and saved.');
  }

  const usedPercent = record
    ? Math.min(100, Math.round((record.usedAmount / record.coverageLimit) * 100))
    : 0;

  function buildExportRows(): [string, string][] {
    if (!record || !bannerPatient) return [];
    const rows: [string, string][] = [
      ['Patient', bannerPatient.name],
      ['MRN', bannerPatient.mrn],
      ['Provider', record.provider],
      ['Plan', record.plan],
      ['Policy Number', record.policyNumber],
      ['Policy Holder', record.policyHolderName],
      [
        'Coverage Period',
        `${formatHumanDate(record.policyStartDate)} - ${formatHumanDate(record.policyEndDate)}`,
      ],
      ['Group Number', record.groupNumber],
      ['Copay', naira(record.copayAmount)],
      ['Relationship to Patient', record.relationshipToPatient],
      ['VIP / Special Coverage', record.isVip ? 'Yes' : 'No'],
      ['Authorization Status', record.authorizationStatus],
      ['Authorization Number', record.authorizationNumber || '—'],
      ['Authorized On', record.authorizedOn ? formatHumanDate(record.authorizedOn) : '—'],
      ['Authorized By', record.authorizedBy || '—'],
      ['Next Review Date', record.nextReviewDate ? formatHumanDate(record.nextReviewDate) : '—'],
    ];
    if (hasVerified) {
      rows.push(
        ['Eligibility Status', record.eligibilityStatus],
        ['Coverage', record.coverageActive ? 'Active' : 'Inactive'],
        ['Benefit Type', record.benefitType],
        ['Authorization Required', record.authorizationRequired ? 'Yes' : 'No'],
        ['Coverage Limit', naira(record.coverageLimit)],
        ['Used Amount', naira(record.usedAmount)],
        ['Available Balance', naira(Math.max(0, record.coverageLimit - record.usedAmount))],
        ['Verification Reference', record.verificationReference || '—'],
        ['Verified On', record.verifiedOn ? formatDateTimeHuman(record.verifiedOn) : '—'],
        ['Verified By', record.verifiedBy || '—'],
      );
    }
    return rows;
  }

  function handleExportPDF() {
    if (!record || !bannerPatient) return;
    const infoRows = buildExportRows();
    const kvHtml = infoRows
      .map(
        ([k, v]) =>
          `<tr><th style="width:220px">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`,
      )
      .join('');
    const coverageRowsHtml = record.coverageDetails
      .map(
        (row) =>
          `<tr><td>${escapeHtml(row.category)}</td><td>${row.coveragePercent}%</td><td>${escapeHtml(naira(row.copay))}</td><td>${row.coinsurancePercent}%</td><td>${escapeHtml(row.limit)}</td><td>${row.covered ? 'Covered' : 'Not Covered'}</td></tr>`,
      )
      .join('');
    downloadPDF(
      `Insurance-Verification-${bannerPatient.mrn}`,
      `<h1>Insurance Verification</h1>
       <p class="meta">${escapeHtml(bannerPatient.name)} · ${escapeHtml(bannerPatient.mrn)}</p>
       <hr />
       <table><tbody>${kvHtml}</tbody></table>
       <h2 style="font-size:16px;margin:20px 0 6px">Coverage Details</h2>
       <table>
         <thead><tr><th>Service Category</th><th>Coverage</th><th>Copay</th><th>Coinsurance</th><th>Limit</th><th>Status</th></tr></thead>
         <tbody>${coverageRowsHtml}</tbody>
       </table>`,
    );
    toast.success('Export ready', 'Insurance verification downloaded as PDF.');
  }

  function handleExportCSV() {
    if (!record || !bannerPatient) return;
    const rows = buildExportRows();
    downloadCSV(`insurance-verification-${bannerPatient.mrn}`, [
      ['Field', 'Value'],
      ...rows,
      ...record.coverageDetails.map((row) => [
        `Coverage - ${row.category}`,
        `${row.coveragePercent}% coverage, ${naira(row.copay)} copay, ${row.coinsurancePercent}% coinsurance, limit ${row.limit}, ${row.covered ? 'Covered' : 'Not Covered'}`,
      ]),
    ]);
    toast.success('Export ready', 'Insurance verification downloaded as CSV.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Insurance Verification
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                {selectedPatient
                  ? 'Verify insurance coverage, check eligibility and record authorization status'
                  : 'Select a patient to verify their insurance coverage'}
              </p>
            </div>
            {selectedPatient && record && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <FileText style={{ width: 15, height: 15, color: '#EF4444' }} />
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <FileDown style={{ width: 15, height: 15, color: '#00B4D8' }} />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleChangePatient}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  Change Patient
                </button>
              </div>
            )}
          </div>

          {!selectedPatient || !record || !bannerPatient ? (
            <div className="mt-5">
              <PatientPicker onSelect={selectPatient} />
            </div>
          ) : (
            <>
              {/* ── Patient banner ─────────────────────────────────────── */}
              <div
                className="mt-5 flex flex-col gap-4 rounded-[12px] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex flex-wrap items-center gap-4">
                  <UserAvatar
                    initials={bannerPatient.initials}
                    size={72}
                    textSize={24}
                    bg={bannerPatient.avatarBg}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 22, color: '#0D2630' }}
                      >
                        {bannerPatient.name}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: '#4A7080',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        {bannerPatient.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span style={{ fontSize: 14, color: '#00B4D8' }}>{bannerPatient.mrn}</span>
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>
                        Patient ID: {bannerPatient.patientId}
                      </span>
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>
                        DOB: {formatHumanDate(bannerPatient.dateOfBirth)} ({bannerPatient.age} Yrs)
                      </span>
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>{bannerPatient.gender}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span style={{ fontSize: 14, color: '#4A7080' }}>
                        📞 {bannerPatient.phone}
                      </span>
                      <span style={{ fontSize: 14, color: '#4A7080' }}>
                        ✉ {bannerPatient.email}
                      </span>
                      <span style={{ fontSize: 14, color: '#4A7080' }}>
                        📍 {bannerPatient.address}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isCurated) {
                      router.push(ROUTES.registrationProfile);
                    } else {
                      toast.info(
                        'Not available',
                        'The full Patient Record view is only built out for the demo patient so far.',
                      );
                    }
                  }}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  View Patient Record
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
                {/* ── Main form ─────────────────────────────────────────── */}
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
                      {/* Insurance Information */}
                      <div>
                        <h2
                          className="font-display font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          1. Insurance Information
                        </h2>
                        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField label="Insurance Provider" htmlFor="ins-provider" required>
                            <FormSelect
                              id="ins-provider"
                              value={provider}
                              onChange={setProvider}
                              options={INSURANCE_PROVIDER_OPTIONS}
                              placeholder="Select provider"
                            />
                          </FormField>
                          <FormField label="Plan/Package" htmlFor="ins-plan">
                            <FormSelect
                              id="ins-plan"
                              value={plan}
                              onChange={setPlan}
                              options={PLAN_OPTIONS}
                              placeholder="Select plan"
                            />
                          </FormField>
                          <FormField label="Policy Number" htmlFor="ins-policy-number" required>
                            <FormInput
                              id="ins-policy-number"
                              value={policyNumber}
                              onChange={(e) => setPolicyNumber(e.target.value)}
                              placeholder="Enter policy number"
                            />
                          </FormField>
                          <FormField label="Policy Start Date" htmlFor="ins-start-date">
                            <FormDateInput
                              id="ins-start-date"
                              value={policyStartDate}
                              onChange={(e) => setPolicyStartDate(e.target.value)}
                            />
                          </FormField>
                          <FormField label="Group Number" htmlFor="ins-group-number">
                            <FormInput
                              id="ins-group-number"
                              value={groupNumber}
                              onChange={(e) => setGroupNumber(e.target.value)}
                              placeholder="Enter group number"
                            />
                          </FormField>
                          <FormField label="Policy End Date" htmlFor="ins-end-date">
                            <FormDateInput
                              id="ins-end-date"
                              value={policyEndDate}
                              onChange={(e) => setPolicyEndDate(e.target.value)}
                            />
                          </FormField>
                          <FormField label="Policy Holder Name" htmlFor="ins-holder-name" required>
                            <FormInput
                              id="ins-holder-name"
                              value={policyHolderName}
                              onChange={(e) => setPolicyHolderName(e.target.value)}
                              placeholder="Enter policy holder name"
                            />
                          </FormField>
                          <FormField label="Copay Amount" htmlFor="ins-copay">
                            <FormInput
                              id="ins-copay"
                              value={copayAmount}
                              onChange={(e) =>
                                setCopayAmount(e.target.value.replace(/[^0-9]/g, ''))
                              }
                              placeholder="0.00"
                            />
                          </FormField>
                          <FormField label="Relationship to Patient" htmlFor="ins-relationship">
                            <FormSelect
                              id="ins-relationship"
                              value={relationship}
                              onChange={(v) => setRelationship(v as RelationshipToPatient)}
                              options={RELATIONSHIP_OPTIONS}
                              placeholder="Select relationship"
                            />
                          </FormField>
                          <label className="mt-7 flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isVip}
                              onChange={(e) => setIsVip(e.target.checked)}
                              style={{ accentColor: '#00B4D8' }}
                              className="size-4 cursor-pointer rounded"
                            />
                            <span style={{ fontSize: 14, color: '#4A7080' }}>
                              VIP / Special Coverage
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Verification */}
                      <div>
                        <h2
                          className="font-display font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          2. Verification
                        </h2>
                        <div className="mt-3 flex flex-col gap-2.5">
                          <label
                            className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3.5 py-3"
                            style={{
                              border: `1px solid ${verificationMethod === 'realtime' ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                            }}
                          >
                            <input
                              type="radio"
                              name="verification-method"
                              checked={verificationMethod === 'realtime'}
                              onChange={() => setVerificationMethod('realtime')}
                              style={{ accentColor: '#00B4D8' }}
                              className="size-4 cursor-pointer"
                            />
                            <span style={{ fontSize: 14, color: '#0D2630' }}>
                              Real-time Eligibility Check
                            </span>
                          </label>
                          <label
                            className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3.5 py-3"
                            style={{
                              border: `1px solid ${verificationMethod === 'manual' ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                            }}
                          >
                            <input
                              type="radio"
                              name="verification-method"
                              checked={verificationMethod === 'manual'}
                              onChange={() => setVerificationMethod('manual')}
                              style={{ accentColor: '#00B4D8' }}
                              className="size-4 cursor-pointer"
                            />
                            <span style={{ fontSize: 14, color: '#0D2630' }}>
                              Manual Verification
                            </span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyEligibility}
                          className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, background: '#00B4D8' }}
                        >
                          <Search style={{ width: 15, height: 15 }} />
                          Verify Eligibility
                        </button>
                        <button
                          type="button"
                          onClick={handleClearFields}
                          className="mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          Clear Fields
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Coverage Details */}
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      3. Coverage Details
                    </h2>
                    <div className="mt-3 overflow-x-auto scroll-smooth">
                      <div className="min-w-[720px]">
                        <div
                          className="flex rounded-t-[8px]"
                          style={{
                            background: 'rgba(226,237,241,0.4)',
                            borderBottom: '1px solid #E6F8FD',
                          }}
                        >
                          <div className="min-w-0 flex-1 py-2.5 pr-2 pl-3">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Service Category
                            </span>
                          </div>
                          <div className="w-24 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Coverage
                            </span>
                          </div>
                          <div className="w-24 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Copay
                            </span>
                          </div>
                          <div className="w-28 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Coinsurance
                            </span>
                          </div>
                          <div className="w-40 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Limit
                            </span>
                          </div>
                          <div className="w-28 shrink-0 py-2.5 pr-3">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Status
                            </span>
                          </div>
                        </div>
                        {record.coverageDetails.map((row) => (
                          <div
                            key={row.category}
                            className="flex items-center"
                            style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                          >
                            <div className="min-w-0 flex-1 py-3 pr-2 pl-3">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {row.category}
                              </p>
                            </div>
                            <div className="w-24 shrink-0 py-3 pr-2">
                              <span
                                className="inline-block rounded-full px-2 py-0.5 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  color: '#00B4D8',
                                  background: 'rgba(0,180,216,0.10)',
                                }}
                              >
                                {row.coveragePercent}%
                              </span>
                            </div>
                            <div className="w-24 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>{naira(row.copay)}</p>
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {row.coinsurancePercent}%
                              </p>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {row.limit}
                              </p>
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-3">
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  whiteSpace: 'nowrap',
                                  color: row.covered ? '#22C55E' : '#EF4444',
                                  border: `1px solid ${row.covered ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                                }}
                              >
                                {row.covered ? 'Covered' : 'Not Covered'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Note: Coverage details are based on the information provided by the insurance
                      provider.
                    </p>
                  </div>

                  {/* Authorization */}
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      4. Authorization
                    </h2>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <FormField label="Authorization Status" htmlFor="auth-status" required>
                        <FormSelect
                          id="auth-status"
                          value={authorizationStatus}
                          onChange={(v) => setAuthorizationStatus(v as AuthorizationStatus)}
                          options={AUTHORIZATION_STATUS_OPTIONS}
                          placeholder="Select status"
                        />
                      </FormField>
                      <FormField label="Authorization Number" htmlFor="auth-number">
                        <FormInput
                          id="auth-number"
                          value={authorizationNumber}
                          onChange={(e) => setAuthorizationNumber(e.target.value)}
                          placeholder="Enter authorization number"
                        />
                      </FormField>
                      <FormField label="Authorized On" htmlFor="auth-date">
                        <FormDateInput
                          id="auth-date"
                          value={authorizedOn}
                          onChange={(e) => setAuthorizedOn(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Authorized By" htmlFor="auth-by">
                        <FormInput
                          id="auth-by"
                          value={authorizedBy}
                          onChange={(e) => setAuthorizedBy(e.target.value)}
                          placeholder="Enter authorizer name"
                        />
                      </FormField>
                      <FormField label="Next Review Date" htmlFor="auth-review-date">
                        <FormDateInput
                          id="auth-review-date"
                          value={nextReviewDate}
                          onChange={(e) => setNextReviewDate(e.target.value)}
                        />
                      </FormField>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <FormField label="Remarks (Optional)" htmlFor="auth-remarks">
                          <textarea
                            id="auth-remarks"
                            rows={2}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Add any remarks"
                            className="w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none"
                            style={{
                              fontSize: 14,
                              color: '#0D2630',
                              border: '1px solid rgba(0,100,130,0.18)',
                            }}
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      Cancel
                    </button>
                    <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveComplete}
                        className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        Save &amp; Complete
                      </button>
                    </PermissionGate>
                  </div>
                </div>

                {/* ── Sidebar ───────────────────────────────────────────── */}
                <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Insurance Summary
                      </h2>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: '#22C55E',
                          border: '1px solid rgba(34,197,94,0.4)',
                        }}
                      >
                        {record.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2.5">
                      {[
                        ['Provider', record.provider],
                        ['Policy Number', record.policyNumber],
                        ['Plan', record.plan],
                        ['Policy Holder', record.policyHolderName],
                        [
                          'Coverage Period',
                          `${formatHumanDate(record.policyStartDate)} - ${formatHumanDate(record.policyEndDate)}`,
                        ],
                        ['Group Number', record.groupNumber],
                        ['Copay', naira(record.copayAmount)],
                        ['Authorization Status', record.authorizationStatus],
                        [
                          'Last Verified',
                          record.verifiedOn ? formatDateTimeHuman(record.verifiedOn) : '—',
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                          <span
                            className="max-w-[170px] truncate text-right font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {hasVerified ? (
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Verification Result
                      </h2>
                      <div
                        className="mt-3 flex items-start gap-2.5 rounded-[10px] p-3"
                        style={{
                          background: record.coverageActive
                            ? 'rgba(34,197,94,0.06)'
                            : 'rgba(239,68,68,0.06)',
                          border: `1px solid ${record.coverageActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}
                      >
                        <Shield
                          style={{
                            width: 20,
                            height: 20,
                            color: record.coverageActive ? '#22C55E' : '#EF4444',
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <p
                            className="font-display font-semibold"
                            style={{
                              fontSize: 16,
                              color: record.coverageActive ? '#22C55E' : '#EF4444',
                            }}
                          >
                            {record.eligibilityStatus}
                          </p>
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {record.coverageActive
                              ? 'This patient is eligible for coverage.'
                              : 'This patient is not eligible for coverage.'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-2.5">
                        {[
                          [
                            'Eligibility Status',
                            record.eligibilityStatus,
                            record.coverageActive ? '#22C55E' : '#EF4444',
                          ],
                          ['Coverage', record.coverageActive ? 'Active' : 'Inactive', undefined],
                          ['Benefit Type', record.benefitType, undefined],
                          [
                            'Authorization Required',
                            record.authorizationRequired ? 'Yes' : 'No',
                            undefined,
                          ],
                          ['Coverage Limit', naira(record.coverageLimit), undefined],
                          ['Used Amount', naira(record.usedAmount), undefined],
                          [
                            'Available Balance',
                            naira(Math.max(0, record.coverageLimit - record.usedAmount)),
                            undefined,
                          ],
                          [
                            'Verification Reference',
                            record.verificationReference || '—',
                            undefined,
                          ],
                          [
                            'Verified On',
                            record.verifiedOn ? formatDateTimeHuman(record.verifiedOn) : '—',
                            undefined,
                          ],
                          ['Verified By', record.verifiedBy || '—', undefined],
                        ].map(([label, value, color]) => (
                          <div key={label} className="flex items-center justify-between gap-2">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                            <span
                              className="max-w-[170px] truncate text-right font-sans font-medium"
                              style={{ fontSize: 14, color: (color as string) ?? '#0D2630' }}
                            >
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                      {record.coverageLimit > 0 && (
                        <div className="mt-3">
                          <div
                            className="h-2 overflow-hidden rounded-full"
                            style={{ background: 'rgba(0,100,130,0.10)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${usedPercent}%`, background: '#00B4D8' }}
                            />
                          </div>
                          <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {usedPercent}% of coverage limit used
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="rounded-[12px] p-4 text-center"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Verification Result
                      </h2>
                      <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Run &quot;Verify Eligibility&quot; to see this patient&apos;s coverage
                        result.
                      </p>
                    </div>
                  )}

                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Activity Timeline
                      </h2>
                      {activity.length > 4 && (
                        <span style={{ fontSize: 14, color: '#00B4D8' }}>View All</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-col gap-3">
                      {activity.length === 0 ? (
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>No activity recorded yet.</p>
                      ) : (
                        activity.slice(0, 4).map((act) => (
                          <div key={act.id} className="flex items-start gap-2.5">
                            <div
                              className="flex size-8 shrink-0 items-center justify-center rounded-full"
                              style={{ background: act.iconBg }}
                            >
                              <act.icon style={{ width: 15, height: 15, color: act.iconColor }} />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {act.label}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatDateTimeHuman(act.dateTime)} by {act.actor}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
