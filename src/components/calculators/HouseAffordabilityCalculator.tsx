import { useEffect, useRef } from 'react'
import { Card } from '../ui/Card'
import { formatCurrency } from '../../utils/calculations'
import { parseLocaleAmount } from '../../utils/sanitize'
import { maxAffordableHomePrice } from '../../utils/houseAffordability'
import { useHouseCalculatorState } from '../../hooks/useHouseCalculatorState'
import { useSettings } from '../../hooks/useSettings'
import { Home, DollarSign, Percent, Building2 } from 'lucide-react'

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

const CAPS = {
  agi: 10_000_000,
  downPaymentDollars: 5_000_000,
  interestRatePercent: 30,
  loanTermYears: 35,
  homeInsurancePercent: 2,
  hoaDues: 10_000,
} as const

function clamp(value: number, max: number): number {
  return isNaN(value) ? 0 : Math.max(0, Math.min(value, max))
}

export function HouseAffordabilityCalculator() {
  const { state, updateState } = useHouseCalculatorState()
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
  const downPaymentDollarsNum = clamp(parseLocaleAmount(state.downPaymentDollars) || 0, CAPS.downPaymentDollars)
  const downPaymentPercentNum = Math.max(0, Math.min(100, parseLocaleAmount(state.downPaymentPercent) || 0))
  const interestRateNum = clamp(parseLocaleAmount(state.interestRate) || 0, CAPS.interestRatePercent)
  const loanTermYearsNum = Math.max(1, Math.min(CAPS.loanTermYears, Math.round(parseFloat(state.loanTermYears) || 0)))
  const homeInsuranceRateNum = clamp(parseLocaleAmount(state.homeInsuranceRate) || 0, CAPS.homeInsurancePercent)
  const hoaDuesNum = clamp(parseLocaleAmount(state.hoaDues) || 0, CAPS.hoaDues)

  const homeInsuranceRate = homeInsuranceRateNum / 100

  const result =
    agiNum > 0 && loanTermYearsNum > 0
      ? maxAffordableHomePrice({
          agiAnnual: agiNum, downPaymentDollars: downPaymentDollarsNum,
          downPaymentPercent: downPaymentPercentNum, downPaymentMode: state.downPaymentMode,
          interestRatePercent: interestRateNum, loanTermYears: loanTermYearsNum,
          homeInsuranceRateAnnual: homeInsuranceRate,
          hoaMonthly: hoaDuesNum, dtiPercent: 28,
        })
      : null

  return (
    <div className="space-y-4">
      {/* Income & Loan */}
      <Card data-tour="home-income">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <Home size={20} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-200">Dochód i kredyt</h2>
            <p className="text-xs text-slate-500 leading-relaxed">Reguła DTI front-end 28% dla kosztów mieszkaniowych</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Roczny dochód netto (zł)</label>
            <input inputMode="decimal" value={state.agi}
              onChange={(e) => updateState({ agi: e.target.value })}
              onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.agi) updateState({ agi: String(CAPS.agi) }) }}
              placeholder={budgetForPrefill > 0 ? String(Math.round(budgetForPrefill * 12)) : '96000'}
              className={INPUT} />
            {budgetForPrefill > 0 && (
              <p className="text-xs text-slate-600 mt-1">~{formatCurrency(budgetForPrefill * 12)}/rok z miesięcznego budżetu</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Wkład własny</label>
            <div className="flex gap-2 rounded-xl bg-slate-800 p-1 mb-2">
              {(['percent', 'dollar'] as const).map((m) => (
                <button key={m} type="button" onClick={() => updateState({ downPaymentMode: m })}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${state.downPaymentMode === m ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                  {m === 'percent' ? '%' : 'zł'}
                </button>
              ))}
            </div>
            {state.downPaymentMode === 'percent' ? (
              <input inputMode="decimal" value={state.downPaymentPercent}
                onChange={(e) => updateState({ downPaymentPercent: e.target.value })}
                placeholder="20" className={INPUT} />
            ) : (
              <input inputMode="decimal" value={state.downPaymentDollars}
                onChange={(e) => updateState({ downPaymentDollars: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.downPaymentDollars) updateState({ downPaymentDollars: String(CAPS.downPaymentDollars) }) }}
                placeholder="120000" className={INPUT} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Oprocentowanie (%)</label>
              <input inputMode="decimal" value={state.interestRate}
                onChange={(e) => updateState({ interestRate: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.interestRatePercent) updateState({ interestRate: String(CAPS.interestRatePercent) }) }}
                placeholder="7,5" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Okres kredytu (lata)</label>
              <input type="number" step="1" min="1" max={CAPS.loanTermYears} value={state.loanTermYears}
                onChange={(e) => updateState({ loanTermYears: e.target.value })}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v)) { if (v > CAPS.loanTermYears) updateState({ loanTermYears: String(CAPS.loanTermYears) }); else if (v < 1) updateState({ loanTermYears: '1' }) } }}
                placeholder="30" className={INPUT} />
            </div>
          </div>
        </div>
      </Card>

      {/* Costs */}
      <Card data-tour="home-costs">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <Percent size={20} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-200">Koszty stałe</h2>
            <p className="text-xs text-slate-500 leading-relaxed">Ubezpieczenie i czynsz administracyjny</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Ubezpieczenie nieruchomości (%/rok)</label>
              <input inputMode="decimal" value={state.homeInsuranceRate}
                onChange={(e) => updateState({ homeInsuranceRate: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.homeInsurancePercent) updateState({ homeInsuranceRate: String(CAPS.homeInsurancePercent) }) }}
                placeholder="0,08" className={INPUT} />
              <p className="text-xs text-slate-600 mt-1">Typowo: 0,05–0,15%</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Czynsz administracyjny (zł/mies.)</label>
              <input inputMode="decimal" value={state.hoaDues}
                onChange={(e) => updateState({ hoaDues: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.hoaDues) updateState({ hoaDues: String(CAPS.hoaDues) }) }}
                placeholder="0" className={INPUT} />
            </div>
          </div>
        </div>
      </Card>

      {/* Result */}
      {result && result.maxAffordablePrice > 0 && (
        <Card data-tour="home-result">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
              <Building2 size={20} className="text-green-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-200">Wynik zdolności zakupu</h2>
              <p className="text-xs text-slate-500 leading-relaxed">Na podstawie reguły DTI front-end 28%</p>
            </div>
          </div>

          {/* Max price */}
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <DollarSign size={14} className="text-green-400" />
              <p className="text-xs text-slate-400">Maksymalna cena nieruchomości w zasięgu</p>
            </div>
            <p className="text-3xl font-bold text-green-400">{formatCurrency(result.maxAffordablePrice)}</p>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span>Wkład własny: {formatCurrency(result.downPaymentAmount)}</span>
              <span>Kredyt: {formatCurrency(result.loanAmount)}</span>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Percent size={14} className="text-slate-500" />
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Miesięczny podział</p>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Kapitał i odsetki', value: result.monthlyPrincipalInterest, color: 'text-slate-300' },
                { label: 'Ubezpieczenie', value: result.monthlyInsurance, color: 'text-slate-300' },
                { label: 'Czynsz administracyjny', value: result.monthlyHOA, color: 'text-slate-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-800/30">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`text-sm font-medium tabular-nums ${color}`}>{formatCurrency(value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-slate-700/50 bg-slate-800/50">
                <span className="text-sm font-medium text-slate-300">Łączne koszty mieszkaniowe</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-400 tabular-nums">{formatCurrency(result.totalMonthlyHousing)}</span>
                  <span className="text-xs text-slate-500 ml-1.5">/mies.</span>
                  <p className="text-xs text-slate-500">{result.dtiPercent.toFixed(1)}% dochodu netto</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
