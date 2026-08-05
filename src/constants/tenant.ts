/**
 * The single onboarded tenant this build currently serves — NAU Medical
 * Centre (Nnamdi Azikiwe University's medical centre). Every place that
 * needs to display the institution's name, or prefix a generated identifier
 * with it (see `reserveIdentifier()` in `patientDirectoryStore.ts`), reads
 * from here instead of hardcoding the string separately.
 *
 * This app is single-tenant today, but the backend's own
 * `POST /patients/reserve-identifier` contract already returns a fully
 * formed, tenant-prefixed MRN per the real institution onboarded (e.g.
 * `NAU-A8B78N87393485`) — this constant is what a real multi-tenant swap
 * would replace with the tenant/facility info returned on login, one place
 * instead of the dozen literal strings this replaced.
 */
export const TENANT_CONFIG = {
  name: 'NAU Medical Centre',
  /** Prefixes every backend-generated MRN for this tenant. */
  mrnPrefix: 'NAU',
};
