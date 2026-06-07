import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import { BudgetGroups } from '../components/dashboard/BudgetGroups'
import { SpendingDonut } from '../components/dashboard/SpendingDonut'
import { WealthZone } from '../components/dashboard/WealthZone'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useSettings } from '../hooks/useSettings'
import { useBudgetGoals } from '../hooks/useBudgetGoals'
import { sumByType, groupByCategory, groupByCategoryGroup } from '../utils/calculations'
import { getMonthlyForecast, type Forecast } from '../utils/forecasting'
import type { CategoryGroup, Category } from '../db/database'

export default function Dashboard() {
  const { getMonthlyBudget } = useSettings()
  const [viewDate, setViewDate] = useState(new Date())
  const month = format(viewDate, 'yyyy-MM')
  const monthlyBudget = getMonthlyBudget(month)

  const start = format(startOfMonth(viewDate), 'yyyy-MM-dd')
  const end = format(endOfMonth(viewDate), 'yyyy-MM-dd')
  const isCurrentMonth = month === format(new Date(), 'yyyy-MM')

  const { transactions } = useTransactions(start, end)
  const { getCategoryById } = useCategories()
  const { goals } = useBudgetGoals(month)
  const [forecast, setForecast] = useState<Forecast | null>(null)

  const [groupBreakdown, setGroupBreakdown] = useState<Record<CategoryGroup, number>>({
    needs: 0, wants: 0, savings: 0, income: 0,
  })

  const totalIncome = sumByType(transactions, 'income')

  const categorySpending = Object.entries(groupByCategory(transactions))
    .map(([catId, total]) => ({
      category: getCategoryById(Number(catId)),
      total,
    }))
    .filter((item): item is { category: Category; total: number } => !!item.category)

  useEffect(() => {
    groupByCategoryGroup(transactions).then(setGroupBreakdown)
  }, [transactions])

  useEffect(() => {
    if (isCurrentMonth) {
      getMonthlyForecast(monthlyBudget).then(setForecast)
    } else {
      setForecast(null)
    }
  }, [isCurrentMonth, monthlyBudget, transactions])

  return (
    <div className="space-y-8">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pulpit</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <button onClick={() => setViewDate((d) => subMonths(d, 1))}
              className="text-slate-500 hover:text-slate-300 text-sm">←</button>
            <p className="text-sm text-slate-400">{format(viewDate, 'LLLL yyyy', { locale: pl })}</p>
            <button onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="text-slate-500 hover:text-slate-300 text-sm"
              disabled={isCurrentMonth}>→</button>
            {!isCurrentMonth && (
              <button onClick={() => setViewDate(new Date())}
                className="text-xs text-green-400 hover:text-green-300 ml-1">Dziś</button>
            )}
          </div>
        </div>
        <Link to="/add"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-xl font-medium leading-none text-white hover:bg-green-700 transition-colors">
          <span className="block -translate-y-0.5">+</span>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Budżet</h2>
        <BudgetGroups
          spent={groupBreakdown}
          income={totalIncome}
          goals={goals}
          monthlyBudget={monthlyBudget}
          forecast={forecast}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Wydatki</h2>
        <SpendingDonut categorySpending={categorySpending} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Majątek</h2>
        <WealthZone />
      </section>
    </div>
  )
}
