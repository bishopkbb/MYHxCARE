'use client';

import { AlertTriangle, Info, Plus, Trash2 } from 'lucide-react';
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from 'react-hook-form';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormPhoneInput } from '@components/shared/FormPhoneInput';
import { FormSelect } from '@components/shared/FormSelect';
import { FormTextarea } from '@components/shared/FormTextarea';
import {
  ALLERGY_SEVERITY_OPTIONS,
  CHRONIC_CONDITION_OPTIONS,
  DISABILITY_TYPE_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  type AdditionalDetailsValues,
} from '@/features/registration/schemas/additionalDetailsSchema';
import {
  RELATIONSHIP_OPTIONS,
  type SelectOption,
} from '@/features/registration/__mocks__/registerPatientOptions';

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
  register: UseFormRegister<AdditionalDetailsValues>;
  control: Control<AdditionalDetailsValues>;
  errors: FieldErrors<AdditionalDetailsValues>;
  watch: UseFormWatch<AdditionalDetailsValues>;
  setValue: UseFormSetValue<AdditionalDetailsValues>;
};

function SelectField({
  control,
  errors,
  name,
  label,
  required,
  placeholder,
  options,
}: FormProps & {
  name: keyof AdditionalDetailsValues;
  label: string;
  required?: boolean;
  placeholder: string;
  options: SelectOption[];
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
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={options}
            placeholder={placeholder}
            hasError={!!error}
          />
        )}
      />
    </FormField>
  );
}

function CheckboxGroup({
  options,
  value,
  onChange,
}: {
  options: SelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-2 font-sans"
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <input
            type="checkbox"
            checked={value.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            style={{ accentColor: '#00B4D8' }}
            className="size-4 shrink-0 cursor-pointer rounded"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export function AdditionalDetailsStep({ register, control, errors, watch, setValue }: FormProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'allergies' });
  const hasNoKnownAllergies = watch('hasNoKnownAllergies');
  const nokPhoneCountryCode = watch('nokPhoneCountryCode');
  const hasDisability = watch('hasDisability');
  const chronicConditions = watch('chronicConditions');
  const disabilityTypes = watch('disabilityTypes');
  const allergiesError = errors.allergies?.message as string | undefined;

  const formProps: FormProps = { register, control, errors, watch, setValue };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      {/* ── Left column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Card title="Next of Kin">
          <p className="mb-3.5" style={{ fontSize: 14, color: '#8A98A3' }}>
            The patient&apos;s primary legal contact — may be the same person as the Emergency
            Contact, but recorded separately since they don&apos;t always match.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Full Name" htmlFor="nokName" required error={errors.nokName?.message}>
              <FormInput
                id="nokName"
                placeholder="Enter full name"
                hasError={!!errors.nokName}
                {...register('nokName')}
              />
            </FormField>
            <SelectField
              {...formProps}
              name="nokRelationship"
              label="Relationship"
              required
              placeholder="Select relationship"
              options={RELATIONSHIP_OPTIONS}
            />
            <FormField
              label="Phone Number"
              htmlFor="nokPhoneNumber"
              required
              error={errors.nokPhoneNumber?.message}
            >
              <FormPhoneInput
                countryCode={nokPhoneCountryCode}
                onCountryCodeChange={(v) => setValue('nokPhoneCountryCode', v)}
                hasError={!!errors.nokPhoneNumber}
                numberInputProps={{
                  id: 'nokPhoneNumber',
                  placeholder: 'Phone number',
                  ...register('nokPhoneNumber'),
                }}
              />
            </FormField>
          </div>
        </Card>

        <Card title="Known Allergies">
          <label
            className="flex cursor-pointer items-center gap-2 font-sans font-medium"
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <input
              type="checkbox"
              checked={hasNoKnownAllergies}
              onChange={(e) => {
                setValue('hasNoKnownAllergies', e.target.checked);
                if (e.target.checked) setValue('allergies', []);
              }}
              style={{ accentColor: '#00B4D8' }}
              className="size-4 shrink-0 cursor-pointer rounded"
            />
            No known allergies (NKDA)
          </label>

          {!hasNoKnownAllergies && (
            <div className="mt-3.5 flex flex-col gap-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-3 rounded-[10px] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <FormField
                    label="Substance"
                    htmlFor={`allergies.${index}.substance`}
                    error={errors.allergies?.[index]?.substance?.message}
                  >
                    <FormInput
                      id={`allergies.${index}.substance`}
                      placeholder="e.g. Penicillin"
                      hasError={!!errors.allergies?.[index]?.substance}
                      {...register(`allergies.${index}.substance` as const)}
                    />
                  </FormField>
                  <FormField
                    label="Reaction"
                    htmlFor={`allergies.${index}.reaction`}
                    error={errors.allergies?.[index]?.reaction?.message}
                  >
                    <FormInput
                      id={`allergies.${index}.reaction`}
                      placeholder="e.g. Rash, swelling"
                      hasError={!!errors.allergies?.[index]?.reaction}
                      {...register(`allergies.${index}.reaction` as const)}
                    />
                  </FormField>
                  <FormField label="Severity" htmlFor={`allergies.${index}.severity`}>
                    <Controller
                      name={`allergies.${index}.severity` as const}
                      control={control}
                      render={({ field: severityField }) => (
                        <FormSelect
                          id={`allergies.${index}.severity`}
                          value={severityField.value}
                          onChange={severityField.onChange}
                          options={ALLERGY_SEVERITY_OPTIONS}
                          placeholder="Select severity"
                        />
                      )}
                    />
                  </FormField>
                  <div className="flex items-end justify-end sm:pb-0.5">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label="Remove allergy"
                      className="flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:outline-none"
                      style={{ border: '1px solid rgba(239,68,68,0.3)' }}
                    >
                      <Trash2 style={{ width: 15, height: 15, color: '#EF4444' }} />
                    </button>
                  </div>
                </div>
              ))}

              {allergiesError && <p style={{ fontSize: 14, color: '#EF4444' }}>{allergiesError}</p>}

              <button
                type="button"
                onClick={() => append({ substance: '', reaction: '', severity: 'MILD' })}
                className="flex h-10 w-fit items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                Add Allergy
              </button>
            </div>
          )}
        </Card>

        <Card title="Medical History">
          <p className="mb-3" style={{ fontSize: 14, color: '#8A98A3' }}>
            A brief screening only — full clinical history is taken by the care team.
          </p>
          <FormField label="Chronic Conditions" htmlFor="chronicConditions">
            <CheckboxGroup
              options={CHRONIC_CONDITION_OPTIONS}
              value={chronicConditions}
              onChange={(next) => setValue('chronicConditions', next)}
            />
          </FormField>
          {chronicConditions.includes('other') && (
            <FormField
              label="Describe Other Condition"
              htmlFor="otherChronicCondition"
              required
              error={errors.otherChronicCondition?.message}
              className="mt-3.5"
            >
              <FormInput
                id="otherChronicCondition"
                placeholder="Describe the condition"
                hasError={!!errors.otherChronicCondition}
                {...register('otherChronicCondition')}
              />
            </FormField>
          )}
          <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Current Medications" htmlFor="currentMedications">
              <FormTextarea
                id="currentMedications"
                rows={3}
                placeholder="List any medications currently being taken"
                {...register('currentMedications')}
              />
            </FormField>
            <FormField label="Past Surgeries" htmlFor="pastSurgeries">
              <FormTextarea
                id="pastSurgeries"
                rows={3}
                placeholder="List any past surgeries or procedures"
                {...register('pastSurgeries')}
              />
            </FormField>
          </div>
        </Card>
      </div>

      {/* ── Right column ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Card title="Communication & Referral">
          <div className="flex flex-col gap-4">
            <SelectField
              {...formProps}
              name="preferredLanguage"
              label="Preferred Language"
              required
              placeholder="Select language"
              options={PREFERRED_LANGUAGE_OPTIONS}
            />
            <SelectField
              {...formProps}
              name="referralSource"
              label="How did the patient find us?"
              required
              placeholder="Select referral source"
              options={REFERRAL_SOURCE_OPTIONS}
            />
            <FormField
              label="Referral Details"
              htmlFor="referralDetails"
              hint="Referring doctor or hospital name, if applicable"
            >
              <FormInput
                id="referralDetails"
                placeholder="e.g. Dr. Adaeze Okonkwo, UNTH"
                {...register('referralDetails')}
              />
            </FormField>
          </div>
        </Card>

        <Card title="Disability & Accessibility">
          <FormField label="Does the patient have any accessibility needs?" htmlFor="hasDisability">
            <div className="flex gap-4">
              {(['no', 'yes'] as const).map((v) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-2 font-sans"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  <input
                    type="radio"
                    name="hasDisability"
                    checked={hasDisability === v}
                    onChange={() => setValue('hasDisability', v)}
                    style={{ accentColor: '#00B4D8' }}
                    className="size-4 cursor-pointer"
                  />
                  {v === 'no' ? 'No' : 'Yes'}
                </label>
              ))}
            </div>
          </FormField>

          {hasDisability === 'yes' && (
            <div className="mt-3.5 flex flex-col gap-3.5">
              <FormField
                label="Type"
                htmlFor="disabilityTypes"
                error={errors.disabilityTypes?.message as string | undefined}
              >
                <CheckboxGroup
                  options={DISABILITY_TYPE_OPTIONS}
                  value={disabilityTypes}
                  onChange={(next) => setValue('disabilityTypes', next)}
                />
              </FormField>
              <FormField label="Notes" htmlFor="disabilityNotes">
                <FormTextarea
                  id="disabilityNotes"
                  rows={2}
                  placeholder="e.g. Wheelchair access required"
                  {...register('disabilityNotes')}
                />
              </FormField>
            </div>
          )}
        </Card>

        <Card title="Consent & Declarations">
          <div className="flex flex-col gap-3.5">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                {...register('consentTreatment')}
                style={{ accentColor: '#00B4D8' }}
                className="mt-0.5 size-4 shrink-0 cursor-pointer rounded"
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                The patient (or their guardian) consents to receiving treatment at this facility.
                <span style={{ color: '#EF4444' }}> *</span>
              </span>
            </label>
            {errors.consentTreatment && (
              <p className="-mt-2" style={{ fontSize: 14, color: '#EF4444' }}>
                {errors.consentTreatment.message}
              </p>
            )}

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                {...register('consentDataProcessing')}
                style={{ accentColor: '#00B4D8' }}
                className="mt-0.5 size-4 shrink-0 cursor-pointer rounded"
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                The patient consents to their data being processed in line with the NDPR privacy
                notice.
                <span style={{ color: '#EF4444' }}> *</span>
              </span>
            </label>
            {errors.consentDataProcessing && (
              <p className="-mt-2" style={{ fontSize: 14, color: '#EF4444' }}>
                {errors.consentDataProcessing.message}
              </p>
            )}

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                {...register('consentShareWithNok')}
                style={{ accentColor: '#00B4D8' }}
                className="mt-0.5 size-4 shrink-0 cursor-pointer rounded"
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                The patient consents to sharing medical information with their Next of Kin.
              </span>
            </label>
          </div>
        </Card>

        <div
          className="flex items-start gap-2.5 rounded-[10px] p-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          {hasNoKnownAllergies || !allergiesError ? (
            <Info style={{ width: 16, height: 16, color: '#F59E0B' }} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle
              style={{ width: 16, height: 16, color: '#F59E0B' }}
              className="mt-0.5 shrink-0"
            />
          )}
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            <span className="font-semibold">Note:</span> Treatment and data processing consent are
            required before this registration can be completed.
          </p>
        </div>
      </div>
    </div>
  );
}
