import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, FastForward, Loader2, PartyPopper } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api, type LaunchResult } from '../api/client'
import { sfx } from '../audio/sound'
import { SpacecraftPreview } from '../components/SpacecraftPreview'
import { Button, ErrorBox, MissionProgress, Panel, ScreenWrap, StepTitle } from '../components/ui'
import { useGame } from '../game/store'

const STEP_MS = 1300

// Simple, kid-friendly status line for each phase of the (seeded) launch simulation.
const plainPhase: Record<string, string> = {
  Countdown: 'Final checks complete…',
  Liftoff: 'Liftoff! Engines at full power.',
  'Orbit insertion': 'Reaching orbit…',
  'Telescope deployment': 'Opening the telescope…',
  'Solar panel activation': 'Unfolding solar panels…',
  'Communications link': 'Calling home to Earth…',
  'Operations ready': 'Spacecraft ready for science!',
}

function Rocket({ heavy }: { heavy: number }) {
  const w = 22 + heavy * 6
  return (
    <svg viewBox="0 0 100 200" className="h-56 w-auto" aria-hidden>
      <path d={`M50 8 C ${50 + w / 2} 30 ${50 + w / 2} 50 ${50 + w / 2} 70 L ${50 + w / 2} 160 L ${50 - w / 2} 160 L ${50 - w / 2} 70 C ${50 - w / 2} 50 ${50 - w / 2} 30 50 8Z`} fill="#e2e8f0" />
      <rect x={50 - w / 2} y={60} width={w} height={8} fill="#0ea5e9" />
      <path d={`M${50 - w / 2} 130 L ${50 - w / 2 - 14} 165 L ${50 - w / 2} 160Z M${50 + w / 2} 130 L ${50 + w / 2 + 14} 165 L ${50 + w / 2} 160Z`} fill="#94a3b8" />
      {heavy >= 2 && <><rect x={50 - w / 2 - 12} y={90} width={10} height={70} rx={5} fill="#cbd5e1" /><rect x={50 + w / 2 + 2} y={90} width={10} height={70} rx={5} fill="#cbd5e1" /></>}
      <circle cx={50} cy={95} r={5} fill="#1e3a8a" stroke="#93c5fd" />
    </svg>
  )
}

export function LaunchScreen() {
  const { state, dispatch } = useGame()
  const [result, setResult] = useState<LaunchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(3)
  const [step, setStep] = useState(-1) // -1 = countdown; then index into events
  const started = useRef(false)
  // Reduced motion: same seeded events, shown at a faster pace without the big movement.
  const reduce = useReducedMotion()
  const stepMs = reduce ? 500 : STEP_MS
  const countMs = reduce ? 400 : 800

  const run = () => {
    setError(null)
    api.launch(state.design, state.level, state.seed)
      .then((r) => { setResult(r); dispatch({ type: 'launched', launch: r }) })
      .catch((e: Error) => setError(e.message))
  }
  useEffect(() => { if (!started.current) { started.current = true; run() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown, then step through events.
  useEffect(() => {
    if (!result) return
    if (step === -1) {
      if (count > 0) {
        sfx.beep()
        const t = setTimeout(() => setCount((c) => c - 1), countMs)
        return () => clearTimeout(t)
      }
      sfx.launch()
      setStep(0)
      return
    }
    if (step < result.events.length) {
      const ev = result.events[step]
      if (step > 0) (ev.status === 'anomaly' ? sfx.error : sfx.deploy)()
      const t = setTimeout(() => setStep((s) => s + 1), stepMs)
      return () => clearTimeout(t)
    }
    if (step === result.events.length) (result.anomalies.length ? sfx.failure : sfx.success)()
  }, [result, step, count, stepMs, countMs])

  const done = !!result && step >= result.events.length
  const skip = () => { if (result) { setCount(0); setStep(result.events.length) } }
  const heavy = state.design.launch === 'lv_heavy' ? 2 : state.design.launch === 'lv_medium' ? 1 : 0
  const inSpace = step >= 2
  const panelsOut = step >= 4

  return (
    <ScreenWrap>
      <MissionProgress current="launch" />
      <StepTitle step="Launch" title="Launch sequence" hint="Sit back, Commander. Riskier designs are more likely to hit problems on the way up." />
      {error && <ErrorBox message={error} onRetry={run} />}

      <div className="grid gap-5 md:grid-cols-[1fr_320px] [&>*]:min-w-0">
        <Panel className="relative h-[min(380px,52svh)] min-h-[260px] overflow-hidden">
          {/* sky gradient shifts to space */}
          <motion.div className="absolute inset-0" animate={{ background: inSpace ? 'linear-gradient(#03050d,#070b1a)' : 'linear-gradient(#0b1a3a,#1e3a8a 70%,#7c2d12)' }} transition={{ duration: 1.5 }} />
          <AnimatePresence mode="wait">
            {!inSpace ? (
              <motion.div key="rocket" className="absolute inset-x-0 bottom-0 flex flex-col items-center" exit={{ opacity: 0 }}>
                <motion.div animate={step >= 0 ? { y: -520 } : { y: 0 }} transition={{ duration: 2.6, ease: 'easeIn' }} className="flex origin-bottom scale-75 flex-col items-center sm:scale-100">
                  <Rocket heavy={heavy} />
                  {step >= 0 && (
                    <motion.div className="-mt-3 h-24 w-10 rounded-full bg-gradient-to-b from-amber-200 via-orange-500 to-transparent blur-[2px]"
                      animate={{ scaleY: [1, 1.3, 0.9, 1.2], opacity: [0.9, 1, 0.8, 1] }} transition={{ duration: 0.25, repeat: Infinity }} />
                  )}
                </motion.div>
                <div className="h-6 w-full bg-slate-800" />
                {step === -1 && result && (
                  <motion.div key={count} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center font-display text-7xl font-black text-white glow-text sm:text-8xl" aria-live="assertive">
                    {count > 0 ? count : 'GO'}
                  </motion.div>
                )}
                {!result && !error && <div className="absolute inset-0 flex items-center justify-center text-cyan-200"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              </motion.div>
            ) : (
              <motion.div key="space" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                <div className="absolute -bottom-[340px] left-1/2 h-[480px] w-[480px] max-w-none -translate-x-1/2 rounded-full bg-gradient-to-t from-blue-900 via-blue-600 to-cyan-300 opacity-80 shadow-[0_0_80px_rgba(56,189,248,0.6)]" />
                <motion.div className="absolute inset-x-0 top-6" initial={{ scale: 0.6 }} animate={{ scale: 1, y: [0, -6, 0] }} transition={{ y: { duration: 4, repeat: Infinity }, scale: { duration: 1 } }}>
                  <SpacecraftPreview design={state.design} deployed={panelsOut} />
                </motion.div>
                {step >= 5 && (
                  <div className="absolute right-6 top-6"><span className="absolute inline-flex h-4 w-4 rounded-full bg-cyan-400 animate-pulse-ring" /><span className="relative inline-flex h-4 w-4 rounded-full bg-cyan-300" /></div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Live status line */}
          {result && (
            <div className="absolute inset-x-3 top-3 z-10 flex justify-center" aria-live="polite">
              <span className="rounded-full bg-black/55 px-3 py-1 text-center text-xs font-semibold text-cyan-100 backdrop-blur sm:text-sm">
                {done ? (result.anomalies.length ? 'In orbit, with problems' : 'In orbit. All systems go!')
                  : step === -1 ? `Countdown: ${count > 0 ? count : 'ignition'}` : plainPhase[result.events[step]?.phase] ?? result.events[step]?.phase}
              </span>
            </div>
          )}
          {!done && result && (
            <button onClick={skip} className="absolute bottom-3 right-3 z-10 flex min-h-11 items-center gap-1.5 rounded-xl border border-white/20 bg-black/60 px-4 text-sm font-semibold text-white hover:bg-black/80">
              <FastForward className="h-4 w-4" /> Skip
            </button>
          )}
        </Panel>

        <Panel className="p-4">
          <div className="hud-label mb-3">Mission events</div>
          <ol className="space-y-2">
            {result?.events.map((ev, i) => {
              const shown = i < step || done
              const current = i === step && !done
              return (
                <li key={ev.phase} className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg px-2 py-1.5 text-sm transition ${current ? 'bg-cyan-400/10' : ''} ${shown || current ? 'opacity-100' : 'opacity-35'}`}>
                  {shown ? (ev.status === 'anomaly' ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />)
                    : current ? <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> : <span className="h-4 w-4 rounded-full border border-slate-600" />}
                  <span className="flex-1 text-slate-200">{ev.phase}</span>
                  {shown && <span className={`text-xs ${ev.status === 'anomaly' ? 'basis-full pl-7 text-amber-300' : 'text-slate-400'}`}>{ev.status === 'anomaly' ? ev.message : 'OK'}</span>}
                </li>
              )
            })}
          </ol>
          {done && result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
              {result.anomalies.length > 0 ? (
                <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-50" role="status">
                  <div className="flex items-center gap-2 font-display font-bold"><AlertTriangle className="h-5 w-5 text-amber-300" /> You made it to orbit, with {result.anomalies.length} problem{result.anomalies.length > 1 ? 's' : ''}</div>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {result.anomalies.map((a) => <li key={a.id}><b>{a.title}.</b> {a.detail}</li>)}
                  </ul>
                  <p className="mt-2 text-xs text-amber-100/80">Your mission can still succeed. Use your resources carefully.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3 font-display text-sm font-bold text-emerald-50" role="status">
                  <PartyPopper className="h-5 w-5 text-emerald-300" /> Perfect launch! All systems working.
                </div>
              )}
              <p className="text-[11px] text-slate-500">Each hardware phase had a {(result.per_phase_chance * 100).toFixed(1)}% anomaly chance (risk {result.risk}% ÷ 4), rolled with a seeded generator. Stylized simulation, not real orbital physics.</p>
              <Button className={`w-full !py-4 ${state.mode !== 'commander' ? 'next-action' : ''}`} onClick={() => dispatch({ type: 'go', screen: 'explore' })}>NEXT: EXPLORE THE STARS →</Button>
            </motion.div>
          )}
        </Panel>
      </div>
    </ScreenWrap>
  )
}
