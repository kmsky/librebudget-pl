import type { CategoryGroup } from '../db/database'

export const GROUP_COLORS: Record<CategoryGroup, string> = {
  needs: '#eab308',
  wants: '#f97316',
  savings: '#3b82f6',
  income: '#22c55e',
}

/** CSS class for category icons - use group color (dark theme default, light overrides in CSS) */
export function getCategoryIconClassName(group: CategoryGroup): string {
  return `category-icon-${group}`
}

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  needs: 'Potrzeby',
  wants: 'Zachcianki',
  savings: 'Oszczędności',
  income: 'Przychód',
}

export function getHealthBarColor(ratio: number, theme?: string): string {
  if (ratio <= 0.5) return theme === 'light' ? '#008526' : '#22c55e'
  if (ratio <= 0.75) return '#eab308'
  if (ratio <= 0.9) return '#f97316'
  return '#ef4444'
}

export function getHealthBarGradient(ratio: number): string {
  if (ratio <= 0.5) return 'from-green-500 to-green-400'
  if (ratio <= 0.75) return 'from-green-500 via-yellow-500 to-yellow-400'
  if (ratio <= 0.9) return 'from-yellow-500 via-orange-500 to-orange-400'
  return 'from-orange-500 via-red-500 to-red-400'
}
