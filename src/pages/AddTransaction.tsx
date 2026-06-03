import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useCategories } from '../hooks/useCategories'
import { useTransactions } from '../hooks/useTransactions'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { useDebts } from '../hooks/useDebts'
import { EXPENSE_GROUPS, type CategoryGroup } from '../db/database'
import { Icon, CATEGORY_ICONS } from '../components/ui/Icon'
import { GROUP_LABELS, GROUP_COLORS, getCategoryIconClassName } from '../utils/colors'
import { formatCurrency } from '../utils/calculations'
import { parseLocaleAmount } from '../utils/sanitize'
import { BudgetToggle } from '../components/BudgetToggle'
import type { SavingsGoal } from '../db/database'

type TabType = 'expense' | 'income' | 'savings'

const SAVINGS_TYPE_LABELS: Record<string, string> = {
  emergency_fund: 'Fundusz awaryjny',
  savings_account: 'Konto oszczędnościowe',
  goal: 'Cel',
}

export default function AddTransaction() {
  const navigate = useNavigate()
  const { categoriesByGroup, categories } = useCategories()
  const { transactions, addTransaction } = useTransactions()
  const { goals, addFunds } = useSavingsGoals()
  const { debts, updateDebt } = useDebts()

  const [type, setType] = useState<TabType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [savingsGoalId, setSavingsGoalId] = useState<number | null>(null)
  const [affectsBudget, setAffectsBudget] = useState(true)
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [debtId, setDebtId] = useState<number | null>(null)
  const [linkedGoalId, setLinkedGoalId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  const selectedCategory = categoryId ? categories.find((c) => c.id === categoryId) : null
  const catName = selectedCategory?.name ?? ''

  // Debt linking
  const isDebtPayoff = catName === 'Spłata długów'
  const isTransportation = catName === 'Transport'
  const showDebtSelector = isDebtPayoff || isTransportation
  const activeDebts = debts.filter((d) => d.balance > 0 && (!isTransportation || d.icon === 'Car'))

  // Savings linking
  const SAVINGS_CATEGORIES = new Set(['Oszczędności', 'Emerytura', 'Akcje', 'Fundusz awaryjny'])
  const isSavingsCategory = SAVINGS_CATEGORIES.has(catName)
  const linkableGoals = goals.filter((g) => {
    if (catName === 'Fundusz awaryjny') return g.type === 'emergency_fund'
    return true
  })

  const savingsGoalsAvailable = goals.filter(
    (g) => g.type !== 'goal' || g.currentAmount < g.targetAmount,
  )

  const activeGroups: CategoryGroup[] =
    type === 'expense' ? EXPENSE_GROUPS : type === 'income' ? ['income'] : []

  const { addCategory } = useCategories()
  const [newCatGroup, setNewCatGroup] = useState<CategoryGroup | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('Wallet')
  const [savingCat, setSavingCat] = useState(false)

  const handleCreateCategory = async () => {
    if (!newCatName.trim() || !newCatGroup) return
    setSavingCat(true)
    const id = await addCategory({
      name: newCatName.trim(),
      group: newCatGroup,
      icon: newCatIcon,
      color: GROUP_COLORS[newCatGroup],
      isPreset: false,
    })
    setCategoryId(id as number)
    setNewCatGroup(null)
    setNewCatName('')
    setNewCatIcon('Wallet')
    setSavingCat(false)
  }

  const isDuplicate = useMemo(() => {
    if (type === 'savings') return false
    if (!amount || !categoryId) return false
    const amt = parseLocaleAmount(amount)
    return transactions.some(
      (t) => t.amount === amt && t.categoryId === categoryId && t.date === date && t.type === type,
    )
  }, [amount, categoryId, date, type, transactions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (type === 'savings') {
      if (!amount || !savingsGoalId) return
      setSaving(true)
      await addFunds(savingsGoalId, parseLocaleAmount(amount), affectsBudget, {
        date,
        description: description.trim() || undefined,
      })
      setSaving(false)
      setAmount('')
      setSavingsGoalId(null)
      setDescription('')
      setNote('')
      navigate('/transactions')
      return
    }

    if (!amount || !categoryId) return

    if (isDuplicate && !duplicateWarning) {
      setDuplicateWarning(true)
      return
    }

    setSaving(true)
    await addTransaction({
      amount: parseLocaleAmount(amount),
      type,
      categoryId,
      description,
      note,
      date,
    })

    // Apply payment to selected debt
    if (showDebtSelector && debtId) {
      const debt = debts.find((d) => d.id === debtId)
      if (debt) {
        const newBalance = Math.max(0, debt.balance - parseLocaleAmount(amount))
        await updateDebt(debtId, { balance: newBalance })
      }
    }

    // Apply funds to linked savings goal
    if (isSavingsCategory && linkedGoalId) {
      await addFunds(linkedGoalId, parseLocaleAmount(amount), false)
    }

    setSaving(false)

    setAmount('')
    setCategoryId(null)
    setDebtId(null)
    setLinkedGoalId(null)
    setDescription('')
    setNote('')
    setDuplicateWarning(false)
    navigate('/transactions')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dodaj transakcję</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type toggle */}
          <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategoryId(null); setSavingsGoalId(null); setNewCatGroup(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                type === 'expense'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Wydatek
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategoryId(null); setSavingsGoalId(null); setNewCatGroup(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                type === 'income'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Przychód
            </button>
            <button
              type="button"
              onClick={() => { setType('savings'); setCategoryId(null); setSavingsGoalId(null); setNewCatGroup(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                type === 'savings'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Oszczędności
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
              Kwota
            </label>
            <div className="relative">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-4 pr-10 text-lg text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                zł
              </span>
            </div>
          </div>

          {/* Category (Expense/Income) or Account selector (Savings) */}
          {type === 'savings' ? (
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                Konto / cel oszczędnościowy
              </label>
              {savingsGoalsAvailable.length === 0 ? (
                <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
                  <p className="text-sm text-slate-400 mb-2">
                    Brak kont oszczędnościowych. Najpierw dodaj jedno w Oszczędnościach.
                  </p>
                  <Link
                    to="/savings"
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    Przejdź do Oszczędności →
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {savingsGoalsAvailable.map((goal: SavingsGoal) => {
                    const id = goal.id!
                    const selected = savingsGoalId === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSavingsGoalId(id)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${
                          selected
                            ? 'border-transparent text-white'
                            : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                        }`}
                        style={selected ? { backgroundColor: GROUP_COLORS.savings } : undefined}
                      >
                        <Icon
                          name={goal.icon}
                          size={18}
                          className={selected ? '' : 'text-blue-400'}
                        />
                        <div className="flex flex-col items-start">
                          <span>{goal.name}</span>
                          <span className="text-xs opacity-80">
                            {SAVINGS_TYPE_LABELS[goal.type]} · {formatCurrency(goal.currentAmount)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                Kategoria
              </label>
              <div className="space-y-3">
                {activeGroups.map((group) => {
                  const cats = categoriesByGroup(group)
                  return (
                    <div key={group}>
                      {activeGroups.length > 1 && (
                        <p
                          className="mb-1.5 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: GROUP_COLORS[group] }}
                        >
                          {GROUP_LABELS[group]}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {cats.map((cat) => {
                          const selected = categoryId === cat.id
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => { setCategoryId(cat.id!); setDebtId(null); setLinkedGoalId(null) }}
                              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                                selected
                                  ? 'border-transparent text-white'
                                  : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                              }`}
                              style={selected ? { backgroundColor: GROUP_COLORS[cat.group] } : undefined}
                            >
                              <Icon
                                name={cat.icon}
                                size={16}
                                className={selected ? '' : getCategoryIconClassName(cat.group)}
                              />
                              {cat.name}
                            </button>
                          )
                        })}
                        <button
                          type="button"
                          onClick={() => { setNewCatGroup(group); setNewCatName(''); setNewCatIcon('Wallet') }}
                          className="flex items-center gap-1 rounded-lg border border-dashed border-slate-600 px-3 py-1.5 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-300 transition-colors"
                        >
                          <Icon name="Plus" size={14} />
                          Nowa
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Debt selector (Debt Payoff or Transportation with car debts) */}
          {showDebtSelector && activeDebts.length > 0 && (
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                Zalicz na dług
              </label>
              <div className="flex flex-wrap gap-2">
                {activeDebts.map((debt) => {
                  const selected = debtId === debt.id
                  return (
                    <button
                      key={debt.id}
                      type="button"
                      onClick={() => setDebtId(selected ? null : debt.id!)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${
                        selected
                          ? 'border-transparent bg-orange-600 text-white'
                          : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                      }`}
                    >
                      <Icon
                        name={debt.icon || 'CreditCard'}
                        size={16}
                        className={selected ? '' : 'text-red-400'}
                      />
                      <div className="flex flex-col items-start">
                        <span>{debt.name}</span>
                        <span className="text-xs opacity-80">
                          {formatCurrency(debt.balance)} · {debt.interestRate}% APR
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Wpłata pomniejszy saldo wybranego długu.
              </p>
            </div>
          )}

          {/* Savings goal selector (Savings, Retirement, Stocks, Emergency Fund) */}
          {isSavingsCategory && linkableGoals.length > 0 && (
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
                Dodaj do celu oszczędnościowego
              </label>
              <div className="flex flex-wrap gap-2">
                {linkableGoals.map((goal) => {
                  const id = goal.id!
                  const selected = linkedGoalId === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLinkedGoalId(selected ? null : id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${
                        selected
                          ? 'border-transparent text-white'
                          : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                      }`}
                      style={selected ? { backgroundColor: GROUP_COLORS.savings } : undefined}
                    >
                      <Icon
                        name={goal.icon}
                        size={16}
                        className={selected ? '' : 'text-blue-400'}
                      />
                      <div className="flex flex-col items-start">
                        <span>{goal.name}</span>
                        <span className="text-xs opacity-80">
                          {SAVINGS_TYPE_LABELS[goal.type]} · {formatCurrency(goal.currentAmount)}
                          {goal.targetAmount > 0 && ` / ${formatCurrency(goal.targetAmount)}`}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Środki zostaną dodane do wybranego celu oszczędnościowego.
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
              Opis
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Na co to było?"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
              Notatka <span className="text-slate-600 font-normal">(opcjonalnie)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dodatkowe szczegóły, dane z paragonu itp."
              rows={2}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Budget toggle (Savings only) */}
          {type === 'savings' && (
            <BudgetToggle value={affectsBudget} onChange={setAffectsBudget} />
          )}

          {/* Duplicate warning (Expense/Income only) */}
          {type !== 'savings' && duplicateWarning && (
            <div className="rounded-xl border border-yellow-700 bg-yellow-900/20 p-3 text-sm text-yellow-300">
              <Icon name="AlertTriangle" size={18} className="inline mr-1 align-middle" /> Podobna transakcja już istnieje w tym dniu. Zatwierdź ponownie, aby potwierdzić.
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={
              !amount ||
              saving ||
              (type === 'savings' ? !savingsGoalId || savingsGoalsAvailable.length === 0 : !categoryId)
            }
          >
            {saving
              ? 'Zapisywanie...'
              : type === 'savings'
                ? 'Dodaj do oszczędności'
                : duplicateWarning
                  ? 'Dodaj mimo to'
                  : `Dodaj ${type === 'income' ? 'przychód' : 'wydatek'}`}
          </Button>
        </form>
      </Card>

      {/* New Category Modal */}
      <Modal
        open={!!newCatGroup}
        onClose={() => setNewCatGroup(null)}
        title={`Nowa kategoria${newCatGroup ? ` · ${GROUP_LABELS[newCatGroup]}` : ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Nazwa</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="np. Opieka nad zwierzętami"
              autoFocus
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-400">Ikona</label>
            <div className="grid grid-cols-8 gap-1">
              {CATEGORY_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setNewCatIcon(ic)}
                  className={`flex h-9 w-full items-center justify-center rounded-lg transition-colors ${
                    newCatIcon === ic
                      ? 'bg-slate-700 ring-2 ring-green-500 text-green-400'
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon name={ic} size={17} />
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleCreateCategory}
            className="w-full"
            disabled={!newCatName.trim() || savingCat}
          >
            {savingCat ? 'Tworzenie...' : 'Utwórz kategorię'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
