import { describe, it, expect } from 'vitest'
import type { BudgetGoal } from '../../db/database'
import {
  DEFAULT_SPLIT,
  getGroupAllocation,
  getBudgetStatusColor,
  getSavingsStatusColor,
  STATUS_GREEN,
  STATUS_RED,
} from '../budget'

function goal(group: 'needs' | 'wants' | 'savings', monthlyLimit: number): BudgetGoal {
  return { categoryId: null, group, monthlyLimit, month: '2026-06' }
}

describe('getGroupAllocation', () => {
  it('returns the saved group goal when present and positive', () => {
    const goals = [goal('needs', 2500), goal('wants', 900)]
    expect(getGroupAllocation('needs', goals, 6000)).toBe(2500)
    expect(getGroupAllocation('wants', goals, 6000)).toBe(900)
  })

  it('falls back to the default split when no goal exists for the group', () => {
    expect(getGroupAllocation('needs', [], 6000)).toBe(6000 * DEFAULT_SPLIT.needs)
    expect(getGroupAllocation('wants', [], 6000)).toBe(6000 * DEFAULT_SPLIT.wants)
    expect(getGroupAllocation('savings', [], 6000)).toBe(6000 * DEFAULT_SPLIT.savings)
  })

  it('treats a zero limit as absent and falls back to the split', () => {
    const goals = [goal('needs', 0)]
    expect(getGroupAllocation('needs', goals, 6000)).toBe(3000)
  })

  it('ignores category-level goals (categoryId set) and uses the group fallback', () => {
    const catGoal: BudgetGoal = { categoryId: 7, group: 'needs', monthlyLimit: 500, month: '2026-06' }
    expect(getGroupAllocation('needs', [catGoal], 6000)).toBe(3000)
  })

  it('rounds the fallback to cents', () => {
    expect(getGroupAllocation('wants', [], 1234.567)).toBe(370.37)
  })
})

describe('getBudgetStatusColor (spending groups)', () => {
  it('is green below the allocation', () => {
    expect(getBudgetStatusColor(0, 1000)).toBe(STATUS_GREEN)
    expect(getBudgetStatusColor(999.99, 1000)).toBe(STATUS_GREEN)
  })

  it('is green exactly at the allocation (boundary)', () => {
    expect(getBudgetStatusColor(1000, 1000)).toBe(STATUS_GREEN)
  })

  it('is red once exceeded', () => {
    expect(getBudgetStatusColor(1000.01, 1000)).toBe(STATUS_RED)
  })

  it('never returns a yellow/amber value', () => {
    const colors = [0, 600, 900, 1000, 1500].map((s) => getBudgetStatusColor(s, 1000))
    expect(colors.every((c) => c === STATUS_GREEN || c === STATUS_RED)).toBe(true)
  })
})

describe('getSavingsStatusColor (inverted)', () => {
  it('is red when under the plan', () => {
    expect(getSavingsStatusColor(500, 1000)).toBe(STATUS_RED)
  })

  it('is green when meeting the plan exactly', () => {
    expect(getSavingsStatusColor(1000, 1000)).toBe(STATUS_GREEN)
  })

  it('is green when exceeding the plan (saving more is good)', () => {
    expect(getSavingsStatusColor(1500, 1000)).toBe(STATUS_GREEN)
  })
})
