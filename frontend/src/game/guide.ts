// Plain-language copy, readiness explanations and the auto-build helper.
// Everything here is presentation only: numbers and pass/fail always come from the backend mission engine.
import { api, type Catalog, type Category, type Check, type Design, type Evaluation } from '../api/client'
import type { DesignSlot } from './store'

export const SLOT_ORDER: DesignSlot[] = ['telescope', 'instrument', 'solar', 'antenna', 'launch', 'orbit', 'ground_station']

/** One simple sentence per part: what it does and the trade-off. */
export const slotInfo: Record<DesignSlot, { label: string; purpose: string; tradeoff: string }> = {
  telescope: {
    label: 'Telescope', purpose: 'Collects starlight. A bigger mirror makes every discovery worth more points.',
    tradeoff: 'Bigger telescopes are heavier, cost more and need more power.',
  },
  instrument: {
    label: 'Camera', purpose: 'The light sensor. It decides how many stars you can choose from.',
    tradeoff: 'More stars means more data that must be sent back to Earth.',
  },
  solar: {
    label: 'Solar Panels', purpose: 'Make electricity. Spare power becomes energy for observations.',
    tradeoff: 'Bigger panels add weight and are riskier to unfold in space.',
  },
  antenna: {
    label: 'Antenna', purpose: 'Sends your science data home. Stronger links give extra AI credits.',
    tradeoff: 'Powerful antennas use more electricity.',
  },
  launch: {
    label: 'Rocket', purpose: 'Carries your spacecraft into space. It must be strong enough for your orbit.',
    tradeoff: 'Bigger rockets lift more and fail less often, but cost a lot.',
  },
  orbit: {
    label: 'Orbit', purpose: 'Where your spacecraft lives. Sets how long it works and how well it sees stars.',
    tradeoff: 'Far orbits see better but need the Deep Space network to talk to Earth.',
  },
  ground_station: {
    label: 'Ground Station', purpose: 'The dishes on Earth that listen to your spacecraft.',
    tradeoff: 'Far-away orbits need the bigger Deep Space network.',
  },
}

/** Short contextual "why it matters" lessons, shown as hints (guided) or Learn More (commander). */
export const lessons: Record<DesignSlot, string> = {
  telescope: 'A telescope is a light bucket: the bigger the mirror, the fainter the dips it can catch. Kepler used a 0.95 m mirror.',
  instrument: 'Kepler\'s camera had 42 light sensors watching ~150,000 stars at once. More sensors = more targets, but more data.',
  solar: 'Power must be greater than what your equipment uses. If it is not, instruments shut down. Spare power becomes mission energy.',
  antenna: 'Science is only useful if it reaches Earth. If the antenna is too slow, data piles up and is lost.',
  launch: 'Every kilogram has to be lifted. Mass matters because a rocket can only carry so much to each orbit.',
  orbit: 'Kepler flew in an Earth-trailing orbit so Earth would never block its view of the stars.',
  ground_station: 'NASA\'s Deep Space Network uses giant 70 m dishes in California, Spain and Australia to hear distant spacecraft.',
}

/** Plain meaning of each resource meter. */
export const metricInfo = {
  budget: 'How much money you are spending.',
  mass: 'How heavy your spacecraft is.',
  power: 'Electricity left over after running your equipment.',
  comms: 'How much science data reaches Earth.',
  risk: 'Chance of mission problems.',
} as const

export interface CheckGuide {
  problem: string
  why: string
  fix: string
  target: DesignSlot | null
  fixLabel: string
}

const checkGuides: Record<string, Omit<CheckGuide, 'target'> & { target: DesignSlot | null }> = {
  complete: { problem: 'Your spacecraft is missing some parts.', why: 'A spacecraft needs every system to work.', fix: 'Pick one option in every category.', target: null, fixLabel: 'Pick missing part' },
  budget: { problem: 'Your spacecraft costs more than your budget.', why: 'Real missions have a fixed budget. Going over means no launch.', fix: 'Choose a smaller telescope, a simpler camera or a cheaper rocket.', target: 'telescope', fixLabel: 'Change telescope' },
  launch: { problem: 'Your rocket cannot carry your spacecraft to its orbit.', why: 'Every kilogram must be lifted. Far orbits need more rocket power.', fix: 'Choose a bigger rocket, a closer orbit or lighter parts.', target: 'launch', fixLabel: 'Change rocket' },
  power: { problem: 'Your spacecraft does not make enough electricity.', why: 'Power must be greater than what your equipment uses, or it shuts down.', fix: 'Choose bigger solar panels or less power-hungry parts.', target: 'solar', fixLabel: 'Change solar panels' },
  comms: { problem: 'Your spacecraft cannot send all its science data back to Earth.', why: 'Data that never reaches Earth cannot be studied.', fix: 'Choose a stronger antenna or the Deep Space Antenna Network.', target: 'antenna', fixLabel: 'Change antenna' },
  ground: { problem: 'Your ground station cannot hear a spacecraft that far away.', why: 'Distant orbits need giant dishes to receive faint signals.', fix: 'Select the Deep Space Antenna Network.', target: 'ground_station', fixLabel: 'Change ground station' },
  lifetime: { problem: 'Your mission would not last long enough to finish its science.', why: 'You need enough observing days to study all your stars.', fix: 'Pick a stable orbit (L2 or Earth-Trailing) and keep spare power.', target: 'orbit', fixLabel: 'Change orbit' },
  energy: { problem: 'Not enough energy for all your planned observations.', why: 'Each observation uses energy, which comes from spare solar power.', fix: 'Choose bigger solar panels or a less power-hungry camera.', target: 'solar', fixLabel: 'Change solar panels' },
  risk: { problem: 'Your mission is too risky for this level.', why: 'Risky parts and thin margins make launch problems more likely.', fix: 'Choose a more reliable rocket, simpler parts or more spare power.', target: 'launch', fixLabel: 'Change rocket' },
}

const passText: Record<string, string> = {
  budget: 'Your spacecraft fits the budget.',
  launch: 'Your rocket can carry your spacecraft to orbit.',
  power: 'You make more electricity than you use.',
  comms: 'All your science data can reach Earth.',
  ground: 'Your ground station can talk to your spacecraft.',
  lifetime: 'Your mission will last long enough.',
  energy: 'You have enough energy for your observations.',
  risk: 'Mission risk is acceptable.',
}

const warnText: Record<string, string> = {
  launch: 'Your rocket can lift it, but only just.',
  power: 'Power is OK, but the margin is thin.',
  comms: 'Data only just fits through your link.',
  risk: 'Mission risk is on the high side.',
}

export function guideForCheck(c: Check, design: Design): CheckGuide & { headline: string } {
  const g = checkGuides[c.id] ?? { problem: c.label, why: '', fix: c.fix, target: null, fixLabel: 'Fix it' }
  let target = g.target
  if (c.id === 'complete') target = SLOT_ORDER.find((s) => !design[s]) ?? null
  if (c.id === 'comms' && design.antenna === 'ant_ka') target = 'ground_station'
  const headline = c.status === 'pass' ? (passText[c.id] ?? c.label) : c.status === 'warn' ? (warnText[c.id] ?? c.label) : g.problem
  return { ...g, target, headline }
}

/** Validated launch-ready fallbacks for levels without a backend recommendation (checked against the engine). */
const FALLBACK_DESIGNS: Design[] = [
  { telescope: 'tel_medium', instrument: 'ins_basic', solar: 'sol_small', antenna: 'ant_high', launch: 'lv_medium', orbit: 'trailing', ground_station: 'gs_deep' },
  { telescope: 'tel_small', instrument: 'ins_basic', solar: 'sol_small', antenna: 'ant_ka', launch: 'lv_medium', orbit: 'trailing', ground_station: 'gs_deep' },
  { telescope: 'tel_small', instrument: 'ins_basic', solar: 'sol_small', antenna: 'ant_high', launch: 'lv_medium', orbit: 'trailing', ground_station: 'gs_deep' },
]

/** The design auto-build will propose for this level (before validation). */
export function suggestedDesign(cat: Catalog, level: number): Design {
  return cat.levels[String(level)]?.recommended ?? FALLBACK_DESIGNS[0]
}

/**
 * Auto-build: returns the first candidate the live mission engine reports as launch-ready.
 * Nothing is bypassed: the same evaluate endpoint and checks apply as for a hand-built design.
 */
export async function autoBuild(cat: Catalog, level: number): Promise<{ design: Design; evaluation: Evaluation }> {
  const rec = cat.levels[String(level)]?.recommended
  const candidates = [...(rec ? [rec] : []), ...FALLBACK_DESIGNS]
  let last: { design: Design; evaluation: Evaluation } | null = null
  for (const d of candidates) {
    const evaluation = await api.evaluate(d, level)
    last = { design: { ...d }, evaluation }
    if (evaluation.launch_ready) return last
  }
  if (!last) throw new Error('No spacecraft designs available')
  return last
}

export const isCategory = (s: DesignSlot): s is Category => s !== 'ground_station'
