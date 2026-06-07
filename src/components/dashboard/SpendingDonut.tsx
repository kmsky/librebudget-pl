import { useState } from 'react'
import type { Category } from '../../db/database'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Card } from '../ui/Card'
import { formatCurrency } from '../../utils/calculations'

interface SpendingDonutProps {
  categorySpending: { category: Category; total: number }[]
}

/**
 * Distinct slice color per category. Preset categories share one color per group
 * in the DB (all needs are yellow, etc.), so identity color is generated here
 * instead: evenly-spaced hues tuned for the dark background.
 */
function sliceColor(i: number, n: number): string {
  const hue = Math.round((i * 360) / Math.max(n, 1))
  return `hsl(${hue}, 60%, 58%)`
}

export function SpendingDonut({ categorySpending }: SpendingDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const items = [...categorySpending]
    .filter(({ category }) => category.group !== 'savings')
    .sort((a, b) => b.total - a.total)

  const total = items.reduce((sum, it) => sum + it.total, 0)

  if (items.length === 0 || total === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">Wydatki wg kategorii</h3>
        <p className="py-4 text-center text-sm text-slate-500">Brak danych o wydatkach</p>
      </Card>
    )
  }

  const data = items.map((it, i) => ({
    name: it.category.name,
    value: it.total,
    color: sliceColor(i, items.length),
    pct: (it.total / total) * 100,
  }))

  const active = activeIndex != null ? data[activeIndex] : null

  return (
    <Card>
      <h3 className="mb-3 text-sm font-medium text-slate-400">Wydatki wg kategorii</h3>

      {/* Hovered slice info shows in the center hole — no floating tooltip to overlap. */}
      <div className="relative h-56" onMouseLeave={() => setActiveIndex(null)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={1.5}
              stroke="none"
              isAnimationActive={false}
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={d.color}
                  opacity={active && i !== activeIndex ? 0.4 : 1}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[28%] text-center">
          {active ? (
            <>
              <span className="flex max-w-full items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: active.color }} />
                <span className="truncate">{active.name}</span>
              </span>
              <span className="mt-0.5 text-lg font-bold tabular-nums text-slate-100">
                {formatCurrency(active.value)}
              </span>
              <span className="text-xs tabular-nums text-slate-500">{active.pct.toFixed(0)}%</span>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-500">Razem</span>
              <span className="text-lg font-bold tabular-nums text-slate-100">{formatCurrency(total)}</span>
            </>
          )}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {data.map((d, i) => (
          <li
            key={d.name}
            className="flex items-center gap-2 text-sm"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-300">{d.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-slate-500">{d.pct.toFixed(0)}%</span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-slate-200">
              {formatCurrency(d.value)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
