import { useEffect, useState } from 'react'
import { api, type Design, type Evaluation } from '../api/client'

// Live engineering evaluation from the mission engine (debounced).
export function useEvaluation(design: Design, level: number) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(design)
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      api.evaluate(design, level)
        .then((e) => { if (alive) { setEvaluation(e); setError(null) } })
        .catch((e: Error) => { if (alive) setError(e.message) })
    }, 120)
    return () => { alive = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, level, tick])
  return { evaluation, error, retry: () => setTick((n) => n + 1) }
}
