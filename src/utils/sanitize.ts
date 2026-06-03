/** Shared sanitization for imported data. */

const MAX_STRING_LENGTH = 500
const MAX_AMOUNT = 999_999_999.99
const AMOUNT_DECIMALS = 2

/** Sanitize strings: strip HTML/scripts, control chars, enforce length. */
export function sanitizeString(value: string, maxLen = MAX_STRING_LENGTH): string {
  if (typeof value !== 'string') return ''
  let s = value
    .replace(/\0/g, '') // null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .trim()
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

/** Sanitize amount: finite, 2 decimals, non-negative, capped. */
export function sanitizeAmount(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0
  const rounded = Math.round(value * Math.pow(10, AMOUNT_DECIMALS)) / Math.pow(10, AMOUNT_DECIMALS)
  return Math.min(rounded, MAX_AMOUNT)
}

/**
 * Sanitize a balance that may legitimately be negative (e.g. a savings account
 * overdrawn by a withdrawal): finite, 2 decimals, clamped to [-MAX, MAX].
 */
export function sanitizeSignedAmount(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  const rounded = Math.round(value * Math.pow(10, AMOUNT_DECIMALS)) / Math.pow(10, AMOUNT_DECIMALS)
  return Math.max(-MAX_AMOUNT, Math.min(rounded, MAX_AMOUNT))
}

/**
 * Parse a user-typed amount in Polish locale (e.g. "1 234,56" or "12,50 zł")
 * into a number. Strips whitespace (incl. non-breaking spaces used as thousands
 * separators) and the zł symbol, and treats comma as the decimal separator.
 * Returns NaN for invalid input so callers can distinguish "empty/invalid" from
 * 0 (pass the result through sanitizeAmount to coerce non-finite values to 0).
 */
export function parseLocaleAmount(value: string): number {
  if (typeof value !== 'string') return NaN
  const cleaned = value
    .replace(/zł/gi, '')
    .replace(/\s/g, '')
    .replace(',', '.')
  if (cleaned === '') return NaN
  return parseFloat(cleaned)
}
