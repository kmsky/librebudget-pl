import { useState, useEffect } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { Card } from '../components/ui/Card'
import { db, EXPENSE_GROUPS } from '../db/database'
import { sumByType, groupByCategoryGroup, formatCurrency } from '../utils/calculations'
import { GROUP_COLORS, GROUP_LABELS } from '../utils/colors'

interface TrendMonth {
  label: string
  income: number
  expenses: number
  net: number
  needs: number
  wants: number
  savings: number
}

export default function Trends() {
  const [range, setRange] = useState<6 | 12>(12)
  const [data, setData] = useState<TrendMonth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [range])

  const loadData = async () => {
    setLoading(true)
    const months: TrendMonth[] = []
    const now = new Date()

    for (let i = range - 1; i >= 0; i--) {
      const date = subMonths(now, i)
      const start = format(startOfMonth(date), 'yyyy-MM-dd')
      const end = format(endOfMonth(date), 'yyyy-MM-dd')

      const txs = await db.transactions
        .where('date').between(start, end, true, true).toArray()

      const income = sumByType(txs, 'income')
      const expenses = sumByType(txs, 'expense')
      const breakdown = await groupByCategoryGroup(txs)

      months.push({
        label: format(date, 'LLL', { locale: pl }),
        income,
        expenses,
        net: income - expenses,
        needs: breakdown.needs,
        wants: breakdown.wants,
        savings: breakdown.savings,
      })
    }

    setData(months)
    setLoading(false)
  }

  const avgExpenses = data.length > 0
    ? data.reduce((s, m) => s + m.expenses, 0) / data.length
    : 0
  const avgIncome = data.length > 0
    ? data.reduce((s, m) => s + m.income, 0) / data.length
    : 0
  const avgSavingsRate = avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-400">Ładowanie trendów...</p>
      </div>
    )
  }

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    fontSize: '13px',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trendy wydatków</h1>
          <p className="text-sm text-slate-400">Zobacz szerszy obraz w czasie</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
          {([6, 12] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${range === r ? 'bg-slate-800 text-slate-100' : 'text-slate-500'}`}
            >{r} mies.</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-slate-500">Śr. miesięczny przychód</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(avgIncome)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Śr. miesięczne wydatki</p>
          <p className="text-2xl font-bold text-slate-200">{formatCurrency(avgExpenses)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Śr. stopa oszczędności</p>
          <p className={`text-2xl font-bold ${avgSavingsRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {avgSavingsRate.toFixed(1)}%
          </p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-medium text-slate-400">Przychody vs wydatki</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickFormatter={(v) => `${v} zł`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="Przychód" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} name="Wydatki" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-medium text-slate-400">Oszczędności netto na miesiąc</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickFormatter={(v) => `${v} zł`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="net" name="Oszczędności netto" radius={[4, 4, 0, 0]}
                fill="#22c55e"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props
                  const color = payload.net >= 0 ? '#22c55e' : '#ef4444'
                  return <rect x={x} y={y} width={width} height={height} rx={4} fill={color} />
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-medium text-slate-400">Wydatki według grup kategorii</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickFormatter={(v) => `${v} zł`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              {EXPENSE_GROUPS.map((g) => (
                <Bar key={g} dataKey={g} stackId="a" fill={GROUP_COLORS[g]} name={GROUP_LABELS[g]}
                  radius={g === 'savings' ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
