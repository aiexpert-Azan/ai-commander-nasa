import { motion } from 'framer-motion'
import { Award, ChevronRight, RefreshCw, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { sfx } from '../audio/sound'
import { Button, ErrorBox, MissionProgress, Panel, ScreenWrap, Spinner, StepTitle } from '../components/ui'
import { missionStatus, useGame } from '../game/store'

const rankColor: Record<string, string> = {
  'Elite Commander': 'from-amber-300 to-orange-500',
  'Mission Specialist': 'from-cyan-300 to-blue-500',
  Explorer: 'from-emerald-300 to-teal-500',
  Cadet: 'from-slate-300 to-slate-500',
}

export function Results() {
  const { state, dispatch } = useGame()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const status = missionStatus(state)
  const score = state.score

  const load = () => {
    if (!state.ops || !state.live) return
    setError(null)
    api.score(state.design, state.level, {
      analyzed: status.decided, correct: status.correct, energy_left: state.live.energy, start_energy: state.ops.energy,
    }).then((s) => { dispatch({ type: 'score', score: s }); (s.success ? sfx.success : sfx.failure)() }).catch((e: Error) => setError(e.message))
  }
  useEffect(() => { if (!score) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const maxLevel = state.catalog ? Object.keys(state.catalog.levels).length : 3
  const canNext = !!score?.success && state.level < maxLevel

  const share = async () => {
    if (!score) return
    const lvl = state.catalog?.levels[String(state.level)]?.name ?? `Level ${state.level}`
    const text = `AI Commander — The Exoplanet Hunter\n${lvl}: ${score.total}/100 · Rank: ${score.rank}\n${score.correct}/${score.analyzed} Kepler signals classified correctly. #NASASpaceApps`
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setCopied(true) }
    } catch { /* cancelled */ }
  }

  if (error) return <ScreenWrap><ErrorBox title="Couldn't load your mission report" message={error} onRetry={load} /></ScreenWrap>
  if (!score) return <ScreenWrap><Spinner label="Compiling mission report..." /></ScreenWrap>

  const parts = [
    { k: 'engineering', label: 'Spacecraft design', hint: 'How many safety checks passed', max: 25 },
    { k: 'efficiency', label: 'Saving resources', hint: 'Money and energy left over', max: 20 },
    { k: 'science', label: 'Science results', hint: 'Correct planet calls', max: 40 },
    { k: 'completion', label: 'Mission completion', hint: 'Stars you classified', max: 15 },
  ] as const

  return (
    <ScreenWrap>
      <MissionProgress current="results" />
      <StepTitle step="Mission report" title={score.success ? 'Mission success!' : 'Mission complete, but not a win yet'}
        hint={score.success
          ? (state.level < maxLevel ? 'Outstanding work, Commander. The next level is unlocked!' : 'Outstanding work, Commander. You beat the final level!')
          : `To win you need at least ${Math.round((state.catalog?.levels[String(state.level)]?.pass_accuracy ?? 0.6) * 100)}% correct calls on ${status.required} stars. You got ${Math.round(score.accuracy * 100)}% on ${score.analyzed}. Try again!`} />
      <div className="grid gap-5 md:grid-cols-[280px_1fr] [&>*]:min-w-0">
        <Panel className="flex flex-col items-center p-6 text-center">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120 }}
            className={`flex h-24 w-24 items-center justify-center sm:h-32 sm:w-32 rounded-full bg-gradient-to-br ${rankColor[score.rank]} shadow-[0_0_50px_-10px_rgba(34,211,238,0.8)]`}>
            <Award className="h-12 w-12 text-slate-950 sm:h-16 sm:w-16" />
          </motion.div>
          <div className="mt-4 font-display text-xl font-black text-white">{score.rank}</div>
          <div className="mt-1 font-display text-5xl font-black text-cyan-300 glow-text">{score.total}</div>
          <div className="text-xs text-slate-400">overall mission score / 100</div>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Stars analyzed', score.analyzed],
              ['Correct', score.correct],
              ['Incorrect', score.incorrect],
              ['Points', state.points],
              ['Accuracy', `${Math.round(score.accuracy * 100)}%`],
              ['Budget left', `$${score.budget_remaining}M`],
              ['Energy left', `${state.live?.energy ?? 0}/${state.ops?.energy ?? 0}`],
              ['Launch anomalies', state.launch?.anomalies.length ?? 0],
            ].map(([l, v]) => (
              <Panel key={String(l)} className="p-3">
                <div className="font-display text-xl font-bold text-white">{v}</div>
                <div className="text-[11px] text-slate-400">{l}</div>
              </Panel>
            ))}
          </div>
          <Panel className="p-5">
            <div className="hud-label mb-3">Score breakdown</div>
            <div className="space-y-3">
              {parts.map((p) => (
                <div key={p.k}>
                  <div className="mb-1 flex items-end justify-between gap-2 text-sm"><span className="text-slate-200">{p.label} <span className="block text-[11px] text-slate-400">{p.hint}</span></span><span className="shrink-0 font-display font-bold text-white tabular-nums">{score.breakdown[p.k]} / {p.max}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800"><motion.div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" initial={{ width: 0 }} animate={{ width: `${(score.breakdown[p.k] / p.max) * 100}%` }} transition={{ duration: 1 }} /></div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="p-5">
            <div className="hud-label mb-2">What made the difference</div>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
              {score.insights.map((t) => <li key={t}>{t}</li>)}
              {state.launch?.anomalies.map((a) => <li key={a.id}>Launch anomaly: {a.title} — {a.detail}</li>)}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button variant="ghost" onClick={share}><Share2 className="h-4 w-4" /> {copied ? 'COPIED!' : 'SHARE RESULTS'}</Button>
        <Button variant="ghost" onClick={() => dispatch({ type: 'newMission', level: state.level })}><RefreshCw className="h-4 w-4" /> {score.success ? 'PLAY AGAIN' : 'TRY AGAIN'}</Button>
        <Button className={canNext ? 'next-action' : ''} disabled={!canNext} title={canNext ? '' : score.success ? 'You have completed the final level!' : 'Succeed at this level to unlock the next one'}
          onClick={() => dispatch({ type: 'newMission', level: state.level + 1 })}>
          NEXT LEVEL <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {!canNext && score.success && state.level >= maxLevel && <p className="mt-3 text-center text-sm text-amber-300 sm:text-right">You conquered every level. Elite work, Commander!</p>}
    </ScreenWrap>
  )
}
