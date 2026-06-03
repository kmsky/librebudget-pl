import { useEffect, useRef } from 'react'
import { Card } from '../ui/Card'
import { formatCurrency } from '../../utils/calculations'
import { maxAffordableRent } from '../../utils/rentAffordability'
import { parseLocaleAmount } from '../../utils/sanitize'
import { useRentCalculatorState } from '../../hooks/useRentCalculatorState'
import { useSettings } from '../../hooks/useSettings'
import { Home, DollarSign } from 'lucide-react'

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

const CAPS = { agi: 10_000_000 } as const

function clamp(value: number, max: number): number {
  return isNaN(value) ? 0 : Math.max(0, Math.min(value, max))
}

export function RentAffordabilityCalculator() {
  const { state, updateState } = useRentCalculatorState()
  const { settings } = useSettings()
  const monthOverride = settings[`monthlyBudget-${new Date().toISOString().slice(0, 7)}`]
  const defaultStored = settings['monthlyBudget']
  const budgetForPrefill =
    monthOverride != null ? parseFloat(monthOverride)
      : defaultStored != null ? parseFloat(defaultStored) : 0

  const prefilled = useRef(false)
  useEffect(() => {
    if (!prefilled.current && state.agi === '' && budgetForPrefill > 0) {
      prefilled.current = true
      updateState({ agi: String(Math.round(budgetForPrefill * 12)) })
    }
  }, [budgetForPrefill, state.agi, updateState])

  const agiNum = clamp(parseLocaleAmount(state.agi) || 0, CAPS.agi)
  const result = agiNum > 0 ? maxAffordableRent({ agiAnnual: agiNum, dtiPercent: 30 }) : null

  return (
    <div className="space-y-4">
      <Card data-tour="rent-input">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <Home size={20} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-200">Rent Affordability</h2>
            <p className="text-xs text-slate-500 leading-relaxed">Rent should not exceed 30% of net monthly income</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Annual net income (zł)</label>
            <input inputMode="decimal" value={state.agi}
              onChange={(e) => updateState({ agi: e.target.value })}
              onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.agi) updateState({ agi: String(CAPS.agi) }) }}
              placeholder={budgetForPrefill > 0 ? String(Math.round(budgetForPrefill * 12)) : '96000'}
              className={INPUT} />
            {budgetForPrefill > 0 && (
              <p className="text-xs text-slate-600 mt-1">~{formatCurrency(budgetForPrefill * 12)}/year from monthly budget</p>
            )}
          </div>
        </div>
      </Card>

      {result && (
        <Card data-tour="rent-result">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
              <DollarSign size={20} className="text-green-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-200">Max Affordable Rent</h2>
              <p className="text-xs text-slate-500 leading-relaxed">Based on the 30% DTI rule</p>
            </div>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <DollarSign size={14} className="text-green-400" />
              <p className="text-xs text-slate-400">Maximum monthly rent</p>
            </div>
            <p className="text-3xl font-bold text-green-400">{formatCurrency(result.maxMonthlyRent)}<span className="text-lg font-normal text-slate-500 ml-1">/mo</span></p>
            <p className="text-xs text-slate-500 mt-2">
              {result.dtiPercent}% of {formatCurrency(result.monthlyGrossIncome)}/mo net income
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
