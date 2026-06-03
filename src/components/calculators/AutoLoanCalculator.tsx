import { useState, useEffect, useRef } from 'react'
import { Card } from '../ui/Card'
import { formatCurrency, getCurrentMonth } from '../../utils/calculations'
import {
  evaluateAutoLoan,
  resolveDownPayment,
  maxPrincipalForPayment,
  type DownPaymentMode,
} from '../../utils/autoLoan'
import { parseLocaleAmount } from '../../utils/sanitize'
import { useSettings } from '../../hooks/useSettings'
import { Check, X, Car, DollarSign, Percent, TableProperties } from 'lucide-react'

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

const CAPS = {
  carPrice: 2_000_000,
  downPaymentDollars: 2_000_000,
  interestRatePercent: 30,
  loanTermMonths: 96,
  monthlyIncome: 500_000,
} as const

function clamp(value: number, max: number): number {
  return isNaN(value) ? 0 : Math.max(0, Math.min(value, max))
}

export function AutoLoanCalculator() {
  const { settings } = useSettings()
  const month = getCurrentMonth()
  const monthOverride = settings[`monthlyBudget-${month}`]
  const defaultStored = settings['monthlyBudget']
  const budgetForPrefill =
    monthOverride != null ? parseFloat(monthOverride)
      : defaultStored != null ? parseFloat(defaultStored) : 0

  const [carPrice, setCarPrice] = useState('')
  const [downPaymentMode, setDownPaymentMode] = useState<DownPaymentMode>('percent')
  const [downPaymentDollars, setDownPaymentDollars] = useState('')
  const [downPaymentPercent, setDownPaymentPercent] = useState('20')
  const [interestRate, setInterestRate] = useState('')
  const [loanTermMonths, setLoanTermMonths] = useState('36')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const prefilled = useRef(false)
  useEffect(() => {
    if (!prefilled.current && monthlyIncome === '' && budgetForPrefill > 0) {
      prefilled.current = true
      setMonthlyIncome(String(Math.round(budgetForPrefill)))
    }
  }, [budgetForPrefill, monthlyIncome])

  const carPriceNum = clamp(parseLocaleAmount(carPrice) || 0, CAPS.carPrice)
  const downPaymentDollarsNum = clamp(parseLocaleAmount(downPaymentDollars) || 0, CAPS.downPaymentDollars)
  const downPaymentPercentNum = Math.max(0, Math.min(100, parseLocaleAmount(downPaymentPercent) || 0))
  const interestRateNum = clamp(parseLocaleAmount(interestRate) || 0, CAPS.interestRatePercent)
  const loanTermNum = Math.max(1, Math.min(CAPS.loanTermMonths, Math.round(parseFloat(loanTermMonths) || 0)))
  const monthlyIncomeNum = clamp(parseLocaleAmount(monthlyIncome) || 0, CAPS.monthlyIncome)

  const result =
    carPriceNum > 0 && loanTermNum > 0
      ? evaluateAutoLoan({
          carPrice: carPriceNum, downPaymentDollars: downPaymentDollarsNum,
          downPaymentPercent: downPaymentPercentNum, downPaymentMode,
          interestRatePercent: interestRateNum, loanTermMonths: loanTermNum,
          monthlyIncome: monthlyIncomeNum,
        })
      : null

  const downPaymentAmount =
    carPriceNum > 0
      ? resolveDownPayment(carPriceNum, downPaymentDollarsNum, downPaymentPercentNum, downPaymentMode)
      : 0

  const allPass = result ? result.rule1.pass && result.rule2.pass && result.rule3.pass : false
  const passCount = result ? [result.rule1.pass, result.rule2.pass, result.rule3.pass].filter(Boolean).length : 0

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Card data-tour="auto-inputs">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
            <Car size={20} className="text-orange-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-200">Auto Loan Details</h2>
            <p className="text-xs text-slate-500 leading-relaxed">Evaluate against the 20/3/8 rule</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Car price (zł)</label>
              <input inputMode="decimal" value={carPrice}
                onChange={(e) => setCarPrice(e.target.value)}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.carPrice) setCarPrice(String(CAPS.carPrice)) }}
                placeholder="80000" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                Monthly net income (zł)
                {budgetForPrefill > 0 && Math.abs((parseLocaleAmount(monthlyIncome) || 0) - budgetForPrefill) < 1 && (
                  <span className="ml-1.5 text-xs text-slate-600">(from budget)</span>
                )}
              </label>
              <input inputMode="decimal" value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.monthlyIncome) setMonthlyIncome(String(CAPS.monthlyIncome)) }}
                placeholder="8000" className={INPUT} />
            </div>
          </div>

          {/* Down payment */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Down payment</label>
            <div className="flex gap-2 rounded-xl bg-slate-800 p-1 mb-2">
              {(['percent', 'dollar'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setDownPaymentMode(m)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${downPaymentMode === m ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                  {m === 'percent' ? '%' : 'zł'}
                </button>
              ))}
            </div>
            {downPaymentMode === 'percent' ? (
              <input inputMode="decimal" value={downPaymentPercent}
                onChange={(e) => setDownPaymentPercent(e.target.value)}
                placeholder="20" className={INPUT} />
            ) : (
              <input inputMode="decimal" value={downPaymentDollars}
                onChange={(e) => setDownPaymentDollars(e.target.value)}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.downPaymentDollars) setDownPaymentDollars(String(CAPS.downPaymentDollars)) }}
                placeholder="16000" className={INPUT} />
            )}
            {carPriceNum > 0 && (
              <p className="text-xs text-slate-500 mt-1">= {formatCurrency(downPaymentAmount)} down</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Interest rate (%)</label>
              <input inputMode="decimal" value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.interestRatePercent) setInterestRate(String(CAPS.interestRatePercent)) }}
                placeholder="7,5" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Loan term (months)</label>
              <input type="number" step="1" min="1" max={CAPS.loanTermMonths} value={loanTermMonths}
                onChange={(e) => setLoanTermMonths(e.target.value)}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v)) { if (v > CAPS.loanTermMonths) setLoanTermMonths(String(CAPS.loanTermMonths)); else if (v < 1) setLoanTermMonths('1') } }}
                placeholder="36" className={INPUT} />
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <Card data-tour="auto-results">
          <div className="flex items-start gap-3 mb-5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${allPass ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <DollarSign size={20} className={allPass ? 'text-green-400' : 'text-red-400'} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-200">Loan Analysis</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {passCount}/3 rules passed
              </p>
            </div>
          </div>

          {/* Payment card */}
          <div className={`rounded-xl border p-4 mb-5 ${allPass ? 'border-green-500/20 bg-green-500/5' : 'border-orange-500/20 bg-orange-500/5'}`}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className={allPass ? 'text-green-400' : 'text-orange-400'} />
              <p className="text-xs text-slate-400">Estimated monthly payment</p>
            </div>
            <p className={`text-2xl font-bold ${allPass ? 'text-green-400' : 'text-orange-400'}`}>
              {formatCurrency(result.monthlyPayment)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Principal: {formatCurrency(result.principal)}
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Percent size={14} className="text-slate-500" />
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">20/3/8 Rule Checklist</p>
            </div>

            {[
              {
                rule: result.rule1,
                title: 'Down payment ≥ 20%',
                passMsg: `${formatCurrency(result.downPaymentAmount)} meets 20% (${formatCurrency(result.rule1.required)})`,
                failMsg: `Increase by ${formatCurrency(result.rule1.shortfall)} to reach ${formatCurrency(result.rule1.required)}`,
              },
              {
                rule: result.rule2,
                title: `Term ≤ ${result.rule2.maxMonths} months`,
                passMsg: `${loanTermNum} months is within limit`,
                failMsg: `Reduce by ${result.rule2.excess} months (max ${result.rule2.maxMonths})`,
              },
              {
                rule: result.rule3,
                title: 'Payment ≤ 8% of income',
                passMsg: `${formatCurrency(result.monthlyPayment)} ≤ 8% (${formatCurrency(result.rule3.maxPayment)})`,
                failMsg: monthlyIncomeNum > 0
                  ? `Reduce by ${formatCurrency(result.rule3.excess)} — need income ≥ ${formatCurrency(result.monthlyPayment / 0.08)}/mo`
                  : 'Enter monthly income to check',
              },
            ].map(({ rule, title, passMsg, failMsg }, i) => (
              <div key={i}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${rule.pass ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5 ${rule.pass ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                  {rule.pass
                    ? <Check size={14} className="text-green-400" strokeWidth={2.5} />
                    : <X size={14} className="text-red-400" strokeWidth={2.5} />}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${rule.pass ? 'text-green-400' : 'text-red-400'}`}>{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{rule.pass ? passMsg : failMsg}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Max affordable table */}
      {monthlyIncomeNum > 0 && loanTermNum > 0 && (
        <Card data-tour="auto-table">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <TableProperties size={20} className="text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-200">Max Affordable Estimates</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                8% of income = {formatCurrency(monthlyIncomeNum * 0.08)}/mo for {loanTermNum} months
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/30">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Rate</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Max Loan</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Max Price</th>
                </tr>
              </thead>
              <tbody>
                {[2, 4, 6, 8, 10, 12].map((rate) => {
                  const maxPrincipal = maxPrincipalForPayment(monthlyIncomeNum * 0.08, rate, loanTermNum)
                  const maxCarPrice =
                    downPaymentMode === 'dollar'
                      ? maxPrincipal + downPaymentDollarsNum
                      : downPaymentPercentNum < 100
                        ? maxPrincipal / (1 - downPaymentPercentNum / 100)
                        : maxPrincipal
                  return (
                    <tr key={rate} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400">{rate}%</td>
                      <td className="py-2.5 px-4 text-right text-slate-300 font-medium tabular-nums">{formatCurrency(maxPrincipal)}</td>
                      <td className="py-2.5 px-4 text-right text-green-400 font-medium tabular-nums">{formatCurrency(maxCarPrice)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
