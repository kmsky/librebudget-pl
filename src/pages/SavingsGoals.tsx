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
  onWithdraw,
  onDelete,
}: {
  item: SavingsGoal
  showProgress: boolean
  onAddFunds: () => void
  onWithdraw: () => void
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
              {item.type === 'emergency_fund' ? 'Fundusz awaryjny' : item.type === 'savings_account' ? 'Konto oszczędnościowe' : 'Cel oszczędnościowy'}
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
        <Button size="sm" onClick={onAddFunds} className="flex-1">+ Wpłać</Button>
        <Button size="sm" variant="secondary" onClick={onWithdraw} className="flex-1">− Wypłać</Button>
        <Button size="sm" variant="danger" onClick={onDelete}>Usuń</Button>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SavingsGoals() {
  const { goalsOnly, savingsAccounts, emergencyFunds, addGoal, addSavings, deleteGoal, addFunds, withdrawFunds } = useSavingsGoals()

  const [showModal, setShowModal] = useState<'goal' | 'savings_account' | 'emergency_fund' | null>(null)
  const [showFundModal, setShowFundModal] = useState<number | null>(null)
  const [showWithdrawModal, setShowWithdrawModal] = useState<number | null>(null)

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

  // Withdraw funds state
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [affectsBudgetWithdraw, setAffectsBudgetWithdraw] = useState(true)

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

  const handleWithdraw = async () => {
    if (!withdrawAmount || !showWithdrawModal) return
    await withdrawFunds(showWithdrawModal, parseLocaleAmount(withdrawAmount), affectsBudgetWithdraw)
    setShowWithdrawModal(null); setWithdrawAmount(''); setAffectsBudgetWithdraw(true)
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
            <h1 className="text-2xl font-bold">Oszczędności</h1>
          </div>
          <p className="text-sm text-slate-400">Konta, cele i fundusz awaryjny</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setShowModal('emergency_fund'); setIcon('Shield'); resetForm() }}>
            + Fundusz awaryjny
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setShowModal('savings_account'); setIcon('Building2'); resetForm() }}>
            + Konto
          </Button>
          <Button onClick={() => { setShowModal('goal'); setIcon('Target'); resetForm() }}>
            + Cel
          </Button>
        </div>
      </div>

      {/* Total savings summary */}
      {hasAny && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-xs text-slate-400 mb-1">Łącznie zaoszczędzone</p>
          <p className="text-3xl font-bold text-blue-400">{formatCurrency(grandTotal)}</p>
          {(totalEmergency > 0 || totalSavingsAccounts > 0 || totalGoals > 0) && (
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              {totalEmergency > 0 && <span>Fundusz awaryjny: <span className="text-slate-300">{formatCurrency(totalEmergency)}</span></span>}
              {totalSavingsAccounts > 0 && <span>Konta: <span className="text-slate-300">{formatCurrency(totalSavingsAccounts)}</span></span>}
              {totalGoals > 0 && <span>Cele: <span className="text-slate-300">{formatCurrency(totalGoals)}</span></span>}
            </div>
          )}
        </div>
      )}

      {!hasAny && (
        <Card>
          <p className="text-center text-slate-400 py-8">
            Dodaj konta oszczędnościowe, cele lub fundusz awaryjny, aby zacząć.
          </p>
        </Card>
      )}

      {/* Emergency Funds */}
      {emergencyFunds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-300">Fundusz awaryjny</h2>
            <span className="text-xs text-blue-400">{formatCurrency(totalEmergency)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {emergencyFunds.map((item) => (
              <SavingsCard
                key={item.id} item={item} showProgress={false}
                onAddFunds={() => { setShowFundModal(item.id!); setFundAmount(''); setAffectsBudgetFund(true) }}
                onWithdraw={() => { setShowWithdrawModal(item.id!); setWithdrawAmount(''); setAffectsBudgetWithdraw(true) }}
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
            <h2 className="text-sm font-semibold text-slate-300">Konta oszczędnościowe</h2>
            <span className="text-xs text-blue-400">{formatCurrency(totalSavingsAccounts)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {savingsAccounts.map((item) => (
              <SavingsCard
                key={item.id} item={item} showProgress={false}
                onAddFunds={() => { setShowFundModal(item.id!); setFundAmount(''); setAffectsBudgetFund(true) }}
                onWithdraw={() => { setShowWithdrawModal(item.id!); setWithdrawAmount(''); setAffectsBudgetWithdraw(true) }}
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
            <h2 className="text-sm font-semibold text-slate-300">Cele oszczędnościowe</h2>
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
                          {completed ? 'Cel osiągnięty! 🎉' : daysLeft > 0 ? `${daysLeft} dni do terminu` : 'Po terminie'}
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
                        + Wpłać
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => { setShowWithdrawModal(goal.id!); setWithdrawAmount(''); setAffectsBudgetWithdraw(true) }} className="flex-1">
                      − Wypłać
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => goal.id && deleteGoal(goal.id)}>Usuń</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Funds Modal */}
      <Modal open={!!showFundModal} onClose={() => setShowFundModal(null)} title="Wpłać środki">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Kwota</label>
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
            label="Zalicz jako tegomiesięczną wpłatę na oszczędności"
            hint="Wyłącz, jeśli te pieniądze już wcześniej istniały i tylko je tu zapisujesz."
          />
          <Button onClick={handleFund} className="w-full" disabled={!fundAmount}>Wpłać środki</Button>
        </div>
      </Modal>

      {/* Withdraw Funds Modal */}
      <Modal open={!!showWithdrawModal} onClose={() => setShowWithdrawModal(null)} title="Wypłać środki">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Kwota</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
              <input
                inputMode="decimal" value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00" autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
          <BudgetToggle
            value={affectsBudgetWithdraw}
            onChange={setAffectsBudgetWithdraw}
            label="Odejmij od tegomiesięcznych oszczędności"
            hint="Wyłącz, jeśli to tylko korekta salda pieniędzy, które już wcześniej istniały — wypłata nie zostanie odjęta od tegomiesięcznego śledzenia oszczędności."
          />
          <Button onClick={handleWithdraw} className="w-full" disabled={!withdrawAmount}>Wypłać środki</Button>
        </div>
      </Modal>

      {/* New Savings Goal Modal */}
      <Modal open={showModal === 'goal'} onClose={() => setShowModal(null)} title="Nowy cel oszczędnościowy">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Ikona</label>
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
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Nazwa</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="np. Na wakacje"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Kwota docelowa</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">zł</span>
              <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)}
                placeholder="5000"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Data docelowa</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none" />
          </div>
          <Button onClick={handleAddGoal} className="w-full" disabled={!name.trim() || !target}>
            Utwórz cel
          </Button>
        </div>
      </Modal>

      {/* Add Savings Account Modal */}
      <Modal open={showModal === 'savings_account'} onClose={() => setShowModal(null)} title="Dodaj konto oszczędnościowe">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Ikona</label>
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
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Nazwa</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="np. Konto oszczędnościowe mBank"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Obecne saldo</label>
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
            label="Zalicz saldo początkowe do tegomiesięcznych oszczędności"
            hint="Wyłącz, jeśli to konto już wcześniej istniało — saldo nie zostanie dodane do tegomiesięcznego śledzenia oszczędności."
          />
          <Button onClick={() => handleAddSavings('savings_account')} className="w-full" disabled={!name.trim() || !currentAmount}>
            Dodaj konto
          </Button>
        </div>
      </Modal>

      {/* Add Emergency Fund Modal */}
      <Modal open={showModal === 'emergency_fund'} onClose={() => setShowModal(null)} title="Dodaj fundusz awaryjny">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Ikona</label>
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
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Nazwa</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="np. Fundusz awaryjny"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Obecne saldo</label>
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
            label="Zalicz saldo początkowe do tegomiesięcznych oszczędności"
            hint="Wyłącz, jeśli ten fundusz już wcześniej istniał — saldo nie zostanie dodane do tegomiesięcznego śledzenia oszczędności."
          />
          <Button onClick={() => handleAddSavings('emergency_fund')} className="w-full" disabled={!name.trim() || !currentAmount}>
            Dodaj fundusz awaryjny
          </Button>
        </div>
      </Modal>
    </div>
  )
}
