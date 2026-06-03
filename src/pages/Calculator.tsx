import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/ui/Card'
import { formatCurrency } from '../utils/calculations'
import { futureValue } from '../utils/compoundInterest'
import { runMonteCarloSimulation, type MonteCarloResult } from '../utils/monteCarlo'
import { MonteCarloResults } from '../components/calculators/MonteCarloResults'
import { useCalculatorState } from '../hooks/useCalculatorState'
import { parseLocaleAmount } from '../utils/sanitize'
import { useHomeHousingType } from '../hooks/useHomeHousingType'
import { AutoLoanCalculator } from '../components/calculators/AutoLoanCalculator'
import { HouseAffordabilityCalculator } from '../components/calculators/HouseAffordabilityCalculator'
import { RentAffordabilityCalculator } from '../components/calculators/RentAffordabilityCalculator'
import {
  Target, TrendingUp, Calendar,
  ChevronDown, Shuffle, Clock, Percent, HelpCircle,
} from 'lucide-react'
import { InfoTip } from '../components/ui/InfoTip'
import { GuidedTour, type TourStep } from '../components/ui/GuidedTour'

const STANDARD_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="compound-interest"]',
    title: 'Compound Interest',
    content: 'Enter your starting balance, regular contributions, and expected rate of return. Set the contribution frequency to monthly or yearly, and use the annual raise field to model increasing contributions over time.',
  },
]

const RETIREMENT_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="compound-interest"]',
    title: 'Your Starting Point',
    content: 'Enter your current savings balance, how much you contribute, and your expected rate of return. The annual raise field models salary growth increasing your contributions over time.',
  },
  {
    target: '[data-tour="retirement-timeline"]',
    title: 'Retirement Timeline',
    content: 'Set your current age and target retirement age. The visual timeline shows your accumulation phase (green) and retirement phase. Years to grow is calculated automatically.',
    optional: true,
  },
  {
    target: '[data-tour="know-your-number"]',
    title: 'Know Your Number',
    content: (
      <>
        <p>Choose how to plan withdrawals: <strong className="text-slate-200">By Rate</strong> uses a percentage of your portfolio (like the 4% rule), or <strong className="text-slate-200">By Income</strong> lets you set a specific annual income target.</p>
        <p className="mt-2">The projected portfolio box shows what your savings could grow to by retirement.</p>
      </>
    ),
    optional: true,
  },
  {
    target: '[data-tour="monte-carlo"]',
    title: 'Monte Carlo Simulation',
    content: (
      <>
        <p>Stress-test your plan across thousands of randomized scenarios. Configure market volatility, inflation, fees, and simulation count.</p>
        <p className="mt-2">Toggle <strong className="text-slate-200">Variable longevity</strong> to model lifespan uncertainty, and <strong className="text-slate-200">Sequence-of-returns risk</strong> to model realistic market crash clustering.</p>
      </>
    ),
    optional: true,
  },
]

const AUTO_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="auto-inputs"]',
    title: 'Auto Loan Details',
    content: 'Enter the car price, your monthly income, down payment, interest rate, and loan term. Your monthly income may be pre-filled from your budget settings.',
  },
  {
    target: '[data-tour="auto-results"]',
    title: 'Loan Analysis',
    content: (
      <>
        <p>See your estimated monthly payment and how it stacks up against the <strong className="text-slate-200">20/3/8 rule</strong>:</p>
        <p className="mt-1.5"><strong className="text-slate-200">20%</strong> down payment, <strong className="text-slate-200">3</strong>-year (36 month) max term, and payment under <strong className="text-slate-200">8%</strong> of monthly income.</p>
      </>
    ),
    optional: true,
  },
  {
    target: '[data-tour="auto-table"]',
    title: 'Max Affordable Estimates',
    content: 'This table shows the most expensive car you can afford at various interest rates while staying within the 8% income rule. It factors in your down payment and loan term.',
    optional: true,
  },
]

const HOME_OWN_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="home-income"]',
    title: 'Income & Loan',
    content: 'Enter your annual net income, down payment, mortgage interest rate, and loan term. The calculator uses the 28% front-end DTI rule to determine how much housing you can afford.',
  },
  {
    target: '[data-tour="home-costs"]',
    title: 'Recurring Costs',
    content: 'Add homeowners insurance and HOA dues. These reduce your borrowing capacity since they count toward the 28% housing limit.',
  },
  {
    target: '[data-tour="home-result"]',
    title: 'Affordability Result',
    content: 'See the maximum home price you can afford, plus a full monthly breakdown of principal & interest, insurance, and HOA.',
    optional: true,
  },
]

const HOME_RENT_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="rent-input"]',
    title: 'Your Income',
    content: 'Enter your annual net income. It may be pre-filled from your monthly budget settings. The calculator applies the 30% DTI rule to determine your max affordable rent.',
  },
  {
    target: '[data-tour="rent-result"]',
    title: 'Max Affordable Rent',
    content: 'This shows the maximum monthly rent you should pay based on the 30% rule — meaning no more than 30% of your net monthly income goes toward rent.',
    optional: true,
  },
]

const TARGET_RETIREMENT_AGES = [59.5, 60, 62, 65, 67, 70] as const
const WITHDRAWAL_RATE_OPTIONS = [1.5, 2, 2.5, 3, 3.5, 4] as const

const CAPS = {
  initialBalance: 999_999_999,
  contributionMonthly: 500_000,
  contributionYearly: 6_000_000,
  years: 80,
  annualRatePercent: 30,
  currentAge: 120,
  numTrials: 100_000,
} as const

function clamp(value: number, max: number): number {
  return isNaN(value) ? 0 : Math.max(0, Math.min(value, max))
}

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
        <Icon size={20} className="text-green-400" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-200">{title}</h2>
        <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  )
}

export default function Calculator() {
  const { state, updateState, reset } = useCalculatorState()
  const { housingType, setHousingType } = useHomeHousingType()
  const [autoResetKey, setAutoResetKey] = useState(0)
  const [homeResetKey, setHomeResetKey] = useState(0)
  const [mcsResult, setMcsResult] = useState<MonteCarloResult | null>(null)
  const [mcsRunning, setMcsRunning] = useState(false)
  const [mcsOpen, setMcsOpen] = useState(false)
  const mcsResultsRef = useRef<HTMLDivElement>(null)
  const [tourActive, setTourActive] = useState(false)

  const handleReset = () => {
    if (mode === 'autoLoan') setAutoResetKey((k) => k + 1)
    else if (mode === 'houseAffordability') setHomeResetKey((k) => k + 1)
    else { reset(); setMcsResult(null); setMcsOpen(false) }
  }

  const {
    mode, initialBalance, contribution, contributionFrequency,
    years, annualRate, withdrawalMode, withdrawalRatePercent, desiredAnnualIncome,
    currentAge, targetRetirementAge,
    contributionAnnualIncrease,
    returnStdDev, inflationMean, inflationStdDev, annualFee,
    endAge, numTrials, useVariableLongevity, useRegimeSwitching,
  } = state

  const contributionMax =
    contributionFrequency === 'monthly' ? CAPS.contributionMonthly : CAPS.contributionYearly

  useEffect(() => {
    const v = parseLocaleAmount(contribution)
    if (contribution !== '' && !isNaN(v) && v > contributionMax)
      updateState({ contribution: String(contributionMax) })
  }, [contributionFrequency, contribution, contributionMax, updateState])

  const initialBalanceNum = clamp(parseLocaleAmount(initialBalance) || 0, CAPS.initialBalance)
  const contributionNum = clamp(parseLocaleAmount(contribution) || 0, contributionMax)
  const contributionIncreaseNum = clamp(parseLocaleAmount(contributionAnnualIncrease) || 0, 20)
  const yearsNum = clamp(parseFloat(years) || 0, CAPS.years)
  const annualRateNum = clamp(parseLocaleAmount(annualRate) || 0, CAPS.annualRatePercent)
  const currentAgeNum = clamp(parseFloat(currentAge) || 0, CAPS.currentAge)
  const desiredIncomeNum = clamp(parseLocaleAmount(desiredAnnualIncome) || 0, 10_000_000)

  const yearsToGrow = mode === 'goalSeeker'
    ? targetRetirementAge - currentAgeNum
    : yearsNum

  const futureBalance =
    yearsNum > 0 || (mode === 'goalSeeker' && yearsToGrow > 0)
      ? futureValue({ initialBalance: initialBalanceNum, contribution: contributionNum, contributionFrequency, years: mode === 'goalSeeker' ? yearsToGrow : yearsNum, annualRatePercent: annualRateNum, annualRaisePercent: contributionIncreaseNum })
      : null

  // In goalSeeker mode, annual income is derived from projected portfolio × withdrawal rate
  const projectedAnnualIncome = futureBalance !== null && futureBalance > 0
    ? futureBalance * (withdrawalRatePercent / 100)
    : 0

  const goalSeekerInvalid = mode === 'goalSeeker' && currentAge !== '' && yearsToGrow <= 0

  // Clear stale Monte Carlo results when any input changes
  useEffect(() => {
    setMcsResult(null)
  }, [
    initialBalance, contribution, contributionFrequency, annualRate,
    currentAge, targetRetirementAge, withdrawalMode, withdrawalRatePercent, desiredAnnualIncome,
    contributionAnnualIncrease, returnStdDev, inflationMean, inflationStdDev,
    annualFee, endAge, numTrials, useVariableLongevity, useRegimeSwitching,
  ])

  // Monte Carlo
  const returnStdDevNum = clamp(parseLocaleAmount(returnStdDev) || 0, 50)
  const inflationMeanNum = clamp(parseLocaleAmount(inflationMean) || 0, 15)
  const inflationStdDevNum = clamp(parseLocaleAmount(inflationStdDev) || 0, 10)
  const annualFeeNum = clamp(parseLocaleAmount(annualFee) || 0, 5)
  const endAgeNum = clamp(parseFloat(endAge) || 90, 120)
  const numTrialsNum = Math.max(100, Math.min(CAPS.numTrials, parseInt(numTrials) || 1000))
  const annualContributionForMCS =
    contributionFrequency === 'monthly' ? contributionNum * 12 : contributionNum

  const canRunMCS =
    mode === 'goalSeeker' && currentAge !== '' && !isNaN(currentAgeNum) && currentAgeNum > 0 && yearsToGrow > 0 &&
    (withdrawalMode === 'rate' || desiredIncomeNum > 0)

  // Keep a ref to the latest simulation params so the setTimeout callback
  // never reads stale closure values from a previous render.
  const mcsParamsRef = useRef<Parameters<typeof runMonteCarloSimulation>[0] | null>(null)
  mcsParamsRef.current = {
    initialBalance: initialBalanceNum, annualContribution: annualContributionForMCS,
    meanReturnPercent: annualRateNum, returnStdDevPercent: returnStdDevNum,
    inflationMeanPercent: inflationMeanNum, inflationStdDevPercent: inflationStdDevNum,
    annualFeePercent: annualFeeNum, contributionIncreasePercent: contributionIncreaseNum,
    currentAge: currentAgeNum,
    retirementAge: targetRetirementAge, endAge: endAgeNum,
    withdrawalRatePercent,
    ...(withdrawalMode === 'income' && desiredIncomeNum > 0 ? { desiredAnnualIncome: desiredIncomeNum } : {}),
    numTrials: numTrialsNum,
    samplePaths: 15, useVariableLongevity, useRegimeSwitching,
  }

  const handleRunMCS = () => {
    if (!canRunMCS) return
    setMcsRunning(true)
    setTimeout(() => {
      const result = runMonteCarloSimulation(mcsParamsRef.current!)
      setMcsResult(result)
      setMcsRunning(false)
      setTimeout(() => {
        mcsResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }, 10)
  }

  // Hard-cap enforcement for simulations input
  const handleNumTrialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') { updateState({ numTrials: '' }); return }
    const v = parseInt(raw)
    if (isNaN(v)) return
    updateState({ numTrials: String(Math.min(v, CAPS.numTrials)) })
  }

  // Timeline progress for retirement mode
  const hasAges = currentAge !== '' && !isNaN(currentAgeNum) && currentAgeNum > 0
  const timelineTotal = hasAges ? endAgeNum - currentAgeNum : 0
  const timelineRetire = hasAges ? targetRetirementAge - currentAgeNum : 0
  const retirePct = timelineTotal > 0 ? Math.max(0, Math.min(100, (timelineRetire / timelineTotal) * 100)) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calculators</h1>
          <p className="text-sm text-slate-400">
            {mode === 'autoLoan' ? 'Auto evaluation (20/3/8 rule)'
              : mode === 'houseAffordability'
                ? housingType === 'renting' ? 'Max affordable rent (30% rule)' : 'Max affordable home price (28% DTI)'
                : mode === 'goalSeeker' ? 'Retirement planning & Monte Carlo analysis' : 'Compound interest calculator'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button type="button" onClick={() => { if (mode === 'goalSeeker') setMcsOpen(true); setTourActive(true) }}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            <HelpCircle size={15} />
            Guide
          </button>
          <button type="button" onClick={handleReset}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            Reset Calculator
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div data-tour="mode-toggle" className="flex gap-2 rounded-xl bg-slate-900 border border-slate-800 p-1">
        {[
          { key: 'standard' as const, label: 'Standard' },
          { key: 'goalSeeker' as const, label: 'Retirement' },
          { key: 'autoLoan' as const, label: 'Auto' },
          { key: 'houseAffordability' as const, label: 'Home' },
        ].map((t) => (
          <button key={t.key} type="button" onClick={() => updateState({ mode: t.key })}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === t.key ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Housing sub-toggle */}
      {mode === 'houseAffordability' && (
        <div className="flex gap-2 rounded-xl bg-slate-900 border border-slate-800 p-1">
          {(['owning', 'renting'] as const).map((h) => (
            <button key={h} type="button" onClick={() => setHousingType(h)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${housingType === h ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
              {h === 'owning' ? 'Owning' : 'Renting'}
            </button>
          ))}
        </div>
      )}

      {/* Auto / Home calculators */}
      {mode === 'autoLoan' ? (
        <AutoLoanCalculator key={autoResetKey} />
      ) : mode === 'houseAffordability' ? (
        housingType === 'renting' ? <RentAffordabilityCalculator key={homeResetKey} /> : <HouseAffordabilityCalculator key={homeResetKey} />
      ) : (
      <>
      {/* ─── Compound Interest Inputs ─── */}
      <Card data-tour="compound-interest">
        <SectionHeader
          icon={TrendingUp}
          title="Compound Interest"
          subtitle={mode === 'goalSeeker' ? 'Your starting point and growth assumptions' : 'Calculate future value with regular contributions'}
        />

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Initial balance (zł)</label>
              <input inputMode="decimal" value={initialBalance}
                onChange={(e) => updateState({ initialBalance: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.initialBalance) updateState({ initialBalance: String(CAPS.initialBalance) }) }}
                placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Contributions (zł)</label>
              <input inputMode="decimal" value={contribution}
                onChange={(e) => updateState({ contribution: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > contributionMax) updateState({ contribution: String(contributionMax) }) }}
                placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Frequency</label>
              <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
                {(['monthly', 'yearly'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => updateState({ contributionFrequency: f })}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${contributionFrequency === f ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    {f === 'monthly' ? 'Monthly' : 'Yearly'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${mode === 'standard' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
                Annual raise (%)
                <InfoTip>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Annual increase to your contributions, modeling salary raises or increased savings over time.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                    At 2%, a 1 000 zł/mo contribution becomes ~1 020 zł/mo next year. Average wage growth is 3-4% nominal. Set to 0% if your contributions are fixed.
                  </p>
                </InfoTip>
              </label>
              <input inputMode="decimal" value={contributionAnnualIncrease}
                onChange={(e) => updateState({ contributionAnnualIncrease: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > 20) updateState({ contributionAnnualIncrease: '20' }) }}
                placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
                Rate of return (%)
                {mode === 'goalSeeker' && (
                  <InfoTip>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Expected average annual return before inflation. This is used both for the deterministic target calculation and as the mean return in Monte Carlo simulations.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                      S&P 500 historical average: ~10% nominal, ~7% real (after inflation). A balanced portfolio (60/40 stocks/bonds) historically returns ~7-8% nominal.
                    </p>
                  </InfoTip>
                )}
              </label>
              <input inputMode="decimal" value={annualRate}
                onChange={(e) => updateState({ annualRate: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.annualRatePercent) updateState({ annualRate: String(CAPS.annualRatePercent) }) }}
                placeholder="7" className={INPUT} />
            </div>
            {mode === 'standard' && (
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">Years to grow</label>
                <input type="number" step="1" min="0" max={CAPS.years} value={years}
                  onChange={(e) => updateState({ years: e.target.value })}
                  onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.years) updateState({ years: String(CAPS.years) }) }}
                  placeholder="10" className={INPUT} />
              </div>
            )}
          </div>

          {/* Standard result */}
          {mode === 'standard' && futureBalance !== null && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 mt-2">
              <p className="text-xs text-slate-400 mb-1">Final future balance</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(futureBalance)}</p>
            </div>
          )}
        </div>
      </Card>

      {/* ─── RETIREMENT MODE ─── */}
      {mode === 'goalSeeker' && (
      <>
        {/* Age Timeline */}
        <Card data-tour="retirement-timeline">
          <SectionHeader
            icon={Calendar}
            title="Retirement Timeline"
            subtitle="Set your current age and when you want to retire"
          />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">Current age</label>
                <input type="number" step="1" min="0" max={CAPS.currentAge} value={currentAge}
                  onChange={(e) => updateState({ currentAge: e.target.value })}
                  onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.currentAge) updateState({ currentAge: String(CAPS.currentAge) }) }}
                  placeholder="35" className={INPUT} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">Retire at</label>
                <select value={targetRetirementAge} onChange={(e) => updateState({ targetRetirementAge: parseFloat(e.target.value) })}
                  className={INPUT}>
                  {TARGET_RETIREMENT_AGES.map((age) => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>
            </div>

            {goalSeekerInvalid && (
              <p className="text-sm text-red-400">Target age must be after current age.</p>
            )}

            {/* Visual timeline bar */}
            {hasAges && yearsToGrow > 0 && (
              <div className="pt-2">
                <div className="relative h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                    style={{ width: `${retirePct}%` }} />
                  <div className="absolute inset-y-0 rounded-full bg-slate-700/60 transition-all duration-500"
                    style={{ left: `${retirePct}%`, right: 0 }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Age {currentAgeNum}</span>
                  <span className="text-green-400 font-medium">
                    Retire at {targetRetirementAge} ({yearsToGrow} yrs)
                  </span>
                  <span>Age {endAgeNum}</span>
                </div>
              </div>
            )}

            {/* Years to grow (auto-computed in retirement mode) */}
            {hasAges && yearsToGrow > 0 && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-500" />
                  <span className="text-sm text-slate-400">
                    <span className="text-slate-200 font-medium">{yearsToGrow} years</span> of growth (age {currentAgeNum} to {targetRetirementAge})
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Know Your Number */}
        <Card data-tour="know-your-number">
          <SectionHeader
            icon={Target}
            title="Know Your Number"
            subtitle="Choose how to plan your retirement withdrawals"
          />
          <div className="space-y-4">
            {/* Withdrawal mode toggle */}
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Withdrawal strategy</label>
              <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
                {(['rate', 'income'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => updateState({ withdrawalMode: m })}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${withdrawalMode === m ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    {m === 'rate' ? 'By Rate (%)' : 'By Income (zł)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Withdrawal inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
                  Withdrawal rate (%)
                  <InfoTip>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      The percentage of your portfolio you withdraw each year in retirement. The 4% rule is a classic guideline based on the Trinity Study.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                      Use 3-3.5% for a more conservative plan, or 2-2.5% if you expect a 30+ year retirement.
                    </p>
                  </InfoTip>
                </label>
                <select
                  value={WITHDRAWAL_RATE_OPTIONS.includes(withdrawalRatePercent as (typeof WITHDRAWAL_RATE_OPTIONS)[number]) ? withdrawalRatePercent : 4}
                  onChange={(e) => updateState({ withdrawalRatePercent: parseFloat(e.target.value) })}
                  disabled={withdrawalMode === 'income'}
                  className={`${INPUT} ${withdrawalMode === 'income' ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  {WITHDRAWAL_RATE_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>{rate}%</option>
                  ))}
                </select>
                {withdrawalMode === 'income' && futureBalance !== null && futureBalance > 0 && desiredIncomeNum > 0 && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Effective rate: {((desiredIncomeNum / futureBalance) * 100).toFixed(1)}% of projected portfolio
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
                  Desired annual income (zł)
                  <InfoTip>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      The annual income you want to withdraw starting at retirement. This exact amount is withdrawn in year one, then adjusted for inflation each subsequent year.
                    </p>
                  </InfoTip>
                </label>
                {withdrawalMode === 'income' ? (
                  <input inputMode="decimal" value={desiredAnnualIncome}
                    onChange={(e) => updateState({ desiredAnnualIncome: e.target.value })}
                    onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > 10_000_000) updateState({ desiredAnnualIncome: '10000000' }) }}
                    placeholder="60000" className={INPUT} />
                ) : (
                  <div className={`${INPUT} flex items-center opacity-40`}>
                    {projectedAnnualIncome > 0 ? formatCurrency(projectedAnnualIncome) : '—'}
                  </div>
                )}
                {withdrawalMode === 'rate' && projectedAnnualIncome > 0 && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    {formatCurrency(projectedAnnualIncome / 12)} / mo at retirement
                  </p>
                )}
              </div>
            </div>

            {/* Projected portfolio */}
            {futureBalance !== null && futureBalance > 0 && !goalSeekerInvalid && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-blue-400" />
                  <p className="text-xs text-slate-400">Projected portfolio at {targetRetirementAge}</p>
                </div>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(futureBalance)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Based on your current savings plan</p>
              </div>
            )}
          </div>
        </Card>

        {/* ─── Monte Carlo Simulation ─── */}
        <Card data-tour="monte-carlo">
          <button type="button" onClick={() => setMcsOpen(!mcsOpen)}
            className="w-full flex items-center justify-between group">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                <Shuffle size={20} className="text-purple-400" />
              </div>
              <div className="text-left min-w-0">
                <h2 className="text-base font-semibold text-slate-200 flex items-center">Monte Carlo Simulation <span className="ml-1.5 inline-flex items-center rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-400">Beta</span></h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Stress-test your plan across thousands of randomized market scenarios
                </p>
              </div>
            </div>
            <ChevronDown size={18}
              className={`text-slate-500 transition-transform duration-200 shrink-0 ml-2 ${mcsOpen ? 'rotate-180' : ''}`} />
          </button>

          {mcsOpen && (
            <div className="mt-5 space-y-4 pt-4 border-t border-slate-800">
              {/* Market assumptions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Percent size={14} className="text-slate-500" />
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Market Assumptions</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Return volatility (%)
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Standard deviation of annual log-returns. Controls how much your portfolio's yearly return varies around the mean.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          S&P 500 historical volatility is roughly 15-16%. A higher value models more uncertainty. At 0%, every year returns exactly the mean rate (no randomness).
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                          Uses Geometric Brownian Motion (GBM) with drift adjustment so the expected return matches your rate of return input, while the median return is slightly lower due to volatility drag.
                        </p>
                      </InfoTip>
                    </label>
                    <input inputMode="decimal" value={returnStdDev}
                      onChange={(e) => updateState({ returnStdDev: e.target.value })}
                      placeholder="15" className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Annual fees (%)
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Total annual expense ratio deducted from your portfolio each year (fund fees, advisor fees, etc.).
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          Index funds typically charge 0.03-0.20%. Actively managed funds can charge 0.5-1.5%. Financial advisors often add 0.5-1.0%. The fee compounds over decades and can significantly reduce your ending balance.
                        </p>
                      </InfoTip>
                    </label>
                    <input inputMode="decimal" value={annualFee}
                      onChange={(e) => updateState({ annualFee: e.target.value })}
                      placeholder="0,5" className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Inflation mean (%)
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Expected average annual inflation rate. Your contributions grow with inflation during accumulation, and your withdrawals increase with inflation during retirement to maintain purchasing power.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          Poland's NBP targets 2.5%, but realized inflation has run higher and more volatile. Use 3.5-5% for a conservative estimate.
                        </p>
                      </InfoTip>
                    </label>
                    <input inputMode="decimal" value={inflationMean}
                      onChange={(e) => updateState({ inflationMean: e.target.value })}
                      placeholder="3,5" className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Inflation volatility (%)
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          How much inflation varies year-to-year. At 0%, inflation is fixed at the mean each year. Higher values model uncertainty in future inflation.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          Polish inflation has been more volatile than the US — swings of several percentage points. Floored at -2% per year to prevent unrealistic deflation spirals.
                        </p>
                      </InfoTip>
                    </label>
                    <input inputMode="decimal" value={inflationStdDev}
                      onChange={(e) => updateState({ inflationStdDev: e.target.value })}
                      placeholder="3" className={INPUT} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                  Note: this simulation does not model tax. In Poland, investment gains outside IKE/IKZE are subject to the 19% capital-gains (Belka) tax, so your real after-tax outcome in a regular brokerage account will be lower.
                </p>
              </div>

              {/* Simulation config */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shuffle size={14} className="text-slate-500" />
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Simulation Config</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Plan through age
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          The age your portfolio needs to last until. The simulation checks whether your money survives from retirement to this age.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          Average Polish life expectancy is about 78, but planning to 90-95 provides a safety margin. If you enable variable longevity below, each simulation samples a realistic death age instead.
                        </p>
                      </InfoTip>
                    </label>
                    <input type="number" step="1" min="50" max="120" value={endAge}
                      onChange={(e) => updateState({ endAge: e.target.value })}
                      placeholder="90" className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Simulations <span className="text-slate-600">(max 100k)</span>
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Number of independent random scenarios to run. Each trial generates a unique sequence of market returns, inflation rates, and (optionally) lifespan.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          1,000 gives quick rough estimates. 10,000 (default) gives stable results. 50,000-100,000 gives very smooth percentile curves but takes a moment. Max 100,000.
                        </p>
                      </InfoTip>
                    </label>
                    <input type="number" step="1000" min="100" max={CAPS.numTrials}
                      value={numTrials} onChange={handleNumTrialsChange}
                      placeholder="10000" className={INPUT} />
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={useVariableLongevity}
                        onChange={(e) => updateState({ useVariableLongevity: e.target.checked })}
                        className="rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500 focus:ring-offset-0 h-4 w-4" />
                      Variable longevity
                    </label>
                    <InfoTip>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        When enabled, each simulation samples a realistic death age from SSA actuarial life tables instead of using the fixed "plan through age."
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                        This models longevity risk — the chance you live longer (or shorter) than expected. Some trials will need money until age 95+, while others end at 75. The success rate accounts for this variation.
                      </p>
                    </InfoTip>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={useRegimeSwitching}
                        onChange={(e) => updateState({ useRegimeSwitching: e.target.checked })}
                        className="rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500 focus:ring-offset-0 h-4 w-4" />
                      Sequence-of-returns risk
                    </label>
                    <InfoTip>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Models realistic market crash clustering using a two-state regime-switching model. The market randomly enters bear periods with consecutive bad years, instead of each year being independent.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                        In a bear regime, expected returns drop sharply (-15 pp) and volatility increases by 60%. Bear markets persist with ~60% probability each year, producing multi-year downturns roughly once every 8 years on average.
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                        Consecutive large losses early in retirement can permanently deplete a portfolio even if long-run average returns are healthy. This is the core risk the standard IID model underestimates. Expect lower success rates when enabled.
                      </p>
                    </InfoTip>
                  </div>
                </div>
              </div>

              {/* Run button */}
              <button type="button" onClick={handleRunMCS} disabled={!canRunMCS || mcsRunning}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 py-3 text-sm font-semibold text-white transition-all hover:from-purple-500 hover:to-purple-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20">
                {mcsRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Running {numTrialsNum.toLocaleString()} simulations...
                  </span>
                ) : (
                  `Run ${numTrialsNum.toLocaleString()} Simulations`
                )}
              </button>
              {!canRunMCS && (
                <p className="text-xs text-slate-600 text-center">
                  {withdrawalMode === 'income' && desiredIncomeNum <= 0
                    ? 'Enter your desired annual income in the Know Your Number section.'
                    : 'Fill in current age, retirement age, and rate of return above.'}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Monte Carlo Results */}
        {mcsResult && !mcsRunning && (
          <div ref={mcsResultsRef}>
            <MonteCarloResults result={mcsResult} currentAge={currentAgeNum} retirementAge={targetRetirementAge} />
          </div>
        )}
      </>
      )}
      </>
      )}

      <GuidedTour
        steps={
          mode === 'goalSeeker' ? RETIREMENT_TOUR_STEPS
            : mode === 'autoLoan' ? AUTO_TOUR_STEPS
            : mode === 'houseAffordability'
              ? housingType === 'renting' ? HOME_RENT_TOUR_STEPS : HOME_OWN_TOUR_STEPS
            : STANDARD_TOUR_STEPS
        }
        active={tourActive}
        onFinish={() => setTourActive(false)}
      />
    </div>
  )
}
