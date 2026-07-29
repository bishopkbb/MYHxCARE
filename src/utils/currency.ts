const CURRENCY_SYMBOL = '₦';

const numberFmt = new Intl.NumberFormat('en', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactNumberFmt = new Intl.NumberFormat('en', {
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats a naira amount for display, e.g. 1234.5 → "₦1,234.50".
 * Amounts are always naira — never kobo.
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${numberFmt.format(amount)}`;
}

/**
 * Formats a naira amount compactly for tight spaces like stat cards, e.g.
 * 46970475 → "₦46.97M", 66654 → "₦66.65K". Falls back to the full amount
 * only below 1,000, where compact notation wouldn't actually save space.
 */
export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) < 1_000) return formatCurrency(amount);
  return `${CURRENCY_SYMBOL}${compactNumberFmt.format(amount)}`;
}

/**
 * Formats a naira amount for use inside a text input (no symbol).
 * e.g. 1234.5 → "1,234.50"
 */
export function formatCurrencyInput(amount: number): string {
  return numberFmt.format(amount);
}

/**
 * Parses a user-entered currency string back to a number.
 * Accepts "₦1,234.56", "1,234.56", "1234.56", "-₦500", "₦-500".
 * Returns 0 for empty or non-numeric input.
 */
export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[₦,\s]/g, '').trim();
  if (!cleaned) return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}
