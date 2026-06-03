import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

const STEPS = [
  {
    icon: 'Hand',
    title: 'Witaj w LibreBudget',
    description: 'Darmowy budżet domowy o otwartym kodzie źródłowym. Twoje dane pozostają na Twoim urządzeniu — nic nie jest nigdzie wysyłane, chyba że włączysz opcjonalną, zaszyfrowaną kopię zapasową w chmurze.',
    tip: null,
  },
  {
    icon: 'LayoutDashboard',
    title: 'Twój pulpit',
    description: 'Zobacz przychody, wydatki i oszczędności na pierwszy rzut oka. Pasek kondycji budżetu oraz % zaoszczędzonego dochodu (cel: 25%+) pomagają Ci trzymać się planu. Dodawaj transakcje przyciskiem +.',
    tip: null,
  },
  {
    icon: 'DollarSign',
    title: 'Budżet i wydatki',
    description: 'Ustaw miesięczne limity w sekcji Budżet. Śledź transakcje, pozycje cykliczne (czynsz, subskrypcje, wynagrodzenie) oraz długi. Przypisuj kategorie do potrzeb, zachcianek lub oszczędności.',
    tip: 'Ustaw swój miesięczny budżet w Ustawieniach, zanim dodasz pierwszą transakcję.',
  },
  {
    icon: 'BarChart3',
    title: 'Narzędzia do budowania majątku',
    description: 'Cele oszczędnościowe, kalkulatory procentu składanego i emerytury, kalkulator kredytu samochodowego (zasada 20/3/8), dostępność mieszkania (zakup lub wynajem).',
    tip: null,
  },
  {
    icon: 'Map',
    title: 'Plan finansowy i analizy',
    description: 'Postępuj krok po kroku zgodnie z Planem finansowym. Korzystaj z Trendów, Przeglądu miesięcznego i Przeglądu rocznego, aby zobaczyć, jak poprawiasz swoją sytuację w czasie.',
    tip: null,
  },
  {
    icon: 'Trophy',
    title: 'Wszystko gotowe',
    description: 'Dodaj swoją pierwszą transakcję, aby zacząć. Wejdź do sekcji Konto, aby skonfigurować opcjonalną, zaszyfrowaną kopię zapasową w chmurze, dzięki której Twoje dane będą Ci towarzyszyć na różnych urządzeniach.',
    tip: 'Zajrzyj do Ustawień, aby zmienić motywy, rozmiar czcionki, opcje dostępności oraz wyeksportować dane.',
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
              Krok {step + 1} z {STEPS.length}
            </span>
            <button onClick={finish} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Pomiń
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
                Wstecz
              </Button>
            )}
            {isLast ? (
              <Button onClick={finish} className="flex-1">
                Zaczynamy
              </Button>
            ) : (
              <Button onClick={() => setStep(step + 1)} className="flex-1">
                Dalej
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
