import { Brain, Coins, Lock, Star, Target, Trophy } from 'lucide-react'
import { Button, Hint, MissionProgress, ScreenWrap, Spinner, StepTitle } from '../components/ui'
import { useGame } from '../game/store'

export function Briefing() {
  const { state, dispatch } = useGame()
  const cat = state.catalog
  if (!cat) return <ScreenWrap><Spinner label="Contacting mission control..." /></ScreenWrap>
  const lvl = cat.levels[String(state.level)]
  const levels = Object.values(cat.levels)
  const guided = state.mode !== 'commander'

  const facts = [
    { icon: Coins, label: 'Budget', value: `$${lvl.budget}M` },
    { icon: Target, label: 'Stars to check', value: `${lvl.stars_required}` },
    { icon: Brain, label: 'AI credits', value: `${lvl.base_ai_credits}+` },
    { icon: Trophy, label: 'To win', value: `${Math.round(lvl.pass_accuracy * 100)}%+ right` },
  ]

  return (
    <ScreenWrap>
      <MissionProgress current="briefing" />
      <StepTitle step={`Level ${lvl.id} · ${lvl.name}`} title="Your mission" hint="Find possible planets in real NASA star data." />

      <div className="mb-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Choose a level">
        {levels.map((l) => {
          const locked = l.id > state.unlocked
          const active = l.id === state.level
          return (
            <button key={l.id} disabled={locked} role="radio" aria-checked={active} aria-label={`Level ${l.id}: ${l.name}${locked ? ' (locked)' : ''}`}
              onClick={() => { if (!active) dispatch({ type: 'newMission', level: l.id }) }}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl p-2 transition ${active ? 'bg-cyan-400/15 ring-2 ring-cyan-400' : 'bg-space-800/60 hover:ring-1 hover:ring-cyan-300/40'} ${locked ? 'cursor-not-allowed opacity-45' : ''}`}>
              <span className="text-xs font-semibold text-slate-200">Level {l.id}</span>
              {locked ? <Lock className="h-4 w-4 text-slate-400" /> : <span className="flex" aria-hidden>{Array.from({ length: l.id }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />)}</span>}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="rounded-2xl bg-space-800/60 p-3">
            <f.icon className="h-5 w-5 text-cyan-300" />
            <div className="mt-1.5 font-display text-xl font-bold text-white">{f.value}</div>
            <div className="text-xs text-slate-300">{f.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Hint title="Mission rules & data">
          <ul className="space-y-1">
            <li>💰 Cost ≤ ${lvl.budget}M · 🚀 light enough for the rocket</li>
            <li>⚡ More power than you use{lvl.min_power_margin > 0 ? ` (+${Math.round(lvl.min_power_margin * 100)}%)` : ''} · 📡 data reaches Earth</li>
            <li>⏳ Lasts {lvl.min_lifetime_years}+ years{lvl.max_risk !== null ? ` · 🛡 risk ≤ ${lvl.max_risk}%` : ''}</li>
          </ul>
          <p className="mt-2 text-xs text-slate-400">Signals are real historical NASA Kepler observations. Answers are checked against the Kepler DR25 catalog. A "candidate" is not a confirmed planet.</p>
        </Hint>
      </div>

      <div className="mt-5 flex justify-end">
        <Button className={`w-full !py-4 sm:w-auto ${guided ? 'next-action' : ''}`} onClick={() => dispatch({ type: 'go', screen: 'design' })}>CONTINUE →</Button>
      </div>
    </ScreenWrap>
  )
}
