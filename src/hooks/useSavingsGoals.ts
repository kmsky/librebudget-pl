import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SavingsGoal, type SavingsGoalType } from '../db/database'
import { sanitizeString, sanitizeAmount } from '../utils/sanitize'

export function useSavingsGoals() {
  const goals = useLiveQuery(() => db.savingsGoals.toArray()) ?? []

  const goalsOnly = goals.filter((g) => g.type === 'goal')
  const savingsAccounts = goals.filter((g) => g.type === 'savings_account')
  const emergencyFunds = goals.filter((g) => g.type === 'emergency_fund')

  const addGoal = async (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    return db.savingsGoals.add({
      ...goal,
      name: sanitizeString(goal.name, 100),
      icon: sanitizeString(goal.icon ?? '', 20),
      targetAmount: sanitizeAmount(goal.targetAmount),
      currentAmount: sanitizeAmount(goal.currentAmount),
      createdAt: new Date().toISOString(),
    })
  }

  const addSavings = async (
    type: SavingsGoalType,
    data: { name: string; icon: string; currentAmount: number; targetAmount?: number; deadline?: string },
    affectsBudget = true,
  ) => {
    const deadline = data.deadline ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
    const targetAmount = sanitizeAmount(data.targetAmount ?? (type === 'goal' ? 0 : data.currentAmount))
    const sanitizedAmount = sanitizeAmount(data.currentAmount)
    const id = await db.savingsGoals.add({
      name: sanitizeString(data.name, 100),
      icon: sanitizeString(data.icon, 20),
      type,
      targetAmount,
      currentAmount: sanitizedAmount,
      deadline,
      createdAt: new Date().toISOString(),
    })

    if (affectsBudget && sanitizedAmount > 0) {
      const catName = type === 'emergency_fund' ? 'Fundusz awaryjny' : 'Oszczędności'
      const savingsCat = await db.categories.where('name').equals(catName).first()
        ?? (await db.categories.where('group').equals('savings').first())
      if (savingsCat?.id) {
        await db.transactions.add({
          amount: sanitizedAmount,
          type: 'expense',
          categoryId: savingsCat.id,
          description: `Saldo początkowe: ${sanitizeString(data.name, 100)}`,
          note: '',
          date: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
        })
      }
    }

    return id
  }

  const updateGoal = async (id: number, changes: Partial<SavingsGoal>) => {
    const sanitized: Partial<SavingsGoal> = { ...changes }
    if (changes.name !== undefined) sanitized.name = sanitizeString(changes.name, 100)
    if (changes.icon !== undefined) sanitized.icon = sanitizeString(changes.icon, 20)
    if (changes.targetAmount !== undefined) sanitized.targetAmount = sanitizeAmount(changes.targetAmount)
    if (changes.currentAmount !== undefined) sanitized.currentAmount = sanitizeAmount(changes.currentAmount)
    return db.savingsGoals.update(id, sanitized)
  }

  const deleteGoal = async (id: number) => {
    return db.savingsGoals.delete(id)
  }

  const addFunds = async (
    id: number,
    amount: number,
    affectsBudget = true,
    opts?: { date?: string; description?: string },
  ) => {
    const goal = await db.savingsGoals.get(id)
    if (goal) {
      const sanitizedAmount = sanitizeAmount(amount)
      await db.savingsGoals.update(id, {
        currentAmount: goal.currentAmount + sanitizedAmount,
      })

      if (affectsBudget) {
        const catName = goal.type === 'emergency_fund' ? 'Fundusz awaryjny' : 'Oszczędności'
        const savingsCat = await db.categories.where('name').equals(catName).first()
          ?? (await db.categories.where('group').equals('savings').first())
        if (savingsCat?.id) {
          const date = opts?.date ?? new Date().toISOString().slice(0, 10)
          const description = opts?.description ?? `Wpłata: ${goal.name}`
          await db.transactions.add({
            amount: sanitizedAmount,
            type: 'expense',
            categoryId: savingsCat.id,
            description,
            note: '',
            date,
            createdAt: new Date().toISOString(),
          })
        }
      }
    }
  }

  return {
    goals,
    goalsOnly,
    savingsAccounts,
    emergencyFunds,
    addGoal,
    addSavings,
    updateGoal,
    deleteGoal,
    addFunds,
  }
}
