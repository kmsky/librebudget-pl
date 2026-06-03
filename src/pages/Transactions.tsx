import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Search, SlidersHorizontal, ChevronDown, Trash2, X } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency } from '../utils/calculations'
import { parseLocaleAmount } from '../utils/sanitize'
import { GROUP_COLORS, GROUP_LABELS, getCategoryIconClassName } from '../utils/colors'
import { EXPENSE_GROUPS } from '../db/database'
import type { Transaction } from '../db/database'
import { Icon } from '../components/ui/Icon'

export default function Transactions() {
  const { transactions, deleteTransaction, updateTransaction, addTransaction } = useTransactions()
  const { categories, getCategoryById, categoriesByGroup } = useCategories()
  const { showToast } = useToast()
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null)
  const [expandedTx, setExpandedTx] = useState<number | null>(null)
  const groupsRef = useRef<HTMLDivElement>(null)

  // Close expanded transaction when clicking outside the groups container
  useEffect(() => {
    if (expandedTx === null) return
    const handler = (e: MouseEvent) => {
      if (groupsRef.current && !groupsRef.current.contains(e.target as Node)) {
        setExpandedTx(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expandedTx])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      if (amountMin && t.amount < parseLocaleAmount(amountMin)) return false
      if (amountMax && t.amount > parseLocaleAmount(amountMax)) return false
      if (search) {
        const q = search.toLowerCase()
        const cat = getCategoryById(t.categoryId)
        const haystack = `${t.description} ${t.note || ''} ${cat?.name || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [transactions, filter, search, categoryFilter, dateFrom, dateTo, amountMin, amountMax, getCategoryById])

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = tx.date
    if (!acc[key]) acc[key] = []
    acc[key].push(tx)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setEditAmount(tx.amount.toString())
    setEditDescription(tx.description)
    setEditNote(tx.note || '')
    setEditCategoryId(tx.categoryId)
  }

  const saveEdit = async () => {
    if (!editingTx?.id || editCategoryId == null) return
    await updateTransaction(editingTx.id, {
      amount: parseLocaleAmount(editAmount),
      description: editDescription,
      note: editNote,
      categoryId: editCategoryId,
    })
    setEditingTx(null)
  }

  const handleDelete = async (tx: Transaction) => {
    if (!tx.id) return
    await deleteTransaction(tx.id)
    showToast('Transakcja usunięta', {
      label: 'Cofnij',
      onClick: async () => {
        const { id: _id, ...rest } = tx
        await addTransaction(rest)
      },
    })
  }

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('all')
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
    setFilter('all')
  }

  const hasActiveFilters = search || categoryFilter !== 'all' || dateFrom || dateTo || amountMin || amountMax

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Transakcje</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{filtered.length} pozycji</span>
          <Link
            to="/add"
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <Icon name="Plus" size={16} />
            Dodaj
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" strokeWidth={1.75} />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj w opisie, notatkach, kategorii…"
          className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        {(['all', 'expense', 'income'] as const).map((f) => (
          <button
            key={f} onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${filter === f ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
          >{f === 'all' ? 'Wszystkie' : f === 'expense' ? 'Wydatki' : 'Przychody'}</button>
        ))}
      </div>

      {/* Advanced filters toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <SlidersHorizontal size={14} strokeWidth={1.75} />
        <span>Filtry</span>
        {hasActiveFilters && <span className="rounded-full bg-green-500/20 px-1.5 py-px text-xs font-medium text-green-400">aktywne</span>}
        {hasActiveFilters && (
          <button
            onClick={(e) => { e.stopPropagation(); clearFilters() }}
            className="ml-1 text-slate-600 hover:text-slate-400"
          >
            <X size={12} strokeWidth={1.75} />
          </button>
        )}
      </button>

      {showFilters && (
        <Card className="space-y-3 !p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Od</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Do</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Kwota min.</label>
              <input inputMode="decimal" value={amountMin} onChange={(e) => setAmountMin(e.target.value)}
                placeholder="0 zł" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Kwota maks.</label>
              <input inputMode="decimal" value={amountMax} onChange={(e) => setAmountMax(e.target.value)}
                placeholder="∞ zł" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Kategoria</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none">
              <option value="all">Wszystkie kategorie</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {sortedDates.length === 0 && (
        <Card className="py-10 text-center">
          <p className="text-slate-400">
            {hasActiveFilters ? 'Brak pasujących transakcji.' : 'Brak transakcji. Zacznij od dodania pierwszej!'}
          </p>
        </Card>
      )}

      {/* Transaction groups */}
      <div ref={groupsRef}>
      {sortedDates.map((date, i) => (
        <div key={date} className={`space-y-1.5 ${i > 0 ? 'mt-3' : ''}`}>
          {/* Date header */}
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {format(parseISO(date), 'EEE, d MMM yyyy', { locale: pl })}
            </h3>
            <span className="text-xs text-slate-700">·</span>
            <span className="text-xs text-slate-600">{grouped[date].length}</span>
          </div>

          {/* Rows */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {grouped[date].map((tx, idx) => {
              const cat = getCategoryById(tx.categoryId)
              const isExpanded = expandedTx === tx.id

              return (
                <div key={tx.id}>
                  {/* Divider between rows — full-width so it doesn't gap against an expanded panel's bg */}
                  {idx > 0 && <div className="border-t border-slate-800" />}

                  {/* Main row — always a button for tap target */}
                  <button
                    className={`tx-row flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-slate-800 ${isExpanded ? 'bg-slate-800' : ''}`}
                    onClick={() => setExpandedTx(isExpanded ? null : (tx.id ?? null))}
                  >
                    {/* Category icon */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: cat ? `${GROUP_COLORS[cat.group]}18` : '#262626' }}
                    >
                      <Icon
                        name={cat?.icon ?? 'Wallet'}
                        size={18}
                        className={cat ? getCategoryIconClassName(cat.group) : 'text-slate-500'}
                      />
                    </div>

                    {/* Description + category chip */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug text-slate-200">
                        {tx.description || cat?.name || 'Transakcja'}
                      </p>
                      {cat && (
                        <span
                          className="mt-0.5 inline-block max-w-full truncate rounded-md px-1.5 py-px text-xs font-medium leading-none"
                          style={{
                            backgroundColor: `${GROUP_COLORS[cat.group]}1a`,
                            color: GROUP_COLORS[cat.group],
                          }}
                        >
                          {GROUP_LABELS[cat.group]} · {cat.name}
                        </span>
                      )}
                    </div>

                    {/* Amount + chevron */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`text-sm font-semibold tabular-nums ${tx.type === 'income' ? 'text-green-400' : 'text-slate-200'}`}>
                        {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                      </span>
                      <ChevronDown
                        size={13}
                        strokeWidth={1.75}
                        className={`text-slate-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Expanded panel: note + actions */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-800 px-3.5 py-3 space-y-2.5">
                      {tx.note && (
                        <p className="flex items-start gap-2 text-sm text-slate-400">
                          <Icon name="FileText" size={14} className="mt-0.5 shrink-0 text-slate-600" />
                          <span>{tx.note}</span>
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(tx)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 py-2 text-sm font-medium text-slate-200 transition-colors active:bg-slate-600"
                        >
                          <Icon name="Pencil" size={14} />
                          Edytuj
                        </button>
                        <button
                          onClick={() => handleDelete(tx)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 py-2 text-sm font-medium text-red-400 transition-colors active:bg-slate-600"
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
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
      ))}
      </div>

      {/* Edit modal */}
      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title="Edytuj transakcję">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-400">Kategoria</label>
            <select
              value={editCategoryId ?? ''}
              onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none"
            >
              {editingTx?.type === 'income'
                ? categoriesByGroup('income').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                : EXPENSE_GROUPS.flatMap((g) =>
                    categoriesByGroup(g).map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({GROUP_LABELS[g]})</option>
                    ))
                  )}
            </select>

            {/* Category preview chip */}
            {editCategoryId != null && (() => {
              const c = getCategoryById(editCategoryId)
              return c ? (
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${GROUP_COLORS[c.group]}18` }}
                  >
                    <Icon name={c.icon} size={16} className={getCategoryIconClassName(c.group)} />
                  </div>
                  <span
                    className="rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${GROUP_COLORS[c.group]}1a`, color: GROUP_COLORS[c.group] }}
                  >
                    {GROUP_LABELS[c.group]} · {c.name}
                  </span>
                </div>
              ) : null
            })()}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-400">Kwota</label>
            <input inputMode="decimal" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-400">Opis</label>
            <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-400">Notatka</label>
            <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none" />
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setEditingTx(null)} className="flex-1">Anuluj</Button>
            <Button onClick={saveEdit} className="flex-1" disabled={editCategoryId == null}>Zapisz</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
