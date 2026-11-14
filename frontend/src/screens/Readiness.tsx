import { ChevronRight, Radio, Rocket, Satellite, Telescope, Wrench } from 'lucide-react'
import { useState } from 'react'
import type { Check } from '../api/client'
import { sfx } from '../audio/sound'
import { Button, ErrorBox, Hint, MissionProgress, Panel, ScreenWrap, Spinner, StatusIcon, StepTitle } from '../components/ui'
import { guideForCheck, slotInfo } from '../game/guide'
import { useGame } from '../game/store'
import { useEvaluation } from '../game/useEvaluation'

const order: Record<Check['status'], number> = { fail: 0, warn: 1, pass: 2 }

export function Readiness() {
  const { state, dispatch } = useGame()
  const cat = state.catalog
  const { evaluation, error, retry, pending } = useEvaluation(state.design, state.level)
  const [showTech, setShowTech] = useState(state.mode === 'commander')
  if (!cat) return <ScreenWrap><Spinner /></ScreenWrap>
  const orbit = cat.components.orbit.find((o) => o.id === state.design.orbit)
  const checks = [...(evaluation?.checks ?? [])].sort((a, b) => order[a.status] - order[b.status])
  const fails = checks.filter((c) => c.status === 'fail')
  const warns = checks.filter((c) => c.status === 'warn')
  const r = evaluation?.resources
  const ready = !!evaluation?.launch_ready && !pending
  const guided = state.mode !== 'commander'

  const segments = [
    { icon: Rocket, name: 'Rocket', ok: !evaluation?.checks.some((c) => c.id === 'launch' && c.status === 'fail'),
      text: cat.components.launch.find((x) => x.id === state.design.launch)?.name ?? '—' },
    { icon: Satellite, name: 'Spacecraft', ok: !evaluation?.checks.some((c) => ['power', 'energy', 'risk', 'lifetime', 'budget'].includes(c.id) && c.status === 'fail'),
      text: `${r?.mass ?? '—'} kg in ${orbit?.name ?? '—'}` },
    { icon: Radio, name: 'Ground', ok: !!state.design.ground_station && !evaluation?.checks.some((c) => ['comms', 'ground'].includes(c.id) && c.status === 'fail'),
      text: cat.ground_stations.find((g) => g.id === state.design.ground_station)?.name ?? 'Not chosen yet' },
    { icon: Telescope, name: 'Science', ok: true, text: `${evaluation?.operations.targets ?? '—'} stars · ${evaluation?.operations.ai_credits ?? '—'} AI credits` },
  ]

  const LaunchBlock = (
    <div className="flex flex-col gap-2">
      <div role="status" className={`rounded-xl border p-3 text-center text-sm font-semibold ${!evaluation ? 'border-slate-600 text-slate-300' : ready ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100' : 'border-rose-400/40 bg-rose-500/10 text-rose-100'}`}>
        {!evaluation ? 'Running checks…' : pending ? 'Re-checking your design…' : ready
          ? (warns.length ? `Ready for launch! (${warns.length} warning${warns.length > 1 ? 's' : ''} to keep in mind)` : 'All checks passed. Ready for launch!')
          : `Fix ${fails.length} problem${fails.length === 1 ? '' : 's'} to unlock launch`}
      </div>
      <Button variant="success" className={`!py-4 text-base ${ready && guided ? 'next-action' : ''}`} disabled={!ready}
        onClick={() => { sfx.go(); dispatch({ type: 'go', screen: 'launch' }) }}>
        <Rocket className="h-5 w-5" /> {ready ? 'LAUNCH MISSION' : 'LAUNCH LOCKED'}
      </Button>
      <Button variant="ghost" onClick={() => dispatch({ type: 'go', screen: 'design' })}><Wrench className="h-4 w-4" /> BACK TO BUILD</Button>
    </div>
  )

  return (
    <ScreenWrap wide>
      <MissionProgress current="readiness" />
      <StepTitle step="Safety check" title="Is your spacecraft ready?"
        hint={!evaluation ? 'Mission control is checking your design…' : fails.length ? 'Mission control found problems. Each one says how to fix it.' : 'Everything checks out. Time to launch!'} />

      <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {segments.map((s) => (
          <Panel key={s.name} className={`p-3 sm:p-4 ${s.ok ? '' : 'ring-1 ring-rose-400/50'}`}>
            <div className="flex items-center gap-2"><s.icon className={`h-4 w-4 shrink-0 ${s.ok ? 'text-cyan-300' : 'text-rose-400'}`} /><span className="hud-label">{s.name}</span></div>
            <div className="mt-1.5 break-words text-sm text-slate-100">{s.text}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-4">
          {/* On phones the launch decision sits above the long list of checks once everything is green. */}
          {ready && <div className="lg:hidden">{LaunchBlock}</div>}
          <Panel className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="hud-label">Mission control checks</span>
              <button onClick={() => setShowTech((v) => !v)} aria-pressed={showTech} className="min-h-11 px-1 text-xs text-cyan-300 hover:text-cyan-100">
                {showTech ? 'Hide' : 'Show'} technical details
              </button>
            </div>
            {error && <ErrorBox message={error} onRetry={retry} />}
            {!evaluation && !error && <Spinner label="Running checks..." />}
            <ul className="space-y-2">
              {checks.map((c) => {
                const g = guideForCheck(c, state.design)
                return (
                  <li key={c.id} className={`rounded-xl border p-3 ${c.status === 'fail' ? 'border-rose-400/40 bg-rose-500/5' : c.status === 'warn' ? 'border-amber-400/30 bg-amber-400/5' : 'border-emerald-400/15 bg-emerald-400/5'}`}>
                    <div className="flex items-start gap-3">
                      <StatusIcon status={c.status} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white">{g.headline}</div>
                        {c.status === 'fail' && (
                          <dl className="mt-1.5 space-y-1 text-sm">
                            <div><dt className="inline font-semibold text-slate-300">Why it matters: </dt><dd className="inline text-slate-300">{g.why}</dd></div>
                            <div><dt className="inline font-semibold text-amber-200">Fix: </dt><dd className="inline text-amber-100">{g.fix}</dd></div>
                          </dl>
                        )}
                        {c.status === 'warn' && c.fix && <p className="mt-1 text-xs text-amber-100">Tip: {c.fix}</p>}
                        {(showTech || c.status !== 'pass') && <p className="mt-1 break-words text-xs text-slate-400">{c.detail}</p>}
                        {c.status !== 'pass' && g.target && (
                          <button onClick={() => { sfx.click(); dispatch({ type: 'focusDesign', slot: g.target }) }}
                            className={`mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm font-semibold ${c.status === 'fail' ? 'border-rose-300/40 text-rose-100 hover:bg-rose-400/10' : 'border-amber-300/30 text-amber-100 hover:bg-amber-400/10'}`}>
                            {c.id === 'complete' ? `Choose ${slotInfo[g.target].label}` : g.fixLabel} <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>
          <Hint>Real NASA missions go through reviews like this before launch. Engineers check every system, because a small mistake can't be fixed once the spacecraft is in space.</Hint>
        </div>

        <div className="space-y-4">
          {r && (
            <Panel className="grid grid-cols-2 gap-3 p-4 text-center sm:p-5">
              <div><div className="font-display text-xl font-bold text-white">{r.lifetime_years} yr</div><div className="text-[11px] text-slate-300">Mission lifetime</div></div>
              <div><div className="font-display text-xl font-bold text-white">{r.science_days}</div><div className="text-[11px] text-slate-300">Observing days</div></div>
              <div><div className="font-display text-xl font-bold text-white">{r.energy}</div><div className="text-[11px] text-slate-300">Energy units</div></div>
              <div><div className="font-display text-xl font-bold text-white">{r.risk}%</div><div className="text-[11px] text-slate-300">Chance of problems</div></div>
            </Panel>
          )}
          <Panel className="p-4 sm:p-5">
            <div className="hud-label mb-1">Ground station</div>
            <p className="mb-3 text-sm text-slate-300">{slotInfo.ground_station.purpose}</p>
            <div className="space-y-2">
              {cat.ground_stations.map((g) => {
                const sel = state.design.ground_station === g.id
                const f = orbit ? g.factor[orbit.id] : undefined
                return (
                  <button key={g.id} aria-pressed={sel} onClick={() => { sfx.select(); dispatch({ type: 'select', category: 'ground_station', id: g.id }) }}
                    className={`min-h-11 w-full rounded-xl p-3 text-left transition ${sel ? 'bg-cyan-400/15 ring-2 ring-cyan-400' : 'bg-space-900/60 hover:ring-1 hover:ring-cyan-300/40'}`}>
                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-white">{sel && '✓ '}{g.name}</span><span className="shrink-0 text-xs text-slate-300">${g.cost}M</span></div>
                    <div className="mt-1 text-xs text-slate-300">{g.description}</div>
                    {f !== undefined && <div className="mt-1 text-xs text-cyan-300">Signal strength for {orbit?.name}: {Math.round(f * 100)}%</div>}
                  </button>
                )
              })}
            </div>
          </Panel>
          <div className={ready ? 'hidden lg:block' : ''}>{LaunchBlock}</div>
        </div>
      </div>
    </ScreenWrap>
  )
}
