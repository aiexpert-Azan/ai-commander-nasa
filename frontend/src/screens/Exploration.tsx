import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Brain, CalendarClock, CheckCircle2, ChevronDown, Crosshair, HelpCircle, Navigation, Orbit, Sparkles, Trophy, XCircle, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type AIResult, type StarDetail } from '../api/client'
import { sfx } from '../audio/sound'
import { AIScientistCard } from '../components/AIScientistCard'
import { LightCurveChart } from '../components/LightCurveChart'
import { starStatus, StarGrid, statusColor } from '../components/StarGrid'
import { TransitDemo } from '../components/TransitDemo'
import { Button, ErrorBox, Hint, MissionProgress, Modal, Panel, ScreenWrap, Spinner } from '../components/ui'
import { missionStatus, useGame, type DecisionRecord } from '../game/store'

function Hud({ icon: Icon, label, value, sub, warn }: { icon: typeof Zap; label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <Panel className={`p-2.5 sm:p-3 ${warn ? 'ring-1 ring-amber-400/60' : ''}`}>
      <div className="flex items-center gap-1.5"><Icon className={`h-3.5 w-3.5 shrink-0 ${warn ? 'text-amber-400' : 'text-cyan-300'}`} /><span className="hud-label truncate">{label}</span></div>
      <div className="mt-0.5 font-display text-xl font-bold text-white tabular-nums sm:text-2xl">{value}</div>
      {sub && <div className="text-[11px] leading-tight text-slate-400">{sub}</div>}
    </Panel>
  )
}

const difficultyText = { clear: 'easy to read', moderate: 'medium', ambiguous: 'tricky' } as const

export function Exploration() {
  const { state, dispatch } = useGame()
  const ops = state.ops
  const live = state.live
  const guided = state.mode !== 'commander'
  const [selected, setSelected] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, StarDetail>>({})
  const [ai, setAi] = useState<Record<string, AIResult>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<DecisionRecord | null>(null)
  const [explainOpen, setExplainOpen] = useState(guided && !state.transitIntroSeen)
  const detailRef = useRef<HTMLDivElement>(null)
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
    return <ScreenWrap><ErrorBox title="No active mission" message="Design and launch a spacecraft first." /><Button className="mt-4" onClick={() => dispatch({ type: 'go', screen: 'briefing' })}>GO TO BRIEFING</Button></ScreenWrap>
  }

  const star = state.stars.find((s) => s.id === selected)
  const observed = selected ? state.observed.includes(selected) : false
  const decision = selected ? state.decisions[selected] : undefined
  const detail = selected ? details[selected] : undefined
  const aiRes = selected ? ai[selected] : undefined
  const canAI = live.aiCredits > 0 && live.energy >= ops.energy_per_ai && !aiRes && !decision && loading !== 'ai'

  const closeExplainer = () => { setExplainOpen(false); dispatch({ type: 'transitIntroSeen' }) }

  const select = (id: string) => {
    sfx.click()
    setSelected(id)
    setAiError(null)
    // On phones the detail panel is below the grid: bring it into view.
    if (window.innerWidth < 1024) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const observe = () => {
    if (!selected || !status.canObserve) return
    sfx.scan()
    // The explainer has done its job once the player looks at a real graph; free up phone screen space.
    if (explainOpen) closeExplainer()
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
      .catch(() => { dispatch({ type: 'aiRefund' }); setAiError('The AI Scientist is unavailable right now. Your credit and energy were refunded. Trust your own analysis!'); sfx.error() })
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
    if (next) select(next.id)
    else setSelected(null)
  }

  const lowEnergy = live.energy < ops.energy_per_obs * 2
  const lowDays = live.scienceDays < ops.days_per_obs * 2

  // One clear next action at a time.
  const nextAction = status.done ? 'Mission complete! See your results.'
    : !star ? 'Tap a star on the target grid (or pick one from the list).'
      : !observed ? 'Point your telescope at this star to measure its brightness.'
        : decision ? 'Pick another star to continue.'
          : !detail ? 'Receiving data…'
            : 'Look for a dip inside the shaded window, then make your call.'

  return (
    <ScreenWrap wide>
      <MissionProgress current="explore" />
      <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <div className="hud-label">Explore · Level {state.level}</div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Planet hunt</h1>
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-1 flex justify-between text-xs text-slate-200"><span>Stars classified</span><span className="tabular-nums">{status.decided} of {status.required}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={status.required} aria-valuenow={status.decided}>
            <motion.div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400" animate={{ width: `${Math.min(100, (status.decided / status.required) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <Hud icon={Zap} label="Energy" value={live.energy} sub={`${ops.energy_per_obs} per look · ${ops.energy_per_ai} per AI`} warn={lowEnergy} />
        <Hud icon={CalendarClock} label="Days left" value={live.scienceDays} sub={`observing days · ${ops.days_per_obs} per look · −${ops.wrong_extra_days} if wrong`} warn={lowDays} />
        <Hud icon={Brain} label="AI credits" value={live.aiCredits} sub="1 per AI question" warn={live.aiCredits === 0} />
        <Hud icon={Trophy} label="Points" value={state.points} sub={`+${ops.points_correct} right · ${ops.points_wrong} wrong`} />
      </div>

      <div className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${guided ? 'border-cyan-300/40 bg-cyan-400/10 text-cyan-50' : 'border-cyan-300/10 text-slate-200'}`} role="status" aria-live="polite">
        <Navigation className="h-4 w-4 shrink-0 text-cyan-300" /> <span><b>Next:</b> {nextAction}</span>
      </div>

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={() => { setError(null); if (!state.stars.length) loadStars() }} /></div>}

      {status.done && (
        <Panel className="mb-4 flex flex-col items-center justify-between gap-3 border-emerald-400/30 p-4 sm:flex-row">
          <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 shrink-0 text-emerald-300" /><span className="text-sm text-slate-200"><b>{status.endReason}.</b> Your mission is complete. See how you did!</span></div>
          <Button variant="success" className="next-action w-full sm:w-auto" onClick={() => dispatch({ type: 'go', screen: 'results' })}>SEE MY RESULTS →</Button>
        </Panel>
      )}

      {/* What am I looking for? */}
      <Panel className="mb-4 overflow-hidden">
        <button onClick={() => (explainOpen ? closeExplainer() : setExplainOpen(true))} aria-expanded={explainOpen}
          className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left">
          <span className="flex items-center gap-2 font-display text-sm font-bold text-white"><HelpCircle className="h-4 w-4 text-amber-300" /> What am I looking for?</span>
          <ChevronDown className={`h-4 w-4 text-slate-300 transition ${explainOpen ? 'rotate-180' : ''}`} />
        </button>
        {explainOpen && (
          <div className="grid gap-4 px-4 pb-4 md:grid-cols-[minmax(0,320px)_1fr]">
            <TransitDemo />
            <div className="space-y-2 text-sm text-slate-200">
              <p><b className="text-white">Planet candidate:</b> a small, smooth dip inside the shaded window, like the drawing. Planets usually block less than 1–2% of a star's light.</p>
              <p><b className="text-white">False positive:</b> a very deep or V-shaped dip, a dip outside the window, or just random noise. Often it's two stars eclipsing each other.</p>
              <p className="text-xs text-slate-400">The drawing is an illustration. The graphs in the game are real, historical Kepler measurements, folded so that every repeat of the dip lines up in the middle.</p>
              <Button variant="ghost" className="!py-2" onClick={closeExplainer}>GOT IT</Button>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr] lg:gap-5 [&>*]:min-w-0">
        <Panel className="p-3">
          <div className="mb-2 flex items-center justify-between px-1"><span className="hud-label">Target field</span><span className="text-[11px] text-slate-400">{state.stars.length} stars</span></div>
          {state.stars.length ? (
            <StarGrid stars={state.stars} selected={selected} observed={state.observed} decisions={state.decisions} onSelect={select} highlightNew={guided && !selected} />
          ) : !error && <Spinner label="Loading Kepler targets..." />}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-slate-300">
            {(['new', 'observed', 'correct', 'incorrect'] as const).map((k) => (
              <span key={k} className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor[k] }} /> {k === 'new' ? 'not observed' : k}</span>
            ))}
          </div>
          {state.stars.length > 0 && (
            <ul className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:max-h-60 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden" aria-label="Star list">
              {state.stars.map((s) => {
                const st = starStatus(s.id, state.observed, state.decisions)
                return (
                  <li key={s.id} className="shrink-0">
                    <button onClick={() => select(s.id)} aria-pressed={selected === s.id}
                      className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs ${selected === s.id ? 'bg-cyan-400/20 text-white ring-1 ring-cyan-300/60' : 'bg-space-900/60 text-slate-200 hover:bg-white/5'}`}>
                      <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: statusColor[st] }} />
                      <span className="whitespace-nowrap">{s.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <div ref={detailRef} className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))]">
          <Panel className="min-h-[360px] p-4 sm:p-5">
            {!star && (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-slate-300">
                <Crosshair className="mb-3 h-10 w-10 text-cyan-300/60" />
                <p className="max-w-xs text-sm">Tap a star to select it. Each one is a real star that NASA's Kepler telescope watched for years.</p>
              </div>
            )}

            {star && (
              <div>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-bold text-white">{star.name}</h2>
                    <div className="text-xs text-slate-400">Kepler Object of Interest {star.koi_name} · difficulty: <span className="text-cyan-300">{difficultyText[star.difficulty]}</span></div>
                  </div>
                  {decision && <span className={`rounded-full px-3 py-1 text-xs font-bold ${decision.correct ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>Catalog: {decision.catalog_label}</span>}
                </div>

                {!observed && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cyan-300/20 px-3 py-10 text-center">
                    <Orbit className="mb-3 h-10 w-10 text-cyan-300" />
                    <p className="mb-4 text-sm text-slate-200">Looking at this star costs <b>{ops.energy_per_obs} energy</b> and <b>{ops.days_per_obs} observing days</b>.</p>
                    <Button className={`w-full sm:w-auto ${guided ? 'next-action' : ''}`} disabled={!status.canObserve || status.decided >= status.required} onClick={observe}><Crosshair className="h-4 w-4" /> POINT TELESCOPE</Button>
                    {!status.canObserve && <p className="mt-2 text-xs text-amber-300">Not enough energy or observing days for another look.</p>}
                  </div>
                )}

                {observed && !detail && <Spinner label="Receiving brightness data from your spacecraft..." />}

                {observed && detail && (
                  <>
                    <LightCurveChart phase={detail.phase} signal={detail.signal} showTrend={ops.tools.includes('trend')} />
                    {ops.tools.includes('trend') && <p className="mt-1 text-[11px] text-amber-300">Amber line = smoothed trend (bonus from your telescope)</p>}
                    <div className="mt-3">
                      <Hint title="Reading the graph">Each dot is the star's brightness. The <b className="text-cyan-200">shaded "dip window"</b> is where a planet's dip should appear, based on Kepler's measured timing. Does the line drop there?</Hint>
                    </div>
                    {ops.tools.includes('depth') && (
                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-space-900/70 p-3 text-center">
                        <div><div className="font-display text-lg font-bold text-white">{detail.features.depth_ppt.toFixed(2)}</div><div className="text-[10px] text-slate-400">dip depth (ppt)</div></div>
                        <div><div className="font-display text-lg font-bold text-white">{detail.features.noise_ppt.toFixed(2)}</div><div className="text-[10px] text-slate-400">noise (ppt)</div></div>
                        <div><div className="font-display text-lg font-bold text-white">{detail.features.snr.toFixed(1)}</div><div className="text-[10px] text-slate-400">dip ÷ noise</div></div>
                      </div>
                    )}

                    {/* AI Scientist */}
                    <AnimatePresence>
                      {(aiRes || loading === 'ai' || aiError) && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 p-4" aria-live="polite">
                          <div className="mb-2 flex items-center gap-2"><Bot className="h-5 w-5 text-violet-300" /><span className="font-display text-sm font-bold text-violet-100">AI SCIENTIST</span><span className="rounded bg-violet-400/20 px-1.5 text-[10px] text-violet-200">experimental</span></div>
                          {loading === 'ai' && <div className="flex items-center gap-2 text-sm text-violet-200"><span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /> The AI is studying this graph...</div>}
                          {aiError && <p className="text-sm text-amber-200">{aiError}</p>}
                          {aiRes && <AIScientistCard result={aiRes} />}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!decision ? (
                      <div className="mt-4">
                        <div className="mb-2 text-sm font-semibold text-white">Your call, Commander:</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button variant="success" className="!h-auto !py-3" disabled={loading === 'decide'} onClick={() => decide('candidate')}>
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span className="flex flex-col items-start"><span>PLANET CANDIDATE</span><span className="font-sans text-[11px] font-normal normal-case tracking-normal opacity-90">The dip looks like a planet</span></span>
                          </Button>
                          <Button variant="danger" className="!h-auto !py-3" disabled={loading === 'decide'} onClick={() => decide('false_positive')}>
                            <XCircle className="h-5 w-5 shrink-0" />
                            <span className="flex flex-col items-start"><span>FALSE POSITIVE</span><span className="font-sans text-[11px] font-normal normal-case tracking-normal opacity-90">Not a planet signal</span></span>
                          </Button>
                        </div>
                        <Button variant="ghost" disabled={!canAI} onClick={consultAI} className="mt-2 w-full !border-violet-400/40 !text-violet-100 hover:!bg-violet-500/10">
                          <Bot className="h-4 w-4" /> {aiRes ? 'AI ALREADY ASKED' : live.aiCredits === 0 ? 'NO AI CREDITS LEFT' : `ASK THE AI SCIENTIST (${live.aiCredits} left · ${ops.energy_per_ai} energy)`}
                        </Button>
                        <div className="mt-2"><Hint title="Why AI can be wrong">The AI only learned from 700 example stars. It finds patterns, but it doesn't understand physics, so it makes mistakes, especially with tricky signals.</Hint></div>
                      </div>
                    ) : (
                      <div className={`mt-4 rounded-xl p-3 text-sm ${decision.correct ? 'bg-emerald-400/10 text-emerald-100' : 'bg-rose-400/10 text-rose-100'}`}>
                        You called it <b>{decision.player_decision}</b>: {decision.correct ? 'correct' : 'incorrect'} ({decision.points > 0 ? '+' : ''}{decision.points} pts). {decision.lesson}
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-slate-500">"False positive" here also covers "no reliable planet signal".</p>
                  </>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Discovery feedback */}
      <Modal open={!!feedback} onClose={() => setFeedback(null)} label="Decision result" maxWidth="max-w-md">
        {feedback && (
          <Panel className={`p-5 text-center sm:p-6 ${feedback.correct ? 'ring-1 ring-emerald-400/50' : 'ring-1 ring-rose-400/50'}`}>
            {feedback.correct ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" /> : <XCircle className="mx-auto h-12 w-12 text-rose-400" />}
            <h3 className="mt-2 font-display text-2xl font-black text-white">{feedback.correct ? 'Great call!' : 'Not quite'}</h3>
            <div className={`mt-1 font-display text-3xl font-black ${feedback.points > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{feedback.points > 0 ? '+' : ''}{feedback.points} pts</div>
            <div className="mt-3 text-sm text-slate-300">NASA's Kepler catalog says: <b className="text-white">{feedback.catalog_label}</b></div>
            <p className="mt-3 text-left text-sm text-slate-200">{feedback.lesson}</p>
            {!feedback.correct && <p className="mt-2 text-left text-xs text-amber-200">Double-checking costs time: −{ops.wrong_extra_days} observing days.</p>}
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-300">
              <div className="rounded-lg bg-space-900/70 p-2"><div className="font-display text-base font-bold text-white">{live.energy}</div>energy</div>
              <div className="rounded-lg bg-space-900/70 p-2"><div className="font-display text-base font-bold text-white">{live.scienceDays}</div>days</div>
              <div className="rounded-lg bg-space-900/70 p-2"><div className="font-display text-base font-bold text-white">{live.aiCredits}</div>AI credits</div>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">Source: {feedback.source}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {status.done ? (
                <Button variant="success" className="sm:col-span-2" data-autofocus onClick={() => { setFeedback(null); dispatch({ type: 'go', screen: 'results' }) }}>SEE MY RESULTS →</Button>
              ) : (
                <>
                  <Button data-autofocus onClick={nextStar}>NEXT STAR →</Button>
                  <Button variant="ghost" onClick={() => setFeedback(null)}>BACK TO MAP</Button>
                </>
              )}
            </div>
          </Panel>
        )}
      </Modal>
    </ScreenWrap>
  )
}
