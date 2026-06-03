import { formatCurrency } from '../../utils/calculations'

interface QuickStatsProps {
  totalIncome: number
  spendingExpenses: number
  savedThisMonth: number
  effectiveBudget: number
}

export function QuickStats({ totalIncome, spendingExpenses, savedThisMonth, effectiveBudget }: QuickStatsProps) {
  const remaining = effectiveBudget - spendingExpenses

  const stats = [
    {
      label: 'Przychód',
      value: formatCurrency(totalIncome),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Wydatki',
      value: formatCurrency(spendingExpenses),
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Pozostało',
      value: formatCurrency(remaining),
      color: remaining >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: remaining >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      label: 'Zaoszczędzono',
      value: formatCurrency(savedThisMonth),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-xl ${stat.bgColor} p-4`}
        >
          <p className="text-xs font-medium text-slate-400">{stat.label}</p>
          <p className={`mt-1 text-lg font-bold ${stat.color}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  )
}
