/** A single page/photo of a patient's existing paper file, captured or
 * uploaded during registration. Reference-only — never promoted to a
 * diagnosis, prescription, vital sign, or any other structured clinical
 * entry; always displayed with a "Legacy Paper Record" label so nobody
 * downstream mistakes it for a live clinical document.
 *
 * UI-state only for now (held in `register/page.tsx`, same as `photoDataUrl`,
 * `mrn`, `patientId`) — wiring this into the patient directory store /
 * backend contract is Pass 4 ("wire to backend contract") and Pass 5
 * ("verify submission/association") of the UNIZIK legacy-record task, not
 * this pass. */
export type LegacyRecordImage = {
  id: string;
  dataUrl: string;
  fileName: string;
  source: 'upload' | 'camera';
  addedAt: string;
  /** What kind of paper content this page shows (e.g. "Case Note",
   * "Prescription") — describes the archived paper record, same purpose as
   * `ReviewConfirmStep`'s other labelled fields. Deliberately a separate
   * option list from `CLINICAL_DOC_CATEGORIES` (medical-records' own
   * document types for new documents going forward): conflating the two
   * would risk a legacy page being mistaken for a live clinical document,
   * which the UNIZIK legacy-record task explicitly prohibits. Optional —
   * images added before this field existed, or left unset by choice, have
   * no type. */
  recordType?: string;
};
