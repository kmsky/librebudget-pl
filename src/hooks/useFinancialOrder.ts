import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { sumByType } from '../utils/calculations'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

export interface Step {
  id: string
  title: string
  description: string
  isAutomated: boolean
  isComplete: boolean
  progress?: number
  target?: number
  actionLabel?: string
  actionLink?: string
}

export function useFinancialOrder() {
  const data = useLiveQuery(async () => {
    const [
      budgetGoals,
      savingsGoals,
      debts,
      settings,
      transactions,
    ] = await Promise.all([
      db.budgetGoals.toArray(),
      db.savingsGoals.toArray(),
      db.debts.toArray(),
      db.settings.toArray(),
      db.transactions.toArray(),
    ])

    const manualSteps = new Set(
      JSON.parse(
        settings.find((s) => s.key === 'foo_manual_steps')?.value || '[]'
      ) as string[]
    )

    // Calculate monthly expenses for emergency fund target
    const now = new Date()
    let totalExpenses = 0
    let monthsCount = 0
    for (let i = 1; i <= 3; i++) {
      const d = subMonths(now, i)
      const start = format(startOfMonth(d), 'yyyy-MM-dd')
      const end = format(endOfMonth(d), 'yyyy-MM-dd')
      const monthTxs = transactions.filter(t => t.date >= start && t.date <= end && t.type === 'expense')
      if (monthTxs.length > 0) {
        totalExpenses += sumByType(monthTxs, 'expense')
        monthsCount++
      }
    }
    const avgMonthlyExpenses = monthsCount > 0 ? totalExpenses / monthsCount : 0
    const emergencyFundTarget = avgMonthlyExpenses * 3
    const currentEmergencyFund = savingsGoals
      .filter(g => g.type === 'emergency_fund')
      .reduce((sum, g) => sum + g.currentAmount, 0)

    const hasHighInterestDebt = debts.some(d => d.interestRate > 10 && d.balance > 0)
    const hasLowInterestDebt = debts.some(d => d.interestRate <= 10 && d.balance > 0)
    const hasBudget = budgetGoals.length > 0

    const steps: Step[] = [
      {
        id: 'budget',
        title: 'Create a Budget',
        description: 'Track your income and expenses to know where your money goes.',
        isAutomated: true,
        isComplete: hasBudget || manualSteps.has('budget'),
        actionLabel: hasBudget ? 'View Budget' : 'Create Budget',
        actionLink: '/goals',
      },
      {
        id: 'high_interest_debt',
        title: 'High Interest Debt',
        description: 'Pay off credit cards and other debts with interest rates above 10%.',
        isAutomated: true,
        isComplete: !hasHighInterestDebt || manualSteps.has('high_interest_debt'),
        actionLabel: hasHighInterestDebt ? 'View Debts' : undefined,
        actionLink: '/debts',
      },
      {
        id: 'emergency_fund',
        title: 'Emergency Fund',
        description: 'Save 3-6 months of expenses for unexpected events.',
        isAutomated: true,
        isComplete: (currentEmergencyFund >= emergencyFundTarget && emergencyFundTarget > 0) || manualSteps.has('emergency_fund'),
        progress: currentEmergencyFund,
        target: emergencyFundTarget,
        actionLabel: 'View Savings',
        actionLink: '/savings',
      },
      {
        id: 'roth_hsa',
        title: 'Max out IKZE & IKE',
        description: 'Max out your IKZE (contributions are deductible from PIT) and IKE (no 19% Belka tax on gains when you withdraw).',
        isAutomated: false,
        isComplete: manualSteps.has('roth_hsa'),
      },
      {
        id: 'max_retirement',
        title: 'Invest Beyond IKE/IKZE',
        description: 'Once IKZE and IKE are maxed out, keep investing for retirement in a regular brokerage account.',
        isAutomated: false,
        isComplete: manualSteps.has('max_retirement'),
      },
      {
        id: 'hyper_accumulation',
        title: 'Hyper-Accumulation',
        description: 'Aim to invest 25% of your net income for financial independence.',
        isAutomated: false,
        isComplete: manualSteps.has('hyper_accumulation'),
      },
      {
        id: 'prepaid_expenses',
        title: 'Prepaid Future Expenses',
        description: 'Save for known future expenses like a car, wedding, or down payment.',
        isAutomated: false,
        isComplete: manualSteps.has('prepaid_expenses'),
      },
      {
        id: 'low_interest_debt',
        title: 'Low Interest Debt',
        description: 'Pay off remaining debts like student loans or mortgage.',
        isAutomated: true,
        isComplete: !hasLowInterestDebt || manualSteps.has('low_interest_debt'),
        actionLabel: hasLowInterestDebt ? 'View Debts' : undefined,
        actionLink: '/debts',
      },
    ]

    return steps
  })

  const toggleStep = async (id: string, isComplete: boolean) => {
    const settings = await db.settings.toArray()
    const current = new Set(
      JSON.parse(
        settings.find((s) => s.key === 'foo_manual_steps')?.value || '[]'
      ) as string[]
    )
    
    if (isComplete) {
      current.add(id)
    } else {
      current.delete(id)
    }
    
    // Check if key exists
    const existing = await db.settings.where('key').equals('foo_manual_steps').first()
    if (existing) {
      await db.settings.update(existing.id!, { value: JSON.stringify([...current]) })
    } else {
      await db.settings.add({ key: 'foo_manual_steps', value: JSON.stringify([...current]) })
    }
  }

  return { steps: data || [], toggleStep }
}
