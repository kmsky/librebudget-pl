import { useState, useEffect } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card } from '../components/ui/Card'
import { db, EXPENSE_GROUPS, type CategoryGroup } from '../db/database'
import {
  sumByType,
  groupByCategoryGroup,
  formatCurrency,
} from '../utils/calculations'
import { GROUP_COLORS, GROUP_LABELS } from '../utils/colors'
import { Icon } from '../components/ui/Icon'

interface MonthData {
  month: string
  label: string
  income: number
  expenses: number
  groupBreakdown: Record<CategoryGroup, number>
}

// Polish plural form for "zmiana na plus" (poprawa)
function pluralizePoprawy(n: number): string {
  if (n === 1) return 'poprawę'
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'poprawy'
  return 'poprawek'
}

export default function Review() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMonthlyData()
  }, [])

  const loadMonthlyData = async () => {
    const data: MonthData[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i)
      const monthStr = format(date, 'yyyy-MM')
      const start = format(startOfMonth(date), 'yyyy-MM-dd')
      const end = format(endOfMonth(date), 'yyyy-MM-dd')

      const txs = await db.transactions
        .where('date')
        .between(start, end, true, true)
        .toArray()

      const breakdown = await groupByCategoryGroup(txs)

      data.push({
        month: monthStr,
        label: format(date, 'LLL', { locale: pl }),
        income: sumByType(txs, 'income'),
        expenses: sumByType(txs, 'expense'),
        groupBreakdown: breakdown,
      })
    }

    setMonths(data)
    setLoading(false)
  }

  const current = months[months.length - 1]
  const previous = months[months.length - 2]

  const improvements: { text: string; positive: boolean }[] = []
  if (current && previous && previous.expenses > 0) {
    const expenseChange =
      ((current.expenses - previous.expenses) / previous.expenses) * 100

    if (expenseChange < 0) {
      improvements.push({
        text: `Wydałeś o ${Math.abs(expenseChange).toFixed(0)}% mniej niż w zeszłym miesiącu!`,
        positive: true,
      })
    } else if (expenseChange > 0) {
      improvements.push({
        text: `Wydatki wzrosły o ${expenseChange.toFixed(0)}% względem zeszłego miesiąca.`,
        positive: false,
      })
    }

    const groups = EXPENSE_GROUPS
    for (const group of groups) {
      const prevAmount = previous.groupBreakdown[group]
      const currAmount = current.groupBreakdown[group]
      if (prevAmount > 0 && currAmount < prevAmount) {
        const pct = (((prevAmount - currAmount) / prevAmount) * 100).toFixed(0)
        improvements.push({
          text: `Wydatki w grupie „${GROUP_LABELS[group]}” spadły o ${pct}%`,
          positive: true,
        })
      }
    }

    if (current.income > previous.income && previous.income > 0) {
      improvements.push({
        text: `Przychód wzrósł o ${(((current.income - previous.income) / previous.income) * 100).toFixed(0)}%`,
        positive: true,
      })
    }
  }

  const onTrack = current && current.expenses <= current.income
  const positiveCount = improvements.filter((i) => i.positive).length

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-400">Ładowanie danych przeglądu...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Przegląd miesiąca</h1>
        <p className="text-sm text-slate-400">
          {format(new Date(), 'LLLL yyyy', { locale: pl })} — ostatnie 6 miesięcy
        </p>
      </div>

      {/* Congratulations banner */}
      {positiveCount >= 2 && (
        <div className="rounded-2xl border border-green-800 bg-green-900/20 p-5">
          <h3 className="mb-1 text-lg font-bold text-green-400">
            Świetne postępy!
          </h3>
          <p className="text-sm text-green-300/80">
            W tym miesiącu masz {positiveCount} {pluralizePoprawy(positiveCount)} na plus. Tak trzymaj!
          </p>
        </div>
      )}

      {/* Income vs Expenses chart */}
      <Card>
        <h3 className="mb-4 text-sm font-medium text-slate-400">
          Przychody vs wydatki
        </h3>
        {months.some((m) => m.income > 0 || m.expenses > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(v) => `${v} zł`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '13px',
                  }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Przychód" />
                <Bar dataKey="expenses" fill="#f97316" radius={[4, 4, 0, 0]} name="Wydatki" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-sm text-slate-500 py-8">
            Dodaj transakcje, aby zobaczyć swoje trendy
          </p>
        )}
      </Card>

      {/* Group breakdown over time */}
      <Card>
        <h3 className="mb-4 text-sm font-medium text-slate-400">
          Wydatki według grup
        </h3>
        {months.some((m) => m.expenses > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(v) => `${v} zł`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '13px',
                  }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar
                  dataKey="groupBreakdown.needs"
                  stackId="a"
                  fill={GROUP_COLORS.needs}
                  name="Potrzeby"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="groupBreakdown.wants"
                  stackId="a"
                  fill={GROUP_COLORS.wants}
                  name="Zachcianki"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="groupBreakdown.savings"
                  stackId="a"
                  fill={GROUP_COLORS.savings}
                  name="Oszczędności"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-sm text-slate-500 py-8">
            Brak danych o wydatkach
          </p>
        )}
      </Card>

      {/* On track */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">
          Ten miesiąc w skrócie
        </h3>
        {current ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                  onTrack ? 'bg-green-900/30' : 'bg-orange-900/30'
                }`}
              >
                {onTrack ? <Icon name="Check" size={24} className="text-green-400" /> : <Icon name="AlertTriangle" size={24} className="text-orange-400" />}
              </div>
              <div>
                <p className="font-medium text-slate-200">
                  {onTrack ? 'Jesteś na dobrej drodze!' : 'Wydatki przewyższają przychody'}
                </p>
                <p className="text-sm text-slate-400">
                  Przychód: {formatCurrency(current.income)} · Wydatki:{' '}
                  {formatCurrency(current.expenses)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Brak danych za ten miesiąc</p>
        )}
      </Card>

      {/* Improvements */}
      {improvements.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-400">
            Najważniejsze
          </h3>
          <div className="space-y-2">
            {improvements.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
                  item.positive
                    ? 'bg-green-900/20 text-green-300'
                    : 'bg-orange-900/20 text-orange-300'
                }`}
              >
                <span className="mt-0.5">{item.positive ? <Icon name="ArrowUpRight" size={16} /> : <Icon name="ArrowDownRight" size={16} />}</span>
                {item.text}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
