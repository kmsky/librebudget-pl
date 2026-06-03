import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CooldownDuration, type ImpulseInterrogationAnswers } from '../db/database'
import { sanitizeString, sanitizeAmount } from '../utils/sanitize'

const DURATION_MS: Record<CooldownDuration, number> = {
  'instant': 0,
  '72h': 72 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '14d': 14 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export const DURATION_LABELS: Record<CooldownDuration, string> = {
  'instant': 'Natychmiast',
  '72h': '72 godziny',
  '7d': '7 dni',
  '14d': '14 dni',
  '30d': '30 dni',
}

export function useImpulseCooldowns() {
  const allItems = useLiveQuery(() => db.impulseItems.toArray()) ?? []

  const waiting = allItems.filter((i) => i.status === 'waiting')
  const saved = allItems.filter((i) => i.status === 'saved')
  const bought = allItems.filter((i) => i.status === 'bought')
  const archived = allItems.filter((i) => i.status === 'archived')

  const totalSaved = saved.reduce((sum, i) => sum + i.amount, 0)

  const addImpulse = async (data: {
    description: string
    amount: number
    categoryId: number
    cooldownDuration: CooldownDuration
    interrogationAnswers?: ImpulseInterrogationAnswers
  }) => {
    const now = new Date()
    const hour = now.getHours()
    const lateNightAdded = hour >= 22 || hour < 4
    const extraMs = lateNightAdded ? 24 * 60 * 60 * 1000 : 0
    const endsAt = new Date(now.getTime() + DURATION_MS[data.cooldownDuration] + extraMs)
    return db.impulseItems.add({
      description: sanitizeString(data.description),
      amount: sanitizeAmount(data.amount),
      categoryId: data.categoryId,
      cooldownDuration: data.cooldownDuration,
      createdAt: now.toISOString(),
      cooldownEndsAt: endsAt.toISOString(),
      status: 'waiting',
      interrogationAnswers: data.interrogationAnswers,
      lateNightAdded,
    })
  }

  const markBought = async (id: number) => {
    return db.impulseItems.update(id, {
      status: 'bought' as const,
      resolvedAt: new Date().toISOString(),
    })
  }

  const markSaved = async (id: number) => {
    return db.impulseItems.update(id, {
      status: 'saved' as const,
      resolvedAt: new Date().toISOString(),
    })
  }

  const archiveImpulse = async (id: number) => {
    const item = allItems.find((i) => i.id === id)
    const previousStatus = item?.status === 'saved' || item?.status === 'bought' ? item.status : 'saved'
    return db.impulseItems.update(id, { status: 'archived' as const, previousStatus })
  }

  const unarchiveImpulse = async (id: number) => {
    const item = allItems.find((i) => i.id === id)
    const restoreTo = item?.previousStatus ?? 'saved'
    return db.impulseItems.update(id, { status: restoreTo })
  }

  const deleteImpulse = async (id: number) => {
    return db.impulseItems.delete(id)
  }

  return { allItems, waiting, saved, bought, archived, totalSaved, addImpulse, markBought, markSaved, archiveImpulse, unarchiveImpulse, deleteImpulse }
}
