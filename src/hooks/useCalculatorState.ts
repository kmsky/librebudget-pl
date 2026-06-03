import { useState, useCallback } from 'react'
import type { ContributionFrequency } from '../utils/compoundInterest'

export type CalculatorMode = 'standard' | 'goalSeeker' | 'autoLoan' | 'houseAffordability'

export type WithdrawalMode = 'rate' | 'income'

export interface CalculatorState {
  mode: CalculatorMode
  initialBalance: string
  contribution: string
  contributionFrequency: ContributionFrequency
  years: string
  annualRate: string
  withdrawalMode: WithdrawalMode
  withdrawalRatePercent: number
  desiredAnnualIncome: string
  currentAge: string
  targetRetirementAge: number
  contributionAnnualIncrease: string
  // Monte Carlo fields
  returnStdDev: string
  inflationMean: string
  inflationStdDev: string
  annualFee: string
  endAge: string
  numTrials: string
  useVariableLongevity: boolean
  useRegimeSwitching: boolean
}

const DEFAULT_STATE: CalculatorState = {
  mode: 'standard',
  initialBalance: '',
  contribution: '',
  contributionFrequency: 'monthly',
  years: '',
  annualRate: '',
  withdrawalMode: 'rate',
  withdrawalRatePercent: 4,
  desiredAnnualIncome: '',
  currentAge: '',
  targetRetirementAge: 65,
  contributionAnnualIncrease: '0',
  // Monte Carlo defaults (inflation tuned to Polish realities — higher and more volatile than the US)
  returnStdDev: '15',
  inflationMean: '3.5',
  inflationStdDev: '3',
  annualFee: '0.5',
  endAge: '90',
  numTrials: '10000',
  useVariableLongevity: false,
  useRegimeSwitching: false,
}

export function useCalculatorState() {
  const [state, setState] = useState<CalculatorState>(() => DEFAULT_STATE)

  const updateState = useCallback((patch: Partial<CalculatorState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  return { state, updateState, reset }
}
