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
    title: 'Procent składany',
    content: 'Wpisz saldo początkowe, regularne wpłaty oraz oczekiwaną stopę zwrotu. Ustaw częstotliwość wpłat na miesięczną lub roczną i użyj pola rocznej podwyżki, aby uwzględnić rosnące w czasie wpłaty.',
  },
]

const RETIREMENT_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="compound-interest"]',
    title: 'Twój punkt wyjścia',
    content: 'Wpisz aktualne saldo oszczędności, ile wpłacasz oraz oczekiwaną stopę zwrotu. Pole rocznej podwyżki uwzględnia wzrost wynagrodzenia zwiększający Twoje wpłaty w czasie.',
  },
  {
    target: '[data-tour="retirement-timeline"]',
    title: 'Oś czasu emerytury',
    content: 'Ustaw swój obecny wiek oraz docelowy wiek przejścia na emeryturę. Wizualna oś czasu pokazuje fazę akumulacji (zielona) oraz fazę emerytury. Liczba lat wzrostu jest obliczana automatycznie.',
    optional: true,
  },
  {
    target: '[data-tour="know-your-number"]',
    title: 'Poznaj swoją kwotę',
    content: (
      <>
        <p>Wybierz, jak planować wypłaty: <strong className="text-slate-200">Według stopy</strong> wykorzystuje procent Twojego portfela (jak reguła 4%), a <strong className="text-slate-200">Według dochodu</strong> pozwala ustawić konkretny docelowy dochód roczny.</p>
        <p className="mt-2">Pole prognozowanego portfela pokazuje, do jakiej wartości mogą urosnąć Twoje oszczędności do emerytury.</p>
      </>
    ),
    optional: true,
  },
  {
    target: '[data-tour="monte-carlo"]',
    title: 'Symulacja Monte Carlo',
    content: (
      <>
        <p>Przetestuj swój plan w tysiącach losowych scenariuszy. Skonfiguruj zmienność rynku, inflację, opłaty oraz liczbę symulacji.</p>
        <p className="mt-2">Włącz <strong className="text-slate-200">Zmienną długość życia</strong>, aby uwzględnić niepewność długości życia, oraz <strong className="text-slate-200">Ryzyko sekwencji stóp zwrotu</strong>, aby uwzględnić realistyczne nawarstwianie się krachów rynkowych.</p>
      </>
    ),
    optional: true,
  },
]

const AUTO_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="auto-inputs"]',
    title: 'Szczegóły kredytu samochodowego',
    content: 'Wpisz cenę samochodu, swój miesięczny dochód, wkład własny, oprocentowanie oraz okres kredytu. Twój miesięczny dochód może być wstępnie uzupełniony z ustawień budżetu.',
  },
  {
    target: '[data-tour="auto-results"]',
    title: 'Analiza kredytu',
    content: (
      <>
        <p>Zobacz szacowaną ratę miesięczną oraz jak wypada ona na tle <strong className="text-slate-200">reguły 20/3/8</strong>:</p>
        <p className="mt-1.5"><strong className="text-slate-200">20%</strong> wkładu własnego, maksymalny okres <strong className="text-slate-200">3</strong> lata (36 miesięcy) oraz rata poniżej <strong className="text-slate-200">8%</strong> miesięcznego dochodu.</p>
      </>
    ),
    optional: true,
  },
  {
    target: '[data-tour="auto-table"]',
    title: 'Szacunki maksymalnej zdolności',
    content: 'Ta tabela pokazuje najdroższy samochód, na jaki możesz sobie pozwolić przy różnych oprocentowaniach, pozostając w granicach reguły 8% dochodu. Uwzględnia ona Twój wkład własny oraz okres kredytu.',
    optional: true,
  },
]

const HOME_OWN_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="home-income"]',
    title: 'Dochód i kredyt',
    content: 'Wpisz swój roczny dochód netto, wkład własny, oprocentowanie kredytu hipotecznego oraz okres kredytu. Kalkulator stosuje regułę DTI front-end na poziomie 28%, aby określić, na jaką nieruchomość Cię stać.',
  },
  {
    target: '[data-tour="home-costs"]',
    title: 'Koszty stałe',
    content: 'Dodaj ubezpieczenie nieruchomości oraz czynsz administracyjny. Obniżają one Twoją zdolność kredytową, ponieważ wliczają się do limitu 28% kosztów mieszkaniowych.',
  },
  {
    target: '[data-tour="home-result"]',
    title: 'Wynik zdolności zakupu',
    content: 'Zobacz maksymalną cenę nieruchomości, na jaką możesz sobie pozwolić, wraz z pełnym miesięcznym podziałem na kapitał i odsetki, ubezpieczenie oraz czynsz administracyjny.',
    optional: true,
  },
]

const HOME_RENT_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="rent-input"]',
    title: 'Twój dochód',
    content: 'Wpisz swój roczny dochód netto. Może być wstępnie uzupełniony z ustawień miesięcznego budżetu. Kalkulator stosuje regułę DTI 30%, aby określić maksymalny czynsz, na jaki Cię stać.',
  },
  {
    target: '[data-tour="rent-result"]',
    title: 'Maksymalny czynsz w zasięgu',
    content: 'Pokazuje to maksymalny miesięczny czynsz, jaki powinieneś płacić zgodnie z regułą 30% — czyli nie więcej niż 30% Twojego miesięcznego dochodu netto przeznaczone na czynsz.',
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
          <h1 className="text-2xl font-bold">Kalkulatory</h1>
          <p className="text-sm text-slate-400">
            {mode === 'autoLoan' ? 'Ocena kredytu samochodowego (reguła 20/3/8)'
              : mode === 'houseAffordability'
                ? housingType === 'renting' ? 'Maksymalny czynsz w zasięgu (reguła 30%)' : 'Maksymalna cena nieruchomości (DTI 28%)'
                : mode === 'goalSeeker' ? 'Planowanie emerytury i analiza Monte Carlo' : 'Kalkulator procentu składanego'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button type="button" onClick={() => { if (mode === 'goalSeeker') setMcsOpen(true); setTourActive(true) }}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            <HelpCircle size={15} />
            Przewodnik
          </button>
          <button type="button" onClick={handleReset}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            Resetuj kalkulator
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div data-tour="mode-toggle" className="flex gap-2 rounded-xl bg-slate-900 border border-slate-800 p-1">
        {[
          { key: 'standard' as const, label: 'Standardowy' },
          { key: 'goalSeeker' as const, label: 'Emerytura' },
          { key: 'autoLoan' as const, label: 'Samochód' },
          { key: 'houseAffordability' as const, label: 'Mieszkanie' },
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
              {h === 'owning' ? 'Zakup' : 'Wynajem'}
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
          title="Procent składany"
          subtitle={mode === 'goalSeeker' ? 'Twój punkt wyjścia oraz założenia dotyczące wzrostu' : 'Oblicz wartość przyszłą przy regularnych wpłatach'}
        />

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Saldo początkowe (zł)</label>
              <input inputMode="decimal" value={initialBalance}
                onChange={(e) => updateState({ initialBalance: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.initialBalance) updateState({ initialBalance: String(CAPS.initialBalance) }) }}
                placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Wpłaty (zł)</label>
              <input inputMode="decimal" value={contribution}
                onChange={(e) => updateState({ contribution: e.target.value })}
                onBlur={(e) => { const v = parseLocaleAmount(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > contributionMax) updateState({ contribution: String(contributionMax) }) }}
                placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Częstotliwość</label>
              <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
                {(['monthly', 'yearly'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => updateState({ contributionFrequency: f })}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${contributionFrequency === f ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    {f === 'monthly' ? 'Miesięcznie' : 'Rocznie'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${mode === 'standard' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
                Roczna podwyżka (%)
                <InfoTip>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Roczny wzrost Twoich wpłat, odwzorowujący podwyżki wynagrodzenia lub zwiększone oszczędności w czasie.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                    Przy 2% wpłata 1 000 zł/mies. w przyszłym roku wzrośnie do ~1 020 zł/mies. Średni wzrost płac wynosi 3-4% nominalnie. Ustaw 0%, jeśli Twoje wpłaty są stałe.
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
                Stopa zwrotu (%)
                {mode === 'goalSeeker' && (
                  <InfoTip>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Oczekiwana średnia roczna stopa zwrotu przed inflacją. Jest używana zarówno do deterministycznego obliczenia celu, jak i jako średnia stopa zwrotu w symulacjach Monte Carlo.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                      Historyczna średnia S&P 500: ~10% nominalnie, ~7% realnie (po inflacji). Zrównoważony portfel (60/40 akcje/obligacje) historycznie daje ~7-8% nominalnie.
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
                <label className="mb-1.5 block text-sm text-slate-400">Lata wzrostu</label>
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
              <p className="text-xs text-slate-400 mb-1">Końcowe saldo przyszłe</p>
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
            title="Oś czasu emerytury"
            subtitle="Ustaw swój obecny wiek oraz kiedy chcesz przejść na emeryturę"
          />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">Obecny wiek</label>
                <input type="number" step="1" min="0" max={CAPS.currentAge} value={currentAge}
                  onChange={(e) => updateState({ currentAge: e.target.value })}
                  onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.currentAge) updateState({ currentAge: String(CAPS.currentAge) }) }}
                  placeholder="35" className={INPUT} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">Emerytura w wieku</label>
                <select value={targetRetirementAge} onChange={(e) => updateState({ targetRetirementAge: parseFloat(e.target.value) })}
                  className={INPUT}>
                  {TARGET_RETIREMENT_AGES.map((age) => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>
            </div>

            {goalSeekerInvalid && (
              <p className="text-sm text-red-400">Wiek docelowy musi być wyższy niż obecny wiek.</p>
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
                  <span>Wiek {currentAgeNum}</span>
                  <span className="text-green-400 font-medium">
                    Emerytura w wieku {targetRetirementAge} ({yearsToGrow} lat)
                  </span>
                  <span>Wiek {endAgeNum}</span>
                </div>
              </div>
            )}

            {/* Years to grow (auto-computed in retirement mode) */}
            {hasAges && yearsToGrow > 0 && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-500" />
                  <span className="text-sm text-slate-400">
                    <span className="text-slate-200 font-medium">{yearsToGrow} lat</span> wzrostu (od wieku {currentAgeNum} do {targetRetirementAge})
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
            title="Poznaj swoją kwotę"
            subtitle="Wybierz, jak planować wypłaty na emeryturze"
          />
          <div className="space-y-4">
            {/* Withdrawal mode toggle */}
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Strategia wypłat</label>
              <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
                {(['rate', 'income'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => updateState({ withdrawalMode: m })}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${withdrawalMode === m ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    {m === 'rate' ? 'Według stopy (%)' : 'Według dochodu (zł)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Withdrawal inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
                  Stopa wypłat (%)
                  <InfoTip>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Procent Twojego portfela, który wypłacasz co roku na emeryturze. Reguła 4% to klasyczna wytyczna oparta na badaniu Trinity Study.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                      Użyj 3-3,5% dla bardziej ostrożnego planu lub 2-2,5%, jeśli spodziewasz się emerytury trwającej ponad 30 lat.
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
                    Efektywna stopa: {((desiredIncomeNum / futureBalance) * 100).toFixed(1)}% prognozowanego portfela
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
                  Pożądany dochód roczny (zł)
                  <InfoTip>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Roczny dochód, jaki chcesz wypłacać począwszy od emerytury. Dokładnie ta kwota jest wypłacana w pierwszym roku, a następnie korygowana o inflację w każdym kolejnym roku.
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
                    {formatCurrency(projectedAnnualIncome / 12)} / mies. na emeryturze
                  </p>
                )}
              </div>
            </div>

            {/* Projected portfolio */}
            {futureBalance !== null && futureBalance > 0 && !goalSeekerInvalid && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-blue-400" />
                  <p className="text-xs text-slate-400">Prognozowany portfel w wieku {targetRetirementAge}</p>
                </div>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(futureBalance)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Na podstawie Twojego obecnego planu oszczędzania</p>
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
                <h2 className="text-base font-semibold text-slate-200 flex items-center">Symulacja Monte Carlo <span className="ml-1.5 inline-flex items-center rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-400">Beta</span></h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Przetestuj swój plan w tysiącach losowych scenariuszy rynkowych
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
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Założenia rynkowe</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Zmienność stopy zwrotu (%)
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Odchylenie standardowe rocznych logarytmicznych stóp zwrotu. Określa, jak bardzo roczna stopa zwrotu Twojego portfela waha się wokół średniej.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          Historyczna zmienność S&P 500 wynosi około 15-16%. Wyższa wartość oznacza większą niepewność. Przy 0% każdy rok daje dokładnie średnią stopę (bez losowości).
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                          Wykorzystuje geometryczny ruch Browna (GBM) z korektą dryfu, tak aby oczekiwana stopa zwrotu odpowiadała wprowadzonej stopie zwrotu, podczas gdy mediana stopy zwrotu jest nieco niższa z powodu dryfu zmienności.
                        </p>
                      </InfoTip>
                    </label>
                    <input inputMode="decimal" value={returnStdDev}
                      onChange={(e) => updateState({ returnStdDev: e.target.value })}
                      placeholder="15" className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Roczne opłaty (%)
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Całkowity roczny wskaźnik kosztów potrącany z Twojego portfela co roku (opłaty funduszowe, opłaty doradcze itp.).
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          Fundusze indeksowe zwykle pobierają 0,03-0,20%. Fundusze aktywnie zarządzane mogą pobierać 0,5-1,5%. Doradcy finansowi często dodają 0,5-1,0%. Opłata kumuluje się przez dekady i może znacząco obniżyć Twoje saldo końcowe.
                        </p>
                      </InfoTip>
                    </label>
                    <input inputMode="decimal" value={annualFee}
                      onChange={(e) => updateState({ annualFee: e.target.value })}
                      placeholder="0,5" className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Średnia inflacja (%)
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Oczekiwana średnia roczna stopa inflacji. Twoje wpłaty rosną wraz z inflacją w fazie akumulacji, a wypłaty rosną wraz z inflacją na emeryturze, aby zachować siłę nabywczą.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          Cel inflacyjny NBP wynosi 2,5%, ale faktyczna inflacja była wyższa i bardziej zmienna. Użyj 3,5-5% dla ostrożnego szacunku.
                        </p>
                      </InfoTip>
                    </label>
                    <input inputMode="decimal" value={inflationMean}
                      onChange={(e) => updateState({ inflationMean: e.target.value })}
                      placeholder="3,5" className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Zmienność inflacji (%)
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Jak bardzo inflacja zmienia się z roku na rok. Przy 0% inflacja jest co roku ustalona na poziomie średniej. Wyższe wartości uwzględniają niepewność przyszłej inflacji.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          Polska inflacja była bardziej zmienna niż amerykańska — z wahaniami o kilka punktów procentowych. Ograniczona do -2% rocznie, aby zapobiec nierealistycznym spiralom deflacyjnym.
                        </p>
                      </InfoTip>
                    </label>
                    <input inputMode="decimal" value={inflationStdDev}
                      onChange={(e) => updateState({ inflationStdDev: e.target.value })}
                      placeholder="3" className={INPUT} />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                  Uwaga: ta symulacja nie uwzględnia podatku. W Polsce zyski kapitałowe poza IKE/IKZE podlegają 19% podatkowi od zysków kapitałowych (podatek Belki), więc Twój rzeczywisty wynik po opodatkowaniu na zwykłym rachunku maklerskim będzie niższy.
                </p>
              </div>

              {/* Simulation config */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shuffle size={14} className="text-slate-500" />
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Konfiguracja symulacji</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Plan do wieku
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Wiek, do którego Twój portfel ma wystarczyć. Symulacja sprawdza, czy Twoje pieniądze przetrwają od emerytury do tego wieku.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          Średnia długość życia w Polsce wynosi około 78 lat, ale planowanie do 90-95 lat zapewnia margines bezpieczeństwa. Jeśli włączysz poniżej zmienną długość życia, każda symulacja zamiast tego losuje realistyczny wiek zgonu.
                        </p>
                      </InfoTip>
                    </label>
                    <input type="number" step="1" min="50" max="120" value={endAge}
                      onChange={(e) => updateState({ endAge: e.target.value })}
                      placeholder="90" className={INPUT} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Symulacje <span className="text-slate-600">(maks. 100 tys.)</span>
                      <InfoTip>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Liczba niezależnych losowych scenariuszy do uruchomienia. Każda próba generuje unikalną sekwencję stóp zwrotu z rynku, stóp inflacji oraz (opcjonalnie) długości życia.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                          1 000 daje szybkie, zgrubne szacunki. 10 000 (domyślnie) daje stabilne wyniki. 50 000-100 000 daje bardzo gładkie krzywe percentyli, ale zajmuje chwilę. Maks. 100 000.
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
                      Zmienna długość życia
                    </label>
                    <InfoTip>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Po włączeniu każda symulacja losuje realistyczny wiek zgonu z aktuarialnych tablic trwania życia, zamiast korzystać ze stałego „planu do wieku”.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                        Uwzględnia to ryzyko długowieczności — szansę, że dożyjesz dłużej (lub krócej) niż oczekiwano. Niektóre próby będą potrzebowały pieniędzy do wieku 95+ lat, inne zakończą się w wieku 75 lat. Wskaźnik powodzenia uwzględnia tę zmienność.
                      </p>
                    </InfoTip>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={useRegimeSwitching}
                        onChange={(e) => updateState({ useRegimeSwitching: e.target.checked })}
                        className="rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500 focus:ring-offset-0 h-4 w-4" />
                      Ryzyko sekwencji stóp zwrotu
                    </label>
                    <InfoTip>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Uwzględnia realistyczne nawarstwianie się krachów rynkowych za pomocą dwustanowego modelu przełączania reżimów. Rynek losowo wchodzi w okresy bessy z kolejnymi złymi latami, zamiast traktować każdy rok jako niezależny.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                        W reżimie bessy oczekiwane stopy zwrotu gwałtownie spadają (-15 pp), a zmienność rośnie o 60%. Bessa utrzymuje się z prawdopodobieństwem ~60% w każdym roku, powodując wieloletnie spadki średnio mniej więcej raz na 8 lat.
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                        Kolejne duże straty na początku emerytury mogą trwale wyczerpać portfel, nawet jeśli długoterminowe średnie stopy zwrotu są zdrowe. To kluczowe ryzyko, które standardowy model IID niedoszacowuje. Po włączeniu spodziewaj się niższych wskaźników powodzenia.
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
                    Trwa {numTrialsNum.toLocaleString()} symulacji...
                  </span>
                ) : (
                  `Uruchom ${numTrialsNum.toLocaleString()} symulacji`
                )}
              </button>
              {!canRunMCS && (
                <p className="text-xs text-slate-600 text-center">
                  {withdrawalMode === 'income' && desiredIncomeNum <= 0
                    ? 'Wpisz pożądany dochód roczny w sekcji „Poznaj swoją kwotę”.'
                    : 'Uzupełnij powyżej obecny wiek, wiek emerytalny oraz stopę zwrotu.'}
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
