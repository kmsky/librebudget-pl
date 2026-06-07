import { useState, useEffect } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { db } from '../../db/database'
import { groupByCategoryGroup, formatCurrency } from '../../utils/calculations'
import { buildCumulativeSavings, type SavingsTrendPoint } from '../../utils/savingsTrend'
import { useSavingsGoals } from '../../hooks/useSavingsGoals'

const TREND_MONTHS = 6
const GROWTH_COLOR = '#22c55e'

export function WealthZone() {
  const { goals } = useSavingsGoals()
  const grandTotal = goals.reduce((sum, g) => sum + g.currentAmount, 0)

  const [trend, setTrend] = useState<SavingsTrendPoint[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const now = new Date()
      const monthly: { label: string; netSavings: number }[] = []

      for (let i = TREND_MONTHS - 1; i >= 0; i--) {
        const date = subMonths(now, i)
        const start = format(startOfMonth(date), 'yyyy-MM-dd')
        const end = format(endOfMonth(date), 'yyyy-MM-dd')
        const txs = await db.transactions.where('date').between(start, end, true, true).toArray()
        const breakdown = await groupByCategoryGroup(txs)
        monthly.push({ label: format(date, 'LLL', { locale: pl }), netSavings: breakdown.savings })
      }

      // Seed the line so its final point matches today's actual total: the
      // baseline is the balance that existed before the trend window.
      const recentFlow = monthly.reduce((s, m) => s + m.netSavings, 0)
      const startingTotal = grandTotal - recentFlow

      if (!cancelled) setTrend(buildCumulativeSavings(monthly, startingTotal))
    }

    load()
    return () => {
      cancelled = true
    }
  }, [grandTotal])

  const hasData = grandTotal !== 0 || goals.length > 0

  if (!hasData) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-slate-500">
          Brak oszczędności. Dodaj cel lub konto, aby śledzić, jak rośnie Twój majątek.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-slate-400">Zgromadzone oszczędności</p>
        <p className="mt-0.5 text-3xl font-bold tabular-nums text-slate-100">
          {formatCurrency(grandTotal)}
        </p>

        {trend.length > 1 && (
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="savFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GROWTH_COLOR} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={GROWTH_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '13px' }}
                  formatter={(value) => formatCurrency(value as number)}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={GROWTH_COLOR}
                  strokeWidth={2}
                  fill="url(#savFill)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {goals.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-400">Cele i konta</h3>
          <div className="space-y-3">
            {goals.map((g) => {
              const showProgress = g.type === 'goal' && g.targetAmount > 0
              const progress = showProgress ? Math.min(g.currentAmount / g.targetAmount, 1) : null
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <Icon name={g.icon || 'Wallet'} size={16} className="shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-slate-200">{g.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-slate-200">
                      {formatCurrency(g.currentAmount)}
                    </span>
                  </div>
                  {progress !== null && (
                    <div className="progress-track h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress * 100}%`,
                          backgroundColor: progress >= 1 ? '#22c55e' : '#3b82f6',
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
