export interface SavingsTrendPoint {
  label: string
  /** Cumulative savings total (zł) at the end of this month. */
  total: number
}

export interface MonthlyNetSavings {
  label: string
  /**
   * Net savings flow for the month — deposits minus withdrawals. This is the
   * `savings` figure from `groupByCategoryGroup`, which already subtracts
   * `savings_withdrawal` transactions, so it can be negative.
   */
  netSavings: number
}

/**
 * Builds a cumulative-savings line by running a sum over per-month net savings
 * flow. The trend reconstructs accumulated savings from the transaction log
 * (the app has no per-month balance history), so it is internally consistent
 * with the rest of LibreBudget's savings accounting.
 *
 * @param monthly  Per-month net savings, oldest first.
 * @param startingTotal  Optional seed for the running sum (default 0).
 */
export function buildCumulativeSavings(
  monthly: MonthlyNetSavings[],
  startingTotal = 0,
): SavingsTrendPoint[] {
  let running = startingTotal
  return monthly.map((m) => {
    running += m.netSavings
    return { label: m.label, total: Math.round(running * 100) / 100 }
  })
}
