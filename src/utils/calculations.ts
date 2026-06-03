import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { db, type CategoryGroup, type Transaction, type TrackingPeriod } from '../db/database'

export function getCurrentPeriodRange(period: TrackingPeriod): { start: string; end: string } {
  const now = new Date()
  if (period === 'monthly') {
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
    }
  }
  return {
    start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export async function getTransactionsForPeriod(
  period: TrackingPeriod,
): Promise<Transaction[]> {
  const { start, end } = getCurrentPeriodRange(period)
  return db.transactions
    .where('date')
    .between(start, end, true, true)
    .toArray()
}

export async function getTransactionsForMonth(month: string): Promise<Transaction[]> {
  const start = `${month}-01`
  const endDate = format(endOfMonth(new Date(`${month}-01`)), 'yyyy-MM-dd')
  return db.transactions
    .where('date')
    .between(start, endDate, true, true)
    .toArray()
}

export function sumByType(transactions: Transaction[], type: 'income' | 'expense'): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0)
}

export function groupByCategory(
  transactions: Transaction[],
): Record<number, number> {
  const grouped: Record<number, number> = {}
  for (const t of transactions) {
    if (t.type === 'expense') {
      grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount
    }
  }
  return grouped
}

export async function groupByCategoryGroup(
  transactions: Transaction[],
): Promise<Record<CategoryGroup, number>> {
  const categories = await db.categories.toArray()
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const grouped: Record<CategoryGroup, number> = {
    needs: 0,
    wants: 0,
    savings: 0,
    income: 0,
  }

  for (const t of transactions) {
    const cat = catMap.get(t.categoryId)
    if (cat) {
      grouped[cat.group] += t.amount
    }
  }

  return grouped
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}
