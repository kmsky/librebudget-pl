import { useState, useEffect, useRef } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'
import { useCloudBackup } from '../hooks/useCloudBackup'

const BACKUP_API_URL = import.meta.env.VITE_BACKUP_API_URL as string | undefined
const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ||
  (import.meta.env.DEV && BACKUP_API_URL ? '1x00000000000000000000AA' : undefined)
const TURNSTILE_REQUIRED = import.meta.env.PROD && !!BACKUP_API_URL

interface SyncModalProps {
  open: boolean
  onClose: () => void
}

export function SyncModal({ open, onClose }: SyncModalProps) {
  const { restoreFromCloud, isRestoring, error } = useCloudBackup()
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [succeeded, setSucceeded] = useState(false)
  const wasRestoringRef = useRef(false)

  // Detect restore completion
  useEffect(() => {
    if (isRestoring) {
      wasRestoringRef.current = true
    } else if (wasRestoringRef.current) {
      wasRestoringRef.current = false
      if (!error) {
        setSucceeded(true)
        setTimeout(() => window.location.reload(), 900)
      }
    }
  }, [isRestoring, error])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setTurnstileToken(null)
      setSucceeded(false)
    }
  }, [open])

  const needsTurnstile = TURNSTILE_REQUIRED && !!TURNSTILE_SITE_KEY
  const canSync = !isRestoring && !succeeded && (!needsTurnstile || !!turnstileToken)

  return (
    <Modal open={open} onClose={isRestoring ? () => {} : onClose} title="Synchronizuj z chmury">
      <div className="space-y-4">
        {succeeded ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600/20">
              <Icon name="Check" size={24} className="text-green-400" />
            </div>
            <p className="text-sm font-medium text-slate-200">Synchronizacja zakończona! Ponowne ładowanie…</p>
          </div>
        ) : (
          <>
            {/* Warning */}
            <div className="flex items-start gap-3 rounded-xl bg-amber-900/20 border border-amber-800/40 p-3">
              <Icon name="AlertTriangle" size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-200 leading-relaxed">
                Spowoduje to zastąpienie <strong>wszystkich danych lokalnych</strong> najnowszą kopią
                zapasową z chmury. Wszelkie niezsynchronizowane zmiany lokalne zostaną utracone.
              </p>
            </div>

            {/* Turnstile verification */}
            {TURNSTILE_REQUIRED && !TURNSTILE_SITE_KEY && (
              <div className="rounded-xl bg-red-900/20 border border-red-800/40 p-3 text-xs text-red-300">
                Synchronizacja z chmurą wymaga ustawienia VITE_TURNSTILE_SITE_KEY w środowisku produkcyjnym.
              </div>
            )}
            {TURNSTILE_SITE_KEY && (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">Ukończ weryfikację, aby kontynuować</p>
                <div className="flex justify-center">
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    options={{ theme: 'dark' }}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken(null)}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-900/20 border border-red-800 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1"
                disabled={!canSync}
                onClick={() => restoreFromCloud(turnstileToken ?? undefined)}
              >
                {isRestoring ? 'Synchronizowanie…' : 'Synchronizuj z chmury'}
              </Button>
              <Button variant="ghost" onClick={onClose} disabled={isRestoring}>
                Anuluj
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
