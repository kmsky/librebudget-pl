import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

const STORAGE_KEY = 'lb-account-onboarding-done'

const STEPS = [
  {
    icon: 'Wallet',
    title: 'Twój sejf — klucz do wszystkiego',
    description: 'Twój sejf jest tworzony na podstawie 12-wyrazowej frazy odzyskiwania. Te słowa to jedyny sposób na zaszyfrowanie i odszyfrowanie kopii zapasowej w chmurze. LibreBudget nigdy ich nie widzi — zapisz je i przechowuj w bezpiecznym miejscu. Jeśli utracisz frazę, kopia zapasowa w chmurze nie będzie mogła zostać odzyskana.',
    tip: null,
  },
  {
    icon: 'Cloud',
    title: 'Automatyczna zaszyfrowana kopia zapasowa',
    description: 'Gdy Twój sejf jest aktywny, dane są szyfrowane w przeglądarce i automatycznie kopiowane do chmury po każdej zmianie. Serwer otrzymuje wyłącznie zaszyfrowany blok danych — Twoja fraza odzyskiwania i klucze nigdy nie opuszczają urządzenia.',
    tip: 'Użyj opcji „Utwórz kopię teraz” po większych zmianach lub przed zmianą urządzenia, aby od razu wysłać świeżą kopię.',
  },
  {
    icon: 'RefreshCw',
    title: 'Synchronizacja — pobierz najnowsze dane',
    description: 'Przycisk Synchronizacja (ikona chmury na pasku nawigacji) pobiera najnowszą kopię zapasową z chmury na to urządzenie. Użyj go zawsze, gdy chcesz wczytać zmiany wprowadzone na innym urządzeniu lub po przywróceniu sejfu w nowej przeglądarce.',
    tip: 'Synchronizacja zastępuje dane lokalne kopią z chmury. Najpierw utwórz kopię zapasową, jeśli masz niezapisane zmiany lokalne.',
  },
  {
    icon: 'HardDrive',
    title: 'Przywracanie na nowym urządzeniu',
    description: 'Przenosisz się na nowy telefon lub do nowej przeglądarki? Wejdź do sekcji Konto → „Przywróć z frazy odzyskiwania”, wprowadź swoje 12 słów, a następnie dotknij Synchronizuj. Cała historia transakcji, cele budżetowe, długi i oszczędności wrócą w kilka sekund.',
    tip: 'Przechowuj frazę odzyskiwania w menedżerze haseł oraz fizyczną kopię w bezpiecznym miejscu.',
  },
  {
    icon: 'Shield',
    title: 'Masz pełną kontrolę',
    description: 'Twoje dane należą do Ciebie. W każdej chwili wyeksportujesz pełną kopię zapasową w formacie JSON lub CSV z Ustawień. Możesz usunąć kopię zapasową z chmury w sekcji Konto w dowolnym momencie — nie zachowujemy niczego. Aplikacja działa całkowicie offline, bez żadnego sejfu i chmury.',
    tip: null,
  },
]

interface AccountOnboardingProps {
  /** When provided, controls visibility externally (replay mode). */
  open?: boolean
  onClose?: () => void
}

export function AccountOnboarding({ open, onClose }: AccountOnboardingProps = {}) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  // Uncontrolled: show on first visit
  useEffect(() => {
    if (open === undefined) {
      const seen = localStorage.getItem(STORAGE_KEY)
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
      localStorage.setItem(STORAGE_KEY, 'true')
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
          {/* Step counter */}
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
                Rozumiem
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
