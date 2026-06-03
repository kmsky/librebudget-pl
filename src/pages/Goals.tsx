import { useState, useEffect } from 'react'
import { format, subMonths, addMonths, startOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useBudgetGoals } from '../hooks/useBudgetGoals'
import { useCategories } from '../hooks/useCategories'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import {
  formatCurrency,
  groupByCategory,
} from '../utils/calculations'
import { GROUP_COLORS, GROUP_LABELS, getHealthBarColor, getCategoryIconClassName } from '../utils/colors'
import { BUDGET_GROUPS, type CategoryGroup } from '../db/database'
import { Icon } from '../components/ui/Icon'

const BUDGET_BLUEPRINTS = [
  { id: '50-30-20', name: '50/30/20', desc: 'Potrzeby 50%, Zachcianki 30%, Oszczędności 20%', needs: 0.5, wants: 0.3, savings: 0.2 },
  { id: '50-25-25', name: '50/25/25', desc: 'Potrzeby 50%, Zachcianki 25%, Oszczędności 25%', needs: 0.5, wants: 0.25, savings: 0.25 },
] as const

export default function Goals() {
  const [viewDate, setViewDate] = useState(new Date())
  const isCurrentMonth = format(viewDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')
  const viewMonth = format(viewDate, 'yyyy-MM')

  const start = format(startOfMonth(viewDate), 'yyyy-MM-dd')
  const end = format(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0), 'yyyy-MM-dd')

  const prevDate = subMonths(viewDate, 1)
  const prevMonth = format(prevDate, 'yyyy-MM')
  const prevLabel = format(prevDate, 'LLLL', { locale: pl })

  const { goals, addGoal, deleteGoal, copyFromMonth } = useBudgetGoals(viewMonth)
  const { categories, categoriesByGroup } = useCategories()
  const { getMonthlyBudget, setMonthlyBudget, clearMonthlyBudgetOverride, customBlueprints, addCustomBlueprint, deleteCustomBlueprint, monthlyBudget: defaultBudget, setSetting, settings } = useSettings()
  const { transactions } = useTransactions(start, end)

  const monthlyBudget = getMonthlyBudget(viewMonth)

  const [showModal, setShowModal] = useState(false)
  const [goalType, setGoalType] = useState<'group' | 'category'>('group')
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup>('needs')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [limitAmount, setLimitAmount] = useState('')
  const [editBudget, setEditBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString())
  const [editDefault, setEditDefault] = useState(false)
  const [defaultInput, setDefaultInput] = useState(defaultBudget.toString())
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null)
  const [groupLimitInput, setGroupLimitInput] = useState('')
  const [showBlueprintModal, setShowBlueprintModal] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customNeeds, setCustomNeeds] = useState('50')
  const [customWants, setCustomWants] = useState('30')
  const [customSavings, setCustomSavings] = useState('20')

  const spending = groupByCategory(transactions)
  const hasMonthOverride = settings[`monthlyBudget-${viewMonth}`] != null

  useEffect(() => {
    setBudgetInput(monthlyBudget.toString())
    setEditBudget(false)
  }, [viewMonth, monthlyBudget])

  useEffect(() => {
    setDefaultInput(defaultBudget.toString())
    setEditDefault(false)
  }, [defaultBudget])

  const handleAddGoal = async () => {
    if (!limitAmount) return
    await addGoal({
      categoryId: goalType === 'category' ? selectedCategoryId : null,
      group: goalType === 'group' ? selectedGroup : null,
      monthlyLimit: parseFloat(limitAmount),
      month: viewMonth,
    })
    setShowModal(false)
    setLimitAmount('')
  }

  const handleSaveBudget = async () => {
    await setMonthlyBudget(viewMonth, parseFloat(budgetInput))
    setEditBudget(false)
  }

  const handleSaveDefault = async () => {
    await setSetting('monthlyBudget', defaultInput)
    setEditDefault(false)
  }

  const startEditGroup = (group: CategoryGroup, currentLimit: number) => {
    setEditingGroup(group)
    setGroupLimitInput(currentLimit > 0 ? currentLimit.toString() : '')
  }

  const cancelEditGroup = () => {
    setEditingGroup(null)
    setGroupLimitInput('')
  }

  const saveGroupGoal = async (group: CategoryGroup) => {
    const amount = parseFloat(groupLimitInput)
    if (!Number.isFinite(amount) || amount < 0) return
    await addGoal({ categoryId: null, group, monthlyLimit: amount, month: viewMonth })
    setEditingGroup(null)
    setGroupLimitInput('')
  }

  type BlueprintLike = { needs: number; wants: number; savings: number }
  const applyBlueprint = async (bp: BlueprintLike) => {
    const base = monthlyBudget
    if (base <= 0) return
    await addGoal({ categoryId: null, group: 'needs', monthlyLimit: Math.round(base * bp.needs * 100) / 100, month: viewMonth })
    await addGoal({ categoryId: null, group: 'wants', monthlyLimit: Math.round(base * bp.wants * 100) / 100, month: viewMonth })
    await addGoal({ categoryId: null, group: 'savings', monthlyLimit: Math.round(base * bp.savings * 100) / 100, month: viewMonth })
    setEditingGroup(null)
  }

  const handleSaveCustomBlueprint = async () => {
    const needs = parseFloat(customNeeds) / 100
    const wants = parseFloat(customWants) / 100
    const savings = parseFloat(customSavings) / 100
    const sum = needs + wants + savings
    if (!customName.trim() || !Number.isFinite(needs) || !Number.isFinite(wants) || !Number.isFinite(savings)) return
    if (Math.abs(sum - 1) > 0.01) return
    const name = customName.trim()
    await addCustomBlueprint({
      id: `custom-${Date.now()}`,
      name,
      needs,
      wants,
      savings,
    })
    setShowBlueprintModal(false)
    setCustomName('')
    setCustomNeeds('50')
    setCustomWants('30')
    setCustomSavings('20')
  }

  const customBlueprintTotal = () => {
    const n = parseFloat(customNeeds) || 0
    const w = parseFloat(customWants) || 0
    const s = parseFloat(customSavings) || 0
    return n + w + s
  }

  const groupSpending = (group: CategoryGroup): number =>
    categoriesByGroup(group).reduce((sum, cat) => sum + (spending[cat.id!] || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Budżet</h1>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={() => setViewDate((d) => subMonths(d, 1))}
              className="text-slate-500 hover:text-slate-300 text-sm"
            >←</button>
            <p className="text-sm text-slate-400">{format(viewDate, 'LLLL yyyy', { locale: pl })}</p>
            <button
              onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="text-slate-500 hover:text-slate-300 text-sm"
              disabled={isCurrentMonth}
            >→</button>
            {!isCurrentMonth && (
              <button
                onClick={() => setViewDate(new Date())}
                className="text-xs text-green-400 hover:text-green-300 ml-1"
              >Dziś</button>
            )}
          </div>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Dodaj cel</Button>
      </div>

      {/* Budget — monthly + default combined */}
      <Card>
        {/* Month row */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              {format(viewDate, 'LLLL yyyy', { locale: pl })}
            </p>
            {editBudget ? (
              <div className="flex gap-2 mt-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">zł</span>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    autoFocus
                    className="w-40 rounded-xl border border-slate-700 bg-slate-800 py-2 pl-7 pr-4 text-xl font-bold text-slate-100 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <Button size="sm" onClick={handleSaveBudget}>Zapisz</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditBudget(false)}>Anuluj</Button>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-4xl font-bold text-slate-100 tracking-tight">
                  {formatCurrency(monthlyBudget)}
                </span>
                {hasMonthOverride && (
                  <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                    Własny
                  </span>
                )}
              </div>
            )}
          </div>
          {!editBudget && (
            <button
              onClick={() => setEditBudget(true)}
              className="shrink-0 mt-0.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Edytuj
            </button>
          )}
        </div>

        {hasMonthOverride && !editBudget && (
          <button
            onClick={() => clearMonthlyBudgetOverride(viewMonth)}
            className="text-xs text-slate-500 hover:text-slate-300 mt-1 transition-colors"
          >
↩ Przywróć domyślny
          </button>
        )}

        {/* Divider */}
        <div className="border-t border-slate-800 my-4" />

        {/* Default row */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Domyślny (wszystkie pozostałe miesiące)
            </p>
            {editDefault ? (
              <div className="flex gap-2 mt-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">zł</span>
                  <input
                    type="number"
                    value={defaultInput}
                    onChange={(e) => setDefaultInput(e.target.value)}
                    autoFocus
                    className="w-36 rounded-xl border border-slate-700 bg-slate-800 py-1.5 pl-7 pr-4 text-lg font-bold text-slate-100 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <Button size="sm" onClick={handleSaveDefault}>Zapisz</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditDefault(false)}>Anuluj</Button>
              </div>
            ) : (
              <span className="text-2xl font-bold text-slate-400">
                {formatCurrency(defaultBudget)}
              </span>
            )}
          </div>
          {!editDefault && (
            <button
              onClick={() => setEditDefault(true)}
              className="shrink-0 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Edytuj
            </button>
          )}
        </div>
      </Card>

      {/* Budget Blueprint */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-slate-400">Schemat budżetu</h3>
          <span className="text-xs text-slate-500">
            Na podstawie {formatCurrency(monthlyBudget)}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Wybierz podział, aby od razu ustawić limity grup na {format(viewDate, 'LLLL', { locale: pl })}.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...BUDGET_BLUEPRINTS, ...customBlueprints].map((bp) => {
            const isCustom = !('desc' in bp)
            const needsAmt = Math.round(monthlyBudget * bp.needs)
            const wantsAmt = Math.round(monthlyBudget * bp.wants)
            const savingsAmt = Math.round(monthlyBudget * bp.savings)
            return (
              <div key={bp.id} className="relative group">
                <button
                  onClick={() => applyBlueprint(bp)}
                  className="w-full flex flex-col rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-left hover:border-slate-500 hover:bg-slate-800 transition-colors"
                >
                  {/* Name + badge */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-sm font-bold text-slate-100">{bp.name}</span>
                    {isCustom && (
                      <span className="text-[10px] font-medium text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full leading-none">
                        Własny
                      </span>
                    )}
                  </div>

                  {/* Segmented bar */}
                  <div className="flex h-2 w-full overflow-hidden rounded-full gap-px mb-3">
                    <div style={{ width: `${bp.needs * 100}%`, backgroundColor: '#eab308' }} className="rounded-l-full" />
                    <div style={{ width: `${bp.wants * 100}%`, backgroundColor: '#f97316' }} />
                    <div style={{ width: `${bp.savings * 100}%`, backgroundColor: '#3b82f6' }} className="rounded-r-full" />
                  </div>

                  {/* Per-group dollar + percent */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: '#eab308' }} />
                        <span className="text-xs text-slate-400">Potrzeby</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-slate-200">{formatCurrency(needsAmt)}</span>
                        <span className="text-[10px] text-slate-500 ml-1">{Math.round(bp.needs * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: '#f97316' }} />
                        <span className="text-xs text-slate-400">Zachcianki</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-slate-200">{formatCurrency(wantsAmt)}</span>
                        <span className="text-[10px] text-slate-500 ml-1">{Math.round(bp.wants * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: '#3b82f6' }} />
                        <span className="text-xs text-slate-400">Oszczędności</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-slate-200">{formatCurrency(savingsAmt)}</span>
                        <span className="text-[10px] text-slate-500 ml-1">{Math.round(bp.savings * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Delete button for custom blueprints */}
                {isCustom && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCustomBlueprint(bp.id) }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-700 text-slate-400 hover:bg-red-900/60 hover:text-red-400 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Usuń"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}

          {/* Add custom */}
          <button
            onClick={() => setShowBlueprintModal(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-green-500/40 bg-green-500/5 p-3 text-green-400 hover:border-green-500/70 hover:bg-green-500/10 transition-colors min-h-[130px]"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-xs font-medium">Własny podział</span>
          </button>
        </div>
      </Card>

      {/* Add Custom Blueprint Modal */}
      <Modal open={showBlueprintModal} onClose={() => setShowBlueprintModal(false)} title="Dodaj własny schemat">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Nazwa</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="np. Agresywne oszczędzanie"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Procenty (muszą sumować się do 100%)</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={customNeeds}
                  onChange={(e) => setCustomNeeds(e.target.value)}
                  placeholder="Potrzeby"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-0.5">Potrzeby %</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={customWants}
                  onChange={(e) => setCustomWants(e.target.value)}
                  placeholder="Zachcianki"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-0.5">Zachcianki %</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={customSavings}
                  onChange={(e) => setCustomSavings(e.target.value)}
                  placeholder="Oszczędności"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-0.5">Oszczędności %</p>
              </div>
            </div>
            <p className={`text-xs mt-1 ${Math.abs(customBlueprintTotal() - 100) < 0.5 ? 'text-green-400' : 'text-slate-500'}`}>
              Łącznie: {customBlueprintTotal().toFixed(0)}%
            </p>
          </div>
          <Button
            onClick={handleSaveCustomBlueprint}
            className="w-full"
            disabled={!customName.trim() || Math.abs(customBlueprintTotal() - 100) > 0.5}
          >
            Dodaj schemat
          </Button>
        </div>
      </Modal>

      {/* Group-level goals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Według grup kategorii</h2>
          {goals.filter(g => g.group).length === 0 && (
            <Button size="sm" variant="ghost" onClick={() => copyFromMonth(prevMonth)}>
              Kopiuj z: {prevLabel}
            </Button>
          )}
        </div>
        {BUDGET_GROUPS.map((group) => {
          const goal = goals.find((g) => g.group === group)
          const spent = groupSpending(group)
          const limit = goal?.monthlyLimit ?? 0
          const ratio = limit > 0 ? spent / limit : 0
          const color = GROUP_COLORS[group]
          const isEditing = editingGroup === group
          const groupCats = categoriesByGroup(group)
            .filter(cat => (spending[cat.id!] || 0) > 0)
            .sort((a, b) => (spending[b.id!] || 0) - (spending[a.id!] || 0))

          return (
            <Card
              key={group}
              className={limit === 0 && !isEditing ? 'opacity-75 border-slate-700/70 border-dashed hover:opacity-100 hover:border-slate-600 transition-all cursor-pointer' : ''}
            >
              <div
                className={limit === 0 && !isEditing ? 'cursor-pointer' : ''}
                onClick={limit === 0 && !isEditing ? () => startEditGroup(group, limit) : undefined}
                onKeyDown={limit === 0 && !isEditing ? (e) => e.key === 'Enter' && startEditGroup(group, limit) : undefined}
                role={limit === 0 && !isEditing ? 'button' : undefined}
                tabIndex={limit === 0 && !isEditing ? 0 : undefined}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <h3 className="font-medium text-slate-200">{GROUP_LABELS[group]}</h3>
                  </div>
                  {!isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <span className="text-slate-300">{formatCurrency(spent)}</span>
                        {limit > 0 && (
                          <span className="text-slate-500"> / {formatCurrency(limit)}</span>
                        )}
                      </div>
                      {limit > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditGroup(group, limit) }}
                          className="text-xs text-green-400 hover:text-green-300 shrink-0"
                          title="Edytuj limit"
                        >
                          Edytuj
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
                {isEditing ? (
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">zł</span>
                      <input
                        type="number"
                        step="0.01"
                        value={groupLimitInput}
                        onChange={(e) => setGroupLimitInput(e.target.value)}
                        placeholder="0"
                        autoFocus
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 pl-7 pr-3 text-sm text-slate-100 focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <Button size="sm" onClick={() => saveGroupGoal(group)} disabled={!groupLimitInput}>
                      Zapisz
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEditGroup}>
                      Anuluj
                    </Button>
                  </div>
                ) : limit > 0 ? (
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(ratio * 100, 100)}%`,
                        backgroundColor: getHealthBarColor(group === 'savings' ? 1 - ratio : ratio),
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-500">
                    <Icon name="Pencil" size={28} className="text-slate-500" />
                    <span className="text-xs font-medium">Ustaw limit</span>
                  </div>
                )}
              </div>
              {groupCats.length > 0 && !isEditing && (
                <div className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
                  {groupCats.map(cat => {
                    const catSpent = spending[cat.id!] || 0
                    const catGoal = goals.find(g => g.categoryId === cat.id)
                    return (
                      <div key={cat.id} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Icon name={cat.icon} size={13} className={getCategoryIconClassName(cat.group)} />
                          <span className="text-xs text-slate-400 truncate">{cat.name}</span>
                        </span>
                        <span className="text-xs text-slate-300 shrink-0 tabular-nums">
                          {formatCurrency(catSpent)}
                          {catGoal && (
                            <span className="text-slate-500"> / {formatCurrency(catGoal.monthlyLimit)}</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              {goal?.id && !isEditing && (
                <button
                  onClick={(e) => { e.stopPropagation(); goal.id && deleteGoal(goal.id) }}
                  className="mt-2 text-xs text-red-400 hover:text-red-300"
                >
                  Usuń cel
                </button>
              )}
            </Card>
          )
        })}
      </div>

      {/* Per-category goals */}
      {goals.filter((g) => g.categoryId).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Cele kategorii</h2>
          {goals
            .filter((g) => g.categoryId)
            .map((goal) => {
              const cat = categories.find((c) => c.id === goal.categoryId)
              if (!cat) return null
              const spent = spending[cat.id!] || 0
              const ratio = goal.monthlyLimit > 0 ? spent / goal.monthlyLimit : 0
              return (
                <Card key={goal.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Icon name={cat.icon} size={18} className={getCategoryIconClassName(cat.group)} />
                      {cat.name}
                    </span>
                    <div className="text-sm">
                      <span className="text-slate-300">{formatCurrency(spent)}</span>
                      <span className="text-slate-500"> / {formatCurrency(goal.monthlyLimit)}</span>
                    </div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(ratio * 100, 100)}%`,
                        backgroundColor: getHealthBarColor(ratio),
                      }}
                    />
                  </div>
                  <button
                    onClick={() => goal.id && deleteGoal(goal.id)}
                    className="mt-2 text-xs text-red-400 hover:text-red-300"
                  >
                    Usuń cel
                  </button>
                </Card>
              )
            })}
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Dodaj cel budżetowy">
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
            <button
              onClick={() => setGoalType('group')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                goalType === 'group' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
              }`}
            >
              Według grupy
            </button>
            <button
              onClick={() => setGoalType('category')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                goalType === 'category' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
              }`}
            >
              Według kategorii
            </button>
          </div>

          {goalType === 'group' ? (
            <div className="flex gap-2">
              {BUDGET_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGroup(g)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    selectedGroup === g ? 'border-transparent text-white' : 'border-slate-700 text-slate-400'
                  }`}
                  style={selectedGroup === g ? { backgroundColor: GROUP_COLORS[g] } : undefined}
                >
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={selectedCategoryId ?? ''}
              onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none"
            >
              <option value="">Wybierz kategorię...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}

          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Limit miesięczny
            </label>
            <input
              type="number"
              step="0.01"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none"
            />
          </div>

          <Button onClick={handleAddGoal} className="w-full" disabled={!limitAmount}>
            Dodaj cel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
