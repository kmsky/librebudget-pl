import { sampleDeathAge } from './actuarialTables'

// ── Types ──────────────────────────────────────────────────────────────

export interface MonteCarloParams {
  initialBalance: number
  annualContribution: number
  meanReturnPercent: number         // e.g. 7
  returnStdDevPercent: number       // e.g. 15 (0 = deterministic)
  inflationMeanPercent: number      // e.g. 3
  inflationStdDevPercent: number    // e.g. 1 (0 = fixed inflation)
  annualFeePercent: number          // e.g. 0.5
  contributionIncreasePercent: number // e.g. 2 (annual raise on top of inflation)
  currentAge: number
  retirementAge: number
  endAge: number                    // used when useVariableLongevity = false
  withdrawalRatePercent: number     // e.g. 4 (SWR applied to balance at retirement)
  desiredAnnualIncome?: number      // if set, use fixed income (today's $) instead of SWR
  numTrials: number                 // default 1000
  samplePaths: number               // default 15
  useVariableLongevity: boolean
  useRegimeSwitching: boolean       // enable sequence-of-returns risk (regime switching)
  seed?: number                     // optional for reproducibility
}

// ── Regime-switching constants ──────────────────────────────────────
// Two-state Markov model calibrated to US equity history:
//   Normal → Bear probability ~12% per year (a bear market starts roughly once per 8 years)
//   Bear → Bear probability ~60% (bear markets tend to persist 2-3 years on average)
//   Bear state: mean return drops sharply, volatility increases
const REGIME = {
  pNormalToBear: 0.12,
  pBearToBear:   0.60,
  bearMeanShift: -0.15,   // bear years: mean return shifts down 15 pp
  bearVolScale:   1.6,    // bear years: volatility multiplied by 1.6×
} as const

export interface YearlyPercentile {
  year: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface MonteCarloResult {
  probabilityOfSuccess: number      // 0–100
  percentiles: {
    p10: number
    p50: number
    p90: number
  }
  paths: { year: number; balance: number }[][]  // samplePaths trajectories
  yearlyPercentiles: YearlyPercentile[]         // per-year percentiles from ALL trials
  failureYear: number | null        // median depletion year for failed runs
  trialCount: number
  yearsSimulated: number
}

// ── Seeded PRNG (Mulberry32) ───────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Box-Muller Normal Sampling (with spare caching) ─────────────────

function makeNormalSampler(rng: () => number) {
  let spare: number | null = null
  return (mean: number, stdDev: number): number => {
    if (stdDev === 0) return mean
    if (spare !== null) {
      const val = mean + stdDev * spare
      spare = null
      return val
    }
    let u1 = rng()
    while (u1 === 0) u1 = rng()
    const u2 = rng()
    const r = Math.sqrt(-2 * Math.log(u1))
    spare = r * Math.sin(2 * Math.PI * u2)
    return mean + stdDev * r * Math.cos(2 * Math.PI * u2)
  }
}

// ── Percentile helper ───────────────────────────────────────────────

function percentileFromSorted(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  const frac = idx - lo
  return sorted[lo] * (1 - frac) + sorted[hi] * frac
}

// ── Core Engine ────────────────────────────────────────────────────────

export function runMonteCarloSimulation(params: MonteCarloParams): MonteCarloResult {
  const {
    initialBalance,
    annualContribution,
    meanReturnPercent,
    returnStdDevPercent,
    inflationMeanPercent,
    inflationStdDevPercent,
    annualFeePercent,
    contributionIncreasePercent,
    currentAge,
    retirementAge,
    endAge,
    withdrawalRatePercent,
    desiredAnnualIncome,
    numTrials,
    samplePaths,
    useVariableLongevity,
    useRegimeSwitching,
    seed,
  } = params

  const meanReturn = meanReturnPercent / 100
  const returnSD = returnStdDevPercent / 100
  const inflationMean = inflationMeanPercent / 100
  const inflationSD = inflationStdDevPercent / 100
  const feeRate = annualFeePercent / 100
  const contribIncrease = contributionIncreasePercent / 100
  const withdrawalRate = withdrawalRatePercent / 100
  const useFixedIncome = desiredAnnualIncome != null && desiredAnnualIncome > 0

  // GBM drift adjustment: so E[1+r] = 1 + meanReturn
  // ln(1+r) ~ N(mu_log, sigma_log) where mu_log = ln(1+meanReturn) - sigma^2/2
  // When regime switching is off, we precompute muLog for the normal state.
  // When on, muLog is recomputed per-year with the effective mean/SD.
  const muLogNormal = returnSD > 0
    ? Math.log(1 + meanReturn) - (returnSD * returnSD) / 2
    : 0 // not used when SD=0

  // Derive a deterministic seed from inputs so identical params produce
  // identical results, but changing any input changes the outcome.
  const defaultSeed = ((
    initialBalance * 7 + annualContribution * 13 + meanReturn * 1e6 + returnSD * 1e6 +
    inflationMean * 1e6 + inflationSD * 1e6 + feeRate * 1e6 + contribIncrease * 1e6 +
    currentAge * 31 + retirementAge * 37 + endAge * 41 + withdrawalRate * 1e6 +
    (desiredAnnualIncome ?? 0) * 47 + numTrials * 43 +
    (useVariableLongevity ? 59 : 0) + (useRegimeSwitching ? 67 : 0)
  ) * 2654435761) >>> 0 // Knuth multiplicative hash
  const rng = mulberry32(seed ?? defaultSeed)
  const normalSample = makeNormalSampler(rng)

  const endingBalances: number[] = []
  const failureYears: number[] = []
  const sampledPaths: { year: number; balance: number }[][] = []

  // Per-year balance accumulator for percentile computation across ALL trials.
  // Key = year index (0-based), value = array of balances from each trial.
  const yearBalances = new Map<number, number[]>()
  let maxTrialYears = 0

  // Determine which trials to record paths for
  const pathIndices = new Set<number>()
  const pathStep = Math.max(1, Math.floor(numTrials / samplePaths))
  for (let i = 0; i < samplePaths && i * pathStep < numTrials; i++) {
    pathIndices.add(i * pathStep)
  }

  for (let trial = 0; trial < numTrials; trial++) {
    const recordPath = pathIndices.has(trial)
    const path: { year: number; balance: number }[] = []

    let balance = initialBalance
    let inflationCumulative = 1.0
    let failed = false
    let failYear = 0
    let inBearMarket = false // regime state for this trial

    // Determine end age for this trial
    const trialEndAge = useVariableLongevity
      ? Math.max(retirementAge + 1, sampleDeathAge(currentAge, rng))
      : endAge

    const totalYears = trialEndAge - currentAge
    if (totalYears > maxTrialYears) maxTrialYears = totalYears

    if (recordPath) {
      path.push({ year: 0, balance })
    }

    // Record year-0 balance
    let arr = yearBalances.get(0)
    if (!arr) { arr = []; yearBalances.set(0, arr) }
    arr.push(balance)

    // SWR withdrawal: set once at retirement as withdrawalRate x portfolio balance,
    // then inflated each subsequent year to maintain purchasing power.
    let annualWithdrawal = 0

    for (let y = 1; y <= totalYears; y++) {
      const age = currentAge + y
      const isRetired = age >= retirementAge

      // Regime switching: transition between normal and bear states
      if (useRegimeSwitching && returnSD > 0) {
        const transitionRoll = rng()
        inBearMarket = inBearMarket
          ? transitionRoll < REGIME.pBearToBear
          : transitionRoll < REGIME.pNormalToBear
      }

      // Sample return (with optional regime-adjusted parameters)
      let annualReturn: number
      if (returnSD === 0) {
        annualReturn = meanReturn
      } else if (!inBearMarket) {
        const logReturn = normalSample(muLogNormal, returnSD)
        annualReturn = Math.exp(logReturn) - 1
      } else {
        const bearMean = meanReturn + REGIME.bearMeanShift
        const bearSD = returnSD * REGIME.bearVolScale
        const bearMuLog = Math.log(1 + Math.max(bearMean, -0.99)) - (bearSD * bearSD) / 2
        const logReturn = normalSample(bearMuLog, bearSD)
        annualReturn = Math.exp(logReturn) - 1
      }

      // Sample inflation (floored at -2%, capped at 25% — Polish inflation runs hotter than the US)
      let inflationThisYear = normalSample(inflationMean, inflationSD)
      inflationThisYear = Math.max(-0.02, Math.min(0.25, inflationThisYear))
      inflationCumulative *= (1 + inflationThisYear)

      if (!isRetired) {
        // ── Accumulation phase ──
        // Growth first (end-of-period contributions match futureValue() formula)
        balance *= (1 + annualReturn)
        // Fees
        balance *= (1 - feeRate)
        // Contribution (inflation-adjusted + annual raise) — added at end of year
        balance += annualContribution * inflationCumulative * Math.pow(1 + contribIncrease, y - 1)
      } else {
        // ── Withdrawal phase ──
        // First retirement year: lock in the annual withdrawal amount.
        if (annualWithdrawal === 0) {
          annualWithdrawal = useFixedIncome
            ? desiredAnnualIncome!
            : balance * withdrawalRate
        }

        // 1. Start-of-year withdrawal (subtract before growth)
        balance -= annualWithdrawal

        if (balance <= 0) {
          balance = 0
          if (!failed) {
            failed = true
            failYear = age
          }
          if (recordPath) path.push({ year: y, balance: 0 })
          // Record zero for remaining years in per-year accumulator
          for (let ry = y; ry <= totalYears; ry++) {
            let a = yearBalances.get(ry)
            if (!a) { a = []; yearBalances.set(ry, a) }
            a.push(0)
            if (recordPath && ry > y) path.push({ year: ry, balance: 0 })
          }
          break
        }

        // 2. Growth on remaining balance
        balance *= (1 + annualReturn)
        // 3. Fees
        balance *= (1 - feeRate)

        // Inflate withdrawal for next year to maintain purchasing power
        annualWithdrawal *= (1 + inflationThisYear)
      }

      const bal = Math.max(0, balance)
      if (recordPath) {
        path.push({ year: y, balance: bal })
      }

      // Record in per-year accumulator
      let a = yearBalances.get(y)
      if (!a) { a = []; yearBalances.set(y, a) }
      a.push(bal)
    }

    endingBalances.push(Math.max(0, balance))
    if (failed) failureYears.push(failYear)
    if (recordPath) sampledPaths.push(path)
  }

  // ── Compute statistics ──

  // Sort for percentiles
  const sorted = [...endingBalances].sort((a, b) => a - b)

  const successCount = endingBalances.filter((b) => b > 0).length
  const probabilityOfSuccess = (successCount / numTrials) * 100

  let failureYear: number | null = null
  if (failureYears.length > 0) {
    const sortedFailures = [...failureYears].sort((a, b) => a - b)
    failureYear = sortedFailures[Math.floor(sortedFailures.length / 2)]
  }

  // Build per-year percentiles from ALL trials
  const yearlyPercentiles: YearlyPercentile[] = []
  for (let y = 0; y <= maxTrialYears; y++) {
    const balances = yearBalances.get(y)
    if (!balances || balances.length === 0) break
    balances.sort((a, b) => a - b)
    yearlyPercentiles.push({
      year: y,
      p10: percentileFromSorted(balances, 10),
      p25: percentileFromSorted(balances, 25),
      p50: percentileFromSorted(balances, 50),
      p75: percentileFromSorted(balances, 75),
      p90: percentileFromSorted(balances, 90),
    })
  }

  return {
    probabilityOfSuccess,
    percentiles: {
      p10: percentileFromSorted(sorted, 10),
      p50: percentileFromSorted(sorted, 50),
      p90: percentileFromSorted(sorted, 90),
    },
    paths: sampledPaths,
    yearlyPercentiles,
    failureYear,
    trialCount: numTrials,
    yearsSimulated: maxTrialYears,
  }
}
