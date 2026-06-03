import { format, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns'
import { db } from '../db/database'
import { sumByType } from './calculations'
import { getMonthlyForecast } from './forecasting'
import type { Transaction } from '../db/database'

export type Severity = 'high' | 'medium' | 'low'

export interface Finding {
  id: string
  title: string
  severity: Severity
  description: string
  penaltyAmount: number
}

export interface FinancialRiskResult {
  score: number
  grade: string
  findings: Finding[]
}

const GRADE_RANGES: { min: number; label: string }[] = [
  { min: 9, label: 'Minimal' },
  { min: 7, label: 'Low' },
  { min: 5, label: 'Medium' },
  { min: 3, label: 'High' },
  { min: 0, label: 'Critical' },
]

/** Severity → flat penalty used by non-proportional checks. */
const SEVERITY_PENALTY: Record<Severity, number> = {
  high: 3.0,
  medium: 1.5,
  low: 0.5,
}

function getGrade(score: number): string {
  for (const g of GRADE_RANGES) {
    if (score >= g.min) return g.label
  }
  return 'Critical'
}

// ---------------------------------------------------------------------------
// Math utilities
// ---------------------------------------------------------------------------

/** Clamps a number between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Linear interpolation penalty.
 * Returns 0 when value ≤ thresholdStart, maxPenalty when value ≥ thresholdMax,
 * and scales proportionally in between.
 */
export function calculateProportionalPenalty(
  value: number,
  thresholdStart: number,
  thresholdMax: number,
  maxPenalty: number,
): number {
  if (value <= thresholdStart) return 0
  if (value >= thresholdMax) return maxPenalty
  return ((value - thresholdStart) / (thresholdMax - thresholdStart)) * maxPenalty
}

// ---------------------------------------------------------------------------
// Check helpers
// ---------------------------------------------------------------------------


function checkNoEmergencyFund(
  savingsGoals: { type: string; currentAmount: number }[],
): Finding[] {
  const hasEmergencyFund = savingsGoals.some(
    (g) => g.type === 'emergency_fund' && g.currentAmount > 0,
  )
  if (hasEmergencyFund) return []
  const severity: Severity = 'high'
  return [{
    id: 'no-emergency-fund',
    title: 'No emergency fund',
    severity,
    penaltyAmount: SEVERITY_PENALTY[severity],
    description: 'Add an emergency fund to protect against unexpected expenses.',
  }]
}

/**
 * Proportional: penalty scales continuously from 0 (at 6 months coverage)
 * to 3.0 pts (at 0 months coverage). Severity threshold at 3 months.
 */
function checkEmergencyFund(
  totalSavings: number,
  avgMonthlyExpenses: number,
): Finding[] {
  if (avgMonthlyExpenses <= 0) return []
  const months = totalSavings / avgMonthlyExpenses
  if (months >= 6) return []

  // Shortfall from the 6-month ideal (0 → 6 months short → 3.0 pts)
  const shortfall = 6 - months
  const penalty = calculateProportionalPenalty(shortfall, 0, 6, 3.0)
  const severity: Severity = months < 3 ? 'high' : 'medium'

  return [{
    id: months < 3 ? 'emergency-fund-high' : 'emergency-fund-medium',
    title: 'Low emergency fund',
    severity,
    penaltyAmount: penalty,
    description: `Savings cover ${months.toFixed(1)} months of expenses. Target: ${months < 3 ? '3+' : '6+'} months.`,
  }]
}

/**
 * Proportional: penalty scales continuously from 0 (at 36% DTI)
 * to 3.0 pts (at 80%+ DTI). Severity threshold at 43%.
 */
function checkDebtToIncome(totalMinPayment: number, totalIncome: number): Finding[] {
  if (totalIncome <= 0) return []
  const ratio = (totalMinPayment / totalIncome) * 100
  if (ratio < 36) return []

  // Scale from 36% (0 pts) to 80% (3.0 pts cap)
  const penalty = calculateProportionalPenalty(ratio, 36, 80, 3.0)
  const severity: Severity = ratio > 43 ? 'high' : 'medium'

  return [{
    id: ratio > 43 ? 'debt-to-income-high' : 'debt-to-income-medium',
    title: 'High debt-to-income',
    severity,
    penaltyAmount: penalty,
    description: `Debt payments are ${ratio.toFixed(0)}% of income (threshold: 36%).`,
  }]
}

function checkCreditScore(score: number): Finding[] {
  if (score < 580) {
    const severity: Severity = 'high'
    return [{
      id: 'credit-poor',
      title: 'Poor credit score',
      severity,
      penaltyAmount: SEVERITY_PENALTY[severity],
      description: `Score ${score} is below 580 (Poor).`,
    }]
  }
  if (score < 670) {
    const severity: Severity = 'medium'
    return [{
      id: 'credit-fair',
      title: 'Fair credit score',
      severity,
      penaltyAmount: SEVERITY_PENALTY[severity],
      description: `Score ${score} is in Fair range (580–669).`,
    }]
  }
  return []
}

/**
 * Stepped, uncapped: penalty increases in 0.5 pt increments based on % over budget.
 * Score is clamped at 0 by the engine, so this can exceed remaining points.
 *
 *   0–5%   over → 0.5 pts  (Low)
 *   5–10%  over → 1.0 pts  (Low)
 *   10%+   over → 1.5 pts, then +0.5 per additional 10% over budget
 *
 * Examples: 20% over → 2.0, 50% over → 3.5, 100% over → 6.0, 150% over → 8.5
 */
function checkBudgetOverrun(projectedExpenses: number, budget: number): Finding[] {
  if (projectedExpenses <= budget || budget <= 0) return []

  const overrunPct = ((projectedExpenses - budget) / budget) * 100

  let penalty: number
  if (overrunPct < 5) {
    penalty = 0.5
  } else if (overrunPct < 10) {
    penalty = 1.0
  } else {
    // 1.5 pts at 10%, then +0.5 for each additional 10% beyond that, capped at 10
    penalty = Math.min(1.5 + Math.floor((overrunPct - 10) / 10) * 0.5, 10)
  }

  const severity: Severity = penalty >= 2.5 ? 'high' : penalty >= 1.5 ? 'medium' : 'low'

  return [{
    id: 'budget-overrun',
    title: 'Budget overrun',
    severity,
    penaltyAmount: penalty,
    description: `Projected spend ($${projectedExpenses.toFixed(0)}) exceeds budget ($${budget.toFixed(0)}) by ${overrunPct.toFixed(0)}%.`,
  }]
}

function checkDominantExpenseCategory(
  transactions: Transaction[],
  catMap: Map<number, { name: string; group: string }>,
): Finding[] {
  const expenseByCat: Record<number, number> = {}
  let totalExpenses = 0
  for (const t of transactions) {
    if (t.type === 'expense') {
      const cat = catMap.get(t.categoryId)
      if (cat?.group === 'savings') continue
      expenseByCat[t.categoryId] = (expenseByCat[t.categoryId] || 0) + t.amount
      totalExpenses += t.amount
    }
  }
  if (totalExpenses <= 0) return []

  for (const [catId, amount] of Object.entries(expenseByCat)) {
    const pct = (amount / totalExpenses) * 100
    if (pct > 50) {
      const name = catMap.get(Number(catId))?.name ?? 'Unknown'
      const severity: Severity = 'low'
      return [{
        id: 'dominant-expense',
        title: 'Dominant expense category',
        severity,
        penaltyAmount: SEVERITY_PENALTY[severity],
        description: `${name} is ${pct.toFixed(0)}% of expenses.`,
      }]
    }
  }
  return []
}

function checkSavingsRate(totalIncome: number, totalExpenses: number): Finding[] {
  if (totalIncome <= 0) return []
  const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100
  if (savingsRate < 0) {
    const severity: Severity = 'high'
    return [{
      id: 'negative-savings',
      title: 'Negative savings rate',
      severity,
      penaltyAmount: SEVERITY_PENALTY[severity],
      description: 'Spending exceeds income.',
    }]
  }
  if (savingsRate < 10) {
    const severity: Severity = 'low'
    return [{
      id: 'low-savings',
      title: 'Low savings rate',
      severity,
      penaltyAmount: SEVERITY_PENALTY[severity],
      description: `Savings rate is ${savingsRate.toFixed(1)}% (<10%).`,
    }]
  }
  return []
}

function checkNoRecentData(hasRecentTx: boolean): Finding[] {
  if (hasRecentTx) return []
  const severity: Severity = 'low'
  return [{
    id: 'no-recent-data',
    title: 'No recent data',
    severity,
    penaltyAmount: SEVERITY_PENALTY[severity],
    description: 'No transactions in the last 30 days.',
  }]
}

// ---------------------------------------------------------------------------
// Main scoring engine
// ---------------------------------------------------------------------------

export async function getFinancialRiskScore(): Promise<FinancialRiskResult> {
  const now = new Date()
  const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const thisMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd')

  const [
    currentTxs,
    savingsGoals,
    debts,
    creditScores,
    settings,
    categories,
    recentTxs,
  ] = await Promise.all([
    db.transactions.where('date').between(thisMonthStart, thisMonthEnd, true, true).toArray(),
    db.savingsGoals.toArray(),
    db.debts.toArray(),
    db.creditScores.orderBy('date').toArray(),
    db.settings.toArray(),
    db.categories.toArray(),
    db.transactions.where('date').between(thirtyDaysAgo, thisMonthEnd, true, true).toArray(),
  ])

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  const monthlyBudget = parseFloat(settingsMap['monthlyBudget'] ?? '6000')
  const catMap = new Map(
    categories
      .filter((c): c is typeof c & { id: number } => c.id != null)
      .map((c) => [c.id, { name: c.name, group: c.group }]),
  )

  const totalIncome = sumByType(currentTxs, 'income')
  const totalExpenses = sumByType(currentTxs, 'expense')
  const totalSavings = savingsGoals.reduce((s, g) => s + g.currentAmount, 0)
  const totalMinPayment = debts.reduce((s, d) => s + d.minimumPayment, 0)
  const latestCredit = creditScores.length > 0 ? creditScores[creditScores.length - 1] : null

  let avgMonthlyExpenses = totalExpenses
  const pastMonths: { expenses: number }[] = []
  for (let i = 1; i <= 3; i++) {
    const d = subMonths(now, i)
    const ms = format(startOfMonth(d), 'yyyy-MM-dd')
    const me = format(endOfMonth(d), 'yyyy-MM-dd')
    const txs = await db.transactions.where('date').between(ms, me, true, true).toArray()
    pastMonths.push({ expenses: sumByType(txs, 'expense') })
  }
  if (pastMonths.length > 0) {
    const currentOrPast = [totalExpenses, ...pastMonths.map((m) => m.expenses)]
    avgMonthlyExpenses = currentOrPast.reduce((a, b) => a + b, 0) / currentOrPast.length
  }

  const forecast = await getMonthlyForecast(monthlyBudget)
  const hasRecentTx = recentTxs.length > 0

  const emergencyFundFindings = checkNoEmergencyFund(savingsGoals).length > 0
    ? checkNoEmergencyFund(savingsGoals)
    : checkEmergencyFund(totalSavings, avgMonthlyExpenses)

  const allFindings: Finding[] = [
    ...emergencyFundFindings,
    ...(debts.length > 0 ? checkDebtToIncome(totalMinPayment, totalIncome) : []),
    ...(latestCredit ? checkCreditScore(latestCredit.score) : []),
    ...checkBudgetOverrun(forecast.projectedExpenses, forecast.effectiveBudget),
    ...checkDominantExpenseCategory(currentTxs, catMap),
    ...checkSavingsRate(totalIncome, totalExpenses),
    ...checkNoRecentData(hasRecentTx),
  ]

  // Sort ascending so small findings consume the pool first; large uncapped
  // findings (e.g. budget overrun) render last and only show what remains.
  allFindings.sort((a, b) => a.penaltyAmount - b.penaltyAmount)

  const totalPenalty = allFindings.reduce((sum, f) => sum + f.penaltyAmount, 0)
  const score = Math.round(clamp(10 - totalPenalty, 0, 10) * 10) / 10

  return {
    score,
    grade: getGrade(score),
    findings: allFindings,
  }
}
