import type { Category } from '../../db/database'
import { formatCurrency } from '../../utils/calculations'
import { GROUP_COLORS, getCategoryIconClassName } from '../../utils/colors'
import { Icon } from '../ui/Icon'

interface TopOffendersProps {
  categorySpending: { category: Category; total: number }[]
}

export function TopOffenders({ categorySpending }: TopOffendersProps) {
  const sorted = [...categorySpending]
    .filter(({ category }) => category.group !== 'savings')
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const max = sorted[0]?.total ?? 0

  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400">Największe wydatki</h3>
        <p className="text-sm text-slate-500 py-4 text-center">
          Brak danych o wydatkach
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-400">Top Expenses</h3>
      <div className="space-y-3">
        {sorted.map(({ category, total }, i) => {
          const width = max > 0 ? (total / max) * 100 : 0
          const color = GROUP_COLORS[category.group]
          return (
            <div key={category.id} className="space-y-1">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <Icon name={category.icon} size={16} className={`shrink-0 ${getCategoryIconClassName(category.group)}`} />
                <span className="shrink-0 text-xs font-medium text-slate-500">#{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-slate-200">{category.name}</span>
                <span className="shrink-0 font-medium text-slate-200">{formatCurrency(total)}</span>
              </div>
              <div className="progress-track h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
