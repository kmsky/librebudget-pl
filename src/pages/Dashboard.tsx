import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Card } from '../components/ui/Card'
import { InfoTip } from '../components/ui/InfoTip'
import { HealthBar } from '../components/dashboard/HealthBar'
import { FinancialHealthScore } from '../components/dashboard/FinancialHealthScore'
import { RoadmapWidget } from '../components/dashboard/RoadmapWidget'
import { CategoryDonut } from '../components/dashboard/CategoryDonut'
import { TopOffenders } from '../components/dashboard/TopOffenders'
import { QuickStats } from '../components/dashboard/QuickStats'
import { SavingsTracker } from '../components/dashboard/SavingsTracker'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useSettings } from '../hooks/useSettings'
import {
  sumByType,
  groupByCategory,
  groupByCategoryGroup,
  formatCurrency,
} from '../utils/calculations'
import { getMonthlyForecast, type Forecast } from '../utils/forecasting'
import type { CategoryGroup, Category } from '../db/database'
import { getCategoryIconClassName, GROUP_COLORS, GROUP_LABELS } from '../utils/colors'
import { Icon } from '../components/ui/Icon'

const CONFIDENCE_TIPS: Record<string, string> = {
  low: 'Mniej niż 10 dni danych w tym miesiącu. Szacunek opiera się głównie na poprzednich miesiącach i może się znacznie zmienić.',
  medium: '10–19 dni danych. Szacunek łączy bieżące tempo z trendami historycznymi.',
  high: '20+ dni danych. Szacunek opiera się głównie na rzeczywistym tempie wydatków w tym miesiącu.',
}

export default function Dashboard() {
  const { getMonthlyBudget } = useSettings()
  const [viewDate, setViewDate] = useState(new Date())
  const monthlyBudget = getMonthlyBudget(format(viewDate, 'yyyy-MM'))

  const start = format(startOfMonth(viewDate), 'yyyy-MM-dd')
  const end = format(endOfMonth(viewDate), 'yyyy-MM-dd')
  const isCurrentMonth = format(viewDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  const { transactions } = useTransactions(start, end)
  const { getCategoryById } = useCategories()
  const [forecast, setForecast] = useState<Forecast | null>(null)

  const [groupBreakdown, setGroupBreakdown] = useState<Record<CategoryGroup, number>>({
    needs: 0, wants: 0, savings: 0, income: 0,
  })

  const totalIncome = sumByType(transactions, 'income')

  const savedThisMonth = groupBreakdown.savings
  const spendingExpenses = groupBreakdown.needs + groupBreakdown.wants
  const effectiveBudget = Math.max(0, monthlyBudget - savedThisMonth)

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

  const confidenceColors = { low: 'text-yellow-400', medium: 'text-blue-400', high: 'text-green-400' }

  return (
    <div className="space-y-6">
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

      <QuickStats
        totalIncome={totalIncome}
        spendingExpenses={spendingExpenses}
        savedThisMonth={savedThisMonth}
        effectiveBudget={effectiveBudget}
      />

      <Card>
        <HealthBar spent={spendingExpenses} budget={effectiveBudget} saved={savedThisMonth} />
      </Card>

      <SavingsTracker saved={savedThisMonth} budget={monthlyBudget} income={totalIncome} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CategoryDonut breakdown={groupBreakdown} /></Card>
        <Card><TopOffenders categorySpending={categorySpending} /></Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">Ostatnie transakcje</h3>
          <Link to="/transactions" className="text-xs text-green-400 hover:text-green-300">Zobacz wszystkie</Link>
        </div>
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-6">
            Brak transakcji.{' '}
            <Link to="/add" className="text-green-400 hover:text-green-300">Dodaj pierwszą</Link>
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {transactions.slice(0, 5).map((tx, idx) => {
              const cat = getCategoryById(tx.categoryId)
              return (
                <div key={tx.id}>
                  {idx > 0 && <div className="border-t border-slate-800" />}
                  <Link
                    to="/transactions"
                    className="tx-row flex items-center gap-3 px-3.5 py-3 active:bg-slate-800"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: cat ? `${GROUP_COLORS[cat.group]}18` : '#262626' }}
                    >
                      <Icon
                        name={cat?.icon ?? 'Wallet'}
                        size={18}
                        className={cat ? getCategoryIconClassName(cat.group) : 'text-slate-500'}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug text-slate-200">
                        {tx.description || cat?.name || 'Transakcja'}
                      </p>
                      {cat && (
                        <span
                          className="mt-0.5 inline-block max-w-full truncate rounded-md px-1.5 py-px text-xs font-medium leading-none"
                          style={{
                            backgroundColor: `${GROUP_COLORS[cat.group]}1a`,
                            color: GROUP_COLORS[cat.group],
                          }}
                        >
                          {GROUP_LABELS[cat.group]} · {cat.name}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold tabular-nums ${tx.type === 'income' ? 'text-green-400' : tx.type === 'savings_withdrawal' ? 'text-blue-400' : 'text-slate-200'}`}>
                        {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-slate-500">{format(new Date(tx.date), 'd MMM', { locale: pl })}</p>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <FinancialHealthScore />

      <RoadmapWidget />

      {/* Forecast (current month only) */}
      {forecast && isCurrentMonth && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Prognoza na koniec miesiąca</h3>
            <span className={`text-xs font-medium ${confidenceColors[forecast.confidence]} flex items-center gap-1`}>
              {forecast.confidence === 'low' ? 'Niska' : forecast.confidence === 'medium' ? 'Średnia' : 'Wysoka'} pewność
              <InfoTip>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {CONFIDENCE_TIPS[forecast.confidence]}
                </p>
              </InfoTip>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-slate-500">Prognozowane wydatki</p>
              <p className={`text-lg font-bold ${forecast.onTrack ? 'text-slate-200' : 'text-red-400'}`}>
                {formatCurrency(forecast.projectedExpenses)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Dzienne tempo</p>
              <p className="text-lg font-bold text-slate-200">{formatCurrency(forecast.dailyBurnRate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pozostało dni</p>
              <p className="text-lg font-bold text-slate-200">{forecast.daysLeft}</p>
            </div>
          </div>
          {!forecast.onTrack && (
            <p className="mt-2 text-xs text-red-400">
              ⚠ W tym tempie przekroczysz budżet wydatków {formatCurrency(forecast.effectiveBudget)}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}

