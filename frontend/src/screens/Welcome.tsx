import { motion } from 'framer-motion'
import { Bot, Compass, Hammer, PlayCircle, Rocket, Shield, ShieldCheck, Telescope, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { sfx } from '../audio/sound'
import { useTutorial } from '../components/Tutorial'
import { Button, Modal, Panel } from '../components/ui'
import { useGame, type PlayMode } from '../game/store'

const steps = [
  { icon: Hammer, title: 'Build', text: 'Design a spacecraft on a budget.' },
  { icon: ShieldCheck, title: 'Check', text: 'Fix any problems before launch.' },
  { icon: Rocket, title: 'Launch', text: 'Blast off into space.' },
  { icon: Telescope, title: 'Explore', text: 'Study real NASA star data.' },
  { icon: Bot, title: 'Decide', text: 'Planet or not? You make the call.' },
]

const modes: { id: PlayMode; icon: typeof Compass; name: string; tag?: string; points: string[] }[] = [
  { id: 'guided', icon: Compass, name: 'Guided Explorer', tag: 'Recommended for beginners',
    points: ['Short tips at every step', 'Next action highlighted', 'Auto-Build on every level'] },
  { id: 'commander', icon: Shield, name: 'Mission Commander',
    points: ['Make every decision yourself', 'Full engineering numbers', 'No tutorial interruptions'] },
]

export function Welcome() {
  const { state, dispatch } = useGame()
  const { openTutorial } = useTutorial()
  const [choose, setChoose] = useState(false)
  const inProgress = !!state.launch

  const begin = (mode: PlayMode) => {
    sfx.go()
    dispatch({ type: 'setMode', mode })
    setChoose(false)
    // A mission already in flight is replaced (same as the existing Replay flow); otherwise just continue.
    const go = () => dispatch(inProgress ? { type: 'newMission', level: state.level } : { type: 'go', screen: 'briefing' })
    // First-time guided players get the short tutorial (skippable) before the briefing.
    if (mode === 'guided' && !state.tutorialSeen) openTutorial(go)
    else go()
  }

  return (
    <main className="safe-x relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col items-center justify-center pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] text-center">
      {/* Planet + orbit art */}
      <div className="pointer-events-none absolute left-1/2 top-[38%] -z-0 aspect-square w-[min(520px,120vw)] -translate-x-1/2 -translate-y-1/2 opacity-50" aria-hidden>
        <div className="absolute inset-0 rounded-full border border-cyan-300/10" />
        <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
          <div className="absolute -top-2 left-1/2 h-4 w-4 rounded-full bg-amber-300 shadow-[0_0_24px_#fbbf24]" />
        </motion.div>
        <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-cyan-200 via-blue-500 to-indigo-900 shadow-[0_0_80px_rgba(34,211,238,0.45)]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 w-full">
        <div className="hud-label mb-2">AI Commander · The Exoplanet Hunter</div>
        <h1 className="mx-auto max-w-3xl font-display text-[1.75rem] font-black leading-tight tracking-wide text-white glow-text min-[400px]:text-4xl sm:text-6xl">
          Become a Space Mission Commander!
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-200 sm:text-lg">
          Build a spacecraft, launch into space, explore real NASA star data, and search for possible planets.
        </p>

        <div className="mx-auto mt-7 flex w-full max-w-sm flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          {inProgress ? (
            <>
              <Button variant="success" className="!py-4 text-base sm:w-64" onClick={() => dispatch({ type: 'go', screen: state.score ? 'results' : 'explore' })}>
                <PlayCircle className="h-5 w-5" /> RESUME MISSION
              </Button>
              <Button className="!py-4 sm:w-64" onClick={() => setChoose(true)}><Rocket className="h-5 w-5" /> NEW MISSION</Button>
            </>
          ) : (
            <Button className="next-action !py-4 text-base sm:w-72" onClick={() => setChoose(true)}>
              <Rocket className="h-5 w-5" /> START MY MISSION
            </Button>
          )}
          <Button variant="ghost" className="!py-4 sm:w-56" onClick={() => openTutorial()}>HOW TO PLAY</Button>
        </div>

        <ol className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-5" aria-label="Your mission in 5 steps">
          {steps.map((s, i) => (
            <motion.li key={s.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
              className={i === 4 ? 'min-[400px]:col-span-2 sm:col-span-1' : ''}>
              <Panel className="flex h-full items-center gap-3 p-3 text-left sm:flex-col sm:items-start sm:gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300"><s.icon className="h-5 w-5" /></span>
                <div>
                  <div className="font-display text-sm font-bold text-white">{i + 1}. {s.title}</div>
                  <p className="text-xs text-slate-300">{s.text}</p>
                </div>
              </Panel>
            </motion.li>
          ))}
        </ol>

        <Panel className="mx-auto mt-3 flex max-w-4xl items-start gap-3 p-3 text-left">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm text-slate-200"><b className="text-amber-200">How you win:</b> launch a working spacecraft, then classify enough stars with at least 60% correct to unlock the next level. Three levels to conquer!</p>
        </Panel>

        <p className="mx-auto mt-6 max-w-xl text-[11px] text-slate-400">
          NASA Space Apps Challenge 2026 · Uses historical NASA Kepler data and an experimental student-trained AI model. Not affiliated with or endorsed by NASA.
        </p>
      </motion.div>

      <Modal open={choose} onClose={() => setChoose(false)} label="Choose your play style" maxWidth="max-w-2xl">
        <Panel className="p-5 text-left sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold text-white">How do you want to play?</h2>
              <p className="mt-1 text-sm text-slate-300">Both use the same mission rules and scoring. You can switch any time from the top bar.</p>
            </div>
            <button aria-label="Close" onClick={() => setChoose(false)} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          {inProgress && <p className="mt-3 rounded-lg bg-amber-400/10 p-2 text-xs text-amber-100">Starting a new mission replaces the mission in progress. Unlocked levels are kept.</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {modes.map((m) => (
              <button key={m.id} onClick={() => begin(m.id)} data-autofocus={m.id === 'guided' ? true : undefined}
                className={`glass rounded-2xl p-4 text-left transition hover:ring-2 hover:ring-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400 ${state.mode === m.id || (!state.mode && m.id === 'guided') ? 'ring-1 ring-cyan-300/50' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300"><m.icon className="h-5 w-5" /></span>
                  <div>
                    <div className="font-display text-base font-bold text-white">{m.name}</div>
                    {m.tag && <div className="text-[11px] font-semibold text-emerald-300">{m.tag}</div>}
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-300">
                  {m.points.map((p) => <li key={p} className="flex gap-2"><span className="text-cyan-300">•</span>{p}</li>)}
                </ul>
                <div className="mt-3 font-display text-xs font-bold tracking-wider text-cyan-300">CHOOSE →</div>
              </button>
            ))}
          </div>
        </Panel>
      </Modal>
    </main>
  )
}
