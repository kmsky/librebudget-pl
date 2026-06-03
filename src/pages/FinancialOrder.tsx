import { useFinancialOrder, type Step } from '../hooks/useFinancialOrder'
import { useSettings } from '../hooks/useSettings'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/calculations'
import confetti from 'canvas-confetti'

// Use main-thread confetti (CSP blocks blob: workers, default uses Worker)
const confettiMain = confetti.create(undefined, { useWorker: false, resize: true })

export default function FinancialOrder() {
  const { steps, toggleStep } = useFinancialOrder()
  const { reducedMotion } = useSettings()

  const handleToggle = async (step: Step, e: React.ChangeEvent<HTMLInputElement>) => {
    const willComplete = !step.isComplete
    if (willComplete && !reducedMotion) {
      try {
        const rect = e.target.getBoundingClientRect()
        const x = (rect.left + rect.width / 2) / window.innerWidth
        const y = (rect.top + rect.height / 2) / window.innerHeight
        confettiMain({
          particleCount: 80,
          spread: 60,
          origin: { x, y },
          colors: ['#22c55e', '#16a34a', '#15803d'],
          zIndex: 9999,
          startVelocity: 30,
          gravity: 1.2,
        })
      } catch {
        // Confetti not available
      }
    }
    await toggleStep(step.id, willComplete)
  }

  // Find the first incomplete step
  const currentStepIndex = steps.findIndex(s => !s.isComplete)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plan działania</h1>
          <p className="text-sm text-slate-400">Wykonaj te kroki w drodze do wolności finansowej.</p>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex
          const isPast = index < currentStepIndex || currentStepIndex === -1
          
          return (
            <Card 
              key={step.id} 
              className={`transition-colors ${
                isCurrent ? 'border-green-500/50 bg-slate-900/50' : 
                isPast ? 'opacity-75' : 'opacity-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={step.isComplete}
                    onChange={(e) => handleToggle(step, e)}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-800 accent-green-500 focus:ring-green-500 focus:ring-offset-slate-900"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${step.isComplete ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                      {index + 1}. {step.title}
                    </h3>
                    {step.isAutomated && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Automatyczna kontrola
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{step.description}</p>
                  
                  {step.progress !== undefined && step.target !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{formatCurrency(step.progress)}</span>
                        <span className="text-slate-500">{formatCurrency(step.target)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${Math.min((step.progress / step.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {step.actionLink && !step.isComplete && (
                    <div className="pt-2">
                      <Link to={step.actionLink}>
                        <Button size="sm" variant="secondary">
                          {step.actionLabel || 'Przejdź do strony'}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
