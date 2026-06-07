import type { BudgetGoal } from '../db/database'

/** Spending status colors. Binary only — no intermediate warning state. */
export const STATUS_GREEN = '#22c55e'
export const STATUS_RED = '#ef4444'

/**
 * Default 50/30/20 allocation split, mirroring the first entry of
 * BUDGET_BLUEPRINTS in Goals.tsx. Used as a fallback when a month has no
 * explicit per-group budget goal saved.
 */
export const DEFAULT_SPLIT: Record<'needs' | 'wants' | 'savings', number> = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
}

/**
 * The zł allocation for one budget group in a given month.
 *
 * Prefers an explicit `BudgetGoal` record (group-level, `categoryId === null`).
 * Falls back to `DEFAULT_SPLIT * monthlyBudget` when no goal exists for the
 * group or its limit is 0.
 */
export function getGroupAllocation(
  group: 'needs' | 'wants' | 'savings',
  goals: BudgetGoal[],
  monthlyBudget: number,
): number {
  const goal = goals.find((g) => g.group === group && g.categoryId == null)
  if (goal && goal.monthlyLimit > 0) return goal.monthlyLimit
  return Math.round(monthlyBudget * DEFAULT_SPLIT[group] * 100) / 100
}

/**
 * Binary budget status for SPENDING groups (needs/wants): green while within
 * the allocation, red once exceeded. Spending exactly at the allocation is
 * still "within" (green). There is intentionally no yellow/amber state.
 */
export function getBudgetStatusColor(spent: number, allocation: number): string {
  return spent > allocation ? STATUS_RED : STATUS_GREEN
}

/**
 * Binary status for the SAVINGS group, where the meaning is inverted: saving
 * at or above the planned amount is good (green); saving less is the problem
 * (red). Mirrors the `1 - ratio` inversion used on the Goals page.
 */
export function getSavingsStatusColor(saved: number, allocation: number): string {
  return saved >= allocation ? STATUS_GREEN : STATUS_RED
}
