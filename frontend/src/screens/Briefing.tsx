import { Brain, Coins, Database, Lock, Star, Target, Trophy } from 'lucide-react'
import { Button, Hint, MissionProgress, Panel, ScreenWrap, Spinner, StepTitle } from '../components/ui'
import { useGame } from '../game/store'

export function Briefing() {
  const { state, dispatch } = useGame()
  const cat = state.catalog
  if (!cat) return <ScreenWrap><Spinner label="Contacting mission control..." /></ScreenWrap>
  const lvl = cat.levels[String(state.level)]
  const levels = Object.values(cat.levels)
  const guided = state.mode !== 'commander'

  const facts = [
    { icon: Coins, label: 'Budget to spend', value: `$${lvl.budget}M` },
    { icon: Target, label: 'Stars to classify', value: `${lvl.stars_required}` },
    { icon: Brain, label: 'AI Scientist credits', value: `${lvl.base_ai_credits}+` },
    { icon: Trophy, label: 'Correct calls to win', value: `${Math.round(lvl.pass_accuracy * 100)}%+` },
  ]

  return (
    <ScreenWrap>
      <MissionProgress current="briefing" />
      <StepTitle step={`Mission briefing · Level ${lvl.id}`} title="Welcome, Commander."
        hint="Your job: build a space telescope, launch it, then study real stars from NASA's Kepler mission to find signals that could be planets." />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Choose a level">
        {levels.map((l) => {
          const locked = l.id > state.unlocked
          const active = l.id === state.level
          return (
            <button key={l.id} disabled={locked} role="radio" aria-checked={active}
              onClick={() => { if (!active) dispatch({ type: 'newMission', level: l.id }) }}
              className={`glass min-h-11 rounded-2xl p-4 text-left transition ${active ? 'ring-2 ring-cyan-400' : 'hover:ring-1 hover:ring-cyan-300/40'} ${locked ? 'cursor-not-allowed opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="hud-label">Level {l.id}</span>
                {locked ? <Lock className="h-4 w-4 text-slate-400" aria-label="Locked" /> : <div className="flex" aria-hidden>{Array.from({ length: l.id }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />)}</div>}
              </div>
              <div className="mt-1 font-display text-base font-bold text-white">{l.name}</div>
              <div className="mt-1 text-xs text-slate-300">{locked ? 'Win the previous level to unlock.' : l.summary}</div>
            </button>
          )
        })}
      </div>

      <Panel className="p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-space-900/60 p-3 sm:p-4">
              <f.icon className="h-5 w-5 text-cyan-300" />
              <div className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">{f.value}</div>
              <div className="text-xs text-slate-300">{f.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <div className="rounded-xl border border-cyan-300/10 p-4">
            <div className="hud-label mb-2">Your spacecraft must</div>
            <ul className="space-y-1.5 text-slate-200">
              <li>💰 Cost no more than ${lvl.budget}M</li>
              <li>🚀 Be light enough for its rocket</li>
              <li>⚡ Make {lvl.min_power_margin > 0 ? `at least ${Math.round(lvl.min_power_margin * 100)}% more` : 'more'} power than it uses</li>
              <li>📡 Send all its science data back to Earth</li>
              <li>⏳ Work for at least {lvl.min_lifetime_years} years</li>
              {lvl.max_risk !== null && <li>🛡 Keep mission risk at {lvl.max_risk}% or less</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-4">
            <div className="hud-label mb-2 flex items-center gap-1.5 !text-amber-300"><Database className="h-3.5 w-3.5" /> About the data</div>
            <p className="text-xs leading-relaxed text-slate-200">
              The star signals are <b>real historical observations</b> from NASA's Kepler telescope, not new measurements.
              Your answers are checked against the official Kepler DR25 catalog. A catalog "candidate" is a promising signal, not a confirmed planet.
            </p>
          </div>
        </div>
        {guided && <div className="mt-4"><Hint title="Tip">Every spacecraft part is a trade-off. Not sure what to pick? You can tap <b>Auto-Build</b> on the next screen and learn from its choices.</Hint></div>}
      </Panel>

      <div className="mt-6 flex justify-end">
        <Button className={`w-full !py-4 sm:w-auto ${guided ? 'next-action' : ''}`} onClick={() => dispatch({ type: 'go', screen: 'design' })}>NEXT: BUILD MY SPACECRAFT →</Button>
      </div>
    </ScreenWrap>
  )
}
