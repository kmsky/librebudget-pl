/**
 * Rent affordability using the 30% rule.
 * Max rent should not exceed 30% of net monthly income.
 */

export interface RentAffordabilityInputs {
  agiAnnual: number
  dtiPercent?: number // default 30
}

export interface RentAffordabilityResult {
  maxMonthlyRent: number
  monthlyGrossIncome: number
  dtiPercent: number
}

export function maxAffordableRent(inputs: RentAffordabilityInputs): RentAffordabilityResult {
  const dti = inputs.dtiPercent ?? 30
  const monthlyGross = inputs.agiAnnual / 12
  const maxRent = monthlyGross * (dti / 100)

  return {
    maxMonthlyRent: Math.max(0, maxRent),
    monthlyGrossIncome: monthlyGross,
    dtiPercent: dti,
  }
}
