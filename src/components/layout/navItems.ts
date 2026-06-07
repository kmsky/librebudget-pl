export interface NavItem {
  path: string
  icon: string
  label: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Przegląd',
    items: [
      { path: '/', icon: 'LayoutDashboard', label: 'Pulpit' },
      { path: '/add', icon: 'Plus', label: 'Dodaj transakcję' },
    ],
  },
  {
    label: 'Wydatki',
    items: [
      { path: '/goals', icon: 'DollarSign', label: 'Budżet' },
      { path: '/transactions', icon: 'List', label: 'Transakcje' },
      { path: '/debts', icon: 'TrendingDown', label: 'Długi' },
      { path: '/recurring', icon: 'Repeat', label: 'Cykliczne' },
      { path: '/impulse', icon: 'Timer', label: 'Kontrola impulsów' },
    ],
  },
  {
    label: 'Majątek',
    items: [
      { path: '/savings', icon: 'Building2', label: 'Oszczędności' },
      { path: '/calculator', icon: 'BarChart3', label: 'Kalkulatory' },
      { path: '/roadmap', icon: 'Map', label: 'Plan działania' },
    ],
  },
  {
    label: 'Analizy',
    items: [
      { path: '/trends', icon: 'TrendingUp', label: 'Trendy' },
      { path: '/review', icon: 'Calendar', label: 'Przegląd miesiąca' },
      { path: '/year-review', icon: 'Trophy', label: 'Podsumowanie roku' },
    ],
  },
  {
    label: 'Konto',
    items: [
      { path: '/settings', icon: 'Settings', label: 'Ustawienia' },
      { path: '/account', icon: 'User', label: 'Konto' },
    ],
  },
]

/** Flat list for BottomNav and other consumers */
export const navItems = navGroups.flatMap((g) => g.items)
