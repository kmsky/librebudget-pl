import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Turnstile } from '@marsidev/react-turnstile'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { AccountOnboarding } from '../components/AccountOnboarding'
import { useWallet } from '../hooks/useWallet'
import { useCloudBackup } from '../hooks/useCloudBackup'
import { Icon } from '../components/ui/Icon'

const BACKUP_API_URL = import.meta.env.VITE_BACKUP_API_URL as string | undefined
const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ||
  (import.meta.env.DEV && BACKUP_API_URL ? '1x00000000000000000000AA' : undefined)

/** Production requires Turnstile when cloud backup is configured */
const TURNSTILE_REQUIRED = import.meta.env.PROD && !!BACKUP_API_URL

export default function Account() {
  const { wallet, hasWallet, clearWallet } = useWallet()
  const {
    backupNow,
    restoreFromCloud,
    lastBackupAt,
    isBacking,
    isRestoring,
    error: backupError,
    enabled: backupEnabled,
    backupCooldown,
    isDeleting,
    deleteAccountData,
  } = useCloudBackup()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [lockConfirm, setLockConfirm] = useState(false)

  if (!BACKUP_API_URL) {
    return (
      <>
        <AccountOnboarding />
        <div className="space-y-6">
        <h1 className="text-2xl font-bold">Konto</h1>
        <Card>
          <div className="space-y-3 py-4 text-center">
            <Icon name="Cloud" size={48} className="text-slate-400 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-200">
              Kopia zapasowa w chmurze nie jest skonfigurowana
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Ustaw VITE_BACKUP_API_URL na adres swojego Cloudflare Workera, aby
              włączyć kopię zapasową w chmurze.
            </p>
            <p className="text-xs text-slate-500">
              Twoje dane są nadal bezpiecznie przechowywane lokalnie w przeglądarce.
            </p>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-400">
            Sejf (tylko lokalnie)
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Utwórz lub przywróć sejf, aby przygotować się do kopii zapasowej w
              chmurze. Fraza odzyskiwania daje Ci pełną kontrolę nad Twoimi
              zaszyfrowanymi danymi.
            </p>
            <div className="flex gap-3">
              <Link to="/generate-wallet" className="flex-1">
                <Button variant="secondary" className="w-full">
                  Utwórz sejf
                </Button>
              </Link>
              <Link to="/restore-wallet" className="flex-1">
                <Button variant="secondary" className="w-full">
                  Przywróć sejf
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
      </>
    )
  }

  if (!hasWallet) {
    return (
      <>
        <AccountOnboarding />
        <div className="space-y-6">
        <h1 className="text-2xl font-bold">Konto</h1>
        <Card className="max-w-md mx-auto">
          <div className="mb-5 text-center">
            <Icon name="Wallet" size={48} className="text-slate-400 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-slate-200">
              Kopia zapasowa w chmurze
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Utwórz sejf lub przywróć go z frazy odzyskiwania, aby włączyć
              zaszyfrowaną kopię zapasową w chmurze.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link to="/generate-wallet">
              <Button variant="primary" className="w-full" size="lg">
                Utwórz nowy sejf
              </Button>
            </Link>
            <Link to="/restore-wallet">
              <Button variant="secondary" className="w-full" size="lg">
                Przywróć z frazy odzyskiwania
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Twoje dane budżetowe pozostają lokalnie. Kopia zapasowa w chmurze jest
            opcjonalna i szyfrowana, zanim opuści Twoje urządzenie.
          </p>
        </Card>
      </div>
      </>
    )
  }

  return (
    <>
      <AccountOnboarding open={showTutorial} onClose={() => setShowTutorial(false)} />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Konto</h1>
          <button
            onClick={() => setShowTutorial(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            title="Zobacz samouczek konta"
          >
            <span className="text-sm font-bold">?</span>
          </button>
        </div>

        {/* Vault hero card */}
        <Card className="overflow-hidden !p-0">
          {/* Green accent header */}
          <div className="flex items-center gap-4 bg-green-600/10 border-b border-green-600/20 px-4 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600/20">
              <Icon name="Wallet" size={22} className="text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100">Sejf aktywny</span>
                <span className="flex items-center gap-1 rounded-full bg-green-600/20 px-2 py-0.5 text-xs font-medium text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  Odblokowany
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Kopia zapasowa w chmurze {backupEnabled ? 'włączona' : 'wyłączona'}
              </p>
            </div>
          </div>

          {/* Vault ID row */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 mb-0.5">Anonimowy identyfikator</p>
              <p className="font-mono text-xs text-slate-300 truncate">
                {wallet?.anonymousId?.slice(0, 24)}…
              </p>
            </div>
            <Icon name="Shield" size={16} className="shrink-0 text-slate-600" />
          </div>

          {/* Lock vault button */}
          {!lockConfirm ? (
            <button
              onClick={() => setLockConfirm(true)}
              className="tx-row flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-800"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                <Icon name="Lock" size={15} className="text-slate-400" />
              </div>
              <span className="flex-1 text-sm text-slate-300">Zablokuj sejf</span>
              <Icon name="ChevronRight" size={15} className="text-slate-600" />
            </button>
          ) : (
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm text-amber-400">Zablokowanie sejfu wyloguje Cię i wyczyści wszystkie dane na tym urządzeniu. Możesz go przywrócić w dowolnym momencie za pomocą frazy odzyskiwania.</p>
              {lastBackupAt && (
                <p className="text-xs text-slate-500">Ostatnia kopia zapasowa: {format(new Date(lastBackupAt), 'd MMM yyyy, HH:mm', { locale: pl })}</p>
              )}
              {!lastBackupAt && (
                <p className="text-xs text-red-400">Nie znaleziono kopii zapasowej w chmurze. Możesz utracić wszystkie dane.</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setLockConfirm(false)}
                  className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-slate-300 active:bg-slate-700"
                >Anuluj</button>
                <button
                  onClick={clearWallet}
                  className="flex-1 rounded-lg bg-red-600/20 py-2 text-sm font-medium text-red-400 active:bg-red-600/30"
                >Zablokuj i wymaż</button>
              </div>
            </div>
          )}
        </Card>

        {/* Cloud Backup card */}
        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-400">Kopia zapasowa w chmurze</h3>
          <div className="space-y-4">

            {/* Status pill */}
            <div className="flex items-center gap-3 rounded-xl bg-slate-800 px-3.5 py-3">
              <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${lastBackupAt ? 'bg-green-500' : 'bg-slate-600'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-200 truncate">
                  {lastBackupAt
                    ? `Utworzono kopię ${format(new Date(lastBackupAt), 'd MMM · HH:mm', { locale: pl })}`
                    : 'Brak kopii zapasowej'}
                </p>
                <p className="text-xs text-slate-500">Automatyczna synchronizacja po każdej zmianie</p>
              </div>
            </div>

            {backupError && (
              <div className="rounded-xl bg-red-900/20 border border-red-800 p-3 text-sm text-red-300">
                {backupError}
              </div>
            )}

            {TURNSTILE_REQUIRED && !TURNSTILE_SITE_KEY && (
              <div className="rounded-xl bg-amber-900/20 border border-amber-800/40 p-3 text-sm text-amber-200">
                Kopia zapasowa w chmurze wymaga ustawienia VITE_TURNSTILE_SITE_KEY w środowisku produkcyjnym. Zobacz SETUP.md.
              </div>
            )}
            {TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  options={{ theme: 'dark' }}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>
            )}

            {/* Action buttons — stacked for mobile */}
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => backupNow()}
                disabled={isBacking || backupCooldown > 0}
                className="w-full"
              >
                {isBacking ? 'Tworzenie kopii…' : backupCooldown > 0 ? `Poczekaj ${backupCooldown}s` : 'Utwórz kopię teraz'}
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  window.confirm(
                    'Spowoduje to zastąpienie wszystkich danych lokalnych kopią zapasową z chmury. Kontynuować?'
                  ) && restoreFromCloud(turnstileToken ?? undefined)
                }
                disabled={isRestoring || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                className="w-full"
              >
                {isRestoring ? 'Przywracanie…' : 'Przywróć z chmury'}
              </Button>
            </div>

            <p className="text-xs text-slate-500">
              Przywracanie pobiera najnowszą kopię zapasową z chmury do tej przeglądarki, zastępując dane lokalne.
            </p>

            {/* Danger zone */}
            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-3">
                Trwale usuń dane kopii zapasowej z chmury. Dane lokalne nie zostaną zmienione. Tej operacji nie można cofnąć.
              </p>
              {!showDeleteConfirm ? (
                <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  Usuń kopię zapasową z chmury
                </Button>
              ) : (
                <div className="space-y-3 rounded-xl bg-red-900/20 border border-red-800/50 p-3">
                  <p className="text-sm text-slate-300">
                    Wpisz <span className="font-mono font-bold text-red-400">DELETE</span>, aby potwierdzić:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                      onClick={async () => {
                        const { error: err } = await deleteAccountData()
                        if (!err) {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                        }
                      }}
                    >
                      {isDeleting ? 'Usuwanie…' : 'Usuń trwale'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                      }}
                    >
                      Anuluj
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* How it works */}
        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-400">Jak działa kopia zapasowa w chmurze</h3>
          <div className="space-y-3">
            {[
              { icon: 'HardDrive', text: 'Twoje dane są najpierw przechowywane lokalnie w tej przeglądarce' },
              { icon: 'Key', text: 'Z Twojej frazy odzyskiwania wyprowadzane są klucze szyfrujące — nigdy nie są udostępniane' },
              { icon: 'Lock', text: 'Dane są szyfrowane algorytmem AES-256-GCM, zanim opuszczą Twoje urządzenie' },
              { icon: 'RefreshCw', text: 'Na nowym urządzeniu przywrócisz dane za pomocą frazy odzyskiwania' },
              { icon: 'WifiOff', text: 'Aplikacja działa w pełni offline — chmura jest opcjonalna' },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-600/10">
                  <Icon name={icon} size={14} className="text-green-400" />
                </div>
                <p className="text-sm text-slate-400 leading-snug pt-0.5">{text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
