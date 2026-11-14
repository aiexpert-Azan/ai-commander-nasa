import { motion } from 'framer-motion'
import { Antenna, Battery, Check, Coins, Cpu, Database, Globe2, Rocket, ShieldAlert, Sparkles, Sun, Telescope, Weight, Wifi } from 'lucide-react'
import { useState } from 'react'
import type { Category, Component } from '../api/client'
import { sfx } from '../audio/sound'
import { SpacecraftPreview } from '../components/SpacecraftPreview'
import { Button, ErrorBox, Meter, Panel, ScreenWrap, Spinner, StepTitle } from '../components/ui'
import { useGame } from '../game/store'
import { useEvaluation } from '../game/useEvaluation'

export const categoryMeta: Record<Category, { label: string; icon: typeof Telescope; hint: string }> = {
  telescope: { label: 'Telescope', icon: Telescope, hint: 'Bigger mirrors earn more science points but cost mass and money.' },
  instrument: { label: 'Instrument', icon: Cpu, hint: 'Decides how many stars you can target and how much data you make.' },
  solar: { label: 'Solar Panels', icon: Sun, hint: 'Power for everything. Margin becomes mission energy.' },
  antenna: { label: 'Antenna', icon: Antenna, hint: 'Sends science data home. Better links give extra AI credits.' },
  launch: { label: 'Launch Vehicle', icon: Rocket, hint: 'Must lift your spacecraft to your chosen orbit.' },
  orbit: { label: 'Orbit', icon: Globe2, hint: 'Sets observing efficiency, lifetime and communication needs.' },
}

function statLine(c: Component) {
  const out: string[] = [`$${c.cost}M`]
  if (c.mass) out.push(`${c.mass} kg`)
  if (c.power) out.push(c.power > 0 ? `+${c.power} W` : `${c.power} W`)
  if (c.data) out.push(`${c.data} Gbit/d`)
  return out
}

export function DesignScreen() {
  const { state, dispatch } = useGame()
  const cat = state.catalog
  const { evaluation, error, retry } = useEvaluation(state.design, state.level)
  const [active, setActive] = useState<Category>('telescope')
  if (!cat) return <ScreenWrap><Spinner label="Loading component catalog..." /></ScreenWrap>
  const lvl = cat.levels[String(state.level)]
  const rec = lvl.recommended
  const r = evaluation?.resources
  const chosenCount = cat.categories.filter((c) => state.design[c]).length
  const allChosen = chosenCount === cat.categories.length

  const pick = (category: Category, id: string) => {
    sfx.select()
    dispatch({ type: 'select', category, id })
    const idx = cat.categories.indexOf(category)
    if (!state.design[category] && idx < cat.categories.length - 1) setTimeout(() => setActive(cat.categories[idx + 1]), 250)
  }

  return (
    <ScreenWrap wide>
      <StepTitle step={`Step 1 of 3 · Design (${chosenCount}/6 chosen)`} title="Build your spacecraft" hint="Pick one option in each category. Watch the meters: every choice is a trade-off." />
      {lvl.guided && rec && (
        <Panel className="mb-4 flex flex-col items-start gap-3 border-cyan-300/30 p-4 sm:flex-row sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-cyan-300" />
          <p className="flex-1 text-sm text-slate-300">Cadet tip: parts marked <b className="text-cyan-300">Recommended</b> make a balanced, launch-ready mission. You can also experiment!</p>
          <Button variant="ghost" className="!py-2" onClick={() => { sfx.select(); dispatch({ type: 'setDesign', design: { ...rec } }) }}>Use recommended</Button>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div>
          {/* Category tabs */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {cat.categories.map((c) => {
              const M = categoryMeta[c]
              const done = !!state.design[c]
              return (
                <button key={c} onClick={() => { sfx.click(); setActive(c) }}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${active === c ? 'bg-cyan-400/20 text-white ring-1 ring-cyan-300/60' : 'text-slate-300 hover:bg-white/5'}`}>
                  <M.icon className="h-4 w-4" /> {M.label}
                  {done && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </button>
              )
            })}
          </div>
          <p className="mb-3 text-sm text-cyan-100/70">{categoryMeta[active].hint}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cat.components[active].map((c) => {
              const sel = state.design[active] === c.id
              const isRec = lvl.guided && rec?.[active] === c.id
              return (
                <motion.button key={c.id} layout whileHover={{ y: -3 }} onClick={() => pick(active, c.id)}
                  className={`glass relative rounded-2xl p-4 text-left transition ${sel ? 'ring-2 ring-cyan-400 shadow-[0_0_30px_-8px_rgba(34,211,238,0.8)]' : 'hover:ring-1 hover:ring-cyan-300/40'}`}>
                  {isRec && <span className="absolute right-3 top-3 rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">Recommended</span>}
                  {sel && <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-slate-950"><Check className="h-3.5 w-3.5" /></span>}
                  <div className="mt-5 font-display text-sm font-bold text-white">{c.name}</div>
                  <div className="mt-1 text-xs font-semibold text-cyan-300">{c.benefit}</div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{c.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {statLine(c).map((s) => <span key={s} className="rounded-md bg-space-900/80 px-2 py-0.5 text-[11px] text-slate-300 tabular-nums">{s}</span>)}
                    {c.risk ? <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300">+{c.risk}% risk</span> : null}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Preview + live resources */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Panel className="p-4">
            <div className="hud-label">Spacecraft preview</div>
            <SpacecraftPreview design={state.design} />
            <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
              {state.design.launch && <span className="rounded-full bg-space-800 px-2 py-0.5 text-slate-300">🚀 {cat.components.launch.find((x) => x.id === state.design.launch)?.name}</span>}
              {state.design.orbit && <span className="rounded-full bg-space-800 px-2 py-0.5 text-slate-300">🛰 {cat.components.orbit.find((x) => x.id === state.design.orbit)?.name}</span>}
            </div>
            {error && <ErrorBox message={error} onRetry={retry} />}
            {r && (
              <div className="space-y-3">
                <Meter icon={<Coins className="h-3.5 w-3.5" />} label="Budget used" value={r.cost} max={r.budget} display={`$${r.cost}M / ${r.budget}M`} invert warnAt={r.budget * 0.9} failAt={r.budget} />
                <Meter icon={<Weight className="h-3.5 w-3.5" />} label="Total mass" value={r.mass} max={Math.max(r.launch_capacity, r.mass, 1)}
                  display={r.launch_capacity ? `${r.mass} / ${r.launch_capacity} kg` : `${r.mass} kg`} invert warnAt={r.launch_capacity * 0.9} failAt={r.launch_capacity || Infinity} />
                <Meter icon={<Battery className="h-3.5 w-3.5" />} label="Power balance" value={r.power_generation} max={Math.max(r.power_demand * 1.6, 1)}
                  display={`${r.power_generation - r.power_demand >= 0 ? '+' : ''}${r.power_generation - r.power_demand} W`} warnAt={r.power_demand * 1.1} failAt={r.power_demand} />
                <Meter icon={<Database className="h-3.5 w-3.5" />} label="Data generated" value={r.data_rate} max={30} display={`${r.data_rate} Gbit/day`} />
                <Meter icon={<Wifi className="h-3.5 w-3.5" />} label="Downlink capacity" value={r.downlink} max={30}
                  display={state.design.ground_station ? `${r.downlink} Gbit/day` : 'pick station next'} warnAt={r.data_rate * 1.25} failAt={state.design.ground_station ? r.data_rate : -1} />
                <Meter icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Mission risk" value={r.risk} max={50} display={`${r.risk}%`} invert warnAt={15} failAt={lvl.max_risk ?? 30} />
              </div>
            )}
          </Panel>
          <Button className="mt-4 w-full !py-4" disabled={!allChosen} onClick={() => dispatch({ type: 'go', screen: 'readiness' })}>
            {allChosen ? 'REVIEW MISSION' : `CHOOSE ${6 - chosenCount} MORE`}
          </Button>
        </div>
      </div>
    </ScreenWrap>
  )
}
