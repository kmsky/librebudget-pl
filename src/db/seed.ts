import { db, type Category } from './database'

const PRESET_CATEGORIES: Omit<Category, 'id'>[] = [
  // Needs (yellow)
  { name: 'Mieszkanie', group: 'needs', color: '#eab308', icon: 'Home', isPreset: true },
  { name: 'Media', group: 'needs', color: '#eab308', icon: 'Lightbulb', isPreset: true },
  { name: 'Żywność', group: 'needs', color: '#eab308', icon: 'ShoppingCart', isPreset: true },
  { name: 'Transport', group: 'needs', color: '#eab308', icon: 'Car', isPreset: true },
  { name: 'Ubezpieczenia', group: 'needs', color: '#eab308', icon: 'Shield', isPreset: true },
  { name: 'Zdrowie', group: 'needs', color: '#eab308', icon: 'HeartPulse', isPreset: true },
  // Wants (orange)
  { name: 'Jedzenie na mieście', group: 'wants', color: '#f97316', icon: 'UtensilsCrossed', isPreset: true },
  { name: 'Rozrywka', group: 'wants', color: '#f97316', icon: 'Film', isPreset: true },
  { name: 'Zakupy', group: 'wants', color: '#f97316', icon: 'ShoppingBag', isPreset: true },
  { name: 'Subskrypcje', group: 'wants', color: '#f97316', icon: 'Smartphone', isPreset: true },
  { name: 'Podróże', group: 'wants', color: '#f97316', icon: 'Plane', isPreset: true },
  { name: 'Hobby', group: 'wants', color: '#f97316', icon: 'Palette', isPreset: true },
  // Savings (purple) — money kept/invested, not spent
  { name: 'Oszczędności', group: 'savings', color: '#3b82f6', icon: 'Wallet', isPreset: true },
  { name: 'Emerytura', group: 'savings', color: '#3b82f6', icon: 'Building2', isPreset: true },
  { name: 'Akcje', group: 'savings', color: '#3b82f6', icon: 'TrendingUp', isPreset: true },
  { name: 'Fundusz awaryjny', group: 'savings', color: '#3b82f6', icon: 'LifeBuoy', isPreset: true },
  // Expenses that happen to build future value (still money out the door)
  { name: 'Edukacja', group: 'needs', color: '#eab308', icon: 'GraduationCap', isPreset: true },
  { name: 'Spłata długów', group: 'needs', color: '#eab308', icon: 'CreditCard', isPreset: true },
  { name: 'Opłaty', group: 'needs', color: '#eab308', icon: 'Receipt', isPreset: true },
  // Income (green)
  { name: 'Wynagrodzenie', group: 'income', color: '#22c55e', icon: 'Banknote', isPreset: true },
  { name: 'Freelancing', group: 'income', color: '#22c55e', icon: 'Laptop', isPreset: true },
  { name: 'Dodatkowy zarobek', group: 'income', color: '#22c55e', icon: 'Wrench', isPreset: true },
  { name: 'Dywidendy', group: 'income', color: '#22c55e', icon: 'BarChart3', isPreset: true },
  { name: 'Odsetki', group: 'income', color: '#22c55e', icon: 'Landmark', isPreset: true },
  { name: 'Prezenty', group: 'income', color: '#22c55e', icon: 'Gift', isPreset: true },
  { name: 'Inne przychody', group: 'income', color: '#22c55e', icon: 'DollarSign', isPreset: true },
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
    const hasFees = await db.categories.where('name').equals('Opłaty').count()
    if (hasFees === 0) {
      await db.categories.add({ name: 'Opłaty', group: 'needs', color: '#eab308', icon: 'Receipt', isPreset: true })
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
