/**
 * Shared shape for the flex-row "table" convention used across list pages
 * (Patients, Encounters, Workforce Management, ...): a typed `COLS` array
 * drives both the header row and each data row, so column widths can never
 * drift between the two.
 *
 * This type documents the convention for new screens — it is not a shared
 * render component. Header/row markup stays hand-written per page because
 * real styling diverges (padding, font, hover) between tables enough that
 * forcing one render component would either flatten those differences or
 * balloon into a prop for every visual knob. See the UI compliance
 * checklist §7a for the width rules this type exists to support:
 * exactly one flexible text column (`min-w-0 flex-1`), every other column
 * either a fixed percentage or `shrink-0` with a content-sized width.
 */
export type ColDef = {
  key: string;
  label: string;
  /** Tailwind width classes, e.g. `'w-[22%]'` or `'w-28 shrink-0'` or `'min-w-0 flex-1'`. */
  width: string;
  /** Extra header-cell padding beyond the row's own padding, e.g. `'pl-5 pr-3'`. */
  headPad?: string;
  /** Text alignment for the column, e.g. `'text-center'`. Omit for left-aligned. */
  align?: string;
};
