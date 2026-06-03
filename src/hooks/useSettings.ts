import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

export function useSettings() {
  const settingsRaw = useLiveQuery(() => db.settings.toArray()) ?? []

  const settings = Object.fromEntries(
    settingsRaw.map((s) => [s.key, s.value]),
  ) as Record<string, string>

  const getSetting = (key: string, defaultValue = ''): string => {
    return settings[key] ?? defaultValue
  }

  const setSetting = async (key: string, value: string) => {
    const existing = await db.settings.where('key').equals(key).first()
    if (existing?.id) {
      return db.settings.update(existing.id, { value })
    }
    return db.settings.add({ key, value })
  }

  const monthlyBudget = parseFloat(settings['monthlyBudget'] ?? '6000')

  /** Returns the budget for a specific month (YYYY-MM), falling back to the global default. */
  const getMonthlyBudget = (month: string): number =>
    parseFloat(settings[`monthlyBudget-${month}`] ?? settings['monthlyBudget'] ?? '6000')

  /** Persists a budget for a specific month without touching the global default. */
  const setMonthlyBudget = (month: string, amount: number) =>
    setSetting(`monthlyBudget-${month}`, amount.toString())

  /** Removes the custom budget for a month so it falls back to the default. */
  const clearMonthlyBudgetOverride = async (month: string) => {
    const existing = await db.settings.where('key').equals(`monthlyBudget-${month}`).first()
    if (existing?.id) await db.settings.delete(existing.id)
  }

  const BLUEPRINTS_KEY = 'budgetBlueprints'
  type CustomBlueprint = { id: string; name: string; needs: number; wants: number; savings: number }
  const customBlueprints: CustomBlueprint[] = (() => {
    try {
      const raw = settings[BLUEPRINTS_KEY]
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown[]
      return (Array.isArray(parsed) ? parsed : []).filter((b: unknown): b is CustomBlueprint => {
        if (typeof b !== 'object' || b === null) return false
        const x = b as Record<string, unknown>
        return typeof x.id === 'string' && typeof x.name === 'string' &&
          typeof x.needs === 'number' && typeof x.wants === 'number' && typeof x.savings === 'number'
      })
    } catch {
      return []
    }
  })()

  const addCustomBlueprint = async (bp: CustomBlueprint) => {
    const next = [...customBlueprints.filter((b) => b.id !== bp.id), bp]
    await setSetting(BLUEPRINTS_KEY, JSON.stringify(next))
  }

  const deleteCustomBlueprint = async (id: string) => {
    const next = customBlueprints.filter((b) => b.id !== id)
    await setSetting(BLUEPRINTS_KEY, JSON.stringify(next))
  }

  const notificationsEnabled = settings['notificationsEnabled'] !== 'false'

  const reducedMotion = settings['reducedMotion'] === 'true'
  const strongFocusIndicators = settings['strongFocusIndicators'] === 'true'

  const fontScale = (settings['fontScale'] as 'normal' | 'large' | 'xlarge') ?? 'normal'

  return {
    settings,
    getSetting,
    setSetting,
    monthlyBudget,
    getMonthlyBudget,
    setMonthlyBudget,
    clearMonthlyBudgetOverride,
    customBlueprints,
    addCustomBlueprint,
    deleteCustomBlueprint,
    notificationsEnabled,
    reducedMotion,
    strongFocusIndicators,
    fontScale,
  }
}
