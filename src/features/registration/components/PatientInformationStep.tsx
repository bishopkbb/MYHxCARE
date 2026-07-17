'use client';

import { Camera, Info, RefreshCw, Upload, User as UserIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from 'react-hook-form';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormPhoneInput } from '@components/shared/FormPhoneInput';
import { FormSelect } from '@components/shared/FormSelect';
import { FormTextarea } from '@components/shared/FormTextarea';
import { useToast } from '@/hooks/useToast';
import { resizeImageToDataUrl } from '@providers/AvatarProvider';
import {
  computeAge,
  type PatientInformationValues,
} from '@/features/registration/schemas/registerPatientSchema';
import {
  GENDER_OPTIONS,
  INSURANCE_PROVIDER_OPTIONS,
  LGAS_BY_STATE,
  MARITAL_STATUS_OPTIONS,
  NATIONALITY_OPTIONS,
  NIGERIA_STATES,
  PATIENT_CATEGORY_OPTIONS,
  PLAN_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  type SelectOption,
} from '@/features/registration/__mocks__/registerPatientOptions';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <h2
        className="font-display font-semibold"
        style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

type FormProps = {
  register: UseFormRegister<PatientInformationValues>;
  control: Control<PatientInformationValues>;
  errors: FieldErrors<PatientInformationValues>;
  watch: UseFormWatch<PatientInformationValues>;
  setValue: UseFormSetValue<PatientInformationValues>;
};

type PatientInformationStepProps = FormProps & {
  mrn: string | null;
  patientId: string | null;
  onGenerateMrn: () => void;
  photoDataUrl: string | null;
  onPhotoUploaded: (dataUrl: string) => void;
};

function SelectField({
  control,
  errors,
  name,
  label,
  required,
  placeholder,
  options,
  onValueChange,
  disabled,
}: FormProps & {
  name: keyof PatientInformationValues;
  label: string;
  required?: boolean;
  placeholder: string;
  options: SelectOption[];
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const error = errors[name]?.message as string | undefined;
  return (
    <FormField label={label} htmlFor={name} required={required} error={error}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <FormSelect
            id={name}
            value={field.value as string}
            onChange={(v) => {
              field.onChange(v);
              onValueChange?.(v);
            }}
            onBlur={field.onBlur}
            options={options}
            placeholder={placeholder}
            hasError={!!error}
            disabled={disabled}
          />
        )}
      />
    </FormField>
  );
}

export function PatientInformationStep({
  register,
  control,
  errors,
  watch,
  setValue,
  mrn,
  patientId,
  onGenerateMrn,
  photoDataUrl,
  onPhotoUploaded,
}: PatientInformationStepProps) {
  const toast = useToast();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const dateOfBirth = watch('dateOfBirth');
  const state = watch('state');
  const phoneCountryCode = watch('phoneCountryCode');
  const emergencyPhoneCountryCode = watch('emergencyPhoneCountryCode');
  const emergencyAltPhoneCountryCode = watch('emergencyAltPhoneCountryCode');
  const insuranceProvider = watch('insuranceProvider');

  const age = computeAge(dateOfBirth);
  const lgaOptions = LGAS_BY_STATE[state] ?? [];

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please choose an image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Image too large', 'Please choose an image under 2MB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 400);
      onPhotoUploaded(dataUrl);
    } catch {
      toast.error('Upload failed', 'Could not read that image. Please try another file.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  const formProps: FormProps = { register, control, errors, watch, setValue };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      {/* ── Left column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Card title="Basic Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label="First Name"
              htmlFor="firstName"
              required
              error={errors.firstName?.message}
            >
              <FormInput
                id="firstName"
                placeholder="Enter first name"
                hasError={!!errors.firstName}
                {...register('firstName')}
              />
            </FormField>
            <FormField label="Middle Name" htmlFor="middleName">
              <FormInput
                id="middleName"
                placeholder="Enter middle name"
                {...register('middleName')}
              />
            </FormField>
            <FormField
              label="Last Name"
              htmlFor="lastName"
              required
              error={errors.lastName?.message}
            >
              <FormInput
                id="lastName"
                placeholder="Enter last name"
                hasError={!!errors.lastName}
                {...register('lastName')}
              />
            </FormField>

            <SelectField
              {...formProps}
              name="gender"
              label="Gender"
              required
              placeholder="Select gender"
              options={GENDER_OPTIONS}
            />
            <FormField
              label="Date of Birth"
              htmlFor="dateOfBirth"
              required
              error={errors.dateOfBirth?.message}
            >
              <FormDateInput
                id="dateOfBirth"
                hasError={!!errors.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                {...register('dateOfBirth')}
              />
            </FormField>
            <FormField label="Age" htmlFor="age">
              <FormInput id="age" value={age === null ? '--' : `${age} yrs`} disabled readOnly />
            </FormField>

            <SelectField
              {...formProps}
              name="maritalStatus"
              label="Marital Status"
              placeholder="Select marital status"
              options={MARITAL_STATUS_OPTIONS}
            />
            <SelectField
              {...formProps}
              name="nationality"
              label="Nationality"
              required
              placeholder="Select nationality"
              options={NATIONALITY_OPTIONS}
            />
            <FormField label="Occupation" htmlFor="occupation">
              <FormInput
                id="occupation"
                placeholder="Enter occupation"
                {...register('occupation')}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:col-span-3 sm:grid-cols-2">
              <FormField
                label="Phone Number"
                htmlFor="phoneNumber"
                required
                error={errors.phoneNumber?.message}
              >
                <FormPhoneInput
                  countryCode={phoneCountryCode}
                  onCountryCodeChange={(v) => setValue('phoneCountryCode', v)}
                  hasError={!!errors.phoneNumber}
                  numberInputProps={{
                    id: 'phoneNumber',
                    placeholder: 'Enter phone number',
                    ...register('phoneNumber'),
                  }}
                />
              </FormField>
              <FormField label="Email Address" htmlFor="email" error={errors.email?.message}>
                <FormInput
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  hasError={!!errors.email}
                  {...register('email')}
                />
              </FormField>
            </div>

            <FormField
              label="Address"
              htmlFor="address"
              required
              error={errors.address?.message}
              className="sm:col-span-3"
            >
              <FormInput
                id="address"
                placeholder="Enter residential address"
                hasError={!!errors.address}
                {...register('address')}
              />
            </FormField>

            <SelectField
              {...formProps}
              name="state"
              label="State"
              required
              placeholder="Select state"
              options={NIGERIA_STATES}
              onValueChange={() => setValue('lga', '')}
            />
            <SelectField
              {...formProps}
              name="lga"
              label="LGA"
              required
              placeholder={state ? 'Select LGA' : 'Select state first'}
              options={lgaOptions}
              disabled={!state}
            />
            <FormField
              label="City/Town"
              htmlFor="cityTown"
              required
              error={errors.cityTown?.message}
            >
              <FormInput
                id="cityTown"
                placeholder="Enter city/town"
                hasError={!!errors.cityTown}
                {...register('cityTown')}
              />
            </FormField>
          </div>
        </Card>

        <Card title="Emergency Contact">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label="Full Name"
              htmlFor="emergencyFullName"
              required
              error={errors.emergencyFullName?.message}
            >
              <FormInput
                id="emergencyFullName"
                placeholder="Enter full name"
                hasError={!!errors.emergencyFullName}
                {...register('emergencyFullName')}
              />
            </FormField>
            <SelectField
              {...formProps}
              name="emergencyRelationship"
              label="Relationship"
              required
              placeholder="Select relationship"
              options={RELATIONSHIP_OPTIONS}
            />
            <FormField
              label="Phone Number"
              htmlFor="emergencyPhoneNumber"
              required
              error={errors.emergencyPhoneNumber?.message}
            >
              <FormPhoneInput
                countryCode={emergencyPhoneCountryCode}
                onCountryCodeChange={(v) => setValue('emergencyPhoneCountryCode', v)}
                hasError={!!errors.emergencyPhoneNumber}
                numberInputProps={{
                  id: 'emergencyPhoneNumber',
                  placeholder: 'Phone number',
                  ...register('emergencyPhoneNumber'),
                }}
              />
            </FormField>

            <FormField
              label="Alternate Phone"
              htmlFor="emergencyAltPhoneNumber"
              error={errors.emergencyAltPhoneNumber?.message}
            >
              <FormPhoneInput
                countryCode={emergencyAltPhoneCountryCode}
                onCountryCodeChange={(v) => setValue('emergencyAltPhoneCountryCode', v)}
                hasError={!!errors.emergencyAltPhoneNumber}
                numberInputProps={{
                  id: 'emergencyAltPhoneNumber',
                  placeholder: 'Alternate number',
                  ...register('emergencyAltPhoneNumber'),
                }}
              />
            </FormField>
            <FormField label="Address" htmlFor="emergencyAddress" className="sm:col-span-2">
              <FormInput
                id="emergencyAddress"
                placeholder="Enter contact address"
                {...register('emergencyAddress')}
              />
            </FormField>
          </div>
        </Card>

        <Card title="Insurance Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField
              {...formProps}
              name="insuranceProvider"
              label="Insurance Provider"
              placeholder="Select provider"
              options={INSURANCE_PROVIDER_OPTIONS}
            />
            <FormField
              label="Policy/Member ID"
              htmlFor="policyMemberId"
              required={!!insuranceProvider}
              error={errors.policyMemberId?.message}
            >
              <FormInput
                id="policyMemberId"
                placeholder="Enter policy or member ID"
                hasError={!!errors.policyMemberId}
                {...register('policyMemberId')}
              />
            </FormField>
            <FormField label="Group Number" htmlFor="groupNumber">
              <FormInput
                id="groupNumber"
                placeholder="Enter group number"
                {...register('groupNumber')}
              />
            </FormField>

            <SelectField
              {...formProps}
              name="planType"
              label="Plan Type"
              placeholder="Select plan type"
              options={PLAN_TYPE_OPTIONS}
            />
            <FormField
              label="Policy Holder Name"
              htmlFor="policyHolderName"
              className="sm:col-span-2"
            >
              <FormInput
                id="policyHolderName"
                placeholder="Enter policy holder name"
                {...register('policyHolderName')}
              />
            </FormField>

            <FormField label="Valid From" htmlFor="insuranceValidFrom">
              <FormDateInput id="insuranceValidFrom" {...register('insuranceValidFrom')} />
            </FormField>
            <FormField
              label="Valid To"
              htmlFor="insuranceValidTo"
              error={errors.insuranceValidTo?.message}
            >
              <FormDateInput
                id="insuranceValidTo"
                hasError={!!errors.insuranceValidTo}
                {...register('insuranceValidTo')}
              />
            </FormField>
          </div>
        </Card>
      </div>

      {/* ── Right column ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Card title="Medical Record Information">
          <div
            className="flex items-start gap-2.5 rounded-[10px] p-3"
            style={{ background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.2)' }}
          >
            <Info style={{ width: 16, height: 16, color: '#00B4D8' }} className="mt-0.5 shrink-0" />
            <p style={{ fontSize: 14, color: '#0D2630' }}>
              MRN will be automatically generated after saving the patient information.
            </p>
          </div>

          <div className="mt-4">
            <FormField label="Medical Record Number (MRN)" htmlFor="mrn">
              <div className="flex gap-2">
                <FormInput id="mrn" value={mrn ?? '--'} disabled readOnly className="flex-1" />
                <button
                  type="button"
                  onClick={onGenerateMrn}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
                >
                  <RefreshCw style={{ width: 14, height: 14 }} />
                  Generate MRN
                </button>
              </div>
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Patient ID" htmlFor="patientId">
              <FormInput id="patientId" value={patientId ?? '--'} disabled readOnly />
            </FormField>
          </div>
        </Card>

        <Card title="Patient Photograph">
          <div
            className="flex flex-col items-center rounded-[10px] p-6 text-center"
            style={{ background: '#F5FBFD', border: '1px dashed rgba(0,100,130,0.25)' }}
          >
            <div
              className="flex size-24 items-center justify-center overflow-hidden rounded-full"
              style={{ background: '#E2EDF1' }}
            >
              {photoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoDataUrl} alt="" className="size-24 object-cover" />
              ) : (
                <UserIcon style={{ width: 44, height: 44, color: '#8A98A3' }} />
              )}
            </div>
            <p className="mt-3 font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Upload Patient Photograph
            </p>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
              JPG, PNG or WebP. Max size 2MB.
            </p>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="mt-3 flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:opacity-50"
              style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
            >
              <Upload style={{ width: 14, height: 14 }} />
              {uploadingPhoto ? 'Uploading…' : 'Upload Photo'}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            <Camera style={{ width: 14, height: 14 }} />
            Take Photo
          </button>
        </Card>

        <Card title="Patient Category">
          <div className="flex flex-col gap-4">
            <SelectField
              {...formProps}
              name="categoryType"
              label="Category Type"
              required
              placeholder="Select category"
              options={PATIENT_CATEGORY_OPTIONS}
            />
            <FormField label="Category Description" htmlFor="categoryDescription">
              <FormTextarea
                id="categoryDescription"
                rows={3}
                placeholder="Enter description (optional)"
                {...register('categoryDescription')}
              />
            </FormField>
          </div>
        </Card>

        <div
          className="flex items-start gap-2.5 rounded-[10px] p-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <Info style={{ width: 16, height: 16, color: '#F59E0B' }} className="mt-0.5 shrink-0" />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            <span className="font-semibold">Note:</span> Please ensure all required fields marked
            with * are filled correctly before proceeding.
          </p>
        </div>
      </div>
    </div>
  );
}
