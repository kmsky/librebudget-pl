import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { EXPENSE_GROUPS, type CategoryGroup } from '../../db/database'
import { GROUP_COLORS, GROUP_LABELS } from '../../utils/colors'
import { formatCurrency } from '../../utils/calculations'

interface CategoryDonutProps {
  breakdown: Record<CategoryGroup, number>
}

// Fixed chart dimensions — avoids ResponsiveContainer's ResizeObserver
// firing with conflicting sizes on mobile (common Recharts mobile bug).
const CHART_SIZE = 160
const INNER_R = 42
const OUTER_R = 64

export function CategoryDonut({ breakdown }: CategoryDonutProps) {
  const data = EXPENSE_GROUPS
    .map((group) => ({
      name: GROUP_LABELS[group],
      value: breakdown[group] ?? 0,
      color: GROUP_COLORS[group],
    }))
    .filter((d) => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)
  const withPct = data.map((d) => ({
    ...d,
    percentage: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
  }))

  if (total === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400">Podział wydatków</h3>
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          Brak wydatków w tym okresie
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-400">Spending Breakdown</h3>

      {/* Chart — centered, fixed pixel size, no ResponsiveContainer */}
      <div className="flex justify-center">
        <PieChart width={CHART_SIZE} height={CHART_SIZE}>
          <Pie
            data={withPct}
            cx={CHART_SIZE / 2}
            cy={CHART_SIZE / 2}
            innerRadius={INNER_R}
            outerRadius={OUTER_R}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {withPct.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload
              return (
                <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-xl">
                  <p className="font-medium" style={{ color: d.color }}>{d.name}</p>
                  <p className="text-slate-300">{formatCurrency(d.value)}</p>
                </div>
              )
            }}
          />
        </PieChart>
      </div>

      {/* Legend — sits below the chart, no horizontal competition with it */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {withPct.map((d) => (
          <div key={d.name} className="flex items-center gap-2 min-w-0">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="truncate text-sm text-slate-300">{d.name}</span>
            <span className="shrink-0 text-sm font-semibold text-slate-200">{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
