import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

const STEPS = [
  {
    icon: 'Hand',
    title: 'Welcome to LibreBudget',
    description: 'A free, open-source budget tracker. Your data stays on your device — nothing is sent anywhere unless you enable optional encrypted cloud backup.',
    tip: null,
  },
  {
    icon: 'LayoutDashboard',
    title: 'Your Dashboard',
    description: 'See income, expenses, and savings at a glance. The budget health bar and % of income saved (goal: 25%+) keep you on track. Add transactions with the + button.',
    tip: null,
  },
  {
    icon: 'DollarSign',
    title: 'Budget & Spending',
    description: 'Set monthly limits in Budget. Track transactions, recurring items (rent, subscriptions, salary), and debts. Categorize as needs, wants, or savings.',
    tip: 'Set your monthly budget in Settings before adding your first transaction.',
  },
  {
    icon: 'BarChart3',
    title: 'Wealth Tools',
    description: 'Savings goals, compound interest & retirement calculators, auto loan (20/3/8 rule), home affordability (own or rent).',
    tip: null,
  },
  {
    icon: 'Map',
    title: 'Financial Roadmap & Insights',
    description: 'Follow the step-by-step Financial Roadmap. Use Trends, Monthly Review, and Year Review to see how you\'re improving over time.',
    tip: null,
  },
  {
    icon: 'Trophy',
    title: "You're All Set",
    description: 'Add your first transaction to get started. Visit Account to set up optional encrypted cloud backup so your data follows you across devices.',
    tip: 'Check Settings for themes, font size, accessibility options, and data export.',
  },
]

interface OnboardingProps {
  /** When provided, controls visibility externally (replay mode). */
  open?: boolean
  onClose?: () => void
}

export function Onboarding({ open, onClose }: OnboardingProps = {}) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  // Uncontrolled: show on first visit
  useEffect(() => {
    if (open === undefined) {
      const seen = localStorage.getItem('lb-onboarding-done')
      if (!seen) setShow(true)
    }
  }, [open])

  // Controlled: sync with prop
  useEffect(() => {
    if (open !== undefined) {
      setShow(open)
      if (open) setStep(0)
    }
  }, [open])

  const finish = () => {
    if (open === undefined) {
      localStorage.setItem('lb-onboarding-done', 'true')
    }
    setShow(false)
    onClose?.()
  }

  if (!show) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <div className="fixed inset-0 bg-black/70" onClick={finish} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="flex h-1 bg-slate-800">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 transition-colors duration-300 ${i <= step ? 'bg-green-500' : ''}`}
              style={{ marginRight: i < STEPS.length - 1 ? '2px' : 0 }}
            />
          ))}
        </div>

        <div className="p-6">
          {/* Step counter + skip */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-medium text-slate-500">
              Step {step + 1} of {STEPS.length}
            </span>
            <button onClick={finish} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Skip
            </button>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-600/15">
              <Icon name={current.icon} size={32} className="text-green-400" />
            </div>
          </div>

          {/* Content */}
          <h2 className="text-lg font-bold text-slate-100 text-center mb-3">{current.title}</h2>
          <p className="text-sm text-slate-400 text-center leading-relaxed mb-4">{current.description}</p>

          {/* Tip */}
          {current.tip && (
            <div className="flex items-start gap-2.5 rounded-xl bg-slate-800 px-3.5 py-3 mb-4">
              <Icon name="Lightbulb" size={14} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-xs text-slate-400 leading-relaxed">{current.tip}</p>
            </div>
          )}

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-green-500' : 'w-1.5 bg-slate-700 hover:bg-slate-600'}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-2.5">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
                Back
              </Button>
            )}
            {isLast ? (
              <Button onClick={finish} className="flex-1">
                Get Started
              </Button>
            ) : (
              <Button onClick={() => setStep(step + 1)} className="flex-1">
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
