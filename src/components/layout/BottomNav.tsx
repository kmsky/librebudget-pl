import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Menu, X, ChevronRight } from 'lucide-react'
import { navGroups, navItems } from './navItems'
import { useCloudBackup } from '../../hooks/useCloudBackup'
import { Icon } from '../ui/Icon'
import { SyncModal } from '../SyncModal'

const PRIMARY_PATHS = ['/', '/transactions', '/add', '/goals']
const PRIMARY_ITEMS = PRIMARY_PATHS.map((p) => navItems.find((n) => n.path === p)!)

const MORE_GROUPS = navGroups
  .map((g) => ({ ...g, items: g.items.filter((n) => !PRIMARY_PATHS.includes(n.path)) }))
  .filter((g) => g.items.length > 0)

const ALL_MORE_ITEMS = MORE_GROUPS.flatMap((g) => g.items)
const TOTAL_SLOTS = PRIMARY_ITEMS.length + 1
const SLOT_W = 100 / TOTAL_SLOTS

function pillPos(index: number) {
  return {
    left: `${index * SLOT_W}%`,
    right: `${(TOTAL_SLOTS - index - 1) * SLOT_W}%`,
  }
}

export function BottomNav() {
  const [open, setOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement>(null)
  const { backupNow, isBacking, backupCooldown, lastBackupAt, passphraseSet, enabled } = useCloudBackup()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const isMoreActive = ALL_MORE_ITEMS.some((item) => item.path === location.pathname)
  const isStale = lastBackupAt && (now - new Date(lastBackupAt).getTime() > 5 * 60 * 1000)

  const primaryActiveIndex = PRIMARY_ITEMS.findIndex((item) => item.path === location.pathname)
  const activeIndex = isMoreActive ? PRIMARY_ITEMS.length : primaryActiveIndex

  // Squash-and-stretch pill: animate left/right independently so the
  // leading edge moves first and the trailing edge follows with a delay.
  const prevIndexRef = useRef<number | null>(null)
  const initialPos = activeIndex >= 0 ? pillPos(activeIndex) : pillPos(0)
  const [pill, setPill] = useState({ ...initialPos, transition: 'none' })

  useEffect(() => {
    if (activeIndex < 0) return
    const prev = prevIndexRef.current
    prevIndexRef.current = activeIndex
    if (prev === null || prev === activeIndex) {
      // Snap on first render — no animation
      setPill({ ...pillPos(activeIndex), transition: 'none' })
      return
    }
    const pos = pillPos(activeIndex)
    if (activeIndex > prev) {
      // Moving right: right edge leads, left follows
      setPill({ ...pos, transition: 'right 180ms ease-out, left 240ms ease-out 60ms' })
    } else {
      // Moving left: left edge leads, right follows
      setPill({ ...pos, transition: 'left 180ms ease-out, right 240ms ease-out 60ms' })
    }
  }, [activeIndex])

  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={menuRef} className="md:hidden">
      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      {open && (
        <div
          className="fixed left-3 right-3 z-50 animate-slide-up overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60"
          style={{ bottom: 'calc(3.25rem + max(env(safe-area-inset-bottom), 0.75rem))' }}
        >
          <div className="p-2 space-y-1.5">
            {MORE_GROUPS.map((group, i) => (
              <div key={group.label}>
                {i > 0 && <div className="border-t border-slate-800 -mx-2 mb-1.5" />}
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 px-1 mb-1">
                  {group.label}
                </p>
                <div className="flex gap-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex flex-1 flex-col items-center gap-1 rounded-xl py-2 px-1 text-center transition-colors ${
                          isActive
                            ? 'bg-green-600/15 text-green-400'
                            : 'text-slate-400 active:bg-slate-800'
                        }`
                      }
                    >
                      <Icon name={item.icon} size={18} className="shrink-0" />
                      <span className="text-[9px] leading-tight whitespace-nowrap">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            {enabled && (
              <>
                <div className="border-t border-slate-800 -mx-2" />
                <div className="flex gap-1.5">
                  {/* Back Up Now */}
                  <button
                    onClick={() => backupNow()}
                    disabled={isBacking || backupCooldown > 0 || !passphraseSet}
                    className="flex flex-1 items-center gap-3 rounded-xl bg-slate-800 px-3 py-2.5 text-left transition-colors active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      !passphraseSet ? 'bg-slate-700' : isStale ? 'bg-amber-500/15' : 'bg-green-600/15'
                    }`}>
                      <Icon
                        name={isBacking ? 'RefreshCw' : !passphraseSet ? 'Lock' : 'CloudUpload'}
                        size={17}
                        className={`transition-colors ${
                          isBacking ? 'animate-spin text-green-400' : !passphraseSet ? 'text-slate-500' : isStale ? 'text-amber-400' : 'text-green-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold leading-tight text-slate-200">
                        {isBacking ? 'Tworzenie kopii…' : !passphraseSet ? 'Ustaw klucz szyfrowania' : backupCooldown > 0 ? `Poczekaj ${backupCooldown}s` : 'Utwórz kopię teraz'}
                      </p>
                      <p className={`mt-0.5 text-[10px] leading-tight truncate ${isStale ? 'text-amber-400/80' : 'text-slate-500'}`}>
                        {!passphraseSet
                          ? 'Wymagany klucz szyfrowania'
                          : lastBackupAt
                            ? formatDistanceToNow(new Date(lastBackupAt), { locale: pl, addSuffix: true })
                            : 'Brak kopii'}
                      </p>
                    </div>
                    {!isBacking && passphraseSet && backupCooldown === 0 && (
                      <ChevronRight size={14} className="shrink-0 text-slate-600" />
                    )}
                  </button>

                  {/* Sync from Cloud */}
                  <button
                    onClick={() => { setOpen(false); setSyncOpen(true) }}
                    disabled={!passphraseSet}
                    title="Synchronizuj (przywróć) z kopii w chmurze"
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-800 px-5 py-2.5 transition-colors active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="CloudDownload" size={17} className="text-blue-400" />
                    <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap">Synchronizacja</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 px-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <div className="relative flex items-center overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-md shadow-xl shadow-black/50">
          {/* Squash-and-stretch active cell */}
          {activeIndex >= 0 && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 bg-green-500/10"
              style={{
                left: pill.left,
                right: pill.right,
                transition: pill.transition,
              }}
            />
          )}

          {PRIMARY_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center justify-center py-3 transition-colors ${
                  isActive ? 'text-green-400' : 'text-slate-500 active:text-slate-300'
                }`
              }
            >
              <Icon name={item.icon} size={22} className="shrink-0" />
            </NavLink>
          ))}

          <button
            onClick={() => setOpen((prev) => !prev)}
            className={`relative flex flex-1 flex-col items-center justify-center py-3 transition-colors ${
              open || isMoreActive ? 'text-green-400' : 'text-slate-500 active:text-slate-300'
            }`}
          >
            {open ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
          </button>
        </div>
      </nav>
    </div>
  )
}
