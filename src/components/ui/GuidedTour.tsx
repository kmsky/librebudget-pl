import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'

export interface TourStep {
  target: string
  title: string
  content: ReactNode
  /** If the target element doesn't exist (e.g. collapsed section), auto-skip */
  optional?: boolean
}

interface GuidedTourProps {
  steps: TourStep[]
  active: boolean
  onFinish: () => void
}

const PADDING = 10
const TOOLTIP_GAP = 12
const TOOLTIP_W = 340
const FADE_MS = 150
const BORDER_RADIUS = 16

export function GuidedTour({ steps, active, onFinish }: GuidedTourProps) {
  const [stepIdx, setStepIdx] = useState(0)
  const [mounted, setMounted] = useState(false)

  const tipRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<SVGRectElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const currentStep = steps[stepIdx] as TourStep | undefined

  const getTargetEl = useCallback(() => {
    if (!currentStep) return null
    return document.querySelector(currentStep.target) as HTMLElement | null
  }, [currentStep])

  // Position spotlight + tooltip to match the current target element
  const positionAll = useCallback(() => {
    const el = getTargetEl()
    const mask = maskRef.current
    const glow = glowRef.current
    const tip = tipRef.current
    if (!el || !mask || !glow) return

    const r = el.getBoundingClientRect()
    const spotLeft = r.left - PADDING
    const spotTop = r.top - PADDING
    const spotW = r.width + PADDING * 2
    const spotH = r.height + PADDING * 2

    mask.setAttribute('x', String(spotLeft))
    mask.setAttribute('y', String(spotTop))
    mask.setAttribute('width', String(spotW))
    mask.setAttribute('height', String(spotH))

    glow.style.left = `${spotLeft}px`
    glow.style.top = `${spotTop}px`
    glow.style.width = `${spotW}px`
    glow.style.height = `${spotH}px`

    if (tip) {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const effectiveW = Math.min(TOOLTIP_W, vw - 24)

      tip.style.width = `${effectiveW}px`
      const tipH = tip.scrollHeight

      const spotCX = r.left + r.width / 2
      let left = spotCX - effectiveW / 2
      if (left + effectiveW > vw - 12) left = vw - 12 - effectiveW
      if (left < 12) left = 12

      const spaceBelow = vh - (r.bottom + PADDING) - TOOLTIP_GAP
      let top: number
      if (spaceBelow >= tipH) {
        top = r.bottom + PADDING + TOOLTIP_GAP
      } else {
        top = r.top - PADDING - TOOLTIP_GAP - tipH
      }
      if (top + tipH > vh - 12) top = vh - 12 - tipH
      if (top < 12) top = 12

      tip.style.left = `${left}px`
      tip.style.top = `${top}px`
    }
  }, [getTargetEl])

  const positionRef = useRef(positionAll)
  positionRef.current = positionAll

  const startTracking = useCallback(() => {
    const loop = () => {
      positionRef.current()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const stopTracking = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  const hideTip = useCallback(() => {
    const tip = tipRef.current
    if (tip) {
      tip.style.transition = 'none'
      tip.style.opacity = '0'
    }
  }, [])

  const showTip = useCallback(() => {
    const tip = tipRef.current
    if (!tip) return
    tip.style.transition = `opacity ${FADE_MS}ms ease-out`
    tip.style.opacity = '1'
  }, [])

  // Scroll to the current step's target, then fade in the tooltip once scroll settles
  const scrollToStep = useCallback((skipScroll?: boolean) => {
    const el = getTargetEl()
    if (!el) {
      if (currentStep?.optional) {
        setStepIdx((i) => Math.min(i + 1, steps.length - 1))
      }
      return
    }

    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = undefined
    }

    positionAll()

    if (skipScroll) {
      showTip()
      return
    }

    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    const inView = rect.top >= 0 && rect.bottom <= vh

    if (inView) {
      showTip()
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      // Wait for scroll to settle, then reveal tooltip
      let lastTop = rect.top
      let stableFrames = 0
      const pollScroll = () => {
        const now = el.getBoundingClientRect().top
        if (Math.abs(now - lastTop) < 1) {
          stableFrames++
        } else {
          stableFrames = 0
        }
        lastTop = now
        if (stableFrames >= 3) {
          showTip()
        } else {
          scrollTimerRef.current = setTimeout(pollScroll, 50)
        }
      }
      scrollTimerRef.current = setTimeout(pollScroll, 80)
    }
  }, [getTargetEl, currentStep, steps.length, positionAll, showTip])

  // Seed spotlight on the first target before any animation
  const seedSpotlight = useCallback(() => {
    const first = steps[0]
    if (!first) return
    const el = document.querySelector(first.target) as HTMLElement | null
    if (!el) return
    const r = el.getBoundingClientRect()
    const mask = maskRef.current
    const glow = glowRef.current
    const sL = r.left - PADDING, sT = r.top - PADDING
    const sW = r.width + PADDING * 2, sH = r.height + PADDING * 2
    if (mask) {
      mask.setAttribute('x', String(sL))
      mask.setAttribute('y', String(sT))
      mask.setAttribute('width', String(sW))
      mask.setAttribute('height', String(sH))
    }
    if (glow) {
      glow.style.left = `${sL}px`
      glow.style.top = `${sT}px`
      glow.style.width = `${sW}px`
      glow.style.height = `${sH}px`
    }
  }, [steps])

  // Mount/unmount
  useEffect(() => {
    if (active) {
      setMounted(true)
      setStepIdx(0)
    } else {
      stopTracking()
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      setMounted(false)
    }
    return () => {
      stopTracking()
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Start RAF loop once mounted
  useEffect(() => {
    if (mounted && active) {
      seedSpotlight()
      startTracking()
      scrollToStep(true)
      return stopTracking
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Step changes
  useEffect(() => {
    if (mounted && active) {
      scrollToStep()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx])

  const advance = useCallback(() => {
    if (stepIdx >= steps.length - 1) {
      onFinish()
    } else {
      hideTip()
      setStepIdx((i) => i + 1)
    }
  }, [stepIdx, steps.length, onFinish, hideTip])

  const goBack = useCallback(() => {
    if (stepIdx > 0) {
      hideTip()
      setStepIdx((i) => i - 1)
    }
  }, [stepIdx, hideTip])

  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish()
      if (e.key === 'ArrowRight' || e.key === 'Enter') advance()
      if (e.key === 'ArrowLeft') goBack()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [active, advance, goBack, onFinish])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with spotlight cutout */}
      <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              ref={maskRef}
              x={0} y={0} width={0} height={0}
              rx={BORDER_RADIUS} ry={BORDER_RADIUS}
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#tour-mask)" />
      </svg>

      {/* Spotlight border glow */}
      <div
        ref={glowRef}
        className="fixed rounded-2xl border-2 border-green-400/50 shadow-[0_0_20px_rgba(74,222,128,0.15)]"
        style={{ left: 0, top: 0, width: 0, height: 0, pointerEvents: 'none' }}
      />

      {/* Click-through blocker */}
      <div className="fixed inset-0" onClick={advance} />

      {/* Tooltip */}
      <div
        ref={tipRef}
        className="fixed rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl z-[101]"
        style={{ position: 'fixed', width: TOOLTIP_W, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIdx ? 'w-6 bg-green-400' : i < stepIdx ? 'w-3 bg-green-400/40' : 'w-3 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <h3 className="text-sm font-semibold text-slate-100 mb-2">{currentStep?.title}</h3>
          <div className="text-sm text-slate-400 leading-relaxed">{currentStep?.content}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onFinish}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Pomiń samouczek
          </button>
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Wstecz
              </button>
            )}
            <button
              type="button"
              onClick={advance}
              className="rounded-lg bg-green-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-400 transition-colors"
            >
              {stepIdx >= steps.length - 1 ? 'Zakończ' : 'Dalej'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
