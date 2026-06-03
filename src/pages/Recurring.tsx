import { useState } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useRecurringTransactions } from '../hooks/useRecurringTransactions'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency } from '../utils/calculations'
import { parseLocaleAmount } from '../utils/sanitize'
import { GROUP_COLORS, getCategoryIconClassName } from '../utils/colors'
import { EXPENSE_GROUPS, type TransactionType, type CategoryGroup, type RecurrenceInterval } from '../db/database'
import { Icon } from '../components/ui/Icon'

const INTERVAL_LABELS: Record<RecurrenceInterval, string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  biweekly: 'Co 2 tygodnie',
  monthly: 'Co miesiąc',
  yearly: 'Co rok',
}

export default function Recurring() {
  const { recurring, addRecurring, deleteRecurring, updateRecurring } = useRecurringTransactions()
  const { categoriesByGroup, getCategoryById } = useCategories()

  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [interval, setInterval] = useState<RecurrenceInterval>('monthly')
  const [nextDue, setNextDue] = useState(format(new Date(), 'yyyy-MM-dd'))

  const activeGroups: CategoryGroup[] = type === 'expense' ? EXPENSE_GROUPS : ['income']

  const handleAdd = async () => {
    if (!amount || !categoryId) return
    await addRecurring({
      amount: parseLocaleAmount(amount),
      type,
      categoryId,
      description,
      note: '',
      interval,
      nextDue,
      enabled: true,
    })
    setShowModal(false)
    setAmount('')
    setCategoryId(null)
    setDescription('')
  }

  const activeItems = recurring.filter((r) => r.enabled)
  const pausedItems = recurring.filter((r) => !r.enabled)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Cykliczne</h1>
          </div>
          <p className="text-sm text-slate-400">Automatycznie zapisywane transakcje</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Dodaj</Button>
      </div>

      {recurring.length === 0 && (
        <Card className="text-center">
          <p className="text-slate-400 py-8">
            Brak cyklicznych transakcji. Dodaj czynsz, subskrypcje, wypłatę itp.
          </p>
        </Card>
      )}

      {activeItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400 px-1">Aktywne</h2>
          {activeItems.map((r) => {
            const cat = getCategoryById(r.categoryId)
            return (
              <Card key={r.id} className="flex items-center gap-3 !p-4 group">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: cat ? `${GROUP_COLORS[cat.group]}15` : '#334155' }}
                >
                  <Icon name={cat?.icon ?? 'Wallet'} size={20} className={cat ? getCategoryIconClassName(cat.group) : ''} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-200">{r.description || cat?.name}</p>
                  <p className="text-xs text-slate-500">
                    {INTERVAL_LABELS[r.interval]} · Następna: {format(new Date(r.nextDue), 'd MMM yyyy', { locale: pl })}
                  </p>
                </div>
                <p className={`font-semibold ${r.type === 'income' ? 'text-green-400' : 'text-slate-200'}`}>
                  {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                </p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => r.id && updateRecurring(r.id, { enabled: false })}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-yellow-400"
                    title="Wstrzymaj"
                  >
                    <Icon name="Pause" size={16} />
                  </button>
                  <button
                    onClick={() => r.id && deleteRecurring(r.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-900/30 hover:text-red-400"
                    title="Usuń"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {pausedItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400 px-1">Wstrzymane</h2>
          {pausedItems.map((r) => {
            const cat = getCategoryById(r.categoryId)
            return (
              <Card key={r.id} className="flex items-center gap-3 !p-4 opacity-60">
                <Icon name={cat?.icon ?? 'Wallet'} size={20} className={cat ? getCategoryIconClassName(cat.group) : ''} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-300">{r.description || cat?.name}</p>
                  <p className="text-xs text-slate-600">{INTERVAL_LABELS[r.interval]} · Wstrzymana</p>
                </div>
                <p className="text-sm text-slate-500">{formatCurrency(r.amount)}</p>
                <button
                  onClick={() => r.id && updateRecurring(r.id, { enabled: true })}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-green-400"
                  title="Wznów"
                >
                  <Icon name="Play" size={16} />
                </button>
                <button
                  onClick={() => r.id && deleteRecurring(r.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-red-400"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Dodaj transakcję cykliczną">
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
            <button
              onClick={() => { setType('expense'); setCategoryId(null) }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${type === 'expense' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}
            >Wydatek</button>
            <button
              onClick={() => { setType('income'); setCategoryId(null) }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${type === 'income' ? 'bg-green-600 text-white' : 'text-slate-400'}`}
            >Przychód</button>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Kwota</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
              <input
                inputMode="decimal" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0,00"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Kategoria</label>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none"
            >
              <option value="">Wybierz...</option>
              {activeGroups.map((g) =>
                categoriesByGroup(g).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Opis</label>
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="np. Netflix, czynsz, wypłata"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Częstotliwość</label>
            <select
              value={interval} onChange={(e) => setInterval(e.target.value as RecurrenceInterval)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none"
            >
              {Object.entries(INTERVAL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Data następnej płatności</label>
            <input
              type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none"
            />
          </div>

          <Button onClick={handleAdd} className="w-full" disabled={!amount || !categoryId}>
            Dodaj cykliczną
          </Button>
        </div>
      </Modal>
    </div>
  )
}
