import { useState, useRef, useEffect, useLayoutEffect, useCallback, type ReactNode } from 'react'

interface InfoTipProps {
  children: ReactNode
  className?: string
}

const MARGIN = 8
const TIP_WIDTH = 288
const GAP = 8
const HOVER_CLOSE_DELAY = 120
const ANIM_MS = 150

/**
 * Tooltip that works on hover (desktop) AND tap (mobile).
 * Hover opens/closes automatically; tap pins the tooltip open until
 * tapped again or dismissed. Uses fixed positioning with direct DOM
 * measurement and CSS transitions for smooth enter/exit animation.
 */
export function InfoTip({ children, className = '' }: InfoTipProps) {
  const [pinned, setPinned] = useState(false)
  const [hovering, setHovering] = useState(false)
  const open = pinned || hovering

  const [mounted, setMounted] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const exitTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const openedAbove = useRef(false)

  const cancelHoverClose = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current)
      hoverTimeout.current = undefined
    }
  }, [])

  const startHoverClose = useCallback(() => {
    cancelHoverClose()
    hoverTimeout.current = setTimeout(() => setHovering(false), HOVER_CLOSE_DELAY)
  }, [cancelHoverClose])

  const onTriggerEnter = useCallback(() => {
    cancelHoverClose()
    setHovering(true)
  }, [cancelHoverClose])

  const onTriggerLeave = useCallback(() => {
    startHoverClose()
  }, [startHoverClose])

  const onTipEnter = useCallback(() => {
    cancelHoverClose()
  }, [cancelHoverClose])

  const onTipLeave = useCallback(() => {
    startHoverClose()
  }, [startHoverClose])

  useEffect(() => () => cancelHoverClose(), [cancelHoverClose])

  const positionTip = useCallback((animate: boolean) => {
    const trigger = wrapRef.current
    const tip = tipRef.current
    if (!trigger || !tip) return

    const tr = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const effectiveW = Math.min(TIP_WIDTH, vw - MARGIN * 2)

    tip.style.width = `${effectiveW}px`
    const tipH = tip.scrollHeight

    let left = tr.left
    if (left + effectiveW > vw - MARGIN) left = vw - MARGIN - effectiveW
    if (left < MARGIN) left = MARGIN

    let top: number
    const spaceBelow = vh - tr.bottom - GAP
    const spaceAbove = tr.top - GAP
    let above = false

    if (spaceBelow >= tipH || spaceBelow >= spaceAbove) {
      top = tr.bottom + GAP
    } else {
      top = tr.top - GAP - tipH
      above = true
    }

    if (top + tipH > vh - MARGIN) top = vh - MARGIN - tipH
    if (top < MARGIN) top = MARGIN

    openedAbove.current = above

    tip.style.left = `${left}px`
    tip.style.top = `${top}px`
    tip.style.visibility = 'visible'

    if (animate) {
      const slideY = above ? '6px' : '-6px'
      tip.style.transition = 'none'
      tip.style.opacity = '0'
      tip.style.transform = `scale(0.95) translateY(${slideY})`
      void tip.offsetHeight
      tip.style.transition = `opacity ${ANIM_MS}ms cubic-bezier(.4,0,.2,1), transform ${ANIM_MS}ms cubic-bezier(.4,0,.2,1)`
      tip.style.opacity = '1'
      tip.style.transform = 'scale(1) translateY(0)'
    }
  }, [])

  useEffect(() => {
    if (open) {
      if (exitTimeout.current) {
        clearTimeout(exitTimeout.current)
        exitTimeout.current = undefined
      }
      setMounted(true)
    } else if (mounted) {
      const tip = tipRef.current
      if (tip) {
        const slideY = openedAbove.current ? '6px' : '-6px'
        tip.style.transition = `opacity ${ANIM_MS}ms cubic-bezier(.4,0,.2,1), transform ${ANIM_MS}ms cubic-bezier(.4,0,.2,1)`
        tip.style.opacity = '0'
        tip.style.transform = `scale(0.95) translateY(${slideY})`
      }
      exitTimeout.current = setTimeout(() => {
        setMounted(false)
        exitTimeout.current = undefined
      }, ANIM_MS)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => () => {
    if (exitTimeout.current) clearTimeout(exitTimeout.current)
  }, [])

  useLayoutEffect(() => {
    if (mounted && open) positionTip(true)
  }, [mounted, open, positionTip])

  useEffect(() => {
    if (!mounted) return
    const handler = () => positionTip(false)
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [mounted, positionTip])

  useEffect(() => {
    if (!mounted) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) &&
          tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setPinned(false)
        setHovering(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false)
        setHovering(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mounted])

  return (
    <div
      ref={wrapRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={onTriggerEnter}
      onMouseLeave={onTriggerLeave}
    >
      <button
        type="button"
        aria-label="Więcej informacji"
        onClick={(e) => { e.preventDefault(); setPinned((v) => !v) }}
        className="inline-flex cursor-help touch-manipulation"
      >
        <svg className="h-3.5 w-3.5 text-slate-500 opacity-60 hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
        </svg>
      </button>
      {mounted && (
        <div
          ref={tipRef}
          style={{ position: 'fixed', visibility: 'hidden' }}
          className="rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-lg z-50"
          onMouseEnter={onTipEnter}
          onMouseLeave={onTipLeave}
        >
          {children}
          <button
            type="button"
            onClick={() => { setPinned(false); setHovering(false) }}
            className="mt-2 text-[10px] text-slate-500 hover:text-slate-400 transition-colors sm:hidden"
          >
            Dotknij, aby zamknąć
          </button>
        </div>
      )}
    </div>
  )
}
