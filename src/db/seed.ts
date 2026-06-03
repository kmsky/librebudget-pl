import { db, type Category } from './database'

const PRESET_CATEGORIES: Omit<Category, 'id'>[] = [
  // Needs (yellow)
  { name: 'Housing', group: 'needs', color: '#eab308', icon: 'Home', isPreset: true },
  { name: 'Utilities', group: 'needs', color: '#eab308', icon: 'Lightbulb', isPreset: true },
  { name: 'Groceries', group: 'needs', color: '#eab308', icon: 'ShoppingCart', isPreset: true },
  { name: 'Transportation', group: 'needs', color: '#eab308', icon: 'Car', isPreset: true },
  { name: 'Insurance', group: 'needs', color: '#eab308', icon: 'Shield', isPreset: true },
  { name: 'Healthcare', group: 'needs', color: '#eab308', icon: 'HeartPulse', isPreset: true },
  // Wants (orange)
  { name: 'Dining Out', group: 'wants', color: '#f97316', icon: 'UtensilsCrossed', isPreset: true },
  { name: 'Entertainment', group: 'wants', color: '#f97316', icon: 'Film', isPreset: true },
  { name: 'Shopping', group: 'wants', color: '#f97316', icon: 'ShoppingBag', isPreset: true },
  { name: 'Subscriptions', group: 'wants', color: '#f97316', icon: 'Smartphone', isPreset: true },
  { name: 'Travel', group: 'wants', color: '#f97316', icon: 'Plane', isPreset: true },
  { name: 'Hobbies', group: 'wants', color: '#f97316', icon: 'Palette', isPreset: true },
  // Savings (purple) — money kept/invested, not spent
  { name: 'Savings', group: 'savings', color: '#3b82f6', icon: 'Wallet', isPreset: true },
  { name: 'Retirement', group: 'savings', color: '#3b82f6', icon: 'Building2', isPreset: true },
  { name: 'Stocks', group: 'savings', color: '#3b82f6', icon: 'TrendingUp', isPreset: true },
  { name: 'Emergency Fund', group: 'savings', color: '#3b82f6', icon: 'LifeBuoy', isPreset: true },
  // Expenses that happen to build future value (still money out the door)
  { name: 'Education', group: 'needs', color: '#eab308', icon: 'GraduationCap', isPreset: true },
  { name: 'Debt Payoff', group: 'needs', color: '#eab308', icon: 'CreditCard', isPreset: true },
  { name: 'Fees', group: 'needs', color: '#eab308', icon: 'Receipt', isPreset: true },
  // Income (green)
  { name: 'Salary', group: 'income', color: '#22c55e', icon: 'Banknote', isPreset: true },
  { name: 'Freelance', group: 'income', color: '#22c55e', icon: 'Laptop', isPreset: true },
  { name: 'Side Hustle', group: 'income', color: '#22c55e', icon: 'Wrench', isPreset: true },
  { name: 'Dividends', group: 'income', color: '#22c55e', icon: 'BarChart3', isPreset: true },
  { name: 'Interest', group: 'income', color: '#22c55e', icon: 'Landmark', isPreset: true },
  { name: 'Gifts', group: 'income', color: '#22c55e', icon: 'Gift', isPreset: true },
  { name: 'Other Income', group: 'income', color: '#22c55e', icon: 'DollarSign', isPreset: true },
]

export async function seedDatabase() {
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd(PRESET_CATEGORIES)
  } else {
    const hasIncome = await db.categories.where('group').equals('income').count()
    if (hasIncome === 0) {
      const incomeCategories = PRESET_CATEGORIES.filter((c) => c.group === 'income')
      await db.categories.bulkAdd(incomeCategories)
    }

    // Add Fees category for existing users who don't have it yet
    const hasFees = await db.categories.where('name').equals('Fees').count()
    if (hasFees === 0) {
      await db.categories.add({ name: 'Fees', group: 'needs', color: '#eab308', icon: 'Receipt', isPreset: true })
    }
  }

  const settingsCount = await db.settings.count()
  if (settingsCount === 0) {
    await db.settings.bulkAdd([
      { key: 'notificationsEnabled', value: 'true' },
      { key: 'notificationTime', value: '20:00' },
      { key: 'monthlyBudget', value: '6000' },
    ])
  }
}
