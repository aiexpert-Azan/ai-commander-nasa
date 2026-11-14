// Typed API client for the FastAPI backend.
// Empty = same origin: requests go to /api/... and the Vite dev proxy forwards them to the backend
// (port chosen by start-backend.bat). Set VITE_API_URL only to bypass the proxy.
export const API_URL: string = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

export type Category = 'telescope' | 'instrument' | 'solar' | 'antenna' | 'launch' | 'orbit'
export type Design = Partial<Record<Category | 'ground_station', string | null>>

export interface Component {
  id: string
  name: string
  icon: string
  cost: number
  mass?: number
  power?: number
  data?: number
  throughput?: number
  capacity?: Record<string, number>
  science_multiplier?: number
  benefit: string
  description: string
  risk?: number
}

export interface GroundStation {
  id: string
  name: string
  cost: number
  factor: Record<string, number>
  description: string
}

export interface Level {
  id: number
  name: string
  budget: number
  stars_required: number
  base_ai_credits: number
  min_power_margin: number
  min_lifetime_years: number
  max_risk: number | null
  pass_accuracy: number
  guided: boolean
  recommended: Design | null
  summary: string
}

export interface Catalog {
  bus: { cost: number; mass: number; power: number }
  categories: Category[]
  components: Record<Category, Component[]>
  ground_stations: GroundStation[]
  levels: Record<string, Level>
  disclaimer: string
}

export interface Check {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  fix: string
}

export interface Operations {
  targets: number
  stars_required: number
  ai_credits: number
  energy: number
  science_days: number
  energy_per_obs: number
  energy_per_ai: number
  days_per_obs: number
  wrong_extra_days: number
  science_multiplier: number
  points_correct: number
  points_wrong: number
  tools: string[]
}

export interface Resources {
  cost: number
  budget: number
  mass: number
  launch_capacity: number
  power_generation: number
  power_demand: number
  power_margin: number
  data_rate: number
  downlink: number
  risk: number
  lifetime_years: number
  science_days: number
  energy: number
}

export interface Evaluation {
  level: number
  resources: Resources
  operations: Operations
  checks: Check[]
  launch_ready: boolean
}

export interface LaunchEvent { phase: string; status: 'nominal' | 'anomaly'; message: string; roll: number }
export interface Anomaly { id: string; title: string; detail: string }
export interface LaunchResult {
  ok: boolean
  risk: number
  per_phase_chance: number
  events: LaunchEvent[]
  anomalies: Anomaly[]
  operations: Operations
  evaluation: Evaluation
}

export interface StarSummary {
  id: string
  kepid: number
  koi_name: string
  name: string
  difficulty: 'clear' | 'moderate' | 'ambiguous'
  grid: { x: number; y: number; mag: number }
}

export interface StarDetail extends StarSummary {
  signal: number[]
  phase: number[]
  features: { depth_ppt: number; noise_ppt: number; snr: number }
  provenance: Record<string, string>
}

export interface DecisionResult {
  star_id: string
  correct: boolean
  player_decision: string
  catalog_label: 'CANDIDATE' | 'FALSE POSITIVE'
  lesson: string
  features: { depth_ppt: number; noise_ppt: number; snr: number }
  source: string
}

export interface AIResult {
  score: number
  threshold: number
  predicted_class: 'CANDIDATE' | 'FALSE POSITIVE'
  lean_strength: string
  explanation: string
  disclaimer: string
  model: string
}

export interface ScoreResult {
  breakdown: { engineering: number; efficiency: number; science: number; completion: number }
  total: number
  rank: string
  success: boolean
  accuracy: number
  analyzed: number
  correct: number
  incorrect: number
  budget_remaining: number
  insights: string[]
}

export interface Health {
  status: string
  stars_loaded: number
  star_data_error: string | null
  model_loaded: boolean
  model_error: string | null
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError(`Cannot reach the mission server at ${API_URL || 'the /api proxy'}. Is the backend running?`, 0)
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const j = await res.json()
      const d = j.detail
      msg = typeof d === 'string' ? d : d?.message ?? msg
    } catch { /* ignore */ }
    throw new ApiError(msg, res.status)
  }
  return res.json() as Promise<T>
}

const post = <T,>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
  health: () => request<Health>('/api/health'),
  catalog: () => request<Catalog>('/api/mission/components'),
  evaluate: (design: Design, level: number) => post<Evaluation>('/api/mission/evaluate', { design, level }),
  score: (design: Design, level: number, results: { analyzed: number; correct: number; energy_left: number; start_energy: number }) =>
    post<{ score: ScoreResult }>('/api/mission/evaluate', { design, level, results }).then((r) => r.score),
  launch: (design: Design, level: number, seed: string) => post<LaunchResult>('/api/mission/launch', { design, level, seed }),
  stars: (level: number, count: number, seed: string) =>
    request<{ stars: StarSummary[]; grid_note: string; provenance: Record<string, string> }>(
      `/api/stars?level=${level}&count=${count}&seed=${encodeURIComponent(seed)}`),
  star: (id: string) => request<StarDetail>(`/api/stars/${encodeURIComponent(id)}`),
  decide: (id: string, decision: 'candidate' | 'false_positive') =>
    post<DecisionResult>(`/api/stars/${encodeURIComponent(id)}/decision`, { decision }),
  analyze: (starId: string) => post<AIResult>('/api/ai/analyze', { star_id: starId }),
}
