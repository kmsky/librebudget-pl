import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { useFinancialOrder } from '../../hooks/useFinancialOrder'
import { formatCurrency } from '../../utils/calculations'

export function RoadmapWidget() {
  const { steps } = useFinancialOrder()

  const currentStepIndex = steps.findIndex((s) => !s.isComplete)
  const currentStep = currentStepIndex === -1 ? null : steps[currentStepIndex]
  const allComplete = steps.length > 0 && currentStepIndex === -1

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-400">Mapa finansowa</h3>
        <Link to="/roadmap" className="text-xs text-green-400 hover:text-green-300">
          Zobacz wszystkie
        </Link>
      </div>

      {steps.length === 0 ? (
        <div className="py-4 text-center text-sm text-slate-500">
          Ładowanie mapy...
        </div>
      ) : allComplete ? (
        <div className="py-4 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-slate-200 font-medium">Wszystkie kroki ukończone!</p>
          <p className="text-xs text-slate-500">Opanowałeś kolejność działań w swoich finansach.</p>
        </div>
      ) : currentStep ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Bieżący krok {currentStepIndex + 1} z {steps.length}</span>
              {currentStep.isAutomated && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                  Automatyczny
                </span>
              )}
            </div>
            <h4 className="text-lg font-bold text-slate-200">{currentStep.title}</h4>
            <p className="text-sm text-slate-400 line-clamp-2">{currentStep.description}</p>
          </div>

          {currentStep.progress !== undefined && currentStep.target !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{formatCurrency(currentStep.progress)}</span>
                <span>{formatCurrency(currentStep.target)}</span>
              </div>
              <div className="progress-track h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (currentStep.progress / currentStep.target) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          <Link
            to="/roadmap"
            className="block w-full rounded-lg bg-slate-800 py-2 text-center text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            {currentStep.actionLabel || 'Zarządzaj krokiem'}
          </Link>
        </div>
      ) : (
        <div className="py-4 text-center text-sm text-slate-500">
          Nie znaleziono kroków.
        </div>
      )}
    </Card>
  )
}
