import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { formatCurrency } from '../../utils/calculations'
import {
  getGroupAllocation,
  getBudgetStatusColor,
  getSavingsStatusColor,
  STATUS_GREEN,
  STATUS_RED,
} from '../../utils/budget'
import { GROUP_LABELS } from '../../utils/colors'
import type { CategoryGroup, BudgetGoal } from '../../db/database'
import type { Forecast } from '../../utils/forecasting'

interface BudgetGroupsProps {
  /** Net amount per group for the viewed month (groupByCategoryGroup output). */
  spent: Record<CategoryGroup, number>
  /** Total income for the viewed month. */
  income: number
  /** Budget goals for the viewed month (group-level rows have categoryId === null). */
  goals: BudgetGoal[]
  monthlyBudget: number
  /** End-of-month forecast, present only for the current month. */
  forecast: Forecast | null
}

type BudgetGroupKey = 'needs' | 'wants' | 'savings'

const GROUPS: { key: BudgetGroupKey; icon: string }[] = [
  { key: 'needs', icon: 'ShoppingCart' },
  { key: 'wants', icon: 'Sparkles' },
  { key: 'savings', icon: 'Landmark' },
]

/** Signed contribution to the month balance, e.g. "+8 000 zł" / "−5 200 zł". */
function signed(n: number): string {
  return `${n >= 0 ? '+' : '−'}${formatCurrency(Math.abs(n))}`
}

export function BudgetGroups({ spent, income, goals, monthlyBudget, forecast }: BudgetGroupsProps) {
  const spending = spent.needs + spent.wants
  const saved = spent.savings
  // Free, unallocated cash this month: what came in, minus what was spent and set aside.
  const leftover = income - spending - saved

  return (
    <Card>
      {/* Month cash balance — "do I actually have money?", separate from budget adherence */}
      <div className="mb-5 border-b border-slate-800 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-slate-400">Zostało w tym miesiącu</span>
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: leftover >= 0 ? STATUS_GREEN : STATUS_RED }}
          >
            {formatCurrency(leftover)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs tabular-nums text-slate-500">
          <span>Przychód {signed(income)}</span>
          <span>Wydatki {signed(-spending)}</span>
          <span>Odłożone {signed(-saved)}</span>
        </div>
      </div>

      <div className="space-y-5">
        {GROUPS.map(({ key, icon }) => {
          const allocation = getGroupAllocation(key, goals, monthlyBudget)
          const value = spent[key]
          const ratio = allocation > 0 ? value / allocation : 0
          const fill = Math.max(0, Math.min(ratio, 1)) * 100
          const isSavings = key === 'savings'

          const color = isSavings
            ? getSavingsStatusColor(value, allocation)
            : getBudgetStatusColor(value, allocation)

          // Spending: remaining budget. Savings: distance above/below the plan.
          const delta = isSavings ? value - allocation : allocation - value
          const good = delta >= 0

          let note: string
          if (isSavings) {
            note = good
              ? `${formatCurrency(delta)} ponad plan`
              : `jeszcze ${formatCurrency(-delta)} do planu`
          } else {
            note = good
              ? `pozostało ${formatCurrency(delta)}`
              : `przekroczono o ${formatCurrency(-delta)}`
          }

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Icon name={icon} size={16} className="shrink-0 text-slate-400" />
                <span className="font-medium text-slate-200">{GROUP_LABELS[key]}</span>
                <span className="ml-auto tabular-nums text-slate-400">
                  {formatCurrency(value)}
                  <span className="text-slate-600"> / {formatCurrency(allocation)}</span>
                </span>
              </div>
              <div className="progress-track h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${fill}%`, backgroundColor: color }}
                />
              </div>
              <p
                className="text-right text-xs font-medium tabular-nums"
                style={{ color }}
              >
                {note}
              </p>
            </div>
          )
        })}
      </div>

      {forecast && (
        <p
          className={`mt-5 border-t border-slate-800 pt-3 text-xs ${
            forecast.onTrack ? 'text-slate-500' : 'text-red-400'
          }`}
        >
          {forecast.onTrack
            ? `Prognoza na koniec miesiąca: ${formatCurrency(forecast.projectedExpenses)} (budżet ${formatCurrency(forecast.effectiveBudget)})`
            : `⚠ W tym tempie wydasz ${formatCurrency(forecast.projectedExpenses)} do końca miesiąca — ponad budżet ${formatCurrency(forecast.effectiveBudget)}`}
        </p>
      )}
    </Card>
  )
}
