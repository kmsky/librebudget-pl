import { db } from './database'
import type { Category, CategoryGroup, CooldownDuration, CreditScoreEntry, Debt, ImpulseInterrogationAnswers, ImpulseItem, ImpulseStatus, RecurrenceInterval, SavingsGoal, SavingsGoalType, TransactionType } from './database'
import { sanitizeAmount, sanitizeSignedAmount, sanitizeString } from '../utils/sanitize'

const VALID_GROUPS: CategoryGroup[] = ['needs', 'wants', 'savings', 'income']
const VALID_INTERVALS: RecurrenceInterval[] = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly']

export interface BackupPayload {
  categories: unknown[]
  transactions: unknown[]
  budgetGoals: unknown[]
  settings: unknown[]
  recurringTransactions?: unknown[]
  savingsGoals?: unknown[]
  debts?: unknown[]
  creditScores?: unknown[]
  impulseItems?: unknown[]
  version: number
  backedUpAt: string
}

/** localStorage keys to include in backup alongside IndexedDB settings */
const BACKUP_LOCAL_KEYS = ['lb-theme'] as const

export async function serializeDatabase(): Promise<BackupPayload> {
  const settings = await db.settings.toArray()

  // Inject localStorage-only preferences into settings for backup
  const settingKeys = new Set(settings.map((s) => s.key))
  for (const key of BACKUP_LOCAL_KEYS) {
    if (!settingKeys.has(key)) {
      const val = localStorage.getItem(key)
      if (val) settings.push({ key, value: val })
    }
  }

  return {
    categories: await db.categories.toArray(),
    transactions: await db.transactions.toArray(),
    budgetGoals: await db.budgetGoals.toArray(),
    settings,
    recurringTransactions: await db.recurringTransactions.toArray(),
    savingsGoals: await db.savingsGoals.toArray(),
    debts: await db.debts.toArray(),
    creditScores: await db.creditScores.toArray(),
    impulseItems: await db.impulseItems.toArray(),
    version: 3,
    backedUpAt: new Date().toISOString(),
  }
}

const MAX_ROWS_PER_TABLE = 50_000

export function validateBackupPayload(data: unknown): { valid: boolean; reason?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Payload is not an object' }
  }

  const p = data as Record<string, unknown>

  if (typeof p.version !== 'number' || p.version < 1 || p.version > 10) {
    return { valid: false, reason: `Invalid version: ${p.version}` }
  }
  if (typeof p.backedUpAt !== 'string' || isNaN(Date.parse(p.backedUpAt))) {
    return { valid: false, reason: 'Invalid or missing backedUpAt timestamp' }
  }

  const requiredArrays = ['categories', 'transactions', 'budgetGoals', 'settings']
  for (const key of requiredArrays) {
    if (!Array.isArray(p[key])) {
      return { valid: false, reason: `Missing or invalid table: ${key}` }
    }
    if ((p[key] as unknown[]).length > MAX_ROWS_PER_TABLE) {
      return { valid: false, reason: `Table "${key}" exceeds ${MAX_ROWS_PER_TABLE} row limit` }
    }
  }

  const optionalArrays = ['recurringTransactions', 'savingsGoals', 'debts', 'creditScores', 'impulseItems']
  for (const key of optionalArrays) {
    if (p[key] !== undefined && !Array.isArray(p[key])) {
      return { valid: false, reason: `Table "${key}" must be an array` }
    }
    if (Array.isArray(p[key]) && (p[key] as unknown[]).length > MAX_ROWS_PER_TABLE) {
      return { valid: false, reason: `Table "${key}" exceeds ${MAX_ROWS_PER_TABLE} row limit` }
    }
  }

  return { valid: true }
}

export async function hydrateDatabase(data: BackupPayload): Promise<void> {
  // Persist backup timestamp so the UI always shows when data was last backed up,
  // regardless of which restore path (RestoreWallet or restoreFromCloud) is used.
  if (data.backedUpAt) {
    localStorage.setItem('lb_last_backup_at', data.backedUpAt)
  }
  await db.transaction(
    'rw',
    [db.categories, db.transactions, db.budgetGoals, db.settings,
     db.recurringTransactions, db.savingsGoals, db.debts, db.creditScores, db.impulseItems],
    async () => {
      await db.categories.clear()
      await db.transactions.clear()
      await db.budgetGoals.clear()
      await db.settings.clear()
      await db.recurringTransactions.clear()
      await db.savingsGoals.clear()
      await db.debts.clear()
      await db.creditScores.clear()
      await db.impulseItems.clear()

      const categoryIdMap = new Map<number, number>() // oldId -> newId
      if (data.categories?.length) {
        const sorted = [...(data.categories as Record<string, unknown>[])].sort(
          (a, b) => (Number(a.id) || 0) - (Number(b.id) || 0)
        )
        for (const c of sorted) {
          const oldId = Number(c.id)
          const rest = c as Record<string, unknown>
          const group = VALID_GROUPS.includes(rest.group as CategoryGroup) ? (rest.group as CategoryGroup) : 'needs'
          const item: Omit<Category, 'id'> = {
            name: sanitizeString(String(rest.name ?? ''), 100),
            group,
            color: sanitizeString(String(rest.color ?? '#64748b'), 20),
            icon: sanitizeString(String(rest.icon ?? ''), 20),
            isPreset: Boolean(rest.isPreset),
          }
          const newId = await db.categories.add(item)
          if (Number.isFinite(oldId) && oldId > 0 && typeof newId === 'number') categoryIdMap.set(oldId, newId)
        }
      }
      const remapCategoryId = (oldId: number): number => {
        const mapped = categoryIdMap.get(oldId)
        if (mapped != null) return mapped
        const first = categoryIdMap.values().next().value
        return typeof first === 'number' ? first : 1
      }

      if (data.transactions?.length) {
        const validTypes: TransactionType[] = ['income', 'expense', 'savings_withdrawal']
        const sanitized = (data.transactions as Record<string, unknown>[]).map((t) => {
          const { id: _id, ...rest } = t
          const type = validTypes.includes(rest.type as TransactionType) ? (rest.type as TransactionType) : 'expense'
          const oldCategoryId = Number(rest.categoryId) || 1
          return {
            type,
            amount: sanitizeAmount(Number(rest.amount) || 0),
            categoryId: remapCategoryId(oldCategoryId),
            description: sanitizeString(String(rest.description ?? '')),
            note: sanitizeString(String(rest.note ?? '')),
            date: /^\d{4}-\d{2}-\d{2}$/.test(String(rest.date ?? '')) ? String(rest.date) : new Date().toISOString().split('T')[0],
            createdAt: typeof rest.createdAt === 'string' ? rest.createdAt : new Date().toISOString(),
          }
        })
        await db.transactions.bulkAdd(sanitized)
      }
      if (data.budgetGoals?.length) {
        const sanitized = (data.budgetGoals as Record<string, unknown>[]).map((g) => {
          const { id: _id, ...rest } = g
          const group = rest.group != null && VALID_GROUPS.includes(rest.group as CategoryGroup) ? (rest.group as CategoryGroup) : null
          const oldCategoryId = rest.categoryId != null ? Number(rest.categoryId) : null
          const categoryId = oldCategoryId != null && Number.isFinite(oldCategoryId) ? remapCategoryId(oldCategoryId) : null
          return {
            categoryId,
            monthlyLimit: sanitizeAmount(Number(rest.monthlyLimit) || 0),
            group,
            month: /^\d{4}-\d{2}$/.test(String(rest.month ?? '')) ? String(rest.month) : new Date().toISOString().slice(0, 7),
          }
        })
        await db.budgetGoals.bulkAdd(sanitized)
      }
      if (data.settings?.length) {
        const seen = new Set<string>()
        const sanitized: { key: string; value: string }[] = []
        const localKeysSet = new Set<string>(BACKUP_LOCAL_KEYS)
        for (const s of data.settings as Record<string, unknown>[]) {
          const key = sanitizeString(String(s.key ?? ''), 100)
          if (!key || seen.has(key)) continue
          seen.add(key)
          const value = sanitizeString(String(s.value ?? ''), 500)
          // Restore localStorage-only keys to localStorage instead of DB
          if (localKeysSet.has(key)) {
            localStorage.setItem(key, value)
            window.dispatchEvent(new CustomEvent('lb-localstorage-restored', { detail: { key, value } }))
            continue
          }
          sanitized.push({ key, value })
        }
        await db.settings.bulkAdd(sanitized)
      }
      if (data.recurringTransactions?.length) {
        const validTypes: TransactionType[] = ['income', 'expense', 'savings_withdrawal']
        const sanitized = (data.recurringTransactions as Record<string, unknown>[]).map((r) => {
          const { id: _id, ...rest } = r
          const type = validTypes.includes(rest.type as TransactionType) ? (rest.type as TransactionType) : 'expense'
          const interval = VALID_INTERVALS.includes(rest.interval as RecurrenceInterval) ? (rest.interval as RecurrenceInterval) : 'monthly'
          const oldCategoryId = Number(rest.categoryId) || 1
          const nextDue = /^\d{4}-\d{2}-\d{2}$/.test(String(rest.nextDue ?? '')) ? String(rest.nextDue) : new Date().toISOString().split('T')[0]
          const createdAt = typeof rest.createdAt === 'string' ? rest.createdAt : new Date().toISOString()
          return {
            type,
            amount: sanitizeAmount(Number(rest.amount) || 0),
            categoryId: remapCategoryId(oldCategoryId),
            description: sanitizeString(String(rest.description ?? '')),
            note: sanitizeString(String(rest.note ?? '')),
            interval,
            nextDue,
            enabled: Boolean(rest.enabled),
            createdAt,
          }
        })
        await db.recurringTransactions.bulkAdd(sanitized)
      }
      if (data.savingsGoals?.length) {
        const validTypes: SavingsGoalType[] = ['goal', 'savings_account', 'emergency_fund']
        const goals = (data.savingsGoals as Record<string, unknown>[]).map((g): Omit<SavingsGoal, 'id'> => {
          const { id: _id, type: rawType, ...rest } = g
          const type: SavingsGoalType = validTypes.includes(rawType as SavingsGoalType) ? (rawType as SavingsGoalType) : 'goal'
          const deadline = /^\d{4}-\d{2}(-\d{2})?$/.test(String(rest.deadline ?? '')) ? String(rest.deadline) : new Date().toISOString().split('T')[0]
          const createdAt = typeof rest.createdAt === 'string' ? rest.createdAt : new Date().toISOString()
          return {
            name: sanitizeString(String(rest.name ?? ''), 100),
            icon: sanitizeString(String(rest.icon ?? ''), 20),
            type,
            targetAmount: sanitizeAmount(Number(rest.targetAmount) || 0),
            currentAmount: sanitizeSignedAmount(Number(rest.currentAmount) || 0),
            deadline,
            createdAt,
          }
        })
        await db.savingsGoals.bulkAdd(goals)
      }
      if (data.debts?.length) {
        const sanitized = (data.debts as Record<string, unknown>[]).map((d): Omit<Debt, 'id'> => {
          const { id: _id, ...rest } = d
          const createdAt = typeof rest.createdAt === 'string' ? rest.createdAt : new Date().toISOString()
          return {
            name: sanitizeString(String(rest.name ?? ''), 100),
            icon: sanitizeString(String(rest.icon ?? ''), 20),
            balance: sanitizeAmount(Number(rest.balance) || 0),
            originalBalance: rest.originalBalance != null ? sanitizeAmount(Number(rest.originalBalance) || 0) : undefined,
            interestRate: sanitizeAmount(Number(rest.interestRate) || 0),
            minimumPayment: sanitizeAmount(Number(rest.minimumPayment) || 0),
            targetPayoffDate: typeof rest.targetPayoffDate === 'string' ? rest.targetPayoffDate : undefined,
            targetMonthlyPayment: rest.targetMonthlyPayment != null ? sanitizeAmount(Number(rest.targetMonthlyPayment) || 0) : undefined,
            dueDay: rest.dueDay != null ? Math.min(31, Math.max(1, Math.round(Number(rest.dueDay) || 1))) : undefined,
            notes: rest.notes != null ? sanitizeString(String(rest.notes)) : undefined,
            annualFee: rest.annualFee != null ? sanitizeAmount(Number(rest.annualFee) || 0) : undefined,
            createdAt,
          }
        })
        await db.debts.bulkAdd(sanitized)
      }
      if (data.creditScores?.length) {
        const sanitized = (data.creditScores as Record<string, unknown>[]).map((c): Omit<CreditScoreEntry, 'id'> => {
          const { id: _id, ...rest } = c
          const score = Math.min(850, Math.max(300, Math.round(Number(rest.score) || 0)))
          const date = /^\d{4}-\d{2}-\d{2}$/.test(String(rest.date ?? '')) ? String(rest.date) : new Date().toISOString().split('T')[0]
          const createdAt = typeof rest.createdAt === 'string' ? rest.createdAt : new Date().toISOString()
          return {
            score,
            source: sanitizeString(String(rest.source ?? ''), 100),
            date,
            createdAt,
          }
        })
        await db.creditScores.bulkAdd(sanitized)
      }
      if (data.impulseItems?.length) {
        const validStatuses: ImpulseStatus[] = ['waiting', 'bought', 'saved', 'archived']
        const validDurations: CooldownDuration[] = ['instant', '72h', '7d', '14d', '30d']
        const sanitized = (data.impulseItems as Record<string, unknown>[]).map((i): Omit<ImpulseItem, 'id'> => {
          const { id: _id, ...rest } = i
          const status = validStatuses.includes(rest.status as ImpulseStatus) ? (rest.status as ImpulseStatus) : 'waiting'
          const cooldownDuration = validDurations.includes(rest.cooldownDuration as CooldownDuration) ? (rest.cooldownDuration as CooldownDuration) : '72h'
          const createdAt = typeof rest.createdAt === 'string' ? rest.createdAt : new Date().toISOString()
          const cooldownEndsAt = typeof rest.cooldownEndsAt === 'string' ? rest.cooldownEndsAt : new Date().toISOString()
          const oldCategoryId = Number(rest.categoryId) || 1
          return {
            description: sanitizeString(String(rest.description ?? ''), 200),
            amount: sanitizeAmount(Number(rest.amount) || 0),
            categoryId: remapCategoryId(oldCategoryId),
            cooldownDuration,
            createdAt,
            cooldownEndsAt,
            status,
            resolvedAt: typeof rest.resolvedAt === 'string' ? rest.resolvedAt : undefined,
            previousStatus: rest.previousStatus === 'saved' || rest.previousStatus === 'bought' ? rest.previousStatus : undefined,
            lateNightAdded: rest.lateNightAdded === true ? true : undefined,
            interrogationAnswers: (() => {
              const a = rest.interrogationAnswers as Record<string, unknown> | undefined
              if (!a) return undefined
              const isReplacement = a.isReplacement === 'replacement' || a.isReplacement === 'new' ? a.isReplacement : undefined
              const canBorrow = a.canBorrow === 'yes' || a.canBorrow === 'no' || a.canBorrow === 'maybe' ? a.canBorrow : undefined
              const storageLocation = typeof a.storageLocation === 'string' ? sanitizeString(a.storageLocation, 300) : undefined
              if (!isReplacement || !canBorrow || storageLocation === undefined) return undefined
              return { isReplacement, canBorrow, storageLocation } satisfies ImpulseInterrogationAnswers
            })(),
          }
        })
        await db.impulseItems.bulkAdd(sanitized)
      }
    },
  )
}
