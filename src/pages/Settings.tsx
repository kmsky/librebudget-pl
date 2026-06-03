import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useSettings } from '../hooks/useSettings'
import { useCategories } from '../hooks/useCategories'
import { useTheme, THEMES } from '../hooks/useTheme'
import { db, ALL_GROUPS, type CategoryGroup } from '../db/database'
import { serializeDatabase, hydrateDatabase, type BackupPayload } from '../db/backup'
import { GROUP_COLORS, GROUP_LABELS, getCategoryIconClassName } from '../utils/colors'
import { useWallet } from '../hooks/useWallet'
import { useCloudBackup } from '../hooks/useCloudBackup'
import { exportTransactionsCSV, downloadCSV, exportTransactionsPDF } from '../utils/csvExport'
import {
  requestNotificationPermission,
  getNotificationPermission,
} from '../utils/notifications'
import { Icon, CATEGORY_ICONS } from '../components/ui/Icon'
import { Onboarding } from '../components/Onboarding'
import { AccountOnboarding } from '../components/AccountOnboarding'
import { MonthlyAudit } from '../components/MonthlyAudit'

export default function Settings() {
  const {
    notificationsEnabled,
    reducedMotion,
    strongFocusIndicators,
    fontScale,
    getSetting,
    setSetting,
    monthlyBudget,
  } = useSettings()
  const {
    categories,
    categoriesByGroup,
    addCategory,
    deleteCategory,
  } = useCategories()

  const { theme, setTheme } = useTheme()
  const [exportStatus, setExportStatus] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [showAppTour, setShowAppTour] = useState(false)
  const [showAccountTour, setShowAccountTour] = useState(false)
  const [showAuditTest, setShowAuditTest] = useState(false)
  const [showDevPasswordModal, setShowDevPasswordModal] = useState(false)
  const [devPassword, setDevPassword] = useState('')
  const [devPasswordError, setDevPasswordError] = useState('')
  const developerSettingsEnabled = getSetting('developerSettingsEnabled') === 'true'
  const [csvStatus, setCsvStatus] = useState('')
  const [permissionState, setPermissionState] = useState(
    getNotificationPermission(),
  )
  const { hasWallet } = useWallet()
  const { lastBackupAt, isBacking, enabled: backupEnabled } = useCloudBackup()
  const isCloudConfigured = !!import.meta.env.VITE_BACKUP_API_URL
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatGroup, setNewCatGroup] = useState<CategoryGroup>('needs')
  const [newCatIcon, setNewCatIcon] = useState('Wallet')
  const [catError, setCatError] = useState('')

  const handleExport = async () => {
    try {
      const data = await serializeDatabase()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `librebudget-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('Eksport zakończony pomyślnie!')
      setTimeout(() => setExportStatus(''), 3000)
    } catch {
      setExportStatus('Eksport nie powiódł się')
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (!data.version) {
          setImportStatus('Nieprawidłowy plik kopii zapasowej')
          return
        }

        await hydrateDatabase(data as BackupPayload)

        setImportStatus('Import zakończony pomyślnie! Odświeżanie...')
        setTimeout(() => window.location.reload(), 1500)
      } catch {
        setImportStatus('Nie udało się zaimportować danych')
      }
    }
    input.click()
  }

  const handleResetData = async () => {
    if (!window.confirm('Czy na pewno? Spowoduje to usunięcie WSZYSTKICH Twoich danych. Tej operacji nie można cofnąć.')) return

    await db.transaction('rw', [db.categories, db.transactions, db.budgetGoals, db.monthlySnapshots, db.settings, db.recurringTransactions, db.savingsGoals, db.debts, db.creditScores], async () => {
      await db.categories.clear()
      await db.transactions.clear()
      await db.budgetGoals.clear()
      await db.monthlySnapshots.clear()
      await db.settings.clear()
      await db.recurringTransactions.clear()
      await db.savingsGoals.clear()
      await db.debts.clear()
      await db.creditScores.clear()
    })
    window.location.reload()
  }

  const handleRequestPermission = async () => {
    await requestNotificationPermission()
    setPermissionState(getNotificationPermission())
  }

  const handleAddCategory = async () => {
    const trimmed = newCatName.trim()
    if (!trimmed) return
    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.group === newCatGroup,
    )
    if (exists) {
      setCatError('Kategoria o tej nazwie już istnieje w tej grupie')
      return
    }
    await addCategory({
      name: trimmed,
      group: newCatGroup,
      color: GROUP_COLORS[newCatGroup],
      icon: newCatIcon,
      isPreset: false,
    })
    setNewCatName('')
    setNewCatIcon('Wallet')
    setCatError('')
    setShowCatModal(false)
  }

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteCategory(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nie można usunąć kategorii')
    }
  }

  const handleCSVExport = async () => {
    try {
      const csv = await exportTransactionsCSV()
      downloadCSV(csv, `librebudget-transactions-${new Date().toISOString().split('T')[0]}.csv`)
      setCsvStatus('Wyeksportowano CSV!')
      setTimeout(() => setCsvStatus(''), 3000)
    } catch { setCsvStatus('Eksport nie powiódł się') }
  }

  const handlePDFExport = async () => {
    try {
      await exportTransactionsPDF()
    } catch { setCsvStatus('Eksport PDF nie powiódł się') }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ustawienia</h1>

      {/* Cloud Backup status */}
      {isCloudConfigured && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  backupEnabled
                    ? isBacking
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-green-500'
                    : 'bg-slate-600'
                }`}
              />
              <div>
                <h3 className="text-sm font-medium text-slate-200">
                  Kopia w chmurze
                </h3>
                <p className="text-xs text-slate-500">
                  {!hasWallet
                    ? 'Utwórz lub przywróć sejf, aby włączyć'
                    : isBacking
                      ? 'Synchronizowanie...'
                      : lastBackupAt
                        ? `Ostatnia kopia: ${new Date(lastBackupAt).toLocaleDateString('pl-PL')}`
                        : 'Brak kopii zapasowej'}
                </p>
              </div>
            </div>
            <a
              href="/account"
              className="text-xs font-medium text-green-400 hover:text-green-300"
            >
              {hasWallet ? 'Zarządzaj' : 'Skonfiguruj'}
            </a>
          </div>
        </Card>
      )}

      {/* Appearance */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-200">Wygląd</h3>
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map((t) => {
            const preview = {
              black:     { outer: 'bg-black', bar: 'bg-[#262626]', inner: 'border-[#1a1a1a] bg-[#0a0a0a]', content: 'bg-[#1a1a1a]', accent: 'bg-green-600/60' },
              dark:      { outer: 'bg-[#0a0a0a]', bar: 'bg-[#404040]', inner: 'border-[#262626] bg-[#171717]', content: 'bg-[#262626]', accent: 'bg-green-600/60' },
              developer: { outer: 'bg-[#1e1e1e]', bar: 'bg-[#454545]', inner: 'border-[#3c3c3c] bg-[#252526]', content: 'bg-[#454545]', accent: 'bg-[#007acc]/70' },
              monokai:   { outer: 'bg-[#282828]', bar: 'bg-[#505050]', inner: 'border-[#404040] bg-[#303030]', content: 'bg-[#505050]', accent: 'bg-[#a9dc76]/70' },
              obsidian:  { outer: 'bg-[#1e1e1e]', bar: 'bg-[#3f3f3f]', inner: 'border-[#363636] bg-[#242424]', content: 'bg-[#3f3f3f]', accent: 'bg-[#a882ff]/70' },
              ocean:     { outer: 'bg-[#0f172a]', bar: 'bg-[#475569]', inner: 'border-[#475569] bg-[#1e293b]', content: 'bg-[#475569]', accent: 'bg-cyan-500/50' },
              purple:    { outer: 'bg-[#1e1b4b]', bar: 'bg-[#6366f1]', inner: 'border-[#4338ca] bg-[#312e81]', content: 'bg-[#4338ca]/60', accent: 'bg-[#a78bfa]/70' },
              light:     { outer: 'bg-[#cbd5e1]', bar: 'bg-slate-400', inner: 'border-slate-400 bg-[#e2e8f0]', content: 'bg-slate-300', accent: 'bg-[#008526]/50' },
            }[t]
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                aria-pressed={theme === t}
                aria-label={`Motyw ${t}`}
                className={`overflow-hidden rounded-xl border-2 transition-colors ${
                  theme === t ? 'border-green-500 ring-2 ring-green-500/30' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className={`aspect-[5/3] flex flex-col p-1.5 ${preview.outer}`}>
                  <div className={`mb-1 h-1 w-6 rounded ${preview.bar}`} />
                  <div className={`flex-1 rounded border p-1.5 ${preview.inner}`}>
                    <div className={`mb-1 h-1.5 w-3/4 rounded ${preview.bar}`} />
                    <div className="space-y-0.5">
                      <div className={`h-1 rounded ${preview.content}`} />
                      <div className={`h-1 w-5/6 rounded ${preview.content}`} />
                    </div>
                    <div className="mt-1 flex gap-0.5">
                      <div className={`h-2.5 flex-1 rounded ${preview.content}`} />
                      <div className={`h-2.5 w-6 rounded ${preview.accent}`} />
                    </div>
                  </div>
                </div>
                <p className="py-1.5 text-center text-xs font-medium text-slate-400">{({ black: 'Czarny', dark: 'Ciemny', developer: 'Deweloperski', monokai: 'Monokai', obsidian: 'Obsydian', ocean: 'Ocean', purple: 'Fioletowy', light: 'Jasny' } as Record<string, string>)[t] ?? t.charAt(0).toUpperCase() + t.slice(1)}</p>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Accessibility */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">Dostępność</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200">Ogranicz animacje</p>
              <p className="text-xs text-slate-500">
                Wyłącz animacje i przejścia
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              aria-label="Ogranicz animacje"
              onClick={() => setSetting('reducedMotion', reducedMotion ? 'false' : 'true')}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${reducedMotion ? 'bg-green-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${reducedMotion ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200">Wyraźne wskaźniki fokusu</p>
              <p className="text-xs text-slate-500">
                Grubsze obramowania fokusu dla nawigacji klawiaturą
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={strongFocusIndicators}
              aria-label="Wyraźne wskaźniki fokusu"
              onClick={() => setSetting('strongFocusIndicators', strongFocusIndicators ? 'false' : 'true')}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${strongFocusIndicators ? 'bg-green-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${strongFocusIndicators ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div>
            <p className="mb-2 text-sm text-slate-200">Rozmiar czcionki</p>
            <p className="mb-2 text-xs text-slate-500">
              Skaluj tekst dla lepszej czytelności
            </p>
            <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
              {(['normal', 'large', 'xlarge'] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setSetting('fontScale', scale)}
                  aria-pressed={fontScale === scale}
                  aria-label={`Rozmiar czcionki: ${scale}`}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    fontScale === scale
                      ? 'bg-green-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {scale === 'normal' ? 'Normalny' : scale === 'large' ? 'Duży' : 'Większy'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Monthly budget */}
      <Card>
        <h3 className="mb-2 text-sm font-medium text-slate-400">
          Miesięczny cel budżetowy
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Twój domyślny limit wydatków (potrzeby + zachcianki). Zasila pasek kondycji na Pulpicie, pozostałe saldo
          oraz alerty o przekroczeniu budżetu.{' '}
          <Link to="/goals" className="text-green-400 hover:text-green-300">
            Ustaw lub nadpisz dla danego miesiąca w Budżecie
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setSetting('monthlyBudget', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-4 pr-10 text-slate-100 focus:border-green-500 focus:outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              zł
            </span>
          </div>
        </div>
      </Card>

      {/* Manage Categories */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400">
            Zarządzaj kategoriami
          </h3>
          <Button size="sm" onClick={() => setShowCatModal(true)}>
            + Nowa kategoria
          </Button>
        </div>
        <div className="space-y-4">
          {ALL_GROUPS.map((group) => {
            const cats = categoriesByGroup(group)
            if (cats.length === 0) return null
            return (
              <div key={group}>
                <p
                  className="mb-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: GROUP_COLORS[group] }}
                >
                  {GROUP_LABELS[group]}
                </p>
                <div className="space-y-1">
                  {cats.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-800/50"
                    >
                      <Icon name={cat.icon} size={18} className={getCategoryIconClassName(cat.group)} />
                      <span className="flex-1 text-sm text-slate-200">
                        {cat.name}
                      </span>
                      {cat.isPreset ? (
                        <span className="text-xs text-slate-600">Predefiniowana</span>
                      ) : (
                        <button
                          onClick={() => cat.id && handleDeleteCategory(cat.id)}
                          className="rounded p-1 text-slate-500 hover:bg-red-900/30 hover:text-red-400"
                          title="Usuń własną kategorię"
                          aria-label={`Usuń kategorię ${cat.name}`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Add Category Modal */}
      <Modal
        open={showCatModal}
        onClose={() => { setShowCatModal(false); setCatError('') }}
        title="Nowa własna kategoria"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Grupa</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setNewCatGroup(g)}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                    newCatGroup === g
                      ? 'border-transparent text-white'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  style={
                    newCatGroup === g
                      ? { backgroundColor: GROUP_COLORS[g] }
                      : undefined
                  }
                >
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Nazwa</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => { setNewCatName(e.target.value); setCatError('') }}
              placeholder="np. Opieka nad zwierzętami"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">Ikona</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewCatIcon(icon)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    newCatIcon === icon
                      ? 'bg-slate-700 ring-2 ring-green-500'
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon name={icon} size={18} className={newCatIcon === icon ? getCategoryIconClassName(newCatGroup) : ''} />
                </button>
              ))}
            </div>
          </div>

          {catError && (
            <p className="text-xs text-red-400">{catError}</p>
          )}

          <Button onClick={handleAddCategory} className="w-full" disabled={!newCatName.trim()}>
            Dodaj kategorię
          </Button>
        </div>
      </Modal>

      {/* Notifications */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">
          Powiadomienia
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200">Codzienne przypomnienia</p>
              <p className="text-xs text-slate-500">
                Otrzymuj przypomnienia o zapisywaniu wydatków
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              aria-label="Włącz codzienne powiadomienia przypominające"
              onClick={() =>
                setSetting(
                  'notificationsEnabled',
                  notificationsEnabled ? 'false' : 'true',
                )
              }
              className={`relative h-6 w-11 rounded-full transition-colors ${
                notificationsEnabled ? 'bg-green-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {notificationsEnabled && (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Godzina przypomnienia
                </label>
                <input
                  type="time"
                  value={getSetting('notificationTime', '20:00')}
                  onChange={(e) =>
                    setSetting('notificationTime', e.target.value)
                  }
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:border-green-500 focus:outline-none"
                />
              </div>

              {permissionState !== 'granted' && (
                <Button
                  variant="secondary"
                  onClick={handleRequestPermission}
                  size="sm"
                >
                  {permissionState === 'denied'
                    ? 'Powiadomienia zablokowane (sprawdź ustawienia przeglądarki)'
                    : 'Włącz powiadomienia przeglądarki'}
                </Button>
              )}

              {permissionState === 'granted' && (
                <p className="text-xs text-green-400">
                  Powiadomienia są włączone
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Data management */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">
          Zarządzanie danymi
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExport} className="flex-1">
              Eksport JSON
            </Button>
            <Button variant="secondary" onClick={handleImport} className="flex-1">
              Import JSON
            </Button>
          </div>
          <Button variant="secondary" onClick={handleCSVExport} className="w-full">
            Eksport CSV
          </Button>
          <Button variant="secondary" onClick={handlePDFExport} className="w-full">
            Drukuj / raport PDF
          </Button>
          {exportStatus && (
            <p className="text-xs text-green-400">{exportStatus}</p>
          )}
          {importStatus && (
            <p className="text-xs text-green-400">{importStatus}</p>
          )}
          {csvStatus && (
            <p className="text-xs text-green-400">{csvStatus}</p>
          )}
          <hr className="border-slate-800" />
          <Button variant="danger" onClick={handleResetData} className="w-full">
            Wyczyść wszystkie dane
          </Button>
          <p className="text-xs text-slate-500">
            Spowoduje to trwałe usunięcie wszystkich Twoich transakcji, celów i ustawień.
          </p>
        </div>
      </Card>

      {developerSettingsEnabled && (
        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-400">Deweloperskie / testowe</h3>
          <button
            onClick={() => setShowAuditTest(true)}
            className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-700 active:bg-slate-700 w-full"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600/15">
              <Icon name="ClipboardCheck" size={15} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Testuj miesięczny przegląd</p>
              <p className="text-xs text-slate-500">Wymuś otwarcie miesięcznego przeglądu</p>
            </div>
          </button>
        </Card>
      )}

      {showAuditTest && (
        <MonthlyAudit forceOpen onForceClose={() => setShowAuditTest(false)} />
      )}

      {/* About */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">O aplikacji</h3>
        <p className="text-sm text-slate-300">
          <strong>LibreBudget</strong> v1.1.2
        </p>
        <p className="mt-1 mb-4 text-xs text-slate-500">
          Darmowy budżet domowy o otwartym kodzie źródłowym.
        </p>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">Ustawienia deweloperskie</p>
            <p className="text-xs text-slate-500">Pokaż narzędzia testowe i diagnostyczne</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={developerSettingsEnabled}
            aria-label="Włącz ustawienia deweloperskie"
            onClick={() => {
              if (developerSettingsEnabled) {
                setSetting('developerSettingsEnabled', 'false')
              } else {
                setDevPassword('')
                setDevPasswordError('')
                setShowDevPasswordModal(true)
              }
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${developerSettingsEnabled ? 'bg-green-600' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${developerSettingsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowAppTour(true)}
            className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-700 active:bg-slate-700"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-600/15">
              <Icon name="Map" size={15} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Powtórz wprowadzenie do aplikacji</p>
              <p className="text-xs text-slate-500">Obejrzyj ponownie samouczek wprowadzający</p>
            </div>
          </button>
          <button
            onClick={() => setShowAccountTour(true)}
            className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-700 active:bg-slate-700"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/15">
              <Icon name="Cloud" size={15} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Powtórz wprowadzenie do konta i synchronizacji</p>
              <p className="text-xs text-slate-500">Dowiedz się o sejfach, kopii zapasowej i synchronizacji</p>
            </div>
          </button>
        </div>
      </Card>

      <Onboarding open={showAppTour} onClose={() => setShowAppTour(false)} />
      <AccountOnboarding open={showAccountTour} onClose={() => setShowAccountTour(false)} />

      <Modal
        open={showDevPasswordModal}
        onClose={() => {
          setShowDevPasswordModal(false)
          setDevPassword('')
          setDevPasswordError('')
        }}
        title="Włącz ustawienia deweloperskie"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Wprowadź hasło, aby włączyć narzędzia deweloperskie i testowe.
          </p>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Hasło</label>
            <input
              type="password"
              value={devPassword}
              onChange={(e) => {
                setDevPassword(e.target.value)
                setDevPasswordError('')
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  if (devPassword === 'eggs') {
                    await setSetting('developerSettingsEnabled', 'true')
                    setShowDevPasswordModal(false)
                    setDevPassword('')
                    setDevPasswordError('')
                  } else {
                    setDevPasswordError('Nieprawidłowe hasło')
                  }
                }
              }}
              placeholder="Wprowadź hasło"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
              autoFocus
            />
            {devPasswordError && (
              <p className="mt-1 text-xs text-red-400">{devPasswordError}</p>
            )}
          </div>
          <Button
            onClick={async () => {
              if (devPassword === 'eggs') {
                await setSetting('developerSettingsEnabled', 'true')
                setShowDevPasswordModal(false)
                setDevPassword('')
                setDevPasswordError('')
              } else {
                setDevPasswordError('Nieprawidłowe hasło')
              }
            }}
            className="w-full"
            disabled={!devPassword}
          >
            Włącz
          </Button>
        </div>
      </Modal>
    </div>
  )
}
