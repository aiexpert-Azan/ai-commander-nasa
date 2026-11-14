import { Check, ChevronRight, Rocket, Wrench } from 'lucide-react'
import type { Check as CheckT } from '../api/client'
import { sfx } from '../audio/sound'
import { Button, ErrorBox, Hint, MissionProgress, ScreenWrap, Spinner, StatusIcon, StepTitle } from '../components/ui'
import { guideForCheck, slotInfo } from '../game/guide'
import { useGame } from '../game/store'
import { useEvaluation } from '../game/useEvaluation'

const order: Record<CheckT['status'], number> = { fail: 0, warn: 1, pass: 2 }

export function Readiness() {
  const { state, dispatch } = useGame()
  const cat = state.catalog
  const { evaluation, error, retry, pending } = useEvaluation(state.design, state.level)
  if (!cat) return <ScreenWrap><Spinner /></ScreenWrap>
  const orbit = cat.components.orbit.find((o) => o.id === state.design.orbit)
  const checks = [...(evaluation?.checks ?? [])].sort((a, b) => order[a.status] - order[b.status])
  const problems = checks.filter((c) => c.status !== 'pass')
  const passed = checks.filter((c) => c.status === 'pass')
  const fails = checks.filter((c) => c.status === 'fail')
  const r = evaluation?.resources
  const ready = !!evaluation?.launch_ready && !pending
  const guided = state.mode !== 'commander'

  return (
    <ScreenWrap>
      <MissionProgress current="readiness" />
      <StepTitle step="Safety check" title={!evaluation ? 'Checking…' : ready ? 'Ready for launch!' : 'Not ready yet'}
        hint={!evaluation ? 'Mission control is checking.' : ready ? 'All systems go.' : `Fix ${fails.length} problem${fails.length === 1 ? '' : 's'} below.`} />

      {error && <ErrorBox message={error} onRetry={retry} />}
      {!evaluation && !error && <Spinner label="Running checks..." />}

      {evaluation && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {problems.map((c) => {
              const g = guideForCheck(c, state.design)
              return (
                <div key={c.id} className={`rounded-2xl p-3.5 ${c.status === 'fail' ? 'bg-rose-500/10 ring-1 ring-rose-400/40' : 'bg-amber-400/10 ring-1 ring-amber-400/30'}`}>
                  <div className="flex items-start gap-3">
                    <StatusIcon status={c.status} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white">{g.headline}</div>
                      {g.target && (
                        <button onClick={() => { sfx.click(); dispatch({ type: 'focusDesign', slot: g.target }) }}
                          className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-xl bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15">
                          {c.id === 'complete' ? `Choose ${slotInfo[g.target].label}` : `Fix: ${g.fixLabel.replace('Change ', '')}`} <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                      <Hint title="Details"><p>{g.why}</p><p className="mt-1 text-amber-100">{g.fix}</p><p className="mt-1 text-xs text-slate-400">{c.detail}</p></Hint>
                    </div>
                  </div>
                </div>
              )
            })}
            {passed.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-semibold text-emerald-300">Passed ({passed.length})</div>
                <ul className="flex flex-wrap gap-2">
                  {passed.map((c) => (
                    <li key={c.id} className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-100 ring-1 ring-emerald-400/25">
                      <Check className="h-4 w-4 text-emerald-400" />{guideForCheck(c, state.design).headline}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-200">Ground station</div>
              <div className="grid grid-cols-2 gap-2">
                {cat.ground_stations.map((g) => {
                  const sel = state.design.ground_station === g.id
                  const f = orbit ? g.factor[orbit.id] : undefined
                  return (
                    <button key={g.id} aria-pressed={sel} onClick={() => { sfx.select(); dispatch({ type: 'select', category: 'ground_station', id: g.id }) }}
                      className={`min-h-11 rounded-2xl p-3 text-left transition ${sel ? 'bg-cyan-400/15 ring-2 ring-cyan-400' : 'bg-space-800/60 hover:ring-1 hover:ring-cyan-300/40'}`}>
                      <div className="text-sm font-semibold text-white">{g.id === 'gs_deep' ? 'Deep Space' : 'Near-Earth'}</div>
                      <div className="text-xs text-slate-300">${g.cost}M{f !== undefined ? ` · signal ${Math.round(f * 100)}%` : ''}</div>
                    </button>
                  )
                })}
              </div>
            </div>
            {r && (
              <Hint title="Mission numbers">
                <div className="grid grid-cols-2 gap-1 tabular-nums">
                  <span>Lifetime: <b>{r.lifetime_years} yr</b></span><span>Observing days: <b>{r.science_days}</b></span>
                  <span>Energy: <b>{r.energy}</b></span><span>Risk: <b>{r.risk}%</b></span>
                </div>
              </Hint>
            )}
            <Button variant="success" className={`w-full !py-4 text-base ${ready && guided ? 'next-action' : ''}`} disabled={!ready}
              onClick={() => { sfx.go(); dispatch({ type: 'go', screen: 'launch' }) }}>
              <Rocket className="h-5 w-5" /> {ready ? 'LAUNCH MISSION' : 'LAUNCH LOCKED'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => dispatch({ type: 'go', screen: 'design' })}><Wrench className="h-4 w-4" /> BACK TO BUILD</Button>
          </div>
        </div>
      )}
    </ScreenWrap>
  )
}
