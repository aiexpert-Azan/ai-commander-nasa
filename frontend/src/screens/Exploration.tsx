import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Brain, CalendarClock, CheckCircle2, Crosshair, Info, Orbit, Sparkles, Trophy, XCircle, Zap } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, type AIResult, type StarDetail } from '../api/client'
import { sfx } from '../audio/sound'
import { LightCurveChart } from '../components/LightCurveChart'
import { StarGrid } from '../components/StarGrid'
import { Button, ErrorBox, Panel, ScreenWrap, Spinner } from '../components/ui'
import { missionStatus, useGame, type DecisionRecord } from '../game/store'

function Hud({ icon: Icon, label, value, sub, warn }: { icon: typeof Zap; label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <Panel className={`p-3 ${warn ? 'ring-1 ring-amber-400/50' : ''}`}>
      <div className="flex items-center gap-1.5"><Icon className={`h-3.5 w-3.5 ${warn ? 'text-amber-400' : 'text-cyan-300'}`} /><span className="hud-label">{label}</span></div>
      <div className="mt-1 font-display text-xl font-bold text-white tabular-nums sm:text-2xl">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </Panel>
  )
}

export function Exploration() {
  const { state, dispatch } = useGame()
  const ops = state.ops
  const live = state.live
  const [selected, setSelected] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, StarDetail>>({})
  const [ai, setAi] = useState<Record<string, AIResult>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<DecisionRecord | null>(null)
  const status = missionStatus(state)

  const loadStars = useCallback(() => {
    if (!ops) return
    setError(null)
    api.stars(state.level, ops.targets, state.seed).then((r) => dispatch({ type: 'stars', stars: r.stars })).catch((e: Error) => setError(e.message))
  }, [ops, state.level, state.seed, dispatch])

  useEffect(() => { if (ops && state.stars.length === 0) loadStars() }, [ops, state.stars.length, loadStars])

  const fetchDetail = useCallback((id: string) => {
    if (details[id]) return
    setLoading('signal')
    api.star(id).then((d) => setDetails((m) => ({ ...m, [id]: d }))).catch((e: Error) => setError(e.message)).finally(() => setLoading(null))
  }, [details])

  // Re-fetch signals for stars observed before a page reload.
  useEffect(() => { if (selected && state.observed.includes(selected)) fetchDetail(selected) }, [selected, state.observed, fetchDetail])

  if (!ops || !live) {
    return <ScreenWrap><ErrorBox message="No active mission. Design and launch a spacecraft first." /><Button className="mt-4" onClick={() => dispatch({ type: 'go', screen: 'briefing' })}>GO TO BRIEFING</Button></ScreenWrap>
  }

  const star = state.stars.find((s) => s.id === selected)
  const observed = selected ? state.observed.includes(selected) : false
  const decision = selected ? state.decisions[selected] : undefined
  const detail = selected ? details[selected] : undefined
  const aiRes = selected ? ai[selected] : undefined
  const canAI = live.aiCredits > 0 && live.energy >= ops.energy_per_ai && !aiRes && !decision && loading !== 'ai'

  const observe = () => {
    if (!selected || !status.canObserve) return
    sfx.scan()
    dispatch({ type: 'observe', id: selected })
    fetchDetail(selected)
  }

  const consultAI = () => {
    if (!selected || !canAI) return
    sfx.click()
    setAiError(null)
    dispatch({ type: 'aiConsult', id: selected })
    setLoading('ai')
    api.analyze(selected)
      .then((r) => { setAi((m) => ({ ...m, [selected]: r })); sfx.select() })
      .catch(() => { dispatch({ type: 'aiRefund' }); setAiError('AI Scientist temporarily unavailable. Your credit was refunded — continue with your own analysis.'); sfx.error() })
      .finally(() => setLoading(null))
  }

  const decide = (choice: 'candidate' | 'false_positive') => {
    if (!selected || decision) return
    setLoading('decide')
    api.decide(selected, choice)
      .then((r) => {
        const rec: DecisionRecord = { ...r, points: r.correct ? ops.points_correct : ops.points_wrong, usedAI: !!ai[selected] }
        dispatch({ type: 'decide', record: rec })
        setFeedback(rec);
        (r.correct ? sfx.success : sfx.failure)()
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(null))
  }

  const nextStar = () => {
    setFeedback(null)
    const next = state.stars.find((s) => !state.observed.includes(s.id) && s.id !== selected)
    setSelected(next?.id ?? null)
  }

  const lowEnergy = live.energy < ops.energy_per_obs * 2
  const lowDays = live.scienceDays < ops.days_per_obs * 2

  return (
    <ScreenWrap wide>
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <div className="hud-label">Mission operations</div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Exoplanet hunt</h1>
          <p className="text-sm text-cyan-100/80">{selected ? (observed ? (decision ? 'Pick another star to continue.' : 'Study the dip, then make your call.') : 'Point the telescope to observe this star.') : 'Select a star on the target grid.'}</p>
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-1 flex justify-between text-xs text-slate-300"><span>Discovery progress</span><span>{status.decided}/{status.required}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800"><motion.div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400" animate={{ width: `${(status.decided / status.required) * 100}%` }} /></div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Hud icon={Zap} label="Energy" value={live.energy} sub={`${ops.energy_per_obs}/obs · ${ops.energy_per_ai}/AI`} warn={lowEnergy} />
        <Hud icon={CalendarClock} label="Science days" value={live.scienceDays} sub={`${ops.days_per_obs}/obs · +${ops.wrong_extra_days} if wrong`} warn={lowDays} />
        <Hud icon={Brain} label="AI credits" value={live.aiCredits} sub="1 per consult" warn={live.aiCredits === 0} />
        <Hud icon={Trophy} label="Discovery pts" value={state.points} sub={`+${ops.points_correct} correct · ${ops.points_wrong} wrong`} />
      </div>

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={() => { setError(null); if (!state.stars.length) loadStars() }} /></div>}

      {status.done && (
        <Panel className="mb-4 flex flex-col items-center justify-between gap-3 border-emerald-400/30 p-4 sm:flex-row">
          <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-emerald-300" /><span className="text-sm text-slate-200"><b>{status.endReason}.</b> Your mission is complete — see how you did.</span></div>
          <Button variant="success" onClick={() => dispatch({ type: 'go', screen: 'results' })}>VIEW MISSION RESULTS</Button>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr] [&>*]:min-w-0">
        <Panel className="p-3">
          <div className="mb-2 flex items-center justify-between px-1"><span className="hud-label">Target field</span><span className="text-[10px] text-slate-500">{state.stars.length} targets</span></div>
          {state.stars.length ? (
            <StarGrid stars={state.stars} selected={selected} observed={state.observed} decisions={state.decisions} onSelect={(id) => { sfx.click(); setSelected(id); setAiError(null) }} />
          ) : !error && <Spinner label="Loading Kepler targets..." />}
          <div className="mt-2 flex flex-wrap gap-3 px-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-sky-100" /> unobserved</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" /> observed</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-400" /> correct</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-400" /> incorrect</span>
          </div>
        </Panel>

        <Panel className="min-h-[420px] p-4 sm:p-5">
          {!star && (
            <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center text-slate-400">
              <Crosshair className="mb-3 h-10 w-10 text-cyan-300/60" />
              <p className="max-w-xs text-sm">Tap a star on the target grid. Each one is a real Kepler target with a historical light curve.</p>
            </div>
          )}

          {star && (
            <div>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">{star.name}</h2>
                  <div className="text-xs text-slate-400">Kepler Object of Interest {star.koi_name} · signal difficulty: <span className="text-cyan-300">{star.difficulty}</span></div>
                </div>
                {decision && <span className={`rounded-full px-3 py-1 text-xs font-bold ${decision.correct ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>Catalog: {decision.catalog_label}</span>}
              </div>

              {!observed && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cyan-300/20 py-14 text-center">
                  <Orbit className="mb-3 h-10 w-10 text-cyan-300" />
                  <p className="mb-4 text-sm text-slate-300">Observing costs <b>{ops.energy_per_obs} energy</b> and <b>{ops.days_per_obs} science days</b>.</p>
                  <Button disabled={!status.canObserve || status.decided >= status.required} onClick={observe}><Crosshair className="h-4 w-4" /> POINT TELESCOPE</Button>
                  {!status.canObserve && <p className="mt-2 text-xs text-amber-300">Not enough energy or science days for another observation.</p>}
                </div>
              )}

              {observed && !detail && <Spinner label="Downlinking light curve..." />}

              {observed && detail && (
                <>
                  <LightCurveChart phase={detail.phase} signal={detail.signal} showTrend={ops.tools.includes('trend')} />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <Info className="h-3.5 w-3.5" /> Historical Kepler photometry (MAST), phase-folded at the catalog period. Drag the slider under the chart to zoom.
                    {ops.tools.includes('trend') && <span className="text-amber-300">Amber = smoothed trend (telescope tool)</span>}
                  </div>
                  {ops.tools.includes('depth') && (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-space-900/70 p-3 text-center">
                      <div><div className="font-display text-lg font-bold text-white">{detail.features.depth_ppt.toFixed(2)}</div><div className="text-[10px] text-slate-400">dip depth (ppt)</div></div>
                      <div><div className="font-display text-lg font-bold text-white">{detail.features.noise_ppt.toFixed(2)}</div><div className="text-[10px] text-slate-400">noise (ppt)</div></div>
                      <div><div className="font-display text-lg font-bold text-white">{detail.features.snr.toFixed(1)}</div><div className="text-[10px] text-slate-400">dip / noise</div></div>
                    </div>
                  )}

                  {/* AI Scientist */}
                  <AnimatePresence>
                    {(aiRes || loading === 'ai' || aiError) && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 p-4">
                        <div className="mb-2 flex items-center gap-2"><Bot className="h-5 w-5 text-violet-300" /><span className="font-display text-sm font-bold text-violet-100">AI SCIENTIST</span><span className="rounded bg-violet-400/20 px-1.5 text-[10px] text-violet-200">experimental</span></div>
                        {loading === 'ai' && <div className="flex items-center gap-2 text-sm text-violet-200"><span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /> Running the neural network on this signal...</div>}
                        {aiError && <p className="text-sm text-amber-200">{aiError}</p>}
                        {aiRes && (
                          <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                            <div className="text-center">
                              <div className="font-display text-3xl font-black text-white">{aiRes.score.toFixed(2)}</div>
                              <div className="text-[10px] text-slate-400">candidate score (threshold {aiRes.threshold.toFixed(2)})</div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-violet-400" style={{ width: `${aiRes.score * 100}%` }} /></div>
                              <div className={`mt-2 text-xs font-bold ${aiRes.predicted_class === 'CANDIDATE' ? 'text-emerald-300' : 'text-rose-300'}`}>Leans {aiRes.predicted_class}</div>
                            </div>
                            <div className="text-sm text-slate-200">
                              <p>{aiRes.explanation}</p>
                              <p className="mt-2 text-[11px] text-amber-200/90">⚠ {aiRes.disclaimer}</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!decision ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <Button variant="success" disabled={loading === 'decide'} onClick={() => decide('candidate')}><CheckCircle2 className="h-4 w-4" /> PLANET CANDIDATE</Button>
                      <Button variant="danger" disabled={loading === 'decide'} onClick={() => decide('false_positive')}><XCircle className="h-4 w-4" /> FALSE POSITIVE</Button>
                      <Button variant="ghost" disabled={!canAI} onClick={consultAI} className="!border-violet-400/40 !text-violet-100 hover:!bg-violet-500/10">
                        <Bot className="h-4 w-4" /> {aiRes ? 'AI CONSULTED' : `CONSULT AI (${live.aiCredits})`}
                      </Button>
                    </div>
                  ) : (
                    <div className={`mt-4 rounded-xl p-3 text-sm ${decision.correct ? 'bg-emerald-400/10 text-emerald-100' : 'bg-rose-400/10 text-rose-100'}`}>
                      You called it <b>{decision.player_decision}</b> · {decision.correct ? 'correct' : 'incorrect'} ({decision.points > 0 ? '+' : ''}{decision.points} pts). {decision.lesson}
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-slate-500">"False positive" here also covers "no reliable planet signal".</p>
                </>
              )}
            </div>
          )}
        </Panel>
      </div>

      {/* Discovery feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} className="w-full max-w-md">
              <Panel className={`p-6 text-center ${feedback.correct ? 'ring-1 ring-emerald-400/50' : 'ring-1 ring-rose-400/50'}`}>
                {feedback.correct ? <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" /> : <XCircle className="mx-auto h-14 w-14 text-rose-400" />}
                <h3 className="mt-2 font-display text-2xl font-black text-white">{feedback.correct ? 'Great call!' : 'Not quite'}</h3>
                <div className={`mt-1 font-display text-3xl font-black ${feedback.points > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{feedback.points > 0 ? '+' : ''}{feedback.points} pts</div>
                <div className="mt-3 text-sm text-slate-300">Historical catalog classification: <b className="text-white">{feedback.catalog_label}</b></div>
                <p className="mt-3 text-left text-sm text-slate-300">{feedback.lesson}</p>
                {!feedback.correct && <p className="mt-2 text-left text-xs text-amber-200">Re-observation cost: −{ops.wrong_extra_days} science days.</p>}
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-space-900/70 p-2"><div className="font-display text-base font-bold text-white">{live.energy}</div>energy</div>
                  <div className="rounded-lg bg-space-900/70 p-2"><div className="font-display text-base font-bold text-white">{live.scienceDays}</div>days</div>
                  <div className="rounded-lg bg-space-900/70 p-2"><div className="font-display text-base font-bold text-white">{live.aiCredits}</div>AI credits</div>
                </div>
                <p className="mt-3 text-[10px] text-slate-500">Source: {feedback.source}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {status.done ? (
                    <Button variant="success" className="sm:col-span-2" onClick={() => { setFeedback(null); dispatch({ type: 'go', screen: 'results' }) }}>VIEW MISSION RESULTS</Button>
                  ) : (
                    <>
                      <Button onClick={nextStar}>NEXT STAR</Button>
                      <Button variant="ghost" onClick={() => setFeedback(null)}>VIEW MISSION STATUS</Button>
                    </>
                  )}
                </div>
              </Panel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenWrap>
  )
}
