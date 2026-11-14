import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, CheckCircle2, RotateCcw, Volume2, VolumeX, XCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { sfx } from '../audio/sound'
import { useGame, type Screen } from '../game/store'

type Variant = 'primary' | 'ghost' | 'danger' | 'success' | 'amber'

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_24px_-4px_rgba(34,211,238,0.7)] hover:shadow-[0_0_32px_-2px_rgba(34,211,238,0.9)] hover:brightness-110',
  ghost: 'border border-cyan-300/25 text-cyan-100 hover:bg-cyan-400/10 hover:border-cyan-300/50',
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-display text-sm font-bold tracking-wider transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl ${className}`}>{children}</div>
}

export function ScreenWrap({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className={`mx-auto w-full px-4 pb-16 pt-20 sm:px-6 ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}
    >
      {children}
    </motion.main>
  )
}

export function StepTitle({ step, title, hint }: { step: string; title: string; hint: string }) {
  return (
    <div className="mb-6">
      <div className="hud-label">{step}</div>
      <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-cyan-100/80 sm:text-base">{hint}</p>
    </div>
  )
}

export function Meter({ label, value, display, max, warnAt, failAt, invert, icon }: {
  label: string; value: number; display: string; max: number; warnAt?: number; failAt?: number; invert?: boolean; icon?: ReactNode
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  let color = 'from-cyan-400 to-blue-500'
  if (invert) {
    if (failAt !== undefined && value > failAt) color = 'from-rose-500 to-red-500'
    else if (warnAt !== undefined && value > warnAt) color = 'from-amber-400 to-orange-500'
  } else {
    if (failAt !== undefined && value < failAt) color = 'from-rose-500 to-red-500'
    else if (warnAt !== undefined && value < warnAt) color = 'from-amber-400 to-orange-500'
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-300">{icon}{label}</span>
        <span className="font-display text-sm font-bold text-white tabular-nums">{display}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
        <motion.div className={`h-full rounded-full bg-gradient-to-r ${color}`} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
    </div>
  )
}

export function StatusIcon({ status, className = 'h-5 w-5' }: { status: 'pass' | 'warn' | 'fail'; className?: string }) {
  if (status === 'pass') return <CheckCircle2 className={`${className} text-emerald-400`} />
  if (status === 'warn') return <AlertTriangle className={`${className} text-amber-400`} />
  return <XCircle className={`${className} text-rose-400`} />
}

const backMap: Partial<Record<Screen, Screen>> = {
  briefing: 'welcome', design: 'briefing', readiness: 'design',
}

export function TopBar() {
  const { state, dispatch } = useGame()
  const back = backMap[state.screen]
  const lvl = state.catalog?.levels[String(state.level)]
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-cyan-300/10 bg-space-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
        {back ? (
          <button aria-label="Back" onClick={() => { sfx.click(); dispatch({ type: 'go', screen: back }) }}
            className="rounded-lg p-2 text-cyan-200 hover:bg-cyan-400/10"><ArrowLeft className="h-5 w-5" /></button>
        ) : <span className="w-9" />}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="font-display text-xs font-black tracking-widest text-cyan-300 glow-text sm:text-sm">AI COMMANDER</span>
          {state.screen !== 'welcome' && lvl && (
            <span className="hidden truncate rounded-full border border-cyan-300/20 px-2 py-0.5 text-[11px] text-cyan-100/80 sm:inline">
              Level {lvl.id} · {lvl.name}
            </span>
          )}
        </div>
        <button aria-label={state.sound ? 'Mute sound' : 'Enable sound'} onClick={() => dispatch({ type: 'toggleSound' })}
          className="rounded-lg p-2 text-cyan-200 hover:bg-cyan-400/10">
          {state.sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
        {state.screen !== 'welcome' && (
          <button aria-label="Restart mission" title="Restart mission"
            onClick={() => { if (confirm('Restart and return to the start screen? Current mission progress will be lost.')) { sfx.click(); dispatch({ type: 'reset' }) } }}
            className="rounded-lg p-2 text-cyan-200 hover:bg-cyan-400/10"><RotateCcw className="h-5 w-5" /></button>
        )}
      </div>
    </header>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Panel className="border-rose-400/30 p-5">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
        <div className="flex-1">
          <div className="font-semibold text-rose-200">Mission control error</div>
          <p className="mt-1 text-sm text-slate-300">{message}</p>
          {onRetry && <Button variant="ghost" className="mt-3 !py-2" onClick={onRetry}>Retry</Button>}
        </div>
      </div>
    </Panel>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-cyan-200">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
