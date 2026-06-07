import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Onboarding } from './components/Onboarding'
import { MonthlyAudit } from './components/MonthlyAudit'
import { useNotifications } from './hooks/useNotifications'
import Dashboard from './pages/Dashboard'
import AddTransaction from './pages/AddTransaction'
import Transactions from './pages/Transactions'
import Goals from './pages/Goals'
import Review from './pages/Review'
import Settings from './pages/Settings'
import Account from './pages/Account'
import GenerateWallet from './pages/GenerateWallet'
import RestoreWallet from './pages/RestoreWallet'
import Privacy from './pages/Privacy'
import PrivacyManifesto from './pages/PrivacyManifesto'
import Terms from './pages/Terms'
import Recurring from './pages/Recurring'
import SavingsGoals from './pages/SavingsGoals'
import DebtTracker from './pages/DebtTracker'
import Trends from './pages/Trends'
import YearReview from './pages/YearReview'

import FinancialOrder from './pages/FinancialOrder'
import Calculator from './pages/Calculator'
import ImpulseTracker from './pages/ImpulseTracker'

export default function App() {
  useNotifications()

  return (
    <>
      <Onboarding />
      <MonthlyAudit />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/roadmap" element={<FinancialOrder />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="/savings" element={<SavingsGoals />} />
          <Route path="/debts" element={<DebtTracker />} />
          <Route path="/impulse" element={<ImpulseTracker />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/review" element={<Review />} />
          <Route path="/year-review" element={<YearReview />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/account" element={<Account />} />
          <Route path="/generate-wallet" element={<GenerateWallet />} />
          <Route path="/restore-wallet" element={<RestoreWallet />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/privacy-manifesto" element={<PrivacyManifesto />} />
          <Route path="/terms" element={<Terms />} />
        </Route>
      </Routes>
    </>
  )
}
