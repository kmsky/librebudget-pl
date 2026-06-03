import { useState, useEffect, useRef, useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Icon } from '../components/ui/Icon'
import { useImpulseCooldowns, DURATION_LABELS } from '../hooks/useImpulseCooldowns'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useSettings } from '../hooks/useSettings'
import { useDebts } from '../hooks/useDebts'
import { useRecurringTransactions } from '../hooks/useRecurringTransactions'
import { formatCurrency } from '../utils/calculations'
import { parseLocaleAmount } from '../utils/sanitize'
import type { CooldownDuration, Debt, ImpulseItem, ImpulseInterrogationAnswers } from '../db/database'

// ---------------------------------------------------------------------------
// Count-up animation hook
// ---------------------------------------------------------------------------

function useCountUp(target: number, duration = 600) {
  const [display, setDisplay] = useState(target)
  const prevTarget = useRef(target)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const from = prevTarget.current
    prevTarget.current = target
    if (from === target) return
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (target - from) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return display
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTimeRemaining(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return { expired: true, label: 'Ready' }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (days === 0 && minutes > 0) parts.push(`${minutes}m`)
  return { expired: false, label: parts.join(' ') + ' left' }
}

function getProgress(createdAt: string, endsAt: string) {
  const start = new Date(createdAt).getTime()
  const end = new Date(endsAt).getTime()
  const now = Date.now()
  if (now >= end) return 1
  return Math.max(0, (now - start) / (end - start))
}

/** Normalize a recurring transaction amount to monthly */
function toMonthly(amount: number, interval: string): number {
  switch (interval) {
    case 'daily':    return amount * 30
    case 'weekly':   return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'monthly':  return amount
    case 'yearly':   return amount / 12
    default:         return amount
  }
}

/** Estimate aggregate months to pay off debts given combined balance, weighted rate, total payment */
function aggregatePayoffMonths(totalBalance: number, weightedAnnualRate: number, totalPayment: number): number {
  if (totalBalance <= 0 || totalPayment <= 0) return 0
  const monthlyRate = weightedAnnualRate / 100 / 12
  let remaining = totalBalance
  let months = 0
  while (remaining > 0.01 && months < 600) {
    const interest = remaining * monthlyRate
    const payment = Math.min(totalPayment, remaining + interest)
    remaining -= (payment - interest)
    months++
  }
  return months
}

function isLateNight(): boolean {
  const h = new Date().getHours()
  return h >= 22 || h < 4
}

// ---------------------------------------------------------------------------
// Interrogation answers labels
// ---------------------------------------------------------------------------

const REPLACEMENT_LABELS: Record<ImpulseInterrogationAnswers['isReplacement'], string> = {
  replacement: 'Replacing something broken',
  new: 'Brand new item',
}
const BORROW_LABELS: Record<ImpulseInterrogationAnswers['canBorrow'], string> = {
  yes: 'Yes',
  no: 'No',
  maybe: 'Maybe',
}

// ---------------------------------------------------------------------------
// Fixed-Cost Equivalent insight
// ---------------------------------------------------------------------------

function FixedCostInsight({ amount, recurring }: {
  amount: number
  recurring: Array<{ description: string; amount: number; interval: string; type: string; enabled: boolean }>
}) {
  const top = useMemo(() => {
    const bills = recurring
      .filter((r) => r.type === 'expense' && r.enabled)
      .map((r) => ({ description: r.description, monthly: toMonthly(r.amount, r.interval) }))
      .filter((r) => r.monthly > 0)
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 3)
    return bills
  }, [recurring])

  if (amount <= 0 || top.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-2">
      <p className="text-xs font-medium text-slate-400">Fixed-Cost Equivalent</p>
      {top.map((bill) => {
        const pct = (amount / bill.monthly) * 100
        return (
          <div key={bill.description} className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 truncate">{bill.description}</span>
            <span className={`text-xs font-semibold shrink-0 ${pct >= 50 ? 'text-red-400' : pct >= 25 ? 'text-amber-400' : 'text-slate-300'}`}>
              {pct.toFixed(0)}% of {formatCurrency(bill.monthly)}/mo
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payoff Projection insight
// ---------------------------------------------------------------------------

function PayoffProjection({ amount, debts, getEffectivePayment }: {
  amount: number
  debts: Debt[]
  getEffectivePayment: (debt: Debt) => number
}) {
  const { currentMonths, extraMonths } = useMemo(() => {
    if (debts.length === 0 || amount <= 0) return { currentMonths: 0, extraMonths: 0 }
    const totalBalance = debts.reduce((s, d) => s + d.balance, 0)
    const totalPayment = debts.reduce((s, d) => s + getEffectivePayment(d), 0)
    const weightedRate = totalBalance > 0
      ? debts.reduce((s, d) => s + (d.balance / totalBalance) * d.interestRate, 0)
      : 0
    const current = aggregatePayoffMonths(totalBalance, weightedRate, totalPayment)
    const withPurchase = aggregatePayoffMonths(totalBalance + amount, weightedRate, totalPayment)
    return { currentMonths: current, extraMonths: Math.max(0, withPurchase - current) }
  }, [debts, amount, getEffectivePayment])

  if (debts.length === 0 || amount <= 0 || currentMonths === 0) return null

  const maxMonths = currentMonths + extraMonths
  const currentPct = maxMonths > 0 ? (currentMonths / maxMonths) * 100 : 100
  const extraDays = Math.round(extraMonths * 30.4)
  const extraLabel = extraDays >= 30
    ? `${Math.round(extraDays / 30.4)} month${Math.round(extraDays / 30.4) !== 1 ? 's' : ''}`
    : `${extraDays} day${extraDays !== 1 ? 's' : ''}`

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-2">
      <p className="text-xs font-medium text-slate-400">Debt Payoff Impact</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-20 shrink-0">Now</span>
          <div className="flex-1 h-2 rounded-full bg-slate-700">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: '100%' }} />
          </div>
          <span className="text-xs text-slate-400 shrink-0">{currentMonths}mo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-20 shrink-0">If bought</span>
          <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden flex">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${currentPct}%` }} />
            <div className="h-full bg-red-500/70 transition-all" style={{ width: `${100 - currentPct}%` }} />
          </div>
          <span className="text-xs text-red-400 shrink-0">+{extraLabel}</span>
        </div>
      </div>
      {extraDays > 0 && (
        <p className="text-xs text-slate-500">Buying this delays your debt freedom by approximately <span className="text-red-400 font-medium">{extraLabel}</span>.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Decision Modal
// ---------------------------------------------------------------------------

function DecisionModal({ item, open, onClose, onBuy, onSave }: {
  item: ImpulseItem | null
  open: boolean
  onClose: () => void
  onBuy: () => void
  onSave: () => void
}) {
  if (!item) return null
  return (
    <Modal open={open} onClose={onClose} title="Cooldown Complete">
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
            <Icon name="Timer" size={28} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">{item.description}</h3>
          <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(item.amount)}</p>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Your {DURATION_LABELS[item.cooldownDuration]} cooldown is complete.<br />
            Do you still want to buy this?
          </p>
        </div>
        {item.interrogationAnswers && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-1.5 text-xs text-slate-400">
            <p><span className="text-slate-500">Type:</span> {REPLACEMENT_LABELS[item.interrogationAnswers.isReplacement]}</p>
            <p><span className="text-slate-500">Borrow?</span> {item.interrogationAnswers.canBorrow === 'yes' ? 'Yes, could borrow it' : item.interrogationAnswers.canBorrow === 'maybe' ? 'Maybe' : 'No'}</p>
            {item.interrogationAnswers.storageLocation && (
              <p><span className="text-slate-500">Location:</span> {item.interrogationAnswers.storageLocation}</p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onSave} className="w-full">
            Skip & Save {formatCurrency(item.amount)}
          </Button>
          <Button onClick={onBuy} className="w-full">Buy It</Button>
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Add Impulse Modal (2-step)
// ---------------------------------------------------------------------------

function AddImpulseModal({
  open,
  onClose,
  onSubmit,
  categories,
  wantsCategories,
  recurring,
  debts,
  getEffectivePayment,
  devMode,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    description: string
    amount: number
    categoryId: number
    cooldownDuration: CooldownDuration
    interrogationAnswers: ImpulseInterrogationAnswers
  }) => void
  categories: Array<{ id?: number; name: string; group: string }>
  wantsCategories: typeof categories
  recurring: Array<{ description: string; amount: number; interval: string; type: string; enabled: boolean }>
  debts: Debt[]
  getEffectivePayment: (debt: Debt) => number
  devMode: boolean
}) {
  const [step, setStep] = useState<'interrogation' | 'form'>('interrogation')

  // Interrogation state
  const [isReplacement, setIsReplacement] = useState<ImpulseInterrogationAnswers['isReplacement'] | ''>('')
  const [canBorrow, setCanBorrow] = useState<ImpulseInterrogationAnswers['canBorrow'] | ''>('')
  const [storageLocation, setStorageLocation] = useState('')

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [cooldown, setCooldown] = useState<CooldownDuration>('72h')

  const lateNight = isLateNight()
  const parsedAmount = parseLocaleAmount(amount) || 0

  const interrogationComplete = isReplacement !== '' && canBorrow !== '' && storageLocation.trim().length > 0
  const formComplete = description.trim() && amount && categoryId

  const reset = () => {
    setStep('interrogation')
    setIsReplacement(''); setCanBorrow(''); setStorageLocation('')
    setDescription(''); setAmount(''); setCategoryId(''); setCooldown('72h')
  }

  const handleClose = () => { onClose(); reset() }

  const handleSubmit = () => {
    if (!formComplete || !isReplacement || !canBorrow) return
    onSubmit({
      description: description.trim(),
      amount: parsedAmount,
      categoryId: categoryId as number,
      cooldownDuration: cooldown,
      interrogationAnswers: {
        isReplacement: isReplacement as ImpulseInterrogationAnswers['isReplacement'],
        canBorrow: canBorrow as ImpulseInterrogationAnswers['canBorrow'],
        storageLocation: storageLocation.trim(),
      },
    })
    reset()
  }

  if (!open) return null

  const answeredCount = [isReplacement !== '', canBorrow !== '', storageLocation.trim().length > 0].filter(Boolean).length

  return (
    <Modal open={open} onClose={handleClose} title={step === 'interrogation' ? 'Before You Add It…' : 'Add Impulse Buy'}>
      {step === 'interrogation' ? (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
              <Icon name="AlertTriangle" size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Slow down for a second.</p>
              <p className="text-xs text-slate-400 mt-0.5">Answer honestly — your future self will thank you.</p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < answeredCount ? 'bg-amber-400' : 'bg-slate-700'}`} />
            ))}
            <span className="text-xs text-slate-500 shrink-0">{answeredCount}/3</span>
          </div>

          {/* Q1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isReplacement ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400'}`}>1</span>
              <p className="text-sm font-medium text-slate-200">Is this replacing something broken, or a brand new item?</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['replacement', 'new'] as const).map((v) => (
                <button key={v} onClick={() => setIsReplacement(v)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all text-center ${isReplacement === v ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}>
                  {isReplacement === v ? '✓ ' : ''}{REPLACEMENT_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Q2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${canBorrow ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400'}`}>2</span>
              <p className="text-sm font-medium text-slate-200">Can you borrow this from someone instead?</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['yes', 'maybe', 'no'] as const).map((v) => (
                <button key={v} onClick={() => setCanBorrow(v)}
                  className={`rounded-xl border px-2 py-3 text-sm font-medium transition-all text-center ${canBorrow === v ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}>
                  {canBorrow === v ? '✓ ' : ''}{BORROW_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Q3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${storageLocation.trim() ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400'}`}>3</span>
              <p className="text-sm font-medium text-slate-200">Where will this purchase be in a month?</p>
            </div>
            <textarea
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g. On my desk, in a drawer, collecting dust in the garage…"
              rows={2}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none resize-none text-sm"
            />
          </div>

          <Button onClick={() => setStep('form')} className="w-full" disabled={!interrogationComplete}>
            {interrogationComplete ? 'Continue →' : `Answer all 3 to continue (${answeredCount}/3)`}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Late-night notice */}
          {lateNight && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <Icon name="AlertTriangle" size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-400">Late-night purchase detected — 24 hours will be added to your cooldown automatically.</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">What do you want to buy?</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. New headphones" autoFocus
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Amount</label>
            <div className="relative">
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-4 pr-10 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
            </div>
          </div>

          {/* Fixed-cost equivalent */}
          <FixedCostInsight amount={parsedAmount} recurring={recurring} />

          {/* Debt projection */}
          <PayoffProjection amount={parsedAmount} debts={debts} getEffectivePayment={getEffectivePayment} />

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none">
              <option value="">Select a category</option>
              {wantsCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              {categories.filter((c) => c.group === 'needs').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Cooldown Period</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(DURATION_LABELS) as CooldownDuration[]).filter((d) => d !== 'instant' || devMode).map((d) => (
                <button key={d} onClick={() => setCooldown(d)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${cooldown === d ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}`}>
                  {DURATION_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('interrogation')} className="shrink-0">← Back</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={!formComplete}>
              Start Cooldown{lateNight ? ' (+24h)' : ''}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Impulse Card
// ---------------------------------------------------------------------------

function ImpulseCard({ item, categoryName, onDecide, onDelete }: {
  item: ImpulseItem
  categoryName: string
  onDecide: () => void
  onDelete: () => void
}) {
  const [, setTick] = useState(0)
  const [showAnswers, setShowAnswers] = useState(false)
  const time = getTimeRemaining(item.cooldownEndsAt)
  const progress = getProgress(item.createdAt, item.cooldownEndsAt)

  useEffect(() => {
    if (time.expired) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [time.expired])

  return (
    <Card>
      <div className="flex items-start gap-3 mb-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${time.expired ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
          <Icon name={time.expired ? 'Check' : 'Timer'} size={20} className={time.expired ? 'text-green-400' : 'text-amber-400'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-slate-200 truncate">{item.description}</h3>
            <p className="text-base font-bold text-amber-400 shrink-0">{formatCurrency(item.amount)}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-xs text-slate-500">{categoryName} · {DURATION_LABELS[item.cooldownDuration]}</p>
            {item.lateNightAdded && (
              <span className="text-xs text-amber-500/70">· +24h 🌙</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className={time.expired ? 'text-green-400 font-medium' : 'text-slate-400'}>
            {time.expired ? 'Cooldown complete!' : time.label}
          </span>
          <span className="text-slate-500">{(progress * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800 progress-track">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%`, backgroundColor: time.expired ? '#22c55e' : '#f59e0b' }} />
        </div>
      </div>

      {/* Interrogation answers toggle */}
      {item.interrogationAnswers && (
        <div className="mb-3">
          <button onClick={() => setShowAnswers(!showAnswers)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors">
            <Icon name="ChevronRight" size={12} className={`transition-transform ${showAnswers ? 'rotate-90' : ''}`} />
            Your answers
          </button>
          {showAnswers && (
            <div className="mt-2 rounded-lg bg-slate-800 px-3 py-2 space-y-1 text-xs text-slate-400">
              <p><span className="text-slate-500">Type: </span>{REPLACEMENT_LABELS[item.interrogationAnswers.isReplacement]}</p>
              <p><span className="text-slate-500">Borrow? </span>{BORROW_LABELS[item.interrogationAnswers.canBorrow]}</p>
              {item.interrogationAnswers.storageLocation && (
                <p><span className="text-slate-500">Location: </span>{item.interrogationAnswers.storageLocation}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {time.expired ? (
          <Button size="sm" onClick={onDecide} className="flex-1">Decide Now</Button>
        ) : <div className="flex-1" />}
        <Button size="sm" variant="danger" onClick={onDelete}>Remove</Button>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Resolved Item Card (saved / bought)
// ---------------------------------------------------------------------------

function ResolvedCard({ item, categoryName, variant, onArchive, onDelete }: {
  item: ImpulseItem
  categoryName: string
  variant: 'saved' | 'bought'
  onArchive: () => void
  onDelete: () => void
}) {
  const isSaved = variant === 'saved'
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSaved ? 'bg-green-500/10' : 'bg-slate-800'}`}>
          <Icon name={isSaved ? 'Check' : 'ShoppingCart'} size={20} className={isSaved ? 'text-green-400' : 'text-slate-400'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-slate-200 truncate">{item.description}</h3>
            <p className={`text-base font-bold shrink-0 ${isSaved ? 'text-green-400' : 'text-slate-400'}`}>
              {formatCurrency(item.amount)}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {categoryName} · {isSaved ? 'Saved' : 'Bought'} {item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString() : ''}
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="secondary" onClick={onArchive}>Archive</Button>
            <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ImpulseTracker() {
  const { waiting, saved, bought, archived, totalSaved, addImpulse, markBought, markSaved, archiveImpulse, unarchiveImpulse, deleteImpulse } = useImpulseCooldowns()
  const { addTransaction } = useTransactions()
  const { categories } = useCategories()
  const { getSetting, setSetting } = useSettings()
  const { debts, getEffectivePayment } = useDebts()
  const { recurring } = useRecurringTransactions()

  const devMode = getSetting('developerSettingsEnabled') === 'true'
  const countArchivedSaved = getSetting('impulseCountArchivedSaved') === 'true'

  const wantsCategories = categories.filter((c) => c.group === 'wants')

  const [showAddModal, setShowAddModal] = useState(false)
  const [decisionItem, setDecisionItem] = useState<ImpulseItem | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const handleAdd = async (data: {
    description: string
    amount: number
    categoryId: number
    cooldownDuration: CooldownDuration
    interrogationAnswers: ImpulseInterrogationAnswers
  }) => {
    await addImpulse(data)
    setShowAddModal(false)
  }

  const handleBuy = async () => {
    if (!decisionItem?.id) return
    await addTransaction({
      amount: decisionItem.amount,
      type: 'expense',
      categoryId: decisionItem.categoryId,
      description: decisionItem.description,
      note: 'Impulse buy (approved after cooldown)',
      date: new Date().toISOString().split('T')[0],
    })
    await markBought(decisionItem.id)
    setDecisionItem(null)
  }

  const handleSave = async () => {
    if (!decisionItem?.id) return
    await markSaved(decisionItem.id)
    setDecisionItem(null)
  }

  const getCategoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? 'Unknown'

  const expired = waiting.filter((i) => new Date(i.cooldownEndsAt).getTime() <= Date.now())
  const active = waiting.filter((i) => new Date(i.cooldownEndsAt).getTime() > Date.now())

  const archivedSavedTotal = archived.filter((i) => i.previousStatus === 'saved').reduce((sum, i) => sum + i.amount, 0)
  const displayTotalSaved = totalSaved + (countArchivedSaved ? archivedSavedTotal : 0)
  const animatedTotalSaved = useCountUp(displayTotalSaved)

  const hasContent = waiting.length > 0 || saved.length > 0 || bought.length > 0 || archived.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Impulse Control</h1>
          <p className="text-sm text-slate-400 mt-0.5">Cool down before you buy</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>+ Add Impulse</Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Icon name="Timer" size={16} className="text-amber-400" />
            </div>
            <p className="text-xs font-medium text-slate-400">Active Cooldowns</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-400">{waiting.length}</p>
          {expired.length > 0 && (
            <p className="text-xs text-green-400 mt-1.5">{expired.length} ready to decide</p>
          )}
        </div>
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <Icon name="DollarSign" size={16} className="text-green-400" />
            </div>
            <p className="text-xs font-medium text-slate-400">Money Saved</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-400">
            {animatedTotalSaved.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {saved.length > 0 && (
            <p className="text-xs text-slate-500 mt-1.5">{saved.length} impulse{saved.length !== 1 ? 's' : ''} resisted</p>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!hasContent && (
        <Card>
          <div className="text-center py-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <Icon name="Timer" size={28} className="text-amber-400" />
            </div>
            <h3 className="text-base font-medium text-slate-200 mb-1">No impulse buys tracked</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">
              Thinking about buying something? Add it here and wait out the cooldown before deciding.
            </p>
          </div>
        </Card>
      )}

      {/* Ready to Decide */}
      {expired.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-300">Ready to Decide</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {expired.map((item) => (
              <ImpulseCard key={item.id} item={item} categoryName={getCategoryName(item.categoryId)}
                onDecide={() => setDecisionItem(item)} onDelete={() => item.id && deleteImpulse(item.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Cooling Down */}
      {active.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-semibold text-slate-300">Cooling Down</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((item) => (
              <ImpulseCard key={item.id} item={item} categoryName={getCategoryName(item.categoryId)}
                onDecide={() => setDecisionItem(item)} onDelete={() => item.id && deleteImpulse(item.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Resisted Impulses */}
      {saved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Resisted Impulses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {saved.map((item) => (
              <ResolvedCard key={item.id} item={item} categoryName={getCategoryName(item.categoryId)}
                variant="saved" onArchive={() => item.id && archiveImpulse(item.id)} onDelete={() => item.id && deleteImpulse(item.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Purchased */}
      {bought.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Purchased</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {bought.map((item) => (
              <ResolvedCard key={item.id} item={item} categoryName={getCategoryName(item.categoryId)}
                variant="bought" onArchive={() => item.id && archiveImpulse(item.id)} onDelete={() => item.id && deleteImpulse(item.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <button onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-300 transition-colors">
            <Icon name="ChevronRight" size={14} className={`transition-transform ${showArchived ? 'rotate-90' : ''}`} />
            <span>Archived</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-normal text-slate-500">{archived.length}</span>
          </button>
          {showArchived && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                <span className="text-sm text-slate-400">Include saved amounts in total</span>
                <button type="button" role="switch" aria-checked={countArchivedSaved}
                  onClick={() => setSetting('impulseCountArchivedSaved', countArchivedSaved ? 'false' : 'true')}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${countArchivedSaved ? 'bg-green-600' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${countArchivedSaved ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {archived.map((item) => (
                  <Card key={item.id}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                        <Icon name={item.previousStatus === 'saved' ? 'Check' : 'ShoppingCart'} size={20} className="text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-slate-400 truncate">{item.description}</h3>
                          <p className="text-sm font-semibold text-slate-500 shrink-0">{formatCurrency(item.amount)}</p>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{getCategoryName(item.categoryId)}</p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="secondary" onClick={() => item.id && unarchiveImpulse(item.id)}>Unarchive</Button>
                          <Button size="sm" variant="danger" onClick={() => item.id && deleteImpulse(item.id)}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decision Modal */}
      <DecisionModal item={decisionItem} open={!!decisionItem} onClose={() => setDecisionItem(null)}
        onBuy={handleBuy} onSave={handleSave} />

      {/* Add Impulse Modal */}
      <AddImpulseModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAdd}
        categories={categories}
        wantsCategories={wantsCategories}
        recurring={recurring}
        debts={debts}
        getEffectivePayment={getEffectivePayment}
        devMode={devMode}
      />
    </div>
  )
}
