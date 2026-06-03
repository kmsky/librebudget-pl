import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { Card } from '../ui/Card'
import { formatCurrency } from '../../utils/calculations'
import type { MonteCarloResult, YearlyPercentile } from '../../utils/monteCarlo'
import { ShieldCheck, ShieldAlert, TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react'
import { InfoTip } from '../ui/InfoTip'

interface Props {
  result: MonteCarloResult
  currentAge: number
  retirementAge: number
}

function successConfig(p: number) {
  if (p >= 80) return {
    color: 'text-green-400',
    bg: 'bg-green-500/5',
    border: 'border-green-500/20',
    ring: 'stroke-green-500',
    ringBg: 'stroke-green-500/10',
    icon: ShieldCheck,
    label: 'Mocny',
  }
  if (p >= 50) return {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/20',
    ring: 'stroke-yellow-500',
    ringBg: 'stroke-yellow-500/10',
    icon: ShieldAlert,
    label: 'Zagrożony',
  }
  return {
    color: 'text-red-400',
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    ring: 'stroke-red-500',
    ringBg: 'stroke-red-500/10',
    icon: AlertTriangle,
    label: 'Mało prawdopodobny',
  }
}

export function MonteCarloResults({ result, currentAge, retirementAge }: Props) {
  const { probabilityOfSuccess, percentiles, failureYear, trialCount, yearlyPercentiles } = result
  const cfg = successConfig(probabilityOfSuccess)
  const StatusIcon = cfg.icon

  // Map engine-computed yearly percentiles (from ALL trials) into age-indexed fan chart data
  const fanData = useMemo(() =>
    yearlyPercentiles.map((yp: YearlyPercentile) => ({
      age: currentAge + yp.year,
      p10: yp.p10, p25: yp.p25, p50: yp.p50, p75: yp.p75, p90: yp.p90,
    })),
    [yearlyPercentiles, currentAge],
  )

  const formatAxis = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln zł`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)} tys. zł`
    return `${v.toFixed(0)} zł`
  }

  const tooltipFormatter = (value: number | undefined) => value != null ? formatCurrency(value) : ''

  // SVG ring gauge
  const ringSize = 88
  const strokeW = 6
  const radius = (ringSize - strokeW) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (probabilityOfSuccess / 100) * circumference

  return (
    <div className="space-y-4">
      {/* Hero: Success probability + Percentiles */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Ring gauge */}
          <div className="relative shrink-0">
            <svg width={ringSize} height={ringSize} className="-rotate-90">
              <circle cx={ringSize / 2} cy={ringSize / 2} r={radius}
                fill="none" strokeWidth={strokeW} className={cfg.ringBg} />
              <circle cx={ringSize / 2} cy={ringSize / 2} r={radius}
                fill="none" strokeWidth={strokeW} className={cfg.ring}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-bold ${cfg.color}`}>{probabilityOfSuccess.toFixed(0)}%</span>
            </div>
          </div>

          {/* Labels */}
          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <StatusIcon size={16} className={cfg.color} />
              <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
              <InfoTip>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Procent symulowanych scenariuszy, w których saldo Twojego portfela pozostaje powyżej 0 zł przez całą emeryturę.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                  80%+ jest zwykle uznawane za mocny wynik. 50-80% oznacza, że Twój plan jest zagrożony i może wymagać korekt (oszczędzaj więcej, wydawaj mniej lub przejdź na emeryturę później). Poniżej 50% sugeruje konieczność istotnych zmian.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                  Każdy scenariusz losowo zmienia stopy zwrotu z rynku, inflację oraz opcjonalnie długość życia, korzystając z geometrycznego ruchu Browna. Wczesne krachy rynkowe na emeryturze mają nieproporcjonalnie duży wpływ (ryzyko sekwencji stóp zwrotu).
                </p>
              </InfoTip>
            </div>
            <p className="text-xs text-slate-500">
              {trialCount.toLocaleString()} symulacji &mdash; Twój portfel przetrwa do końca emerytury w {probabilityOfSuccess.toFixed(1)}% scenariuszy
              {probabilityOfSuccess < 100 && (<>, wyczerpuje się w {(100 - probabilityOfSuccess).toFixed(1)}%</>)}
            </p>
            {failureYear !== null && (
              <p className="text-xs text-red-400/80 mt-1 flex items-center gap-1 justify-center sm:justify-start">
                <AlertTriangle size={12} />
                Mediana wyczerpania środków w wieku {failureYear} w nieudanych scenariuszach
              </p>
            )}
          </div>
        </div>

        {/* Percentile cards */}
        <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-800 mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Percentyle salda końcowego</p>
          <InfoTip>
            <p className="text-xs text-slate-300 leading-relaxed">
              Prognozowane saldo Twojego portfela na koniec symulacji, posortowane spośród wszystkich prób.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
              <span className="font-medium text-red-400">10. percentyl:</span> Tylko 10% scenariuszy zakończyło się gorzej niż ten wynik. Twój scenariusz „pecha”.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              <span className="font-medium text-slate-300">50. percentyl (mediana):</span> Połowa scenariuszy zakończyła się powyżej tego wyniku, połowa poniżej. Twój najbardziej prawdopodobny wynik. Powinien z grubsza odpowiadać prognozie o stałej stopie.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              <span className="font-medium text-green-400">90. percentyl:</span> Tylko 10% scenariuszy zakończyło się lepiej niż ten wynik. Twój scenariusz „szczęścia”.
            </p>
          </InfoTip>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-2 sm:p-3 text-center min-w-0">
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <TrendingDown size={12} className="text-red-400 shrink-0" />
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">10. perc.</p>
            </div>
            <p className="text-xs sm:text-lg font-bold text-red-400 truncate">{formatCurrency(percentiles.p10)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">Pesymistyczny</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-2 sm:p-3 text-center min-w-0">
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <Minus size={12} className="text-slate-400 shrink-0" />
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Mediana</p>
            </div>
            <p className="text-xs sm:text-lg font-bold text-slate-200 truncate">{formatCurrency(percentiles.p50)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">Najbardziej prawdopodobny</p>
          </div>
          <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-2 sm:p-3 text-center min-w-0">
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <TrendingUp size={12} className="text-green-400 shrink-0" />
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">90. perc.</p>
            </div>
            <p className="text-xs sm:text-lg font-bold text-green-400 truncate">{formatCurrency(percentiles.p90)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">Optymistyczny</p>
          </div>
        </div>
      </Card>

      {/* Fan chart */}
      {fanData.length > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-300">Prognoza portfela</h3>
                <InfoTip>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Wykres wachlarzowy pokazujący zakres sald portfela we wszystkich symulacjach w każdym wieku. Szersze pasma oznaczają większą niepewność.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                    Zielona linia to mediana (50. percentyl). Wewnętrzne pasmo obejmuje zakres 25.-75. percentyla (środkowe 50% wyników). Zewnętrzne pasmo obejmuje zakres 10.-90. percentyla (środkowe 80%).
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                    Fioletowa przerywana linia oznacza Twój wiek emerytalny. Zwróć uwagę, jak wachlarz poszerza się w czasie — odzwierciedla to kumulującą się niepewność oraz to, jak wczesne krachy na emeryturze mogą trwale wyczerpać portfel (ryzyko sekwencji stóp zwrotu).
                  </p>
                </InfoTip>
              </div>
              <p className="text-xs text-slate-600">Pasma wyników we wszystkich symulacjach</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500/20 border border-green-500/30" /> 25-75th
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500/8 border border-green-500/15" /> 10-90th
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-5 h-0.5 bg-green-500 rounded-full" /> Mediana
              </span>
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fanData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="mc-outer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="mc-inner" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="age"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={{ stroke: '#1e293b' }} />
                <YAxis tickFormatter={formatAxis}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={{ stroke: '#1e293b' }}
                  width={55} />
                <Tooltip
                  formatter={tooltipFormatter}
                  labelFormatter={(v) => `Wiek ${v}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#64748b' }} />
                {retirementAge > currentAge && (
                  <ReferenceLine x={retirementAge} stroke="#8b5cf6" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ value: 'Emerytura', position: 'top', fill: '#8b5cf6', fontSize: 10 }} />
                )}
                {/* 10-90 band */}
                <Area type="monotone" dataKey="p90" stroke="#22c55e" strokeOpacity={0.15} strokeWidth={1} fill="url(#mc-outer)" name="90. percentyl" />
                <Area type="monotone" dataKey="p10" stroke="#22c55e" strokeOpacity={0.15} strokeWidth={1} fill="#0f172a" fillOpacity={1} name="10. percentyl" />
                {/* 25-75 band */}
                <Area type="monotone" dataKey="p75" stroke="#22c55e" strokeOpacity={0.25} strokeWidth={1} fill="url(#mc-inner)" name="75. percentyl" />
                <Area type="monotone" dataKey="p25" stroke="#22c55e" strokeOpacity={0.25} strokeWidth={1} fill="#0f172a" fillOpacity={1} name="25. percentyl" />
                {/* Median */}
                <Area type="monotone" dataKey="p50" stroke="#22c55e" strokeWidth={2} fill="none" name="Mediana"
                  dot={false} activeDot={{ r: 4, fill: '#22c55e', stroke: '#0f172a', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  )
}
