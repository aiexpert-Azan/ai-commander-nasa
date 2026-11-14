import { AnimatePresence, motion } from 'framer-motion'
import { Antenna, Battery, Check, ChevronDown, ChevronLeft, ChevronRight, Coins, Cpu, Globe2, Loader2, Radio, Rocket, ShieldAlert, Sun, Telescope, Wand2, Weight, Wifi } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Component, Resources } from '../api/client'
import { sfx } from '../audio/sound'
import { SpacecraftPreview } from '../components/SpacecraftPreview'
import { Button, ErrorBox, Hint, Meter, MissionProgress, Panel, ScreenWrap, Spinner } from '../components/ui'
import { autoBuild, isCategory, lessons, metricInfo, SLOT_ORDER, slotInfo, suggestedDesign } from '../game/guide'
import { useGame, type DesignSlot } from '../game/store'
import { useEvaluation } from '../game/useEvaluation'

const slotIcon: Record<DesignSlot, typeof Telescope> = {
  telescope: Telescope, instrument: Cpu, solar: Sun, antenna: Antenna, launch: Rocket, orbit: Globe2, ground_station: Radio,
}

interface Option { id: string; name: string; benefit: string; description: string; cost: number; mass?: number; power?: number; risk?: number; extra?: string }

type Level = 'ok' | 'warn' | 'fail'
const tone: Record<Level, string> = { ok: 'text-white', warn: 'text-amber-300', fail: 'text-rose-300' }

/** Compact 4-stat bar for phones: Budget | Weight | Power | Risk, coloured by status. */
function StatBar({ r, maxRisk }: { r: Resources; maxRisk: number | null }) {
  const spare = r.power_generation - r.power_demand
  const stats: { icon: typeof Coins; label: string; value: string; level: Level }[] = [
    { icon: Coins, label: 'Budget', value: `$${r.cost}M/${r.budget}`, level: r.cost > r.budget ? 'fail' : r.cost > r.budget * 0.9 ? 'warn' : 'ok' },
    { icon: Weight, label: 'Weight', value: r.launch_capacity ? `${r.mass}/${r.launch_capacity}` : `${r.mass} kg`, level: r.launch_capacity && r.mass > r.launch_capacity ? 'fail' : r.launch_capacity && r.mass > r.launch_capacity * 0.9 ? 'warn' : 'ok' },
    { icon: Battery, label: 'Power', value: `${spare >= 0 ? '+' : ''}${spare} W`, level: spare < 0 ? 'fail' : spare < r.power_demand * 0.1 ? 'warn' : 'ok' },
    { icon: ShieldAlert, label: 'Risk', value: `${r.risk}%`, level: maxRisk !== null && r.risk > maxRisk ? 'fail' : r.risk >= 20 ? 'warn' : 'ok' },
  ]
  return (
    <div className="grid grid-cols-4 gap-1 text-center">
      {stats.map((s) => (
        <div key={s.label} className="min-w-0">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-300"><s.icon className="h-3 w-3 shrink-0" />{s.label}</div>
          <div className={`truncate text-[13px] font-bold tabular-nums ${tone[s.level]}`}>{s.value}</div>
        </div>
      ))}
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

  useEffect(() => {
    if (state.designFocus) {
      dispatch({ type: 'focusDesign', slot: null })
      setTimeout(() => optionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!cat) return <ScreenWrap><Spinner label="Loading spacecraft parts..." /></ScreenWrap>
  const lvl = cat.levels[String(state.level)]
  const guided = state.mode !== 'commander'
  const rec = suggestedDesign(cat, state.level)
  const r = evaluation?.resources
  const chosen = SLOT_ORDER.filter((s) => state.design[s])
  const allChosen = chosen.length === SLOT_ORDER.length
  const idx = SLOT_ORDER.indexOf(active)
  const nextSlot = SLOT_ORDER.find((s) => !state.design[s] && s !== active) ?? SLOT_ORDER.find((s) => !state.design[s])
  const orbit = cat.components.orbit.find((o) => o.id === state.design.orbit)

  const options: Option[] = isCategory(active)
    ? cat.components[active].map((c: Component) => ({
        ...c,
        extra: c.capacity && orbit ? (c.capacity[orbit.id] ? `Lifts ${c.capacity[orbit.id]} kg to ${orbit.name}` : `Can't reach ${orbit.name}`) : undefined,
      }))
    : cat.ground_stations.map((g) => ({
        id: g.id, name: g.name, cost: g.cost, description: g.description,
        benefit: orbit ? `Signal for ${orbit.name}: ${Math.round((g.factor[orbit.id] ?? 0) * 100)}%` : 'Pick an orbit first',
      }))

  const goSlot = (s: DesignSlot) => { sfx.click(); setActive(s) }

  const pick = (id: string) => {
    sfx.select()
    const wasEmpty = !state.design[active]
    dispatch({ type: 'select', category: active, id })
    setBuildMsg(null)
    if (wasEmpty && guided) {
      const following = SLOT_ORDER.slice(idx + 1).find((s) => !state.design[s])
      if (following) setTimeout(() => setActive(following), 350)
    }
  }

  // Auto-Build: proposes designs and keeps the first one the live backend engine reports as launch-ready.
  const runAutoBuild = async () => {
    setBuilding(true); setBuildErr(null); setBuildMsg(null)
    try {
      const { design, evaluation: ev } = await autoBuild(cat, state.level)
      dispatch({ type: 'setDesign', design })
      sfx.deploy()
      setBuildMsg(ev.launch_ready ? 'All 7 parts picked. Ready to check!' : 'Parts picked, but some checks fail. Review next.')
    } catch (e) {
      setBuildErr((e as Error).message)
    } finally { setBuilding(false) }
  }

  const goNext = () => {
    if (allChosen) dispatch({ type: 'go', screen: 'readiness' })
    else if (nextSlot) { setActive(nextSlot); optionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  }
  const nextLabel = allChosen ? 'CHECK MY SPACECRAFT →' : `NEXT: ${slotInfo[nextSlot ?? active].label.toUpperCase()} →`
  const info = slotInfo[active]
  const ActiveIcon = slotIcon[active]

  return (
    <ScreenWrap wide bottomBar>
      <MissionProgress current="design" />
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Build your spacecraft</h1>
          <p className="text-sm text-cyan-100/85 sm:text-base">Choose your spacecraft parts.</p>
        </div>
        <span className="shrink-0 rounded-full bg-space-800 px-2.5 py-1 text-xs font-semibold text-slate-200 tabular-nums">{chosen.length}/7</span>
      </div>

      <Button variant={allChosen ? 'ghost' : 'primary'} className={`mb-2 w-full !py-3.5 text-base ${!allChosen && guided ? 'next-action' : ''}`} disabled={building} onClick={runAutoBuild}>
        {building ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} AUTO-BUILD (RECOMMENDED)
      </Button>
      <AnimatePresence>
        {(buildMsg || buildErr) && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status"
            className={`mb-2 flex items-center justify-center gap-1.5 text-sm font-semibold ${buildErr ? 'text-rose-300' : 'text-emerald-300'}`}>
            {!buildErr && <Check className="h-4 w-4" />}{buildErr ?? buildMsg}
          </motion.p>
        )}
      </AnimatePresence>
      <p className="mb-4 text-center text-xs text-slate-400">or pick each part yourself below</p>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div ref={optionsRef} className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))]">
          {/* Part selector: 7 icons, status dot under each */}
          <div className="mb-3 grid grid-cols-7 gap-1" role="tablist" aria-label="Spacecraft parts">
            {SLOT_ORDER.map((s) => {
              const Icon = slotIcon[s]
              const done = !!state.design[s]
              const on = active === s
              return (
                <button key={s} role="tab" aria-selected={on} aria-label={`${slotInfo[s].label}${done ? ' (chosen)' : ''}`} title={slotInfo[s].label} onClick={() => goSlot(s)}
                  className={`relative flex h-12 items-center justify-center rounded-xl transition ${on ? 'bg-cyan-400/20 text-white ring-2 ring-cyan-400' : done ? 'bg-space-800/80 text-emerald-300' : 'bg-space-800/50 text-slate-400'}`}>
                  <Icon className="h-5 w-5" />
                  {done && <Check className="absolute right-0.5 top-0.5 h-3 w-3 text-emerald-400" aria-hidden />}
                </button>
              )
            })}
          </div>

          <div className="mb-2 flex items-center gap-2">
            <button aria-label="Previous part" disabled={idx === 0} onClick={() => goSlot(SLOT_ORDER[idx - 1])} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-cyan-200 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center">
              <ActiveIcon className="h-5 w-5 shrink-0 text-cyan-300" />
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-white">{info.label} <span className="text-xs font-normal text-slate-400">{idx + 1}/7</span></h2>
                <p className="text-sm text-slate-300">{info.purpose}</p>
              </div>
            </div>
            <button aria-label="Next part" disabled={idx === SLOT_ORDER.length - 1} onClick={() => goSlot(SLOT_ORDER[idx + 1])} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-cyan-200 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label={`${info.label} options`}>
            {options.map((c) => {
              const sel = state.design[active] === c.id
              const isRec = rec?.[active] === c.id
              return (
                <button key={c.id} role="radio" aria-checked={sel} onClick={() => pick(c.id)}
                  className={`relative flex flex-col rounded-2xl p-3.5 text-left transition active:scale-[0.99] ${sel ? 'bg-cyan-400/15 ring-2 ring-cyan-400' : 'bg-space-800/60 ring-1 ring-white/5 hover:ring-cyan-300/40'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-white">{c.name}</div>
                      <div className="mt-0.5 text-xs font-semibold text-cyan-300">{c.benefit}</div>
                    </div>
                    {sel ? <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-slate-950" aria-label="Selected"><Check className="h-4 w-4" /></span>
                      : <span className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-600" aria-hidden />}
                  </div>
                  {sel && <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{c.description}</p>}
                  {c.extra && <p className={`mt-1 text-xs font-semibold ${c.extra.startsWith("Can't") ? 'text-rose-300' : 'text-slate-300'}`}>{c.extra}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-slate-200">
                    <span>${c.cost}M</span>
                    {c.mass ? <span>{c.mass} kg</span> : null}
                    {c.power ? <span className={c.power > 0 ? 'text-emerald-300' : ''}>{c.power > 0 ? `+${c.power} W` : `${c.power} W`}</span> : null}
                    {c.risk ? <span className="text-amber-300">+{c.risk}% risk</span> : null}
                    {isRec && <span className="ml-auto text-[11px] font-bold text-emerald-300">★ Recommended</span>}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-2"><Hint>{lessons[active]} <span className="text-amber-200">Trade-off: {info.tradeoff}</span></Hint></div>
        </div>

        {/* Desktop: preview + full meters */}
        <div className="hidden lg:sticky lg:top-[calc(5rem+env(safe-area-inset-top))] lg:block lg:self-start">
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <span className="hud-label">Your spacecraft</span>
              {pending && <span className="flex items-center gap-1 text-[11px] text-cyan-200"><Loader2 className="h-3 w-3 animate-spin" /> updating</span>}
            </div>
            <SpacecraftPreview design={state.design} compact />
            {error && <ErrorBox message={error} onRetry={retry} />}
            {r && (
              <div className="space-y-3">
                <Meter icon={<Coins className="h-3.5 w-3.5" />} label="Budget" value={r.cost} max={r.budget} display={`$${r.cost}M / ${r.budget}M`} invert warnAt={r.budget * 0.9} failAt={r.budget} sub={metricInfo.budget} />
                <Meter icon={<Weight className="h-3.5 w-3.5" />} label="Weight" value={r.mass} max={Math.max(r.launch_capacity, r.mass, 1)} display={r.launch_capacity ? `${r.mass} / ${r.launch_capacity} kg` : `${r.mass} kg`} invert warnAt={r.launch_capacity * 0.9} failAt={r.launch_capacity || Infinity} sub={metricInfo.mass} />
                <Meter icon={<Battery className="h-3.5 w-3.5" />} label="Spare power" value={r.power_generation} max={Math.max(r.power_demand * 1.6, 1)} display={`${r.power_generation - r.power_demand >= 0 ? '+' : ''}${r.power_generation - r.power_demand} W`} warnAt={r.power_demand * 1.1} failAt={r.power_demand} sub={metricInfo.power} />
                <Meter icon={<Wifi className="h-3.5 w-3.5" />} label="Data sent home" value={r.downlink} max={Math.max(r.data_rate * 2, r.downlink, 1)} display={state.design.ground_station ? `${r.downlink} Gbit/day (need ${r.data_rate})` : 'needs ground station'} warnAt={r.data_rate * 1.25} failAt={state.design.ground_station ? r.data_rate : -1} sub={metricInfo.comms} />
                <Meter icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Risk" value={r.risk} max={50} display={`${r.risk}%`} invert warnAt={15} failAt={lvl.max_risk ?? 30} sub={metricInfo.risk} />
              </div>
            )}
            {r && evaluation && (
              <div className="mt-3 border-t border-cyan-300/10 pt-2">
                <button onClick={() => setDetails((d) => !d)} aria-expanded={details} className="flex min-h-11 w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Details <ChevronDown className={`h-4 w-4 transition ${details ? 'rotate-180' : ''}`} />
                </button>
                {details && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums">
                    <dt className="text-slate-400">Power made / used</dt><dd className="text-right text-slate-100">{r.power_generation} / {r.power_demand} W</dd>
                    <dt className="text-slate-400">Lifetime</dt><dd className="text-right text-slate-100">{r.lifetime_years} yr</dd>
                    <dt className="text-slate-400">Science days</dt><dd className="text-right text-slate-100">{r.science_days}</dd>
                    <dt className="text-slate-400">Mission energy</dt><dd className="text-right text-slate-100">{r.energy}</dd>
                    <dt className="text-slate-400">Star targets</dt><dd className="text-right text-slate-100">{evaluation.operations.targets}</dd>
                    <dt className="text-slate-400">AI credits</dt><dd className="text-right text-slate-100">{evaluation.operations.ai_credits}</dd>
                  </dl>
                )}
              </div>
            )}
          </Panel>
          <Button className={`mt-4 w-full !py-4 ${guided && allChosen ? 'next-action' : ''}`} onClick={goNext}>{nextLabel}</Button>
        </div>
      </div>

      {/* Phones: compact stats + one primary action */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cyan-300/15 bg-space-950/95 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden">
        <div className="safe-x mx-auto max-w-3xl">
          {r ? <StatBar r={r} maxRisk={lvl.max_risk} /> : error ? <p className="text-center text-xs text-rose-300">Can't reach mission control. <button className="underline" onClick={retry}>Retry</button></p> : null}
          <Button className={`mt-2 w-full ${guided && allChosen ? 'next-action' : ''}`} onClick={goNext}>{nextLabel}</Button>
        </div>
      </div>
    </ScreenWrap>
  )
}
