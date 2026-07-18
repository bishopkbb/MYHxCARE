'use client';

import {
  Calendar,
  Droplet,
  Globe2,
  Heart,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
} from 'lucide-react';

import { UserAvatar } from '@components/shared/UserAvatar';
import { getInitials } from '@lib/utils';
import { computeAge } from '@/features/registration/schemas/registerPatientSchema';
import type {
  DirectoryPatient,
  DirectoryPatientStatus,
  MaritalStatus,
} from '@/features/registration/__mocks__/patientDirectoryFixtures';
import { MOCK_PATIENT_PROFILE } from '@/features/registration/__mocks__/patientProfileFixtures';

function BannerStat({ icon: Icon, value }: { icon: typeof Calendar; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon style={{ width: 15, height: 15, color: '#8A98A3' }} />
      <span style={{ fontSize: 14, color: '#4A7080' }}>{value}</span>
    </div>
  );
}

/** The curated persona (dp-001) has two mock records that represent "the
 * same person" — DIRECTORY_PATIENTS' generic dp-001 row (used for the
 * picker's avatar/faculty) and MOCK_PATIENT_PROFILE (the richly-detailed
 * canonical record used by Patient Profile/Check-In/the Medical Record
 * page). Their identity fields don't match (different MRN, no age/marital/
 * nationality on the directory row), so any page that shows the curated
 * persona's banner must merge onto MOCK_PATIENT_PROFILE's identity fields
 * rather than the directory row's — otherwise the banner contradicts the
 * curated content (documents, visits, allergies) shown below it. */
export function toCuratedBannerPatient(fallback: DirectoryPatient): DirectoryPatient {
  const p = MOCK_PATIENT_PROFILE;
  return {
    ...fallback,
    name: p.fullName,
    initials: getInitials(p.fullName),
    mrn: p.mrn,
    patientId: p.patientId,
    studentId: p.studentId,
    age: computeAge(p.dateOfBirth) ?? fallback.age,
    gender: p.gender as DirectoryPatient['gender'],
    bloodGroup: p.bloodGroup,
    maritalStatus: p.maritalStatus as MaritalStatus,
    nationality: p.nationality,
    phone: p.phone,
    email: p.email,
    address: p.address,
    status: p.status as DirectoryPatientStatus,
    faculty: p.student.facultyDepartment,
  };
}

/** Lean patient banner sourced from DirectoryPatient fields only — used by
 * workspace pages (Visit History, Clinical Documents, Document Upload) that
 * let staff pick any of the 250 Directory patients, not just the one
 * curated persona with a full PatientProfile record. */
export function PatientBanner({ patient }: { patient: DirectoryPatient }) {
  return (
    <div
      className="mt-5 flex flex-col gap-4 rounded-[12px] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar initials={patient.initials} size={72} textSize={24} bg={patient.avatarBg} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="font-display font-semibold" style={{ fontSize: 22, color: '#0D2630' }}>
              {patient.name}
            </p>
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{ fontSize: 14, color: '#4A7080', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              {patient.status}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span style={{ fontSize: 14, color: '#00B4D8' }}>{patient.mrn}</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Patient ID: {patient.patientId}</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Student ID: {patient.studentId}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <BannerStat icon={Calendar} value={`${patient.age} Yrs`} />
            <BannerStat icon={UserIcon} value={patient.gender} />
            <BannerStat icon={Droplet} value={patient.bloodGroup} />
            <BannerStat icon={Heart} value={patient.maritalStatus} />
            <BannerStat icon={Globe2} value={patient.nationality} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
        <div className="flex items-center gap-1.5 sm:flex-row-reverse">
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Phone</span>
          <Phone style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {patient.phone}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:flex-row-reverse">
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Email</span>
          <Mail style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {patient.email}
          </span>
        </div>
        <div className="flex items-start gap-1.5 sm:max-w-[280px] sm:flex-row-reverse">
          <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
            Address
          </span>
          <MapPin style={{ width: 14, height: 14, color: '#8A98A3' }} className="mt-0.5 shrink-0" />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {patient.address}
          </span>
        </div>
      </div>
    </div>
  );
}
