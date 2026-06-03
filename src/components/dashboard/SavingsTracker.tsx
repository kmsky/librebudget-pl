import { Card } from '../ui/Card'
import { formatCurrency } from '../../utils/calculations'

const GOAL_PCT = 25

interface SavingsTrackerProps {
  saved: number
  budget: number
  income: number
}

export function SavingsTracker({ saved, budget, income }: SavingsTrackerProps) {
  if (saved <= 0 && income <= 0) return null

  const percentOfIncome = income > 0 ? (saved / income) * 100 : 0
  const meetsGoal = percentOfIncome >= GOAL_PCT
  const barFill = income > 0 ? Math.min((percentOfIncome / GOAL_PCT) * 100, 100) : 0
  const shortfall = income > 0 ? Math.max(0, income * (GOAL_PCT / 100) - saved) : 0
  const spendingBudget = Math.max(0, budget - saved)

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-400">Zaoszczędzono w tym miesiącu</h3>
        <span className={`text-xs font-medium ${meetsGoal ? 'text-green-400' : 'text-slate-500'}`}>
          Cel: {GOAL_PCT}%+ przychodu
        </span>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <p className={`text-2xl font-bold ${meetsGoal ? 'text-green-400' : 'text-blue-400'}`}>
            {formatCurrency(saved)}
          </p>
          {income > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              {percentOfIncome.toFixed(1)}% przychodu
            </p>
          )}
        </div>
        {budget > 0 && saved > 0 && (
          <div className="text-right">
            <p className="text-sm font-medium text-slate-300">{formatCurrency(spendingBudget)}</p>
            <p className="text-xs text-slate-500">pozostało na wydatki</p>
          </div>
        )}
      </div>

      {income > 0 && (
        <div className="space-y-1.5">
          <div className="progress-track h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${meetsGoal ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${barFill}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">0%</span>
            {meetsGoal ? (
              <span className="text-green-400 font-medium">Cel osiągnięty!</span>
            ) : (
              <span className="text-slate-500">
                jeszcze {formatCurrency(shortfall)} do {GOAL_PCT}%
              </span>
            )}
            <span className="text-slate-600">{GOAL_PCT}%</span>
          </div>
        </div>
      )}
    </Card>
  )
}
