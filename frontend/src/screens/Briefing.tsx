import { Brain, Coins, Lock, Star, Target, Trophy } from 'lucide-react'
import { Button, Panel, ScreenWrap, Spinner, StepTitle } from '../components/ui'
import { useGame } from '../game/store'

export function Briefing() {
  const { state, dispatch } = useGame()
  const cat = state.catalog
  if (!cat) return <ScreenWrap><Spinner label="Contacting mission control..." /></ScreenWrap>
  const lvl = cat.levels[String(state.level)]
  const levels = Object.values(cat.levels)

  const facts = [
    { icon: Coins, label: 'Starting budget', value: `$${lvl.budget}M` },
    { icon: Target, label: 'Discovery target', value: `${lvl.stars_required} stars` },
    { icon: Brain, label: 'Base AI credits', value: `${lvl.base_ai_credits}` },
    { icon: Trophy, label: 'Success', value: `≥${Math.round(lvl.pass_accuracy * 100)}% correct` },
  ]

  return (
    <ScreenWrap>
      <StepTitle step="Mission briefing" title="Welcome, Commander." hint="Your mission: design and operate a space telescope to re-examine historical Kepler star observations and identify possible exoplanet signals." />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {levels.map((l) => {
          const locked = l.id > state.unlocked
          const active = l.id === state.level
          return (
            <button key={l.id} disabled={locked}
              onClick={() => dispatch({ type: 'newMission', level: l.id })}
              className={`glass rounded-2xl p-4 text-left transition ${active ? 'ring-2 ring-cyan-400' : 'hover:ring-1 hover:ring-cyan-300/40'} ${locked ? 'opacity-40' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="hud-label">Level {l.id}</span>
                {locked ? <Lock className="h-4 w-4 text-slate-400" /> : <div className="flex">{Array.from({ length: l.id }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />)}</div>}
              </div>
              <div className="mt-1 font-display text-base font-bold text-white">{l.name}</div>
              <div className="mt-1 text-xs text-slate-400">{locked ? 'Succeed at the previous level to unlock.' : l.summary}</div>
            </button>
          )
        })}
      </div>

      <Panel className="p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-space-900/60 p-4">
              <f.icon className="h-5 w-5 text-cyan-300" />
              <div className="mt-2 font-display text-2xl font-bold text-white">{f.value}</div>
              <div className="text-xs text-slate-400">{f.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <div className="rounded-xl border border-cyan-300/10 p-4">
            <div className="hud-label mb-1">Requirements</div>
            <ul className="list-inside list-disc space-y-1 text-slate-300">
              <li>Stay within ${lvl.budget}M</li>
              <li>Rocket must lift your spacecraft to its orbit</li>
              <li>Power margin of at least {Math.round(lvl.min_power_margin * 100)}%</li>
              <li>Downlink all science data to the ground</li>
              <li>At least {lvl.min_lifetime_years} years of operations</li>
              {lvl.max_risk !== null && <li>Mission risk at most {lvl.max_risk}%</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-4">
            <div className="hud-label mb-1 !text-amber-300">About the data</div>
            <p className="text-xs leading-relaxed text-slate-300">
              Signals are <b>real historical Kepler observations</b> (processed light curves), not new measurements.
              Your calls are checked against the Kepler DR25 catalog. A catalog "candidate" is a promising signal, not a confirmed planet.
            </p>
          </div>
        </div>
      </Panel>

      <div className="mt-6 flex justify-end">
        <Button className="w-full !py-4 sm:w-auto" onClick={() => dispatch({ type: 'go', screen: 'design' })}>DESIGN MY SPACECRAFT</Button>
      </div>
    </ScreenWrap>
  )
}
