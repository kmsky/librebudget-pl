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
    label: 'Overview',
    items: [
      { path: '/', icon: 'LayoutDashboard', label: 'Dashboard' },
      { path: '/add', icon: 'Plus', label: 'Add Transaction' },
    ],
  },
  {
    label: 'Spending',
    items: [
      { path: '/goals', icon: 'DollarSign', label: 'Budget' },
      { path: '/transactions', icon: 'List', label: 'Transactions' },
      { path: '/debts', icon: 'TrendingDown', label: 'Debts' },
      { path: '/recurring', icon: 'Repeat', label: 'Recurring' },
      { path: '/impulse', icon: 'Timer', label: 'Impulse Control' },
    ],
  },
  {
    label: 'Wealth',
    items: [
      { path: '/savings', icon: 'Building2', label: 'Savings' },
      { path: '/calculator', icon: 'BarChart3', label: 'Calculators' },
      { path: '/roadmap', icon: 'Map', label: 'Roadmap' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: '/trends', icon: 'TrendingUp', label: 'Trends' },
      { path: '/review', icon: 'Calendar', label: 'Monthly Review' },
      { path: '/year-review', icon: 'Trophy', label: 'Year Review' },
      { path: '/resources', icon: 'BookOpen', label: 'Resources' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/settings', icon: 'Settings', label: 'Settings' },
      { path: '/account', icon: 'User', label: 'Account' },
    ],
  },
]

/** Flat list for BottomNav and other consumers */
export const navItems = navGroups.flatMap((g) => g.items)
