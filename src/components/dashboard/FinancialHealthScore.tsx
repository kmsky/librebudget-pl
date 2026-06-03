import { useState } from 'react'
import { Card } from '../ui/Card'
import { InfoTip } from '../ui/InfoTip'
import { useFinancialRiskScore } from '../../hooks/useFinancialRiskScore'
import type { Finding, Severity } from '../../utils/financialRiskScore'

const SEVERITY_STYLES: Record<Severity, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/40',
  medium: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  low: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
}

const GRADE_COLORS: Record<string, string> = {
  Krytyczne: 'text-red-400',
  Wysokie: 'text-orange-400',
  Średnie: 'text-yellow-400',
  Niskie: 'text-blue-400',
  Minimalne: 'text-green-400',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  high: 'Wys.',
  medium: 'Śr.',
  low: 'Nis.',
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex shrink-0 w-14 justify-center items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase border ${SEVERITY_STYLES[severity]}`}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  )
}

function FindingItem({ finding, effectivePenalty }: { finding: Finding; effectivePenalty: number }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
      <SeverityBadge severity={finding.severity} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-200">{finding.title}</p>
          <span className="text-xs font-mono text-red-400 shrink-0">
            -{effectivePenalty.toFixed(1)} pkt
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{finding.description}</p>
      </div>
    </div>
  )
}

export function FinancialHealthScore() {
  const { score, grade, findings, loading } = useFinancialRiskScore()
  const [expanded, setExpanded] = useState(false)

  if (loading) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-slate-400">Wskaźnik kondycji finansowej</h3>
        <p className="text-sm text-slate-500 py-4">Ładowanie…</p>
      </Card>
    )
  }

  const gradeColor = GRADE_COLORS[grade] ?? 'text-slate-200'
  const showExpand = findings.length > 2

  // Compute effective penalties ascending (small findings consume pool first,
  // so uncapped ones like budget overrun only take what's left), then reverse
  // for display so the highest-impact finding appears at the top.
  let pool = 10
  const effectivePenalties = findings.map((f) => {
    const effective = Math.min(f.penaltyAmount, pool)
    pool = Math.max(0, pool - effective)
    return effective
  })
  const displayFindings = [...findings].reverse()
  const displayPenalties = [...effectivePenalties].reverse()

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-400">Wskaźnik kondycji finansowej</h3>
          <InfoTip>
            <p className="text-xs text-slate-300 leading-relaxed">
              Wzorowany na systemie Common Vulnerability Scoring System (CVSS). Algorytmy działające po stronie przeglądarki skanują Twoje odszyfrowane dane pod kątem pojedynczych punktów awarii: koncentracji przychodów, niskiego funduszu awaryjnego, wysokiego stosunku długu do dochodu, słabej zdolności kredytowej, przekroczenia budżetu i innych. Każde wykrycie jest oznaczane jako ryzyko wysokie, średnie lub niskie.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
              <strong className="text-slate-300">Skala:</strong> 10 = brak ryzyka. Kluczowe kontrole (przekroczenie budżetu, fundusz awaryjny, dług do dochodu) stosują odliczenia proporcjonalne, rosnące wraz z wagą — do 3,0 pkt każde. Pozostałe wykrycia stosują odliczenia stałe: wysokie −3,0, średnie −1,5, niskie −0,5. Oceny: Minimalne (9–10), Niskie (7–8,9), Średnie (5–6,9), Wysokie (3–4,9), Krytyczne (0–2,9).
            </p>
          </InfoTip>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-slate-100">{score.toFixed(1)}</span>
          <span className={`text-lg font-semibold ${gradeColor}`}>Ryzyko {grade.toLowerCase()}</span>
        </div>
        {findings.length > 0 ? (
          <div className="space-y-2">
            {(showExpand && !expanded ? displayFindings.slice(0, 2) : displayFindings).map((f, i) => (
              <FindingItem key={f.id} finding={f} effectivePenalty={displayPenalties[i]} />
            ))}
            {showExpand && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-xs text-green-400 hover:text-green-300"
              >
                {expanded ? 'Pokaż mniej' : `Pokaż ${findings.length - 2} więcej`}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-2">Nie wykryto żadnych ryzyk.</p>
        )}
      </div>
    </Card>
  )
}
