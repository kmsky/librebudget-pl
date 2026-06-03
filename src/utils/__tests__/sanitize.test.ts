import { describe, it, expect } from 'vitest'
import { parseLocaleAmount, sanitizeAmount, sanitizeSignedAmount } from '../sanitize'
import { formatCurrency } from '../calculations'

describe('parseLocaleAmount (Polish locale input)', () => {
  it('parses comma as the decimal separator', () => {
    expect(parseLocaleAmount('2500,50')).toBe(2500.5)
    expect(parseLocaleAmount('49,99')).toBe(49.99)
  })

  it('strips spaces used as thousands separators', () => {
    expect(parseLocaleAmount('1 234,56')).toBe(1234.56) // regular space
    expect(parseLocaleAmount('1 234,56')).toBe(1234.56) // non-breaking space
    expect(parseLocaleAmount('1 234 567,89')).toBe(1234567.89)
  })

  it('strips the zł symbol', () => {
    expect(parseLocaleAmount('12,50 zł')).toBe(12.5)
    expect(parseLocaleAmount('1 000 zł')).toBe(1000)
  })

  it('still accepts plain dot-decimal input', () => {
    expect(parseLocaleAmount('1234.56')).toBe(1234.56)
    expect(parseLocaleAmount('100')).toBe(100)
  })

  it('returns NaN for empty or invalid input', () => {
    expect(parseLocaleAmount('')).toBeNaN()
    expect(parseLocaleAmount('   ')).toBeNaN()
    expect(parseLocaleAmount('abc')).toBeNaN()
    // @ts-expect-error testing non-string input guard
    expect(parseLocaleAmount(null)).toBeNaN()
  })

  it('composes with sanitizeAmount to coerce invalid input to 0', () => {
    expect(sanitizeAmount(parseLocaleAmount('') || 0)).toBe(0)
    expect(sanitizeAmount(parseLocaleAmount('2500,50'))).toBe(2500.5)
  })
})

describe('sanitizeSignedAmount (savings balances may go negative)', () => {
  it('preserves negative values (overdrawn savings balance)', () => {
    expect(sanitizeSignedAmount(-200)).toBe(-200)
    expect(sanitizeSignedAmount(-49.99)).toBe(-49.99)
  })

  it('keeps positive values like sanitizeAmount', () => {
    expect(sanitizeSignedAmount(1000)).toBe(1000)
    expect(sanitizeSignedAmount(12.5)).toBe(12.5)
  })

  it('rounds to 2 decimals and coerces non-finite to 0', () => {
    expect(sanitizeSignedAmount(-1.005)).toBe(-1.0) // banker-free round
    expect(sanitizeSignedAmount(NaN)).toBe(0)
    expect(sanitizeSignedAmount(Infinity)).toBe(0)
  })

  it('clamps to the [-MAX, MAX] range', () => {
    expect(sanitizeSignedAmount(-1e15)).toBe(-999_999_999.99)
    expect(sanitizeSignedAmount(1e15)).toBe(999_999_999.99)
  })
})

describe('formatCurrency (PLN / pl-PL)', () => {
  it('formats amounts in zloty with a comma decimal separator', () => {
    const formatted = formatCurrency(1234.56)
    expect(formatted).toContain('zł') // zł
    expect(formatted).toContain(',56') // comma decimal separator
  })

  it('does not use a dollar sign', () => {
    expect(formatCurrency(1234.56)).not.toContain('$')
  })
})
