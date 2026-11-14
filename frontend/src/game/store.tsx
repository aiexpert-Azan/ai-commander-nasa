// Game state: a single reducer persisted to localStorage.
import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import type { Catalog, DecisionResult, Design, LaunchResult, Operations, ScoreResult, StarSummary } from '../api/client'
import { setSoundEnabled } from '../audio/sound'

export type Screen = 'welcome' | 'briefing' | 'design' | 'readiness' | 'launch' | 'explore' | 'results'

export interface DecisionRecord extends DecisionResult {
  points: number
  usedAI: boolean
}

export interface OpsState {
  energy: number
  scienceDays: number
  aiCredits: number
}

export interface GameState {
  version: 1
  screen: Screen
  level: number
  unlocked: number
  seed: string
  design: Design
  catalog: Catalog | null
  launch: LaunchResult | null
  ops: Operations | null
  live: OpsState | null
  stars: StarSummary[]
  observed: string[]
  decisions: Record<string, DecisionRecord>
  aiUsed: Record<string, true>
  points: number
  score: ScoreResult | null
  sound: boolean
  missionsFlown: number
}

const KEY = 'ai-commander-save-v1'

const newSeed = () => Math.random().toString(36).slice(2, 10)

export const initialState: GameState = {
  version: 1,
  screen: 'welcome',
  level: 1,
  unlocked: 1,
  seed: newSeed(),
  design: {},
  catalog: null,
  launch: null,
  ops: null,
  live: null,
  stars: [],
  observed: [],
  decisions: {},
  aiUsed: {},
  points: 0,
  score: null,
  sound: true,
  missionsFlown: 0,
}

export type Action =
  | { type: 'go'; screen: Screen }
  | { type: 'catalog'; catalog: Catalog }
  | { type: 'select'; category: string; id: string }
  | { type: 'setDesign'; design: Design }
  | { type: 'launched'; launch: LaunchResult }
  | { type: 'stars'; stars: StarSummary[] }
  | { type: 'observe'; id: string }
  | { type: 'aiConsult'; id: string }
  | { type: 'aiRefund' }
  | { type: 'decide'; record: DecisionRecord }
  | { type: 'score'; score: ScoreResult }
  | { type: 'newMission'; level: number }
  | { type: 'toggleSound' }
  | { type: 'reset' }

function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'go':
      return { ...s, screen: a.screen }
    case 'catalog':
      return { ...s, catalog: a.catalog }
    case 'select':
      return { ...s, design: { ...s.design, [a.category]: a.id } }
    case 'setDesign':
      return { ...s, design: { ...a.design } }
    case 'launched':
      return {
        ...s,
        launch: a.launch,
        ops: a.launch.operations,
        live: { energy: a.launch.operations.energy, scienceDays: a.launch.operations.science_days, aiCredits: a.launch.operations.ai_credits },
        stars: [], observed: [], decisions: {}, aiUsed: {}, points: 0, score: null,
        missionsFlown: s.missionsFlown + 1,
      }
    case 'stars':
      return { ...s, stars: a.stars }
    case 'observe': {
      if (!s.ops || !s.live || s.observed.includes(a.id)) return s
      return {
        ...s,
        observed: [...s.observed, a.id],
        live: { ...s.live, energy: s.live.energy - s.ops.energy_per_obs, scienceDays: s.live.scienceDays - s.ops.days_per_obs },
      }
    }
    case 'aiConsult':
      if (!s.ops || !s.live) return s
      return {
        ...s,
        aiUsed: { ...s.aiUsed, [a.id]: true },
        live: { ...s.live, aiCredits: s.live.aiCredits - 1, energy: s.live.energy - s.ops.energy_per_ai },
      }
    case 'aiRefund':
      if (!s.ops || !s.live) return s
      return { ...s, live: { ...s.live, aiCredits: s.live.aiCredits + 1, energy: s.live.energy + s.ops.energy_per_ai } }
    case 'decide': {
      if (!s.ops || !s.live) return s
      const extra = a.record.correct ? 0 : s.ops.wrong_extra_days
      return {
        ...s,
        decisions: { ...s.decisions, [a.record.star_id]: a.record },
        points: s.points + a.record.points,
        live: { ...s.live, scienceDays: Math.max(0, s.live.scienceDays - extra) },
      }
    }
    case 'score':
      return { ...s, score: a.score }
    case 'newMission': {
      const lvl = a.level
      return {
        ...s,
        level: lvl,
        unlocked: Math.max(s.unlocked, lvl),
        seed: newSeed(),
        design: {},
        launch: null, ops: null, live: null, stars: [], observed: [], decisions: {}, aiUsed: {}, points: 0, score: null,
        screen: 'briefing',
      }
    }
    case 'toggleSound':
      return { ...s, sound: !s.sound }
    case 'reset':
      return { ...initialState, seed: newSeed(), sound: s.sound, unlocked: s.unlocked, catalog: s.catalog }
  }
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as GameState
      if (parsed.version === 1) {
        // Launch animation is not resumable: resume into exploration if already launched.
        const screen = parsed.screen === 'launch' ? (parsed.launch ? 'explore' : 'readiness') : parsed.screen
        return { ...initialState, ...parsed, screen, catalog: null }
      }
    }
  } catch { /* storage unavailable */ }
  return initialState
}

const Ctx = createContext<{ state: GameState; dispatch: Dispatch<Action> } | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    setSoundEnabled(state.sound)
  }, [state.sound])
  useEffect(() => {
    try {
      const { catalog: _c, ...rest } = state
      void _c
      localStorage.setItem(KEY, JSON.stringify(rest))
    } catch { /* ignore */ }
  }, [state])
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

export function useGame() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useGame outside provider')
  return c
}

// ------- derived helpers
export function missionStatus(s: GameState) {
  const required = s.ops?.stars_required ?? 0
  const decided = Object.keys(s.decisions).length
  const correct = Object.values(s.decisions).filter((d) => d.correct).length
  const pendingObserved = s.observed.filter((id) => !s.decisions[id]).length
  const canObserve = !!s.ops && !!s.live && s.live.energy >= s.ops.energy_per_obs && s.live.scienceDays >= s.ops.days_per_obs
  const targetsLeft = s.stars.filter((st) => !s.observed.includes(st.id)).length
  const done = decided >= required || (pendingObserved === 0 && (!canObserve || targetsLeft === 0))
  const endReason = decided >= required ? 'Discovery target reached' : !canObserve ? 'Mission resources exhausted' : 'No targets left'
  return { required, decided, correct, pendingObserved, canObserve, done, endReason }
}
