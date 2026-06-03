import { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { formatCurrency } from '../utils/calculations'
import { parseLocaleAmount } from '../utils/sanitize'
import type { SavingsGoal } from '../db/database'
import { Icon, GOAL_ICONS, ACCOUNT_ICONS } from '../components/ui/Icon'
import { BudgetToggle } from '../components/BudgetToggle'

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function SavingsCard({
  item,
  showProgress,
  onAddFunds,
  onDelete,
}: {
  item: SavingsGoal
  showProgress: boolean
  onAddFunds: () => void
  onDelete: () => void
}) {
  const progress = showProgress && item.targetAmount > 0
    ? Math.min(item.currentAmount / item.targetAmount, 1)
    : null

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Icon name={item.icon || 'Wallet'} size={22} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-slate-200">{item.name}</h3>
            <p className="text-xs text-slate-500">
              {item.type === 'emergency_fund' ? 'Emergency Fund' : item.type === 'savings_account' ? 'Savings Account' : 'Savings Goal'}
            </p>
          </div>
        </div>
        <p className="text-lg font-bold text-blue-400">{formatCurrency(item.currentAmount)}</p>
      </div>

      {progress !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">{formatCurrency(item.currentAmount)}</span>
            <span className="text-slate-500">{formatCurrency(item.targetAmount)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: progress >= 1 ? '#22c55e' : '#3b82f6',
              }}
            />
          </div>
          <p className="text-right text-xs text-slate-500 mt-0.5">{(progress * 100).toFixed(0)}%</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={onAddFunds} className="flex-1">+ Add Funds</Button>
        <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SavingsGoals() {
  const { goalsOnly, savingsAccounts, emergencyFunds, addGoal, addSavings, deleteGoal, addFunds } = useSavingsGoals()

  const [showModal, setShowModal] = useState<'goal' | 'savings_account' | 'emergency_fund' | null>(null)
  const [showFundModal, setShowFundModal] = useState<number | null>(null)

  // Shared form state
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Target')
  const [target, setTarget] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadline, setDeadline] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [affectsBudgetCreate, setAffectsBudgetCreate] = useState(true)

  // Add funds state
  const [fundAmount, setFundAmount] = useState('')
  const [affectsBudgetFund, setAffectsBudgetFund] = useState(true)

  const resetForm = () => {
    setName(''); setIcon('Target'); setTarget('')
    setCurrentAmount(''); setDeadline(format(new Date(), 'yyyy-MM-dd')); setAffectsBudgetCreate(true)
  }

  const handleAddGoal = async () => {
    if (!name.trim() || !target) return
    await addGoal({
      name: name.trim(), icon, type: 'goal',
      targetAmount: parseLocaleAmount(target), currentAmount: 0,
      deadline: deadline || format(new Date(Date.now() + 365 * 86400000), 'yyyy-MM-dd'),
    })
    setShowModal(null); resetForm()
  }

  const handleAddSavings = async (type: 'savings_account' | 'emergency_fund') => {
    if (!name.trim() || !currentAmount) return
    await addSavings(type, {
      name: name.trim(), icon,
      currentAmount: parseLocaleAmount(currentAmount),
    }, affectsBudgetCreate)
    setShowModal(null); resetForm()
  }

  const handleFund = async () => {
    if (!fundAmount || !showFundModal) return
    await addFunds(showFundModal, parseLocaleAmount(fundAmount), affectsBudgetFund)
    setShowFundModal(null); setFundAmount(''); setAffectsBudgetFund(true)
  }

  // Totals
  const totalEmergency = emergencyFunds.reduce((s, g) => s + g.currentAmount, 0)
  const totalSavingsAccounts = savingsAccounts.reduce((s, g) => s + g.currentAmount, 0)
  const totalGoals = goalsOnly.reduce((s, g) => s + g.currentAmount, 0)
  const grandTotal = totalEmergency + totalSavingsAccounts + totalGoals
  const hasAny = goalsOnly.length > 0 || savingsAccounts.length > 0 || emergencyFunds.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Savings</h1>
          </div>
          <p className="text-sm text-slate-400">Accounts, goals & emergency funds</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setShowModal('emergency_fund'); setIcon('Shield'); resetForm() }}>
            + Emergency Fund
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setShowModal('savings_account'); setIcon('Building2'); resetForm() }}>
            + Account
          </Button>
          <Button onClick={() => { setShowModal('goal'); setIcon('Target'); resetForm() }}>
            + Goal
          </Button>
        </div>
      </div>

      {/* Total savings summary */}
      {hasAny && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-xs text-slate-400 mb-1">Total Saved</p>
          <p className="text-3xl font-bold text-blue-400">{formatCurrency(grandTotal)}</p>
          {(totalEmergency > 0 || totalSavingsAccounts > 0 || totalGoals > 0) && (
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              {totalEmergency > 0 && <span>Emergency: <span className="text-slate-300">{formatCurrency(totalEmergency)}</span></span>}
              {totalSavingsAccounts > 0 && <span>Accounts: <span className="text-slate-300">{formatCurrency(totalSavingsAccounts)}</span></span>}
              {totalGoals > 0 && <span>Goals: <span className="text-slate-300">{formatCurrency(totalGoals)}</span></span>}
            </div>
          )}
        </div>
      )}

      {!hasAny && (
        <Card>
          <p className="text-center text-slate-400 py-8">
            Add savings accounts, goals, or an emergency fund to get started.
          </p>
        </Card>
      )}

      {/* Emergency Funds */}
      {emergencyFunds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-300">Emergency Funds</h2>
            <span className="text-xs text-blue-400">{formatCurrency(totalEmergency)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {emergencyFunds.map((item) => (
              <SavingsCard
                key={item.id} item={item} showProgress={false}
                onAddFunds={() => { setShowFundModal(item.id!); setFundAmount(''); setAffectsBudgetFund(true) }}
                onDelete={() => item.id && deleteGoal(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Savings Accounts */}
      {savingsAccounts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-300">Savings Accounts</h2>
            <span className="text-xs text-blue-400">{formatCurrency(totalSavingsAccounts)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {savingsAccounts.map((item) => (
              <SavingsCard
                key={item.id} item={item} showProgress={false}
                onAddFunds={() => { setShowFundModal(item.id!); setFundAmount(''); setAffectsBudgetFund(true) }}
                onDelete={() => item.id && deleteGoal(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Savings Goals */}
      {goalsOnly.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-300">Savings Goals</h2>
            <span className="text-xs text-blue-400">{formatCurrency(totalGoals)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {goalsOnly.map((goal) => {
              const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0
              const completed = goal.currentAmount >= goal.targetAmount
              const daysLeft = differenceInDays(new Date(goal.deadline), new Date())
              return (
                <Card key={goal.id}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                        <Icon name={goal.icon || 'Target'} size={22} className="text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-200">{goal.name}</h3>
                        <p className="text-xs text-slate-500">
                          {completed ? 'Goal reached! 🎉' : daysLeft > 0 ? `${daysLeft} days left` : 'Past deadline'}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-blue-400">{formatCurrency(goal.currentAmount)}</p>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{formatCurrency(goal.currentAmount)}</span>
                      <span className="text-slate-500">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(progress * 100, 100)}%`,
                          backgroundColor: completed ? '#22c55e' : '#3b82f6',
                        }}
                      />
                    </div>
                    <p className="text-right text-xs text-slate-500 mt-0.5">{Math.min(progress * 100, 100).toFixed(0)}%</p>
                  </div>
                  <div className="flex gap-2">
                    {!completed && (
                      <Button size="sm" onClick={() => { setShowFundModal(goal.id!); setFundAmount(''); setAffectsBudgetFund(true) }} className="flex-1">
                        + Add Funds
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => goal.id && deleteGoal(goal.id)}>Delete</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Funds Modal */}
      <Modal open={!!showFundModal} onClose={() => setShowFundModal(null)} title="Add Funds">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
              <input
                inputMode="decimal" value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="0.00" autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
          <BudgetToggle
            value={affectsBudgetFund}
            onChange={setAffectsBudgetFund}
            label="Count as this month's savings contribution"
            hint="Turn off if this money already existed and you're just recording it."
          />
          <Button onClick={handleFund} className="w-full" disabled={!fundAmount}>Add Funds</Button>
        </div>
      </Modal>

      {/* New Savings Goal Modal */}
      <Modal open={showModal === 'goal'} onClose={() => setShowModal(null)} title="New Savings Goal">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {GOAL_ICONS.map((i) => (
                <button key={i} onClick={() => setIcon(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${icon === i ? 'bg-blue-500/20 ring-2 ring-blue-500 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}>
                  <Icon name={i} size={18} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vacation Fund"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Target Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
              <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)}
                placeholder="5000"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Target Date</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none" />
          </div>
          <Button onClick={handleAddGoal} className="w-full" disabled={!name.trim() || !target}>
            Create Goal
          </Button>
        </div>
      </Modal>

      {/* Add Savings Account Modal */}
      <Modal open={showModal === 'savings_account'} onClose={() => setShowModal(null)} title="Add Savings Account">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_ICONS.map((i) => (
                <button key={i} onClick={() => setIcon(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${icon === i ? 'bg-blue-500/20 ring-2 ring-blue-500 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}>
                  <Icon name={i} size={18} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chase Savings"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Current Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
              <input inputMode="decimal" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <BudgetToggle
            value={affectsBudgetCreate}
            onChange={setAffectsBudgetCreate}
            label="Count initial balance as this month's savings"
            hint="Turn off if this account already existed — the balance won't be added to this month's savings tracker."
          />
          <Button onClick={() => handleAddSavings('savings_account')} className="w-full" disabled={!name.trim() || !currentAmount}>
            Add Account
          </Button>
        </div>
      </Modal>

      {/* Add Emergency Fund Modal */}
      <Modal open={showModal === 'emergency_fund'} onClose={() => setShowModal(null)} title="Add Emergency Fund">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_ICONS.map((i) => (
                <button key={i} onClick={() => setIcon(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${icon === i ? 'bg-blue-500/20 ring-2 ring-blue-500 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}>
                  <Icon name={i} size={18} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Current Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
              <input inputMode="decimal" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <BudgetToggle
            value={affectsBudgetCreate}
            onChange={setAffectsBudgetCreate}
            label="Count initial balance as this month's savings"
            hint="Turn off if this fund already existed — the balance won't be added to this month's savings tracker."
          />
          <Button onClick={() => handleAddSavings('emergency_fund')} className="w-full" disabled={!name.trim() || !currentAmount}>
            Add Emergency Fund
          </Button>
        </div>
      </Modal>
    </div>
  )
}
