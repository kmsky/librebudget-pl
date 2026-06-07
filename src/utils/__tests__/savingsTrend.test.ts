import { describe, it, expect } from 'vitest'
import { buildCumulativeSavings } from '../savingsTrend'

describe('buildCumulativeSavings', () => {
  it('accumulates monthly net savings into a running total', () => {
    const result = buildCumulativeSavings([
      { label: 'sty', netSavings: 100 },
      { label: 'lut', netSavings: 50 },
      { label: 'mar', netSavings: 200 },
    ])
    expect(result.map((p) => p.total)).toEqual([100, 150, 350])
    expect(result.map((p) => p.label)).toEqual(['sty', 'lut', 'mar'])
  })

  it('lets a withdrawal month (negative net) reduce the cumulative line', () => {
    const result = buildCumulativeSavings([
      { label: 'sty', netSavings: 100 },
      { label: 'lut', netSavings: -80 },
    ])
    expect(result.map((p) => p.total)).toEqual([100, 20])
  })

  it('returns an empty array for empty input', () => {
    expect(buildCumulativeSavings([])).toEqual([])
  })

  it('offsets every point by the starting total', () => {
    const result = buildCumulativeSavings(
      [
        { label: 'sty', netSavings: 100 },
        { label: 'lut', netSavings: 50 },
      ],
      1000,
    )
    expect(result.map((p) => p.total)).toEqual([1100, 1150])
  })

  it('rounds running totals to cents', () => {
    const result = buildCumulativeSavings([
      { label: 'sty', netSavings: 10.005 },
      { label: 'lut', netSavings: 0.001 },
    ])
    expect(result[0].total).toBe(10.01)
    expect(result[1].total).toBe(10.01)
  })
})
