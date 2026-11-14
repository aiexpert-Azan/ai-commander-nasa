import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, CircleHelp, Compass, Lightbulb, RotateCcw, Shield, Volume2, VolumeX, X, XCircle } from 'lucide-react'
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { sfx } from '../audio/sound'
import { useGame, type Screen } from '../game/store'
import { useTutorial } from './Tutorial'

type Variant = 'primary' | 'ghost' | 'danger' | 'success' | 'amber'

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_24px_-4px_rgba(34,211,238,0.7)] hover:shadow-[0_0_32px_-2px_rgba(34,211,238,0.9)] hover:brightness-110',
  ghost: 'border border-cyan-300/25 bg-space-950/50 text-cyan-100 hover:bg-cyan-400/10 hover:border-cyan-300/50',
  danger: 'bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:brightness-110',
  success: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_24px_-4px_rgba(16,185,129,0.7)] hover:brightness-110',
  amber: 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:brightness-110',
}

export function Button({ variant = 'primary', className = '', children, onClick, silent, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; silent?: boolean }) {
  return (
    <button
      {...rest}
      onClick={(e) => { if (!silent) sfx.click(); onClick?.(e) }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-center font-display text-sm font-bold tracking-wider transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Panel({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`glass rounded-2xl ${className}`}>{children}</div>
}

export function ScreenWrap({ children, wide = false, bottomBar = false }: { children: ReactNode; wide?: boolean; bottomBar?: boolean }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className={`safe-x mx-auto w-full pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-[calc(5rem+env(safe-area-inset-top))] ${bottomBar ? 'pb-40 lg:pb-16' : 'pb-[calc(4rem+env(safe-area-inset-bottom))]'} ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}
    >
      {children}
    </motion.main>
  )
}

export function StepTitle({ step, title, hint }: { step: string; title: string; hint: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="hud-label">{step}</div>
      <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-cyan-100/85 sm:text-base">{hint}</p>
    </div>
  )
}

const journey: { screen: Screen; label: string }[] = [
  { screen: 'briefing', label: 'Brief' },
  { screen: 'design', label: 'Build' },
  { screen: 'readiness', label: 'Check' },
  { screen: 'launch', label: 'Launch' },
  { screen: 'explore', label: 'Explore' },
  { screen: 'results', label: 'Results' },
]

/** Compact mission journey indicator shown at the top of every in-game screen. */
export function MissionProgress({ current }: { current: Screen }) {
  const idx = journey.findIndex((j) => j.screen === current)
  return (
    <nav aria-label="Mission progress" className="mb-4">
      <ol className="flex items-center gap-1">
        {journey.map((j, i) => {
          const done = i < idx
          const active = i === idx
          return (
            <li key={j.screen} className="flex min-w-0 flex-1 flex-col items-center gap-1" aria-current={active ? 'step' : undefined}>
              <div className={`h-1.5 w-full rounded-full ${done ? 'bg-emerald-400/80' : active ? 'bg-cyan-400' : 'bg-slate-700/70'}`} />
              <span className={`flex max-w-full items-center gap-0.5 truncate text-[9px] font-semibold uppercase tracking-normal min-[400px]:text-[10px] min-[400px]:tracking-wider sm:text-[11px] ${active ? 'text-cyan-200' : done ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                {done && <Check className="hidden h-3 w-3 sm:inline" aria-hidden />}{j.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Contextual lesson. Guided Explorer sees it as an open hint; Mission Commander gets a collapsed "Learn more".
 */
export function Hint({ children, title = 'Why it matters', forceOpen }: { children: ReactNode; title?: string; forceOpen?: boolean }) {
  const { state } = useGame()
  const guided = state.mode !== 'commander'
  const [open, setOpen] = useState(false)
  if (guided || forceOpen) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/5 p-3 text-sm text-cyan-50/90">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <div><span className="font-semibold text-amber-200">{title}: </span>{children}</div>
      </div>
    )
  }
  return (
    <div className="text-sm">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-cyan-300 hover:text-cyan-100">
        <Lightbulb className="h-4 w-4" aria-hidden /> Learn more <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && <p className="mt-1 rounded-xl bg-space-900/60 p-3 text-slate-300">{children}</p>}
    </div>
  )
}

export function Meter({ label, value, display, max, warnAt, failAt, invert, icon, sub, compact }: {
  label: string; value: number; display: string; max: number; warnAt?: number; failAt?: number; invert?: boolean; icon?: ReactNode; sub?: string; compact?: boolean
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  let level: 'ok' | 'warn' | 'fail' = 'ok'
  if (invert) {
    if (failAt !== undefined && value > failAt) level = 'fail'
    else if (warnAt !== undefined && value > warnAt) level = 'warn'
  } else {
    if (failAt !== undefined && value < failAt) level = 'fail'
    else if (warnAt !== undefined && value < warnAt) level = 'warn'
  }
  const color = level === 'fail' ? 'from-rose-500 to-red-500' : level === 'warn' ? 'from-amber-400 to-orange-500' : 'from-cyan-400 to-blue-500'
  return (
    <div>
      <div className={`mb-1 flex justify-between ${compact ? 'flex-wrap items-baseline gap-x-1.5' : 'items-center gap-2'}`}>
        <span className={`flex min-w-0 items-center gap-1.5 text-slate-200 ${compact ? 'text-[11px]' : 'text-xs'}`}>{icon}{label}
          {level === 'fail' && <span className="sr-only"> (problem)</span>}
        </span>
        <span className={`shrink-0 font-bold tabular-nums ${compact ? 'text-xs' : 'font-display text-sm'} ${level === 'fail' ? 'text-rose-300' : level === 'warn' ? 'text-amber-200' : 'text-white'}`}>{display}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
        <motion.div className={`h-full rounded-full bg-gradient-to-r ${color}`} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

export function StatusIcon({ status, className = 'h-5 w-5' }: { status: 'pass' | 'warn' | 'fail'; className?: string }) {
  if (status === 'pass') return <CheckCircle2 className={`${className} shrink-0 text-emerald-400`} aria-label="Passed" />
  if (status === 'warn') return <AlertTriangle className={`${className} shrink-0 text-amber-400`} aria-label="Warning" />
  return <XCircle className={`${className} shrink-0 text-rose-400`} aria-label="Problem" />
}

/** Accessible dialog: scrolls on short screens, respects safe areas, closes with Escape. */
export function Modal({ open, onClose, children, label, maxWidth = 'max-w-lg' }: {
  open: boolean; onClose?: () => void; children: ReactNode; label: string; maxWidth?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && onClose) onClose() }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus(), 50)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); document.body.style.overflow = ''; prev?.focus?.() }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/75 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={label}
            initial={{ y: 24, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()} className={`my-auto w-full ${maxWidth}`}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const backMap: Partial<Record<Screen, Screen>> = {
  briefing: 'welcome', design: 'briefing', readiness: 'design',
}

const iconBtn = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-cyan-200 hover:bg-cyan-400/10'

export function TopBar() {
  const { state, dispatch } = useGame()
  const { openTutorial } = useTutorial()
  const [confirmReset, setConfirmReset] = useState(false)
  const back = backMap[state.screen]
  const lvl = state.catalog?.levels[String(state.level)]
  const ModeIcon = state.mode === 'commander' ? Shield : Compass
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-cyan-300/10 bg-space-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="safe-x mx-auto flex h-14 max-w-7xl items-center gap-1 sm:gap-2">
        {back ? (
          <button aria-label="Back" onClick={() => { sfx.click(); dispatch({ type: 'go', screen: back }) }} className={`${iconBtn} -ml-2`}><ArrowLeft className="h-5 w-5" /></button>
        ) : <span className="w-1" />}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-display text-xs font-black tracking-widest text-cyan-300 glow-text sm:text-sm">AI COMMANDER</span>
          {state.screen !== 'welcome' && lvl && (
            <span className="hidden truncate rounded-full border border-cyan-300/20 px-2 py-0.5 text-[11px] text-cyan-100/80 md:inline">
              Level {lvl.id} · {lvl.name}
            </span>
          )}
        </div>
        {state.screen !== 'welcome' && state.mode && (
          <button onClick={() => { sfx.click(); dispatch({ type: 'setMode', mode: state.mode === 'guided' ? 'commander' : 'guided' }) }}
            aria-label={`Play style: ${state.mode === 'guided' ? 'Guided Explorer' : 'Mission Commander'}. Tap to switch.`}
            title="Switch play style"
            className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-400/10">
            <ModeIcon className="h-4 w-4 text-cyan-300" /><span className="hidden sm:inline">{state.mode === 'guided' ? 'Guided' : 'Commander'}</span>
          </button>
        )}
        <button aria-label="How to play" title="How to play" onClick={() => { sfx.click(); openTutorial() }} className={iconBtn}><CircleHelp className="h-5 w-5" /></button>
        <button aria-label={state.sound ? 'Mute sound' : 'Enable sound'} onClick={() => dispatch({ type: 'toggleSound' })} className={iconBtn}>
          {state.sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
        {state.screen !== 'welcome' && (
          <button aria-label="Restart mission" title="Restart mission" onClick={() => { sfx.click(); setConfirmReset(true) }} className={`${iconBtn} -mr-2`}>
            <RotateCcw className="h-5 w-5" />
          </button>
        )}
      </div>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} label="Restart mission">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-white">Restart mission?</h2>
            <button aria-label="Close" onClick={() => setConfirmReset(false)} className={`${iconBtn} -mr-2 -mt-2`}><X className="h-5 w-5" /></button>
          </div>
          <p className="mt-2 text-sm text-slate-300">You will return to the start screen. Your current mission progress will be lost, but unlocked levels are kept.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button variant="ghost" onClick={() => setConfirmReset(false)} data-autofocus>KEEP PLAYING</Button>
            <Button variant="danger" onClick={() => { setConfirmReset(false); dispatch({ type: 'reset' }) }}>RESTART</Button>
          </div>
        </Panel>
      </Modal>
    </header>
  )
}

export function ErrorBox({ message, onRetry, title = 'Something went wrong' }: { message: string; onRetry?: () => void; title?: string }) {
  return (
    <Panel className="border-rose-400/30 p-5">
      <div className="flex items-start gap-3" role="alert">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-rose-200">{title}</div>
          <p className="mt-1 break-words text-sm text-slate-300">{message}</p>
          {onRetry && <Button variant="ghost" className="mt-3 !py-2" onClick={onRetry}>TRY AGAIN</Button>}
        </div>
      </div>
    </Panel>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-cyan-200" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
