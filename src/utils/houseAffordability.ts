/**
 * House affordability calculator using the 28% front-end DTI rule.
 * Max housing cost (P&I + insurance + HOA) ≤ 28% of net monthly income.
 */

import { monthlyPayment } from './autoLoan'
import type { DownPaymentMode } from './autoLoan'

export type { DownPaymentMode }

export interface HouseAffordabilityInputs {
  agiAnnual: number
  downPaymentDollars: number
  downPaymentPercent: number
  downPaymentMode: DownPaymentMode
  interestRatePercent: number
  loanTermYears: number
  homeInsuranceRateAnnual: number // e.g. 0.0008 for 0.08%
  hoaMonthly: number
  dtiPercent?: number // default 28
}

export interface HouseAffordabilityResult {
  maxAffordablePrice: number
  downPaymentAmount: number
  loanAmount: number
  monthlyPrincipalInterest: number
  monthlyInsurance: number
  monthlyHOA: number
  totalMonthlyHousing: number
  dtiPercent: number
  monthlyGrossIncome: number
}

function resolveDownPayment(
  homePrice: number,
  downPaymentDollars: number,
  downPaymentPercent: number,
  mode: DownPaymentMode
): number {
  if (mode === 'dollar') return Math.min(homePrice, Math.max(0, downPaymentDollars))
  const pct = Math.max(0, Math.min(100, downPaymentPercent)) / 100
  return homePrice * pct
}

/**
 * Compute max affordable home price using 28% DTI rule.
 * P&I + (price * insRate/12) + HOA = monthlyGross * (DTI/100)
 * Loan = price - downPayment. P&I = monthlyPayment(loan, rate, term*12).
 * For percent down: downPayment = price * downPct, so loan = price * (1 - downPct).
 * pmtFactor = r(1+r)^n / ((1+r)^n - 1) for monthly payment per unit of principal.
 * P&I = price * (1 - downPct) * pmtFactor
 * price * (1-downPct)*pmtFactor + price*insRate/12 + HOA = maxHousing
 * price * ((1-downPct)*pmtFactor + insRate/12) = maxHousing - HOA
 * price = (maxHousing - HOA) / ((1-downPct)*pmtFactor + insRate/12)
 */
export function maxAffordableHomePrice(inputs: HouseAffordabilityInputs): HouseAffordabilityResult {
  const dti = inputs.dtiPercent ?? 28
  const monthlyGross = inputs.agiAnnual / 12
  const maxHousing = monthlyGross * (dti / 100)

  const months = Math.max(1, Math.round(inputs.loanTermYears * 12))
  const r = inputs.interestRatePercent / 100 / 12
  const pmtFactor =
    Math.abs(r) < 1e-12
      ? 1 / months
      : (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)

  const downPct =
    inputs.downPaymentMode === 'percent'
      ? Math.max(0, Math.min(1, inputs.downPaymentPercent / 100))
      : 0 // for dollar mode we need to solve iteratively since down depends on price

  let maxPrice: number

  if (inputs.downPaymentMode === 'percent') {
    const denom = (1 - downPct) * pmtFactor + inputs.homeInsuranceRateAnnual / 12
    maxPrice = denom > 0 ? Math.max(0, (maxHousing - inputs.hoaMonthly) / denom) : 0
  } else {
    // Dollar down: loan = price - downPayment, P&I = (price - downPayment) * pmtFactor
    const down = Math.max(0, inputs.downPaymentDollars)
    const insRate = inputs.homeInsuranceRateAnnual / 12
    const denom = pmtFactor + insRate
    const priceWithLoan = denom > 0 ? (maxHousing - inputs.hoaMonthly + down * pmtFactor) / denom : 0
    if (priceWithLoan <= down) {
      // All-cash scenario: no loan, price limited by down payment
      maxPrice = insRate > 0 ? Math.min(down, (maxHousing - inputs.hoaMonthly) / insRate) : down
    } else {
      maxPrice = Math.max(0, priceWithLoan)
    }
  }

  const downAmount = resolveDownPayment(
    maxPrice,
    inputs.downPaymentDollars,
    inputs.downPaymentPercent,
    inputs.downPaymentMode
  )
  const loanAmount = Math.max(0, maxPrice - downAmount)
  const monthlyPI = monthlyPayment(loanAmount, inputs.interestRatePercent, months)
  const monthlyIns = (maxPrice * inputs.homeInsuranceRateAnnual) / 12

  return {
    maxAffordablePrice: maxPrice,
    downPaymentAmount: downAmount,
    loanAmount,
    monthlyPrincipalInterest: monthlyPI,
    monthlyInsurance: monthlyIns,
    monthlyHOA: inputs.hoaMonthly,
    totalMonthlyHousing: monthlyPI + monthlyIns + inputs.hoaMonthly,
    dtiPercent: monthlyGross > 0 ? ((monthlyPI + monthlyIns + inputs.hoaMonthly) / monthlyGross) * 100 : 0,
    monthlyGrossIncome: monthlyGross,
  }
}
