import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { navGroups } from './navItems'
import { useCloudBackup } from '../../hooks/useCloudBackup'
import { Icon } from '../ui/Icon'
import { SyncModal } from '../SyncModal'
import logoSrc from '../../../img/192w.png'
import logoSrc512 from '../../../img/512w.png'

export function Sidebar() {
  const { backupNow, isBacking, backupCooldown, lastBackupAt, passphraseSet, enabled } = useCloudBackup()
  const [now, setNow] = useState(Date.now())
  const [syncOpen, setSyncOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const isStale = lastBackupAt && (now - new Date(lastBackupAt).getTime() > 5 * 60 * 1000)

  return (
    <>
    <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-800 bg-slate-900 md:flex md:flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-6 py-4">
        <img
          src={logoSrc}
          srcSet={`${logoSrc} 1x, ${logoSrc512} 2x`}
          alt="LibreBudget"
          className="app-logo h-9 w-9 shrink-0 rounded-lg object-contain"
        />
        <span className="text-lg font-bold text-slate-100">LibreBudget</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-4 text-[0.625rem] font-semibold uppercase tracking-widest text-slate-600">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-green-400'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`
                  }
                >
                  <Icon name={item.icon} size={20} className="shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-slate-800 p-4 space-y-2">
        {enabled && (
          <div className="space-y-1">
            <div className="flex gap-1.5">
              <button
                onClick={() => backupNow()}
                disabled={isBacking || backupCooldown > 0 || !passphraseSet}
                title={!passphraseSet ? 'Najpierw utwórz lub przywróć sejf w sekcji Konto' : undefined}
                className="flex-1 rounded-lg bg-slate-800 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isBacking
                  ? 'Tworzenie kopii...'
                  : !passphraseSet
                    ? 'Ustaw hasło'
                    : backupCooldown > 0
                      ? `Poczekaj ${backupCooldown}s`
                      : 'Utwórz kopię teraz'}
              </button>
              <button
                onClick={() => setSyncOpen(true)}
                disabled={!passphraseSet}
                title="Synchronizuj (przywróć) z kopii w chmurze"
                className="flex items-center justify-center rounded-lg bg-slate-800 px-2.5 py-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="RefreshCw" size={13} />
              </button>
            </div>
            <p className={`text-[0.625rem] text-center ${isStale ? 'text-red-400 font-medium' : 'text-slate-500'}`}>
              {!passphraseSet
                ? 'Wymagane szyfrowanie'
                : lastBackupAt
                  ? `Ostatnia kopia: ${formatDistanceToNow(new Date(lastBackupAt), { locale: pl, addSuffix: true })}`
                  : 'Brak kopii'}
            </p>
          </div>
        )}
        {enabled && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <p className="truncate text-xs text-slate-500">Sejf aktywny</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs text-slate-600">
          <NavLink to="/privacy" className="text-slate-500 hover:text-green-400">Prywatność</NavLink>
          <span>·</span>
          <NavLink to="/privacy-manifesto" className="text-slate-500 hover:text-green-400">Manifest</NavLink>
          <span>·</span>
          <NavLink to="/terms" className="text-slate-500 hover:text-green-400">Regulamin</NavLink>
        </div>
        <p className="text-xs text-slate-500">LibreBudget v1.1.2</p>
      </div>
    </aside>
    </>
  )
}
