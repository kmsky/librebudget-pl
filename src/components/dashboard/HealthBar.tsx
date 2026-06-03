import { getHealthBarColor } from '../../utils/colors'
import { formatCurrency } from '../../utils/calculations'
import { useTheme } from '../../hooks/useTheme'

interface HealthBarProps {
  spent: number
  budget: number
  saved?: number
}

export function HealthBar({ spent, budget, saved = 0 }: HealthBarProps) {
  const { theme } = useTheme()
  const ratio = budget > 0 ? Math.min(spent / budget, 1.2) : 0
  const remaining = Math.max(budget - spent, 0)
  const percentage = Math.min(ratio * 100, 100)
  const color = getHealthBarColor(ratio, theme)

  const label =
    ratio <= 0.5
      ? 'Świetnie ci idzie!'
      : ratio <= 0.75
        ? 'Na dobrej drodze'
        : ratio <= 0.9
          ? 'Robi się ciasno...'
          : ratio <= 1
            ? 'Prawie na limicie!'
            : 'Przekroczony budżet!'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-400">Kondycja budżetu</h3>
          <p className="text-lg font-bold" style={{ color }}>
            {label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Pozostało</p>
          <p className="text-lg font-bold text-slate-100">
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {/* HP Bar */}
      <div className="health-bar-track relative h-6 overflow-hidden rounded-full bg-slate-800">
        <div
          className="health-bar-fill absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}40`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="health-bar-text text-xs font-bold text-white drop-shadow-sm">
            {formatCurrency(spent)} / {formatCurrency(budget)}
          </span>
        </div>
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>{Math.round(percentage)}% wykorzystano</span>
        <span>{Math.round(100 - Math.min(percentage, 100))}% pozostało</span>
      </div>

      {saved > 0 && (
        <p className="text-xs text-blue-400 text-center">
          {formatCurrency(saved)} odłożone poza budżetem · budżet wydatków skorygowany do {formatCurrency(budget)}
        </p>
      )}
    </div>
  )
}
