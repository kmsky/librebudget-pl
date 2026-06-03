import { useState } from 'react'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { formatCurrency } from '../../utils/calculations'
import { parseLocaleAmount } from '../../utils/sanitize'
import { buildHighInterestPayoffPlan } from '../../utils/debtPayoffPlan'
import type { Debt } from '../../db/database'

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

interface HighInterestPayoffPlanProps {
  debts: Debt[]
  getEffectivePayment: (d: Debt) => number
}

export function HighInterestPayoffPlan({ debts, getEffectivePayment }: HighInterestPayoffPlanProps) {
  const [rateThreshold, setRateThreshold] = useState('10')
  const [extraMonthly, setExtraMonthly] = useState('100')
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche')
  const [expanded, setExpanded] = useState(true)

  const thresholdNum = Math.max(0, Math.min(50, parseLocaleAmount(rateThreshold) || 0))
  const extraNum = Math.max(0, parseLocaleAmount(extraMonthly) || 0)

  const plan = buildHighInterestPayoffPlan(debts, {
    rateThreshold: thresholdNum,
    extraMonthly: extraNum,
    strategy,
    getEffectivePayment,
  })

  const highInterestDebts = debts.filter((d) => d.balance > 0 && d.interestRate >= thresholdNum)
  const highInterestTotal = highInterestDebts.reduce((s, d) => s + d.balance, 0)

  if (debts.filter((d) => d.balance > 0).length === 0) return null

  return (
    <Card>
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2">
          <Icon name="Target" size={20} className="text-amber-400" />
          <h3 className="text-sm font-medium text-slate-200">High Interest Payoff Plan</h3>
        </div>
        <span className="text-slate-500 text-sm">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Interest threshold (% APR)</label>
              <input
                inputMode="decimal"
                value={rateThreshold}
                onChange={(e) => setRateThreshold(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={INPUT_CLASS}
                placeholder="10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Extra monthly payment</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
                <input
                  inputMode="decimal"
                  value={extraMonthly}
                  onChange={(e) => setExtraMonthly(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`${INPUT_CLASS} pl-8`}
                  placeholder="100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Strategy</label>
              <div className="flex gap-1 rounded-xl bg-slate-800 p-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setStrategy('avalanche')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    strategy === 'avalanche' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Avalanche
                </button>
                <button
                  onClick={() => setStrategy('snowball')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    strategy === 'snowball' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Snowball
                </button>
              </div>
            </div>
          </div>

          {plan.steps.length === 0 ? (
            <p className="rounded-xl bg-slate-800/50 p-4 text-center text-sm text-slate-400">
              No debts at {thresholdNum}%+ APR. Adjust the threshold or add high-interest debts.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 rounded-xl bg-slate-800/50 p-4">
                <div>
                  <p className="text-xs text-slate-500">High-interest total</p>
                  <p className="text-lg font-semibold text-amber-400">{formatCurrency(highInterestTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Months to clear</p>
                  <p className="text-lg font-semibold text-slate-200">{plan.totalMonths}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Est. interest cost</p>
                  <p className="text-lg font-semibold text-orange-400">{formatCurrency(plan.totalInterest)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Projected done</p>
                  <p className="text-lg font-semibold text-green-400">{plan.completionDate}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">Payoff order</p>
                {plan.steps.map((step, i) => (
                  <div
                    key={step.debtId ?? i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-800/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                        {i + 1}
                      </span>
                      <span className="font-medium text-slate-200">{step.name}</span>
                      <span className="text-xs text-slate-500">{step.interestRate}% APR</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-400">{formatCurrency(step.balance)}</span>
                      <span className="text-slate-500">
                        {step.monthsToPayoff} mo · {formatCurrency(step.monthlyPayment)}/mo
                      </span>
                      <span className="text-orange-400">{formatCurrency(step.interestCost)} interest</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
