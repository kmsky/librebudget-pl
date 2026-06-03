import Dexie, { type EntityTable } from 'dexie'

export type CategoryGroup = 'needs' | 'wants' | 'savings' | 'income'

export const EXPENSE_GROUPS: CategoryGroup[] = ['needs', 'wants']
export const BUDGET_GROUPS: CategoryGroup[] = ['needs', 'wants', 'savings']
export const ALL_GROUPS: CategoryGroup[] = ['needs', 'wants', 'savings', 'income']
export type TransactionType = 'income' | 'expense' | 'savings_withdrawal'
export type TrackingPeriod = 'weekly' | 'monthly'
export type RecurrenceInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface Category {
  id?: number
  name: string
  group: CategoryGroup
  color: string
  icon: string
  isPreset: boolean
}

export interface Transaction {
  id?: number
  amount: number
  type: TransactionType
  categoryId: number
  description: string
  note: string
  date: string
  createdAt: string
}

export interface BudgetGoal {
  id?: number
  categoryId: number | null
  group: CategoryGroup | null
  monthlyLimit: number
  month: string
}

export interface MonthlySnapshot {
  id?: number
  month: string
  totalIncome: number
  totalExpenses: number
  categoryBreakdown: Record<string, number>
  groupBreakdown: Record<CategoryGroup, number>
  healthScore: number
}

export interface AppSettings {
  id?: number
  key: string
  value: string
}

export interface RecurringTransaction {
  id?: number
  amount: number
  type: TransactionType
  categoryId: number
  description: string
  note: string
  interval: RecurrenceInterval
  nextDue: string
  enabled: boolean
  createdAt: string
}

export type SavingsGoalType = 'goal' | 'savings_account' | 'emergency_fund'

export interface SavingsGoal {
  id?: number
  name: string
  icon: string
  type: SavingsGoalType
  targetAmount: number
  currentAmount: number
  deadline: string
  createdAt: string
}

export interface Debt {
  id?: number
  name: string
  icon: string
  balance: number
  /** Highest balance recorded (for progress bar). Set on create, updated if balance increases. */
  originalBalance?: number
  interestRate: number
  minimumPayment: number
  /** Target date to be debt-free (YYYY-MM or YYYY-MM-DD). Used to calc required payment. */
  targetPayoffDate?: string
  /** Target monthly payment. If set, overrides minimum for payoff schedule. */
  targetMonthlyPayment?: number
  /** Day of month payment is due (1–31). */
  dueDay?: number
  /** Optional notes. */
  notes?: string
  /** Annual fee for credit cards (shown when icon is CreditCard). */
  annualFee?: number
  createdAt: string
}

export interface CreditScoreEntry {
  id?: number
  score: number
  source: string
  date: string
  createdAt: string
}

export type CooldownDuration = 'instant' | '72h' | '7d' | '14d' | '30d'
export type ImpulseStatus = 'waiting' | 'bought' | 'saved' | 'archived'

export interface ImpulseInterrogationAnswers {
  isReplacement: 'replacement' | 'new'
  canBorrow: 'yes' | 'no' | 'maybe'
  storageLocation: string
}

export interface ImpulseItem {
  id?: number
  description: string
  amount: number
  categoryId: number
  cooldownDuration: CooldownDuration
  createdAt: string
  cooldownEndsAt: string
  status: ImpulseStatus
  resolvedAt?: string
  /** Status before archiving, so unarchive can restore it. */
  previousStatus?: 'bought' | 'saved'
  interrogationAnswers?: ImpulseInterrogationAnswers
  /** Whether 24h late-night friction was automatically added. */
  lateNightAdded?: boolean
}

export class LibreBudgetDB extends Dexie {
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  budgetGoals!: EntityTable<BudgetGoal, 'id'>
  monthlySnapshots!: EntityTable<MonthlySnapshot, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  recurringTransactions!: EntityTable<RecurringTransaction, 'id'>
  savingsGoals!: EntityTable<SavingsGoal, 'id'>
  debts!: EntityTable<Debt, 'id'>
  creditScores!: EntityTable<CreditScoreEntry, 'id'>
  impulseItems!: EntityTable<ImpulseItem, 'id'>

  constructor() {
    super('LibreBudgetDB')
    this.version(1).stores({
      categories: '++id, name, group, isPreset',
      transactions: '++id, type, categoryId, date, createdAt',
      budgetGoals: '++id, categoryId, group, month',
      monthlySnapshots: '++id, &month',
      settings: '++id, &key',
    })

    this.version(2).stores({
      categories: '++id, name, group, isPreset',
      transactions: '++id, type, categoryId, date, createdAt',
      budgetGoals: '++id, categoryId, group, month',
      monthlySnapshots: '++id, &month',
      settings: '++id, &key',
      recurringTransactions: '++id, interval, nextDue, enabled',
      savingsGoals: '++id, deadline',
      debts: '++id',
    }).upgrade((tx) => {
      return tx.table('transactions').toCollection().modify((t) => {
        if (t.note === undefined) t.note = ''
      })
    })

    this.version(3).stores({
      categories: '++id, name, group, isPreset',
      transactions: '++id, type, categoryId, date, createdAt',
      budgetGoals: '++id, categoryId, group, month',
      monthlySnapshots: '++id, &month',
      settings: '++id, &key',
      recurringTransactions: '++id, interval, nextDue, enabled',
      savingsGoals: '++id, deadline',
      debts: '++id',
      creditScores: '++id, date',
    })

    this.version(4).stores({
      savingsGoals: '++id, type, deadline',
    }).upgrade((tx) => {
      return tx.table('savingsGoals').toCollection().modify((g: { type?: string }) => {
        if (g.type === undefined) g.type = 'goal'
      })
    })

    // v5: rename 'investments' group to 'savings'; Education and Debt Payoff become 'needs'
    this.version(5).stores({}).upgrade((tx) => {
      const EXPENSE_NAMES = new Set(['Education', 'Debt Payoff'])
      return tx.table('categories').toCollection().modify((cat: { group: string; name: string; color: string }) => {
        if (cat.group === 'investments') {
          if (EXPENSE_NAMES.has(cat.name)) {
            cat.group = 'needs'
            cat.color = '#eab308'
          } else {
            cat.group = 'savings'
            cat.color = '#3b82f6'
          }
        }
      })
    })

    // v6: impulse buy cooldown tracker
    this.version(6).stores({
      impulseItems: '++id, status, cooldownEndsAt',
    })

    // v7: translate preset category names from English to Polish (PL fork).
    // Existing users' categories live in IndexedDB; renaming the seed alone only
    // affects fresh installs, so rename in-place here. Custom (non-preset)
    // categories are left untouched.
    this.version(7).stores({}).upgrade((tx) => {
      const RENAME_MAP: Record<string, string> = {
        Housing: 'Mieszkanie',
        Utilities: 'Media',
        Groceries: 'Żywność',
        Transportation: 'Transport',
        Insurance: 'Ubezpieczenia',
        Healthcare: 'Zdrowie',
        'Dining Out': 'Jedzenie na mieście',
        Entertainment: 'Rozrywka',
        Shopping: 'Zakupy',
        Subscriptions: 'Subskrypcje',
        Travel: 'Podróże',
        Hobbies: 'Hobby',
        Savings: 'Oszczędności',
        Retirement: 'Emerytura',
        Stocks: 'Akcje',
        'Emergency Fund': 'Fundusz awaryjny',
        Education: 'Edukacja',
        'Debt Payoff': 'Spłata długów',
        Fees: 'Opłaty',
        Salary: 'Wynagrodzenie',
        Freelance: 'Freelancing',
        'Side Hustle': 'Dodatkowy zarobek',
        Dividends: 'Dywidendy',
        Interest: 'Odsetki',
        Gifts: 'Prezenty',
        'Other Income': 'Inne przychody',
      }
      return tx.table('categories').toCollection().modify((cat: { name: string; isPreset?: boolean }) => {
        if (cat.isPreset && RENAME_MAP[cat.name]) {
          cat.name = RENAME_MAP[cat.name]
        }
      })
    })

    // v8: de-duplicate categories sharing a name. One-off self-heal: the v7
    // rename could collide with a seedDatabase top-up that had already inserted
    // "Opłaty" next to the to-be-renamed "Fees", leaving two identical names.
    // Keep the lowest-id category per name (it holds the transaction history),
    // repoint every reference to it, then delete the rest.
    this.version(8).stores({}).upgrade(async (tx) => {
      const categories = await tx.table('categories').toArray()
      const byName = new Map<string, { id: number }[]>()
      for (const cat of categories) {
        const list = byName.get(cat.name) ?? []
        list.push(cat)
        byName.set(cat.name, list)
      }

      const remap = new Map<number, number>() // duplicate id -> kept id
      const toDelete: number[] = []
      for (const list of byName.values()) {
        if (list.length < 2) continue
        list.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
        const keepId = list[0].id
        for (const dup of list.slice(1)) {
          remap.set(dup.id, keepId)
          toDelete.push(dup.id)
        }
      }
      if (remap.size === 0) return

      const repoint = (row: { categoryId?: number | null }) => {
        if (row.categoryId == null) return
        const k = remap.get(row.categoryId)
        if (k !== undefined) row.categoryId = k
      }
      await tx.table('transactions').toCollection().modify(repoint)
      await tx.table('budgetGoals').toCollection().modify(repoint)
      await tx.table('recurringTransactions').toCollection().modify(repoint)
      await tx.table('impulseItems').toCollection().modify(repoint)
      await tx.table('categories').bulkDelete(toDelete)
    })
  }
}

export const db = new LibreBudgetDB()
