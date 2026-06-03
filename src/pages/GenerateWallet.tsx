import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { PinSetupModal } from '../components/PinSetupModal'
import { useWallet } from '../hooks/useWallet'
import type { WalletKeys } from '../hooks/useWallet'
import { generateWallet, deriveKeys, encryptBackup } from '../utils/crypto'
import { serializeDatabase } from '../db/backup'

const BACKUP_API_URL = import.meta.env.VITE_BACKUP_API_URL as string | undefined
const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ||
  (import.meta.env.DEV && BACKUP_API_URL ? '1x00000000000000000000AA' : undefined)

/** Production requires Turnstile when cloud backup is configured */
const TURNSTILE_REQUIRED = import.meta.env.PROD && !!BACKUP_API_URL

export default function GenerateWallet() {
  const navigate = useNavigate()
  const { setWallet, persistWithPin } = useWallet()
  const [mnemonic] = useState<string>(() => generateWallet())
  const [confirmed, setConfirmed] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [keysForPin, setKeysForPin] = useState<WalletKeys | null>(null)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Nie udało się skopiować do schowka')
    }
  }, [mnemonic])

  const handleConfirm = useCallback(async () => {
    if (!confirmed) return
    setError(null)
    setLoading(true)
    try {
      const { anonymousId, encryptionKey, writeToken } = await deriveKeys(mnemonic)
      if (BACKUP_API_URL && turnstileToken) {
        const payload = await serializeDatabase()
        const encrypted = await encryptBackup(JSON.stringify(payload), encryptionKey)
        const res = await fetch(`${BACKUP_API_URL}/backup/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Turnstile-Token': turnstileToken,
          },
          body: JSON.stringify({ id: anonymousId, payload: encrypted, writeToken }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string; hint?: string }
          const msg = body.error || 'Początkowa kopia zapasowa nie powiodła się'
          throw new Error(body.hint ? `${msg}. ${body.hint}` : msg)
        }
      }
      const keys = { anonymousId, encryptionKey, writeToken }
      setWallet(keys)
      setKeysForPin(keys)
      setShowPinModal(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nie udało się utworzyć sejfu'
      setError(msg === 'Failed to fetch'
        ? 'Nie udało się pobrać danych. Sprawdź połączenie. Jeśli używasz własnej domeny, dodaj ją do ALLOWED_ORIGINS Workera (SETUP.md).'
        : msg)
    } finally {
      setLoading(false)
    }
  }, [mnemonic, confirmed, turnstileToken, setWallet])

  const words = mnemonic.split(' ')

  if (TURNSTILE_REQUIRED && !TURNSTILE_SITE_KEY) {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Utwórz sejf</h1>
        <Card>
          <div className="py-6 text-center text-slate-400">
            <p className="font-medium text-amber-400">Kopia zapasowa w chmurze nie jest skonfigurowana dla środowiska produkcyjnego.</p>
            <p className="mt-2 text-sm">Należy ustawić VITE_TURNSTILE_SITE_KEY. Zobacz SETUP.md.</p>
            <Link to="/account" className="mt-4 inline-block text-sm text-green-400 hover:text-green-300">
              ← Powrót do konta
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Utwórz sejf</h1>
      <Card>
        <div className="space-y-4">
          <div className="text-center mb-4">
            <Icon name="Lock" size={48} className="text-green-400 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-slate-200">
              Zapisz swoją frazę odzyskiwania
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Zapisz te 12 słów i przechowuj je w bezpiecznym miejscu. To jedyny
              sposób na odzyskanie kopii zapasowej z chmury. Każdy, kto zna te
              słowa, może uzyskać dostęp do Twoich danych.
            </p>
          </div>

          <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 font-medium">
                Twoja 12-wyrazowa fraza odzyskiwania
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="shrink-0 gap-1.5 text-slate-400 hover:text-slate-200"
              >
                <Icon name="Copy" size={16} />
                {copied ? 'Skopiowano' : 'Kopiuj'}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm font-mono text-slate-200">
              {words.map((word, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-slate-500 w-5">{i + 1}.</span>
                  <span>{word}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-amber-900/20 border border-amber-800/40 p-3">
            <p className="text-xs text-amber-200">
              <strong>Nie polegaj na jednej kopii.</strong> Jeśli wklejasz frazę do
              menedżera haseł lub aplikacji do bezpiecznego przechowywania, zapisz ją
              również na papierze i przechowuj w bezpiecznym miejscu. Schowki mogą
              zostać wyczyszczone, a urządzenia mogą ulec awarii. Trzymaj kilka kopii
              w różnych miejscach.
            </p>
          </div>

          <p className="text-xs text-slate-500">
            Potrzebujesz bezpiecznego miejsca na przechowanie klucza? Polecamy{' '}
            <a
              href="https://bitwarden.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300"
            >
              Bitwarden
            </a>
            .
          </p>

          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-700 bg-slate-800/50 p-4 hover:border-slate-600 transition-colors">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">
              Zapisałem(-am) swoją frazę odzyskiwania i przechowuję ją w
              bezpiecznym miejscu. Rozumiem, że utrata tych słów oznacza brak
              możliwości odzyskania kopii zapasowej z chmury.
            </span>
          </label>

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

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!confirmed || (!!TURNSTILE_SITE_KEY && !turnstileToken) || loading}
            onClick={handleConfirm}
          >
            {loading ? 'Tworzenie...' : 'Przejdź do pulpitu'}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Ustaw PIN po utworzeniu, aby pozostać zalogowanym na tym urządzeniu.
          </p>

          <PinSetupModal
            open={showPinModal}
            onSetPin={async (pin) => {
              if (keysForPin) {
                await persistWithPin(keysForPin, pin)
                setShowPinModal(false)
                setKeysForPin(null)
                navigate('/', { replace: true })
              }
            }}
            onSkip={() => {
              setShowPinModal(false)
              setKeysForPin(null)
              navigate('/', { replace: true })
            }}
          />

          <p className="text-center">
            <Link to="/account" className="text-sm text-slate-500 hover:text-slate-300">
              ← Powrót do konta
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
