import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useDebts, calcRequiredPayment } from '../hooks/useDebts'
import { formatCurrency } from '../utils/calculations'
import { parseLocaleAmount } from '../utils/sanitize'
import { db } from '../db/database'
import type { Debt } from '../db/database'
import { Icon, DEBT_ICONS } from '../components/ui/Icon'
import { HighInterestPayoffPlan } from '../components/debts/HighInterestPayoffPlan'

export default function DebtTracker() {
  const {
    debts, addDebt, deleteDebt, updateDebt,
    totalDebt, totalMinPayment,
    getPayoffSchedule, getSnowballOrder, getAvalancheOrder, getEffectivePayment,
  } = useDebts()

  const [showModal, setShowModal] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [showPayment, setShowPayment] = useState<number | null>(null)
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('avalanche')

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('CreditCard')
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [targetPayoffDate, setTargetPayoffDate] = useState(format(new Date(), 'yyyy-MM'))
  const [targetMonthlyPayment, setTargetMonthlyPayment] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [notes, setNotes] = useState('')
  const [annualFee, setAnnualFee] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [expandedDebt, setExpandedDebt] = useState<number | null>(null)

  const resetForm = () => {
    setName('')
    setIcon('CreditCard')
    setBalance('')
    setRate('')
    setMinPayment('')
    setTargetPayoffDate(format(new Date(), 'yyyy-MM'))
    setTargetMonthlyPayment('')
    setDueDay('')
    setNotes('')
    setAnnualFee('')
    setEditingDebt(null)
  }

  const openEdit = (debt: Debt) => {
    setEditingDebt(debt)
    setName(debt.name)
    setIcon(debt.icon || 'TrendingDown')
    setBalance(String(debt.balance))
    setRate(String(debt.interestRate))
    setMinPayment(String(debt.minimumPayment))
    setTargetPayoffDate(debt.targetPayoffDate ?? '')
    setTargetMonthlyPayment(debt.targetMonthlyPayment != null ? String(debt.targetMonthlyPayment) : '')
    setDueDay(debt.dueDay != null ? String(debt.dueDay) : '')
    setNotes(debt.notes ?? '')
    setAnnualFee(debt.annualFee != null ? String(debt.annualFee) : '')
    setShowModal(true)
  }

  const handleAdd = async () => {
    if (!name.trim() || !balance || !minPayment) return
    await addDebt({
      name: name.trim(),
      icon,
      balance: parseLocaleAmount(balance),
      interestRate: parseLocaleAmount(rate || '0'),
      minimumPayment: parseLocaleAmount(minPayment),
      targetPayoffDate: targetPayoffDate || undefined,
      targetMonthlyPayment: targetMonthlyPayment ? parseLocaleAmount(targetMonthlyPayment) : undefined,
      dueDay: dueDay ? Math.min(31, Math.max(1, parseInt(dueDay, 10))) : undefined,
      notes: notes.trim() || undefined,
      annualFee: icon === 'CreditCard' && annualFee ? parseLocaleAmount(annualFee) : undefined,
    })
    setShowModal(false)
    resetForm()
  }

  const handleUpdate = async () => {
    if (!editingDebt?.id || !name.trim() || !balance || !minPayment) return
    await updateDebt(editingDebt.id, {
      name: name.trim(),
      icon,
      balance: parseLocaleAmount(balance),
      interestRate: parseLocaleAmount(rate || '0'),
      minimumPayment: parseLocaleAmount(minPayment),
      targetPayoffDate: targetPayoffDate || undefined,
      targetMonthlyPayment: targetMonthlyPayment ? parseLocaleAmount(targetMonthlyPayment) : undefined,
      dueDay: dueDay ? Math.min(31, Math.max(1, parseInt(dueDay, 10))) : undefined,
      notes: notes.trim() || undefined,
      annualFee: icon === 'CreditCard' && annualFee ? parseLocaleAmount(annualFee) : undefined,
    })
    setShowModal(false)
    resetForm()
  }

  const handlePayment = async () => {
    if (!paymentAmount || !showPayment) return
    const debt = debts.find((d) => d.id === showPayment)
    if (debt) {
      const amount = parseLocaleAmount(paymentAmount)
      const newBalance = Math.max(0, debt.balance - amount)
      await updateDebt(showPayment, { balance: newBalance })

      const debtPayoffCat = await db.categories.where('name').equals('Spłata długów').first()
        ?? (await db.categories.where('group').equals('needs').first())
      if (debtPayoffCat?.id) {
        await db.transactions.add({
          amount,
          type: 'expense',
          categoryId: debtPayoffCat.id,
          description: `Spłata: ${debt.name}`,
          note: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          createdAt: new Date().toISOString(),
        })
      }
    }
    setShowPayment(null)
    setPaymentAmount('')
  }

  const orderedDebts = strategy === 'snowball' ? getSnowballOrder() : getAvalancheOrder()

  const totalInterest = debts.reduce((sum, d) => {
    const schedule = getPayoffSchedule(d)
    return sum + schedule.reduce((s, e) => s + e.interest, 0)
  }, 0)

  const maxMonths = debts.reduce((max, d) => {
    const schedule = getPayoffSchedule(d)
    return Math.max(max, schedule.length)
  }, 0)

  const modalTitle = editingDebt ? 'Edytuj dług' : 'Dodaj dług'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Długi</h1>
          </div>
          <p className="text-sm text-slate-400">Ustaw cele spłaty i śledź postępy</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>+ Dodaj dług</Button>
      </div>

      {debts.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
            <Card className="min-w-0 py-5 px-5">
              <p className="text-xs text-slate-500">Suma długów</p>
              <p className="mt-1 break-words text-xl font-bold text-red-400 sm:text-2xl">{formatCurrency(totalDebt)}</p>
            </Card>
            <Card className="min-w-0 py-5 px-5">
              <p className="text-xs text-slate-500">Minimum miesięcznie</p>
              <p className="mt-1 break-words text-xl font-bold text-slate-200 sm:text-2xl">{formatCurrency(totalMinPayment)}</p>
            </Card>
            <Card className="min-w-0 py-5 px-5">
              <p className="text-xs text-slate-500">Szac. suma odsetek</p>
              <p className="mt-1 break-words text-xl font-bold text-orange-400 sm:text-2xl">{formatCurrency(totalInterest)}</p>
              {maxMonths > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {(() => {
                    const years = Math.ceil(maxMonths / 12)
                    const yearWord = years === 1 ? 'rok' : (years % 10 >= 2 && years % 10 <= 4 && (years % 100 < 10 || years % 100 >= 20)) ? 'lata' : 'lat'
                    return `~${years} ${yearWord} do spłaty`
                  })()}
                </p>
              )}
            </Card>
            {(() => {
              const activeDebts = debts.filter((d) => d.balance > 0)
              const highInterestDebts = activeDebts.filter((d) => d.interestRate > 10)
              const highInterestTotal = highInterestDebts.reduce((s, d) => s + d.balance, 0)
              const avgApr = totalDebt > 0
                ? activeDebts.reduce((s, d) => s + d.interestRate * d.balance, 0) / totalDebt
                : 0
              const largestDebt = activeDebts.length > 0 ? activeDebts.reduce((a, b) => (a.balance > b.balance ? a : b)) : null
              const largestPct = totalDebt > 0 && largestDebt ? (largestDebt.balance / totalDebt) * 100 : 0
              return (
                <>
                  <Card className="min-w-0 py-5 px-5">
                    <p className="text-xs text-slate-500">Wysokie oprocentowanie (&gt;10%)</p>
                    <p className="mt-1 break-words text-xl font-bold text-amber-400 sm:text-2xl">{formatCurrency(highInterestTotal)}</p>
                    {totalDebt > 0 && (
                      <p className="text-xs text-slate-500 mt-1">{(highInterestTotal / totalDebt * 100).toFixed(0)}% całości</p>
                    )}
                  </Card>
                  <Card className="min-w-0 py-5 px-5">
                    <p className="text-xs text-slate-500">Śr. ważone RRSO</p>
                    <p className="mt-1 break-words text-xl font-bold text-slate-200 sm:text-2xl">{avgApr.toFixed(1)}%</p>
                  </Card>
                  <Card className="min-w-0 py-5 px-5">
                    <p className="text-xs text-slate-500">Udział największego długu</p>
                    <p className="mt-1 break-words text-xl font-bold text-slate-200 sm:text-2xl">{largestPct.toFixed(0)}%</p>
                  </Card>
                </>
              )
            })()}
          </div>

          <HighInterestPayoffPlan debts={debts} getEffectivePayment={getEffectivePayment} />
        </>
      )}

      {debts.length > 0 && (
        <div className="space-y-3">
          {/* Strategy toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Strategia spłaty</h3>
            <div className="flex gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
              <button
                onClick={() => setStrategy('avalanche')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${strategy === 'avalanche' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
              >Lawina</button>
              <button
                onClick={() => setStrategy('snowball')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${strategy === 'snowball' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
              >Kula śnieżna</button>
            </div>
          </div>

          {/* Debt rows */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {orderedDebts.map((debt, i) => {
              const schedule = getPayoffSchedule(debt)
              const monthsLeft = schedule.length
              const interestCost = schedule.reduce((s, e) => s + e.interest, 0)
              const isPaidOff = debt.balance <= 0
              const startBalance = debt.originalBalance ?? debt.balance
              const paidPercent = startBalance > 0 ? Math.min(100, ((startBalance - debt.balance) / startBalance) * 100) : 100
              const effPayment = getEffectivePayment(debt)
              const reqForTarget = debt.targetPayoffDate && debt.balance > 0
                ? calcRequiredPayment(debt.balance, debt.interestRate, debt.targetPayoffDate)
                : null
              const targetDatePassed = debt.targetPayoffDate && reqForTarget === null && debt.balance > 0
              const isExpanded = expandedDebt === debt.id
              const coveringInterest = effPayment >= debt.balance * (debt.interestRate / 100 / 12)

              return (
                <div key={debt.id}>
                  {i > 0 && <div className="border-t border-slate-800" />}

                  {/* Main tap row */}
                  <button
                    className={`tx-row flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-slate-800 ${isExpanded ? 'bg-slate-800/60' : ''}`}
                    onClick={() => setExpandedDebt(isExpanded ? null : (debt.id ?? null))}
                  >
                    {/* Rank + icon */}
                    <div className="relative shrink-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPaidOff ? 'bg-green-500/15' : 'bg-slate-800'}`}>
                        <Icon name={debt.icon || 'TrendingDown'} size={20} className={isPaidOff ? 'text-green-400' : 'text-slate-300'} />
                      </div>
                      {!isPaidOff && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[9px] font-bold text-slate-400">
                          {i + 1}
                        </span>
                      )}
                      {isPaidOff && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500/20">
                          <Icon name="Check" size={9} className="text-green-400" />
                        </span>
                      )}
                    </div>

                    {/* Name + chips */}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium leading-snug ${isPaidOff ? 'text-green-400 line-through' : 'text-slate-200'}`}>
                        {debt.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <span className="rounded-md bg-slate-800 px-1.5 py-px text-xs text-slate-400">
                          {debt.interestRate}% RRSO
                        </span>
                        <span className="rounded-md bg-slate-800 px-1.5 py-px text-xs text-slate-400">
                          {formatCurrency(debt.minimumPayment)}/mies.
                        </span>
                        {!coveringInterest && !isPaidOff && (
                          <span className="rounded-md bg-amber-500/15 px-1.5 py-px text-xs text-amber-400">
                            ⚠ odsetki
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Balance + chevron */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`text-sm font-semibold tabular-nums ${isPaidOff ? 'text-green-400' : 'text-slate-200'}`}>
                        {formatCurrency(debt.balance)}
                      </span>
                      <ChevronDown
                        size={13}
                        strokeWidth={1.75}
                        className={`text-slate-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-800/40 px-3.5 py-3 space-y-3">
                      {/* Progress bar */}
                      {!isPaidOff && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>{paidPercent.toFixed(0)}% spłacone</span>
                            {monthsLeft > 0 && (
                              <span>{monthsLeft} mies. · {formatCurrency(interestCost)} odsetek</span>
                            )}
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden progress-track">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all duration-300"
                              style={{ width: `${paidPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Goal / target info */}
                      {debt.targetPayoffDate && !isPaidOff && (
                        <p className="text-xs text-slate-500">
                          {targetDatePassed ? (
                            <span className="text-amber-400">Termin celu już minął — zaktualizuj cel lub spłać w całości</span>
                          ) : reqForTarget != null ? (
                            <>
                              Cel: {debt.targetPayoffDate} · wymaga {formatCurrency(reqForTarget)}/mies.
                              {effPayment < reqForTarget && (
                                <span className="text-amber-400 ml-1">(+{formatCurrency(reqForTarget - effPayment)}/mies.)</span>
                              )}
                            </>
                          ) : null}
                        </p>
                      )}

                      {/* Extra details */}
                      {(debt.dueDay != null || (debt.annualFee != null && debt.annualFee > 0) || effPayment > debt.minimumPayment) && (
                        <div className="flex flex-wrap gap-1.5">
                          {debt.dueDay != null && (
                            <span className="rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-400">Termin płatności: {debt.dueDay}.</span>
                          )}
                          {debt.annualFee != null && debt.annualFee > 0 && (
                            <span className="rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-400">opłata {formatCurrency(debt.annualFee)}/rok</span>
                          )}
                          {effPayment > debt.minimumPayment && (
                            <span className="rounded-md bg-green-500/15 px-2 py-1 text-xs text-green-400">Cel {formatCurrency(effPayment)}/mies.</span>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {debt.notes && (
                        <p className="text-xs text-slate-500 italic">{debt.notes}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(debt)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 py-2 text-sm font-medium text-slate-200 transition-colors active:bg-slate-600"
                        >
                          <Icon name="Pencil" size={14} />
                          Edytuj
                        </button>
                        {!isPaidOff && (
                          <button
                            onClick={() => { setShowPayment(debt.id!); setPaymentAmount('') }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600/20 py-2 text-sm font-medium text-green-400 transition-colors active:bg-green-600/30"
                          >
                            <Icon name="Banknote" size={14} />
                            Zapłać
                          </button>
                        )}
                        <button
                          onClick={() => debt.id && deleteDebt(debt.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 py-2 text-sm font-medium text-red-400 transition-colors active:bg-slate-600"
                        >
                          <Icon name="Trash2" size={14} />
                          Usuń
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {debts.length === 0 && (
        <Card className="text-center">
          <p className="text-slate-400 py-8">Brak śledzonych długów. Dodaj pierwszy dług, aby ustawić cele spłaty.</p>
        </Card>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title={modalTitle}>
        <div className="space-y-4">
          {/* Icon */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Ikona</label>
            <div className="flex flex-wrap gap-1.5">
              {DEBT_ICONS.map((i) => (
                <button key={i} onClick={() => setIcon(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${icon === i ? 'bg-slate-700 ring-2 ring-green-500 text-green-400' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  <Icon name={i} size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Nazwa</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="np. Karta kredytowa" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>

          {/* Balance + APR */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Saldo</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">zł</span>
                <input inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-7 pr-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">RRSO</label>
              <div className="relative">
                <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)}
                  placeholder="0.00" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-4 pr-7 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
              </div>
            </div>
          </div>

          {/* Min payment + Due day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Min. rata</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">zł</span>
                <input inputMode="decimal" value={minPayment} onChange={(e) => setMinPayment(e.target.value)}
                  placeholder="0.00" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-7 pr-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Dzień płatności</label>
              <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)}
                placeholder="1–31" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
          </div>

          {/* Target payment + Target date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Docelowa rata</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">zł</span>
                <input inputMode="decimal" value={targetMonthlyPayment} onChange={(e) => setTargetMonthlyPayment(e.target.value)}
                  placeholder="0.00" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-7 pr-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Data spłaty</label>
              <input type="month" value={targetPayoffDate} onChange={(e) => setTargetPayoffDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none" />
            </div>
          </div>

          {/* Annual fee – credit cards only */}
          {icon === 'CreditCard' && (
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Opłata roczna</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">zł</span>
                <input inputMode="decimal" value={annualFee} onChange={(e) => setAnnualFee(e.target.value)}
                  placeholder="0.00" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-7 pr-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Notatki</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Opcjonalnie" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none resize-none" />
          </div>

          {editingDebt ? (
            <Button onClick={handleUpdate} className="w-full" disabled={!name.trim() || !balance || !minPayment}>Zapisz zmiany</Button>
          ) : (
            <Button onClick={handleAdd} className="w-full" disabled={!name.trim() || !balance || !minPayment}>Dodaj dług</Button>
          )}
        </div>
      </Modal>

      <Modal open={!!showPayment} onClose={() => setShowPayment(null)} title="Dokonaj płatności">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Kwota</label>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
            <input inputMode="decimal" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00" autoFocus className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <Button onClick={handlePayment} className="w-full" disabled={!paymentAmount}>Zatwierdź płatność</Button>
        </div>
      </Modal>
    </div>
  )
}
