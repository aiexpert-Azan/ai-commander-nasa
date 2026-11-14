import { AnimatePresence, motion } from 'framer-motion'
import { Hammer, Rocket, Telescope, Volume2, VolumeX, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Panel } from '../components/ui'
import { useGame } from '../game/store'

const steps = [
  { icon: Hammer, title: 'Build', text: 'Pick telescope, instrument, power, antenna, rocket and orbit within budget.' },
  { icon: Rocket, title: 'Launch', text: 'Pass the readiness checks, then watch your mission fly.' },
  { icon: Telescope, title: 'Discover', text: 'Study real Kepler signals and call each one: planet candidate or false positive.' },
]

export function Welcome() {
  const { state, dispatch } = useGame()
  const [howTo, setHowTo] = useState(false)
  const inProgress = state.launch && state.screen === 'welcome'

  return (
    <main className="relative flex min-h-full flex-col items-center justify-center px-4 py-24 text-center">
      {/* Planet + orbit art */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-60" aria-hidden>
        <div className="absolute inset-0 rounded-full border border-cyan-300/10" />
        <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
          <div className="absolute -top-2 left-1/2 h-4 w-4 rounded-full bg-amber-300 shadow-[0_0_24px_#fbbf24]" />
        </motion.div>
        <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-cyan-200 via-blue-500 to-indigo-900 shadow-[0_0_80px_rgba(34,211,238,0.45)]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="relative z-10">
        <div className="hud-label mb-3">NASA Space Apps Challenge 2026 · Space Mission Design Game</div>
        <h1 className="font-display text-5xl font-black leading-none tracking-wider text-white glow-text sm:text-7xl">AI COMMANDER</h1>
        <h2 className="mt-3 font-display text-lg font-bold tracking-[0.3em] text-cyan-300 sm:text-2xl">THE EXOPLANET HUNTER</h2>
        <p className="mx-auto mt-5 max-w-md text-base text-slate-300 sm:text-lg">Build your mission. Explore the stars. Hunt new worlds.</p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="w-64 !py-4 text-base" onClick={() => dispatch({ type: 'go', screen: 'briefing' })}>
            <Rocket className="h-5 w-5" /> START MISSION
          </Button>
          {inProgress && (
            <Button variant="success" className="w-64 !py-4" onClick={() => dispatch({ type: 'go', screen: 'explore' })}>RESUME MISSION</Button>
          )}
          <Button variant="ghost" className="w-64 !py-4" onClick={() => setHowTo(true)}>HOW TO PLAY</Button>
          <Button variant="ghost" className="w-64 !py-4 sm:w-auto" onClick={() => dispatch({ type: 'toggleSound' })} aria-label="Toggle sound">
            {state.sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />} SOUND {state.sound ? 'ON' : 'OFF'}
          </Button>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.15 }}>
              <Panel className="h-full p-4 text-left">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300"><s.icon className="h-4 w-4" /></span>
                  <span className="font-display text-sm font-bold text-white">{i + 1}. {s.title}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{s.text}</p>
              </Panel>
            </motion.div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-xl text-[11px] text-slate-500">
          Uses historical NASA Kepler data and an experimental student-trained AI model. Not affiliated with or endorsed by NASA.
        </p>
      </motion.div>

      <AnimatePresence>
        {howTo && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHowTo(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
              <Panel className="p-6 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-white">How to play</h3>
                  <button aria-label="Close" onClick={() => setHowTo(false)} className="text-slate-400 hover:text-white"><X /></button>
                </div>
                <ol className="mt-4 space-y-3 text-sm text-slate-300">
                  <li><b className="text-cyan-300">1. Design.</b> Choose one part in each category. Every choice changes cost, mass, power, data and risk.</li>
                  <li><b className="text-cyan-300">2. Check.</b> Pick a ground station and fix any red readiness checks before launch.</li>
                  <li><b className="text-cyan-300">3. Launch.</b> Your risk level decides whether anything goes wrong on the way up.</li>
                  <li><b className="text-cyan-300">4. Hunt.</b> Pick stars, study the brightness dip, and decide: planet candidate or false positive. Each observation costs energy and science days.</li>
                  <li><b className="text-cyan-300">5. Ask the AI.</b> The AI Scientist is a real but imperfect neural network. Use credits wisely.</li>
                </ol>
                <p className="mt-4 text-xs text-slate-500">Tip: a planet blocks only a tiny fraction of its star's light. Very deep dips are usually two stars eclipsing each other.</p>
              </Panel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
