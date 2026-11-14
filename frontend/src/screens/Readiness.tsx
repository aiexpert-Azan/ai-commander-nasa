import { Radio, Rocket, Satellite, Telescope, Wrench } from 'lucide-react'
import { sfx } from '../audio/sound'
import { Button, ErrorBox, Panel, ScreenWrap, Spinner, StatusIcon, StepTitle } from '../components/ui'
import { useGame } from '../game/store'
import { useEvaluation } from '../game/useEvaluation'

export function Readiness() {
  const { state, dispatch } = useGame()
  const cat = state.catalog
  const { evaluation, error, retry } = useEvaluation(state.design, state.level)
  if (!cat) return <ScreenWrap><Spinner /></ScreenWrap>
  const orbit = cat.components.orbit.find((o) => o.id === state.design.orbit)
  const fails = evaluation?.checks.filter((c) => c.status === 'fail') ?? []
  const r = evaluation?.resources

  const segments = [
    { icon: Rocket, name: 'Launch segment', ok: !evaluation?.checks.some((c) => c.id === 'launch' && c.status === 'fail'),
      text: cat.components.launch.find((x) => x.id === state.design.launch)?.name ?? '—' },
    { icon: Satellite, name: 'Space segment', ok: !evaluation?.checks.some((c) => ['power', 'energy', 'risk', 'lifetime'].includes(c.id) && c.status === 'fail'),
      text: `${r?.mass ?? '—'} kg spacecraft in ${orbit?.name ?? '—'}` },
    { icon: Radio, name: 'Ground segment', ok: !!state.design.ground_station && !evaluation?.checks.some((c) => ['comms', 'ground'].includes(c.id) && c.status === 'fail'),
      text: cat.ground_stations.find((g) => g.id === state.design.ground_station)?.name ?? 'Choose a station below' },
    { icon: Telescope, name: 'Science segment', ok: true, text: `${evaluation?.operations.targets ?? '—'} Kepler targets, ${evaluation?.operations.ai_credits ?? '—'} AI credits` },
  ]

  return (
    <ScreenWrap wide>
      <StepTitle step="Step 2 of 3 · Verification" title="Mission readiness review" hint={fails.length ? 'Fix every red check, then approve the launch.' : 'Choose a ground station, confirm all checks, then launch.'} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {segments.map((s) => (
          <Panel key={s.name} className={`p-4 ${s.ok ? '' : 'ring-1 ring-rose-400/50'}`}>
            <div className="flex items-center gap-2"><s.icon className={`h-4 w-4 ${s.ok ? 'text-cyan-300' : 'text-rose-400'}`} /><span className="hud-label">{s.name}</span></div>
            <div className="mt-2 text-sm text-slate-200">{s.text}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <Panel className="p-5">
          <div className="hud-label mb-3">Readiness checks</div>
          {error && <ErrorBox message={error} onRetry={retry} />}
          {!evaluation && !error && <Spinner label="Running checks..." />}
          <ul className="space-y-2">
            {evaluation?.checks.map((c) => (
              <li key={c.id} className={`rounded-xl border p-3 ${c.status === 'fail' ? 'border-rose-400/40 bg-rose-500/5' : c.status === 'warn' ? 'border-amber-400/30 bg-amber-400/5' : 'border-emerald-400/15 bg-emerald-400/5'}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon status={c.status} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{c.label}</div>
                    <div className="text-xs text-slate-300">{c.detail}</div>
                    {c.fix && c.status !== 'pass' && <div className="mt-1 text-xs text-amber-200">Fix: {c.fix}</div>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-5">
            <div className="hud-label mb-1">Ground station</div>
            <p className="mb-3 text-xs text-slate-400">Who on Earth will talk to your spacecraft?</p>
            <div className="space-y-2">
              {cat.ground_stations.map((g) => {
                const sel = state.design.ground_station === g.id
                const f = orbit ? g.factor[orbit.id] : undefined
                return (
                  <button key={g.id} onClick={() => { sfx.select(); dispatch({ type: 'select', category: 'ground_station', id: g.id }) }}
                    className={`w-full rounded-xl p-3 text-left transition ${sel ? 'bg-cyan-400/15 ring-2 ring-cyan-400' : 'bg-space-900/60 hover:ring-1 hover:ring-cyan-300/40'}`}>
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-white">{g.name}</span><span className="text-xs text-slate-300">${g.cost}M</span></div>
                    <div className="mt-1 text-xs text-slate-400">{g.description}</div>
                    {f !== undefined && <div className="mt-1 text-xs text-cyan-300">Link quality for {orbit?.name}: {Math.round(f * 100)}%</div>}
                  </button>
                )
              })}
            </div>
          </Panel>
          {r && (
            <Panel className="grid grid-cols-2 gap-3 p-5 text-center">
              <div><div className="font-display text-xl font-bold text-white">{r.lifetime_years}y</div><div className="text-[11px] text-slate-400">Lifetime</div></div>
              <div><div className="font-display text-xl font-bold text-white">{r.science_days}</div><div className="text-[11px] text-slate-400">Science days</div></div>
              <div><div className="font-display text-xl font-bold text-white">{r.energy}</div><div className="text-[11px] text-slate-400">Energy units</div></div>
              <div><div className="font-display text-xl font-bold text-white">{r.risk}%</div><div className="text-[11px] text-slate-400">Anomaly risk</div></div>
            </Panel>
          )}
          <div className="flex flex-col gap-3">
            <Button variant="success" className="!py-4" disabled={!evaluation?.launch_ready}
              onClick={() => { sfx.go(); dispatch({ type: 'go', screen: 'launch' }) }}>
              <Rocket className="h-5 w-5" /> APPROVE AND LAUNCH
            </Button>
            {evaluation && !evaluation.launch_ready && <p className="text-center text-xs text-rose-300">Launch blocked: {fails.length} critical check{fails.length === 1 ? '' : 's'} failing.</p>}
            <Button variant="ghost" onClick={() => dispatch({ type: 'go', screen: 'design' })}><Wrench className="h-4 w-4" /> MODIFY DESIGN</Button>
          </div>
        </div>
      </div>
    </ScreenWrap>
  )
}
