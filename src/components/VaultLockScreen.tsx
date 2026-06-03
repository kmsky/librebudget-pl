import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'
import { useWallet } from '../hooks/useWallet'
import { getPinLockoutStatus, PIN_MAX_ATTEMPTS } from '../hooks/useWallet'

export function VaultLockScreen() {
  const navigate = useNavigate()
  const { unlockWithPin, forgetPersistedVault } = useWallet()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lockout, setLockout] = useState(getPinLockoutStatus)

  // Refresh lockout status every second while locked out
  useEffect(() => {
    if (!lockout.isLockedOut) return
    const id = setInterval(() => {
      const status = getPinLockoutStatus()
      setLockout(status)
      if (!status.isLockedOut) setError(null)
    }, 1000)
    return () => clearInterval(id)
  }, [lockout.isLockedOut])

  const handleUnlock = useCallback(async () => {
    const status = getPinLockoutStatus()
    if (status.isLockedOut) return
    if (!pin.trim()) return
    setError(null)
    setLoading(true)
    try {
      const ok = await unlockWithPin(pin)
      if (!ok) {
        setPin('')
        const next = getPinLockoutStatus()
        setLockout(next)
        if (next.isPermanent) {
          setError(null) // permanent banner handles messaging
        } else if (next.isLockedOut) {
          setError(null) // countdown banner handles messaging
        } else {
          const remaining = PIN_MAX_ATTEMPTS - next.failCount
          setError(
            remaining <= 3
              ? `Nieprawidłowy PIN — ${remaining === 1 ? 'pozostała 1 próba' : `pozostały ${remaining} ${remaining < 5 ? 'próby' : 'prób'}`} przed zablokowaniem`
              : 'Nieprawidłowy PIN'
          )
        }
      }
    } finally {
      setLoading(false)
    }
  }, [pin, unlockWithPin])

  const plural = (n: number, one: string, few: string, many: string) => {
    const mod10 = n % 10
    const mod100 = n % 100
    if (n === 1) return one
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
    return many
  }

  const formatCountdown = (secs: number) => {
    if (secs >= 60) {
      const mins = Math.ceil(secs / 60)
      return `${mins} ${plural(mins, 'minuta', 'minuty', 'minut')}`
    }
    return `${secs} ${plural(secs, 'sekunda', 'sekundy', 'sekund')}`
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-3 ${lockout.isPermanent ? 'bg-red-600/15' : 'bg-green-600/15'}`}>
            <Icon
              name={lockout.isPermanent ? 'AlertTriangle' : 'Lock'}
              size={32}
              className={lockout.isPermanent ? 'text-red-400' : 'text-green-400'}
            />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-1">Odblokuj sejf</h2>
          <p className="text-sm text-slate-400">
            Wprowadź PIN, aby włączyć kopię zapasową w chmurze na tym urządzeniu
          </p>
        </div>

        {/* Permanent lockout */}
        {lockout.isPermanent ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-900/20 border border-red-800/50 p-4 text-center">
              <p className="text-sm font-medium text-red-300 mb-1">Sejf zablokowany na stałe</p>
              <p className="text-xs text-red-400/80">
                Zbyt wiele nieudanych prób wprowadzenia PIN-u ({PIN_MAX_ATTEMPTS}). Użyj frazy odzyskiwania, aby przywrócić dostęp.
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full"
              size="lg"
              onClick={() => { forgetPersistedVault(); navigate('/restore-wallet') }}
            >
              Przywróć za pomocą frazy odzyskiwania
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timed lockout banner */}
            {lockout.isLockedOut && (
              <div className="rounded-xl bg-amber-900/20 border border-amber-800/40 p-3 text-center">
                <p className="text-sm font-medium text-amber-300">Zbyt wiele nieudanych prób</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  Spróbuj ponownie za <span className="font-semibold tabular-nums">{formatCountdown(lockout.secondsRemaining)}</span>
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-slate-400">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                placeholder="Wprowadź swój PIN"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                disabled={loading || lockout.isLockedOut}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              className="w-full"
              size="lg"
              onClick={handleUnlock}
              disabled={!pin.trim() || loading || lockout.isLockedOut}
            >
              {loading ? 'Odblokowywanie…' : lockout.isLockedOut ? `Zablokowano — ${formatCountdown(lockout.secondsRemaining)}` : 'Odblokuj'}
            </Button>
          </div>
        )}

        {!lockout.isPermanent && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Nie pamiętasz PIN-u?{' '}
            <button
              type="button"
              onClick={() => { forgetPersistedVault(); navigate('/restore-wallet') }}
              className="text-green-400 hover:text-green-300"
            >
              Przywróć za pomocą frazy odzyskiwania
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
