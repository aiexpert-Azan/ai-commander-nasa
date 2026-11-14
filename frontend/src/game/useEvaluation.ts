import { useEffect, useState } from 'react'
import { api, type Design, type Evaluation } from '../api/client'

// Live engineering evaluation from the mission engine (debounced).
// `pending` is true while the shown evaluation belongs to an older design (a request is in flight).
export function useEvaluation(design: Design, level: number) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [evaluatedKey, setEvaluatedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const key = `${level}|${JSON.stringify(design)}`
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      api.evaluate(design, level)
        .then((e) => { if (alive) { setEvaluation(e); setEvaluatedKey(key); setError(null) } })
        .catch((e: Error) => { if (alive) setError(e.message) })
    }, 120)
    return () => { alive = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick])
  return { evaluation, error, pending: !error && evaluatedKey !== key, retry: () => setTick((n) => n + 1) }
}
