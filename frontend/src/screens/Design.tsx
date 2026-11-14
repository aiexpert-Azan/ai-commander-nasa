import { AnimatePresence, motion } from 'framer-motion'
import { Antenna, Battery, Check, ChevronDown, Coins, Cpu, Globe2, Loader2, Radio, Rocket, ShieldAlert, Sun, Telescope, Wand2, Weight, Wifi } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Component, Resources } from '../api/client'
import { sfx } from '../audio/sound'
import { SpacecraftPreview } from '../components/SpacecraftPreview'
import { Button, ErrorBox, Hint, Meter, MissionProgress, Panel, ScreenWrap, Spinner, StepTitle } from '../components/ui'
import { autoBuild, isCategory, lessons, metricInfo, SLOT_ORDER, slotInfo, suggestedDesign } from '../game/guide'
import { useGame, type DesignSlot } from '../game/store'
import { useEvaluation } from '../game/useEvaluation'

const slotIcon: Record<DesignSlot, typeof Telescope> = {
  telescope: Telescope, instrument: Cpu, solar: Sun, antenna: Antenna, launch: Rocket, orbit: Globe2, ground_station: Radio,
}

interface Option { id: string; name: string; benefit: string; description: string; cost: number; mass?: number; power?: number; risk?: number; extra?: string }

function fmtSigned(n: number, unit: string, prefix = '') {
  if (n === 0) return null
  return `${n > 0 ? '+' : '−'}${prefix}${Math.abs(n)}${unit}`
}

/** Resource meters with plain-language meaning and exact values. */
function ResourceMeters({ r, hasStation, maxRisk, compact = false }: { r: Resources; hasStation: boolean; maxRisk: number | null; compact?: boolean }) {
  const spare = r.power_generation - r.power_demand
  return (
    <div className={compact ? 'grid grid-cols-2 gap-x-4 gap-y-2' : 'space-y-3'}>
      <Meter compact={compact} icon={<Coins className="h-3.5 w-3.5" />} label="Money" value={r.cost} max={r.budget} display={`$${r.cost}M / ${r.budget}M`}
        invert warnAt={r.budget * 0.9} failAt={r.budget} sub={compact ? undefined : metricInfo.budget} />
      <Meter compact={compact} icon={<Weight className="h-3.5 w-3.5" />} label="Weight" value={r.mass} max={Math.max(r.launch_capacity, r.mass, 1)}
        display={r.launch_capacity ? `${r.mass} / ${r.launch_capacity} kg` : `${r.mass} kg`} invert warnAt={r.launch_capacity * 0.9}
        failAt={r.launch_capacity || Infinity} sub={compact ? undefined : `${metricInfo.mass} The rocket's limit is the full bar.`} />
      <Meter compact={compact} icon={<Battery className="h-3.5 w-3.5" />} label="Spare power" value={r.power_generation} max={Math.max(r.power_demand * 1.6, 1)}
        display={`${spare >= 0 ? '+' : ''}${spare} W`} warnAt={r.power_demand * 1.1} failAt={r.power_demand} sub={compact ? undefined : metricInfo.power} />
      {!compact && (
        <Meter compact={compact} icon={<Wifi className="h-3.5 w-3.5" />} label="Data sent home" value={r.downlink} max={Math.max(r.data_rate * 2, r.downlink, 1)}
          display={hasStation ? `${r.downlink} Gbit/day (need ${r.data_rate})` : 'needs ground station'}
          warnAt={r.data_rate * 1.25} failAt={hasStation ? r.data_rate : -1} sub={metricInfo.comms} />
      )}
      <Meter compact={compact} icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Risk" value={r.risk} max={50} display={`${r.risk}%`} invert warnAt={15}
        failAt={maxRisk ?? 30} sub={compact ? undefined : metricInfo.risk + (maxRisk !== null ? ` Limit: ${maxRisk}%.` : '')} />
    </div>
  )
}

export function DesignScreen() {
  const { state, dispatch } = useGame()
  const cat = state.catalog
  const { evaluation, error, retry, pending } = useEvaluation(state.design, state.level)
  const [active, setActive] = useState<DesignSlot>(state.designFocus ?? 'telescope')
  const [building, setBuilding] = useState(false)
  const [buildMsg, setBuildMsg] = useState<string | null>(null)
  const [buildErr, setBuildErr] = useState<string | null>(null)
  const [details, setDetails] = useState(state.mode === 'commander')
  const optionsRef = useRef<HTMLDivElement>(null)

  // Consume a "Fix it" focus request from the readiness review.
  useEffect(() => {
    if (state.designFocus) {
      dispatch({ type: 'focusDesign', slot: null })
      setTimeout(() => optionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!cat) return <ScreenWrap><Spinner label="Loading spacecraft parts..." /></ScreenWrap>
  const lvl = cat.levels[String(state.level)]
  const guided = state.mode !== 'commander'
  const showAutoBuild = guided || lvl.guided
  const rec = showAutoBuild ? suggestedDesign(cat, state.level) : null
  const r = evaluation?.resources
  const chosen = SLOT_ORDER.filter((s) => state.design[s])
  const allChosen = chosen.length === SLOT_ORDER.length
  const nextSlot = SLOT_ORDER.find((s) => !state.design[s] && s !== active) ?? SLOT_ORDER.find((s) => !state.design[s])
  const orbit = cat.components.orbit.find((o) => o.id === state.design.orbit)

  const options: Option[] = isCategory(active)
    ? cat.components[active].map((c: Component) => ({
        ...c,
        extra: c.capacity && orbit ? (c.capacity[orbit.id] ? `Lifts ${c.capacity[orbit.id]} kg to ${orbit.name}` : `Cannot reach ${orbit.name}`) : undefined,
      }))
    : cat.ground_stations.map((g) => ({
        id: g.id, name: g.name, cost: g.cost, description: g.description,
        benefit: orbit ? `Signal strength for ${orbit.name}: ${Math.round((g.factor[orbit.id] ?? 0) * 100)}%` : 'Pick an orbit to see signal strength',
      }))
  const current = options.find((o) => o.id === state.design[active])

  const focusSlot = (s: DesignSlot) => {
    setActive(s)
    if (window.innerWidth < 1024) optionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pick = (id: string) => {
    sfx.select()
    const wasEmpty = !state.design[active]
    dispatch({ type: 'select', category: active, id })
    setBuildMsg(null)
    // Guided players move on to the next empty part automatically.
    if (wasEmpty && guided) {
      const following = SLOT_ORDER.slice(SLOT_ORDER.indexOf(active) + 1).find((s) => !state.design[s])
      if (following) setTimeout(() => setActive(following), 350)
    }
  }

  const runAutoBuild = async () => {
    setBuilding(true); setBuildErr(null); setBuildMsg(null)
    try {
      const { design, evaluation: ev } = await autoBuild(cat, state.level)
      dispatch({ type: 'setDesign', design })
      sfx.deploy()
      setBuildMsg(ev.launch_ready
        ? 'Done! This spacecraft is launch-ready. Tap any part to see why it was picked, or change it.'
        : 'Built a starting design, but it still has problems. Check the review screen for fixes.')
    } catch (e) {
      setBuildErr((e as Error).message)
    } finally { setBuilding(false) }
  }

  const goNext = () => {
    if (allChosen) dispatch({ type: 'go', screen: 'readiness' })
    else if (nextSlot) focusSlot(nextSlot)
  }
  const nextLabel = allChosen ? 'NEXT: CHECK MY SPACECRAFT →' : `NEXT: CHOOSE ${slotInfo[nextSlot ?? active].label.toUpperCase()} →`
  const info = slotInfo[active]
  const ActiveIcon = slotIcon[active]

  return (
    <ScreenWrap wide bottomBar>
      <MissionProgress current="design" />
      <StepTitle step={`Build · ${chosen.length} of ${SLOT_ORDER.length} parts chosen`} title="Build your spacecraft"
        hint="Choose one option for each part. Every choice is a trade-off between money, weight, power and risk." />

      {showAutoBuild && (
        <Panel className="mb-4 flex flex-col gap-3 border-cyan-300/30 p-4 sm:flex-row sm:items-center">
          <Wand2 className="hidden h-6 w-6 shrink-0 text-cyan-300 sm:block" aria-hidden />
          <div className="flex-1 text-sm text-slate-200">
            <b className="text-white">New to this?</b> Auto-Build picks a complete, launch-ready spacecraft (including the ground station). Parts marked <b className="text-cyan-300">Recommended</b> are its picks.
          </div>
          <Button variant={chosen.length === 0 && guided ? 'primary' : 'ghost'} className={`w-full sm:w-auto ${chosen.length === 0 && guided ? 'next-action' : ''}`} disabled={building} onClick={runAutoBuild}>
            {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} AUTO-BUILD MY SPACECRAFT
          </Button>
        </Panel>
      )}
      <AnimatePresence>
        {(buildMsg || buildErr) && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status"
            className={`mb-4 rounded-xl border p-3 text-sm ${buildErr ? 'border-rose-400/40 bg-rose-500/10 text-rose-100' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'}`}>
            {buildErr ?? buildMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div ref={optionsRef} className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))]">
          {/* Part tabs */}
          <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 xl:flex-wrap xl:overflow-visible" role="tablist" aria-label="Spacecraft parts">
            {SLOT_ORDER.map((s, i) => {
              const Icon = slotIcon[s]
              const done = !!state.design[s]
              const on = active === s
              return (
                <button key={s} role="tab" aria-selected={on} onClick={() => { sfx.click(); setActive(s) }}
                  className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm transition ${on ? 'bg-cyan-400/20 text-white ring-1 ring-cyan-300/60' : done ? 'text-slate-200 hover:bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}>
                  <span className="text-[10px] text-slate-500">{i + 1}</span>
                  <Icon className="h-4 w-4" /> {slotInfo[s].label}
                  {done ? <Check className="h-4 w-4 text-emerald-400" aria-label="chosen" /> : <span className="h-2 w-2 rounded-full bg-slate-600" aria-label="not chosen" />}
                </button>
              )
            })}
          </div>

          <div className="mb-3 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300"><ActiveIcon className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display text-lg font-bold text-white">{info.label}</h2>
              <p className="text-sm text-slate-200">{info.purpose}</p>
              <p className="text-xs text-amber-200/90">Trade-off: {info.tradeoff}</p>
            </div>
          </div>
          <div className="mb-3"><Hint>{lessons[active]}</Hint></div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label={`${info.label} options`}>
            {options.map((c) => {
              const sel = state.design[active] === c.id
              const isRec = rec?.[active] === c.id
              const dCost = current && !sel ? c.cost - current.cost : 0
              const dMass = current && !sel ? (c.mass ?? 0) - (current.mass ?? 0) : 0
              const dPower = current && !sel ? (c.power ?? 0) - (current.power ?? 0) : 0
              const deltas = [fmtSigned(dCost, 'M', '$'), fmtSigned(dMass, ' kg'), fmtSigned(dPower, ' W')].filter(Boolean)
              return (
                <button key={c.id} role="radio" aria-checked={sel} onClick={() => pick(c.id)}
                  className={`glass relative flex flex-col rounded-2xl p-4 text-left transition active:scale-[0.99] ${sel ? 'bg-cyan-400/10 ring-2 ring-cyan-400 shadow-[0_0_30px_-8px_rgba(34,211,238,0.8)]' : 'hover:ring-1 hover:ring-cyan-300/40'}`}>
                  <div className="flex min-h-6 flex-wrap items-center gap-1.5">
                    {sel && <span className="flex items-center gap-1 rounded-full bg-cyan-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-950"><Check className="h-3 w-3" /> Selected</span>}
                    {isRec && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">★ Recommended</span>}
                  </div>
                  <div className="mt-2 font-display text-sm font-bold text-white">{c.name}</div>
                  <div className="mt-1 text-xs font-semibold text-cyan-300">{c.benefit}</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{c.description}</p>
                  {c.extra && <p className={`mt-1 text-xs font-semibold ${c.extra.startsWith('Cannot') ? 'text-rose-300' : 'text-slate-200'}`}>{c.extra}</p>}
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <span className="rounded-md bg-space-900/80 px-2 py-0.5 text-[11px] text-slate-200 tabular-nums">${c.cost}M</span>
                    {c.mass ? <span className="rounded-md bg-space-900/80 px-2 py-0.5 text-[11px] text-slate-200 tabular-nums">{c.mass} kg</span> : null}
                    {c.power ? <span className={`rounded-md bg-space-900/80 px-2 py-0.5 text-[11px] tabular-nums ${c.power > 0 ? 'text-emerald-300' : 'text-slate-200'}`}>{c.power > 0 ? `makes ${c.power} W` : `uses ${-c.power} W`}</span> : null}
                    {c.risk ? <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-200">+{c.risk}% risk</span> : null}
                  </div>
                  {deltas.length > 0 && <div className="mt-2 text-[11px] text-slate-400">vs your pick: <span className="text-slate-200">{deltas.join(' · ')}</span></div>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview + live resources */}
        <div className="lg:sticky lg:top-[calc(5rem+env(safe-area-inset-top))] lg:self-start">
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <span className="hud-label">Your spacecraft</span>
              {pending && <span className="flex items-center gap-1 text-[11px] text-cyan-200"><Loader2 className="h-3 w-3 animate-spin" /> updating</span>}
            </div>
            <SpacecraftPreview design={state.design} compact />
            <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
              {state.design.launch && <span className="rounded-full bg-space-800 px-2 py-0.5 text-slate-200">🚀 {cat.components.launch.find((x) => x.id === state.design.launch)?.name}</span>}
              {orbit && <span className="rounded-full bg-space-800 px-2 py-0.5 text-slate-200">🛰 {orbit.name}</span>}
              {state.design.ground_station && <span className="rounded-full bg-space-800 px-2 py-0.5 text-slate-200">📡 {cat.ground_stations.find((g) => g.id === state.design.ground_station)?.name}</span>}
            </div>
            {error && <ErrorBox message={error} onRetry={retry} />}
            {r && <ResourceMeters r={r} hasStation={!!state.design.ground_station} maxRisk={lvl.max_risk} />}
            {r && evaluation && (
              <div className="mt-3 border-t border-cyan-300/10 pt-2">
                <button onClick={() => setDetails((d) => !d)} aria-expanded={details}
                  className="flex min-h-11 w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Engineering details <ChevronDown className={`h-4 w-4 transition ${details ? 'rotate-180' : ''}`} />
                </button>
                {details && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums">
                    <dt className="text-slate-400">Power made / used</dt><dd className="text-right text-slate-100">{r.power_generation} / {r.power_demand} W</dd>
                    <dt className="text-slate-400">Power margin</dt><dd className="text-right text-slate-100">{(r.power_margin * 100).toFixed(0)}%</dd>
                    <dt className="text-slate-400">Data made / downlink</dt><dd className="text-right text-slate-100">{r.data_rate} / {r.downlink} Gbit/d</dd>
                    <dt className="text-slate-400">Mass / rocket limit</dt><dd className="text-right text-slate-100">{r.mass} / {r.launch_capacity} kg</dd>
                    <dt className="text-slate-400">Lifetime</dt><dd className="text-right text-slate-100">{r.lifetime_years} yr</dd>
                    <dt className="text-slate-400">Science days</dt><dd className="text-right text-slate-100">{r.science_days}</dd>
                    <dt className="text-slate-400">Mission energy</dt><dd className="text-right text-slate-100">{r.energy}</dd>
                    <dt className="text-slate-400">Star targets</dt><dd className="text-right text-slate-100">{evaluation.operations.targets}</dd>
                    <dt className="text-slate-400">AI credits</dt><dd className="text-right text-slate-100">{evaluation.operations.ai_credits}</dd>
                    <dt className="text-slate-400">Points per correct call</dt><dd className="text-right text-slate-100">{evaluation.operations.points_correct}</dd>
                  </dl>
                )}
                <p className="mt-2 text-[10px] text-slate-500">{cat.disclaimer}</p>
              </div>
            )}
          </Panel>
          <Button className={`mt-4 hidden w-full !py-4 lg:flex ${guided && allChosen ? 'next-action' : ''}`} onClick={goNext}>{nextLabel}</Button>
        </div>
      </div>

      {/* Mobile: resources + next step stay in reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cyan-300/15 bg-space-950/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden">
        <div className="safe-x mx-auto max-w-3xl">
          {r && <ResourceMeters r={r} hasStation={!!state.design.ground_station} maxRisk={lvl.max_risk} compact />}
          <Button className={`mt-2 w-full ${guided && allChosen ? 'next-action' : ''}`} onClick={goNext}>{nextLabel}</Button>
        </div>
      </div>
    </ScreenWrap>
  )
}
